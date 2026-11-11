"""
Stage 7: Multi-Shorts Production Engine (9:16 Vertical 1080x1920).
Extracts 2-3 high-impact scenes from the master timeline:
- Short 1: The Cold Open Hook
- Short 2: The Critical Flaw / Malware Breach
- Short 3: The Market Collapse / Autopsy Discrepancy
Renders vertical 9:16 compositions via Remotion CLI, slices timecoded voiceover & subtitles,
and packages each short with dedicated SEO metadata and NanoBanana Pro thumbnail prompts.
"""

import json
from pathlib import Path
import subprocess
import time
from typing import Any, Dict, List

from pipeline import config
from pipeline.subtitles import slice_subtitles_for_range
from pipeline.utils_vram import flush_cuda_memory
from pipeline.youtube_metadata import derive_topic_entities, generate_short_thumbnail_prompts


def build_short_packages(timeline_scenes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not timeline_scenes:
        return []

    n_scenes = len(timeline_scenes)
    packages = []

    anchor_indices = [
        0,
        max(1, int(n_scenes * 0.38)),
        max(2, int(n_scenes * 0.72)),
    ]

    for p_idx, anchor_idx in enumerate(anchor_indices, 1):
        pkg_scenes: List[Dict[str, Any]] = []
        cur_idx = min(anchor_idx, n_scenes - 1)
        acc_dur = 0.0

        while cur_idx < n_scenes and acc_dur < 32.0:
            s = timeline_scenes[cur_idx]
            pkg_scenes.append(s)
            acc_dur += float(s.get("durationSec", 15.0))
            cur_idx += 1
            if acc_dur >= 58.0:
                break

        prev_idx = anchor_idx - 1
        while acc_dur < 31.0 and prev_idx >= 0:
            s = timeline_scenes[prev_idx]
            pkg_scenes.insert(0, s)
            acc_dur += float(s.get("durationSec", 15.0))
            prev_idx -= 1
            if acc_dur >= 58.0:
                break

        final_dur = min(58.0, max(31.0, acc_dur))
        start_sec = float(pkg_scenes[0].get("startTimeSec", 0.0))
        title = pkg_scenes[0].get("chapterTitle", f"Forensic Investigation Exhibit {p_idx}")

        packages.append({
            "packageId": f"short_{p_idx:02d}",
            "title": title,
            "scenes": pkg_scenes,
            "startSec": start_sec,
            "durationSec": round(final_dur, 2),
        })

    return packages


def select_peak_short_scenes(timeline_scenes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    packages = build_short_packages(timeline_scenes)
    return [p["scenes"][0] for p in packages] if packages else []


def normalize_short_scenes(
    pkg_scenes: List[Dict[str, Any]],
    dur_sec: float,
) -> List[Dict[str, Any]]:
    """Clips short scene durations to dur_sec while keeping scene-relative words and visualBeats valid."""
    target_total = max(0.0, round(float(dur_sec), 2))
    normalized: List[Dict[str, Any]] = []
    elapsed = 0.0

    for s in pkg_scenes:
        remaining = round(target_total - elapsed, 2)
        if remaining <= 0.0:
            break

        orig_dur = float(s.get("durationSec", 15.0))
        clipped_dur = round(min(orig_dur, remaining), 2)
        norm_s = dict(s)
        norm_s["startTimeSec"] = round(elapsed, 2)
        norm_s["durationSec"] = clipped_dur

        norm_words = []
        for w in s.get("words", []):
            w_start = max(0.0, float(w.get("startSec", 0.0)))
            if w_start < clipped_dur:
                w_end = min(clipped_dur, max(w_start + 0.05, float(w.get("endSec", w_start + 0.3))))
                norm_words.append({
                    "word": w.get("word", ""),
                    "startSec": round(w_start, 3),
                    "endSec": round(w_end, 3),
                })
        norm_s["words"] = norm_words

        if "visualBeats" in s and isinstance(s["visualBeats"], list):
            kept_beats = [
                dict(b)
                for b in s["visualBeats"]
                if float(b.get("startSec", 0.0)) < clipped_dur
            ]
            if kept_beats:
                last_rem = round(clipped_dur - float(kept_beats[-1]["startSec"]), 2)
                if last_rem <= 0.45 and len(kept_beats) > 1:
                    prev_dur = float(kept_beats[-2]["durationSec"])
                    if prev_dur + last_rem <= 8.5:
                        kept_beats.pop()
                        kept_beats[-1]["durationSec"] = round(
                            clipped_dur - float(kept_beats[-1]["startSec"]), 2
                        )
                    else:
                        shift = round(0.46 - last_rem, 2)
                        kept_beats[-2]["durationSec"] = round(prev_dur - shift, 2)
                        kept_beats[-1]["startSec"] = round(
                            float(kept_beats[-1]["startSec"]) - shift, 2
                        )
                        kept_beats[-1]["durationSec"] = round(
                            clipped_dur - float(kept_beats[-1]["startSec"]), 2
                        )
                else:
                    kept_beats[-1]["durationSec"] = round(max(0.46, last_rem), 2)

                for b_idx, b in enumerate(kept_beats):
                    b["beatIndex"] = b_idx
            norm_s["visualBeats"] = kept_beats

        if "microEvents" in s and isinstance(s["microEvents"], list) and s["microEvents"]:
            kept_me = [
                dict(me)
                for me in s["microEvents"]
                if float(me.get("triggerOffsetSec", 0.0)) < clipped_dur
            ]
            if not kept_me:
                first_me = dict(s["microEvents"][0])
                first_me["triggerOffsetSec"] = round(max(0.0, clipped_dur - 0.5), 2)
                kept_me = [first_me]
            norm_s["microEvents"] = kept_me

        if "sfxTriggers" in s and isinstance(s["sfxTriggers"], list):
            norm_s["sfxTriggers"] = [
                dict(st)
                for st in s["sfxTriggers"]
                if float(st.get("offsetSec", 0.0)) < clipped_dur
            ]

        normalized.append(norm_s)
        elapsed = round(elapsed + clipped_dur, 2)

    return normalized


def generate_shorts_for_run(
    topic: str,
    video_id: str,
    timeline_path: Path,
    words_path: Path,
    voice_mastered_path: Path,
    music_path: Path,
    output_shorts_dir: Path,
) -> List[Dict[str, Any]]:
    output_shorts_dir = Path(output_shorts_dir)
    output_shorts_dir.mkdir(parents=True, exist_ok=True)

    with open(timeline_path, "r", encoding="utf-8") as f:
        timeline_data = json.load(f)

    scenes = timeline_data.get("scenes", [])
    packages = build_short_packages(scenes)
    shorts_manifest: List[Dict[str, Any]] = []

    entities = derive_topic_entities(topic, timeline_data)
    short_prompts = generate_short_thumbnail_prompts(topic, entities)

    print(f"\n[Stage 7] Producing {len(packages)} Vertical 9:16 Shorts (30s-60s each)...")

    for pkg in packages:
        short_num = pkg["packageId"]
        short_dir = output_shorts_dir / short_num
        short_dir.mkdir(parents=True, exist_ok=True)

        start_sec = pkg["startSec"]
        dur_sec = pkg["durationSec"]
        chapter_title = pkg["title"]
        pkg_scenes = pkg["scenes"]

        short_thumb_info = short_prompts.get(short_num, {})
        short_thumb_title = short_thumb_info.get("title", f"{chapter_title} // {topic[:40]}")
        short_thumb_prompt = short_thumb_info.get("prompt", "")

        print(f"  >>> Compiling {short_num}: '{chapter_title}' ({dur_sec}s from {start_sec}s, {len(pkg_scenes)} scenes)")

        audio_slice_path = short_dir / "audio_slice.wav"
        cmd_audio = [
            "ffmpeg",
            "-y",
            "-ss", str(start_sec),
            "-t", str(dur_sec),
            "-i", str(voice_mastered_path),
            "-c:a", "pcm_s16le",
            "-ar", "48000",
            str(audio_slice_path),
        ]
        subprocess.run(cmd_audio, check=True, capture_output=True)

        sub_srt = short_dir / "subtitles.srt"
        sub_vtt = short_dir / "subtitles.vtt"
        slice_subtitles_for_range(words_path, start_sec, start_sec + dur_sec, sub_srt, sub_vtt)

        short_scenes_normalized = normalize_short_scenes(pkg_scenes, dur_sec)

        short_props = {
            "videoId": video_id,
            "topicTitle": short_thumb_title,
            "fps": 30,
            "width": 1080,
            "height": 1920,
            "totalDurationSec": dur_sec,
            "audioTrackPath": f"output/{video_id}/shorts/{short_num}/audio_slice.wav",
            "scenes": short_scenes_normalized,
            "scene": short_scenes_normalized[0],
            "ctaText": "Watch full investigation on our channel — link in pinned comment",
        }

        short_props_path = short_dir / "short_props.json"
        with open(short_props_path, "w", encoding="utf-8") as f:
            json.dump(short_props, f, indent=2)

        final_short_mp4 = short_dir / "short.mp4"
        if not (final_short_mp4.exists() and final_short_mp4.stat().st_size > 100000):
            silent_short_mp4 = short_dir / "silent_short.mp4"
            cmd_render = (
                f'npx remotion render ShortForensicComposition "{silent_short_mp4.as_posix()}" '
                f'--props="{short_props_path.as_posix()}" --muted --gl=angle --concurrency=4'
            )
            t0 = time.time()
            res_render = subprocess.run(cmd_render, shell=True, capture_output=True, text=True, cwd=str(config.PROJECT_ROOT))
            if res_render.returncode != 0 or not silent_short_mp4.exists():
                print(f"[Warning] Short render error: {res_render.stderr[-300:]}")
                pass

            filtergraph = (
                "[2:a]volume=0.55[bg];"
                "[bg][1:a]sidechaincompress=threshold=0.12:ratio=3.2:attack=30:release=450[bg_ducked];"
                "[1:a]volume=1.0[v];"
                "[v][bg_ducked]amix=inputs=2:duration=first:weights=1.0 0.85[a];"
                "[a]loudnorm=I=-14:LRA=7:TP=-1.5[out_a]"
            )

            video_source = silent_short_mp4 if silent_short_mp4.exists() else None
            if video_source:
                cmd_mux = [
                    "ffmpeg",
                    "-y",
                    "-i", str(video_source),
                    "-i", str(audio_slice_path),
                    "-stream_loop", "-1",
                    "-i", str(music_path),
                    "-filter_complex", filtergraph,
                    "-map", "0:v:0",
                    "-map", "[out_a]",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-b:a", "320k",
                    "-shortest",
                    str(final_short_mp4),
                ]
                subprocess.run(cmd_mux, check=True, capture_output=True)
                if silent_short_mp4.exists():
                    silent_short_mp4.unlink()

        short_title = f"{chapter_title} // {topic[:40]} #Shorts"
        short_desc = (
            f"The shocking forensic evidence behind {topic}.\n\n"
            f"Full 10-minute investigative documentary available on our channel: [Link in Pinned Comment]\n\n"
            "#Shorts #ForensicInvestigation #TrueCrime #Documentary"
        )
        metadata_txt_path = short_dir / "metadata.txt"
        with open(metadata_txt_path, "w", encoding="utf-8") as mf:
            mf.write("=" * 70 + "\n")
            mf.write(f"VEXLOCI // SHORT METADATA: {short_num.upper()}\n")
            mf.write("=" * 70 + "\n\n")
            mf.write(f"TITLE:\n{short_title}\n\n")
            mf.write(f"DESCRIPTION:\n{short_desc}\n\n")
            mf.write("PINNED COMMENT:\nWatch the full investigative documentary on our channel!\n\n")
            if short_thumb_prompt:
                mf.write("-" * 70 + "\n")
                mf.write("### NANOBANANA PRO // 9:16 VERTICAL THUMBNAIL PROMPT\n")
                mf.write("-" * 70 + "\n")
                mf.write(f"Scene Focus: {short_thumb_info.get('scene', 'Forensic Evidence')}\n")
                mf.write(f"On-Image Typographic Title: {short_thumb_title}\n\n")
                mf.write(f"Prompt:\n{short_thumb_prompt}\n")

        shorts_manifest.append({
            "shortId": short_num,
            "chapterTitle": chapter_title,
            "durationSec": dur_sec,
            "videoPath": final_short_mp4,
            "subtitlesSrt": sub_srt,
            "metadataPath": metadata_txt_path,
            "thumbnailPrompt": short_thumb_prompt,
            "thumbnailTitle": short_thumb_title,
        })
        print(f"  [OK] {short_num} completed: {final_short_mp4.name} ({dur_sec}s)")
        flush_cuda_memory()

    return shorts_manifest
