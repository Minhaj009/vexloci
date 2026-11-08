"""
Vexloci Video Engine: Master Orchestrator (Stages 1 -> 7).
Accepts any topic string across the forensic/cyber/financial collapse niche,
coordinates sequential pipeline stages under 6 GB VRAM budget, and compiles
a complete, production-ready release package inside output/<video_id>/:
├── long_form/ (1080p30 16:9 Video, Audio WAV, .srt & .vtt Subtitles, YouTube Metadata & Nano Bana 2 Pro prompts)
├── shorts/ (2-3 Vertical 9:16 1080x1920 Shorts with timecoded subtitles and link metadata)
├── assets/ (Photometric graded historical photos, 18s Ken Burns b-roll, 2.5D cutouts)
└── timeline/ (Full 6-act scripts, word alignments, and compiled scene schemas)
"""

import argparse
import json
from pathlib import Path
import re
import shutil
import sys
import time
from typing import Any, Dict

from pipeline.config import (
    ASSETS_DIR,
    CANVAS_FPS,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    MUSIC_DIR,
    OUTPUT_DIR,
    PUBLIC_DIR,
    RUNS_DIR,
)

# Ensure safe UTF-8 terminal I/O on Windows PowerShell
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
from pipeline.stage1_research import compile_research_and_script
from pipeline.stage2_audio import generate_voiceover
from pipeline.stage3_align import extract_word_timestamps
from pipeline.stage4_assets import process_assets_for_run
from pipeline.stage5_compile import compile_timeline, verify_dom_qa_playwright
from pipeline.stage6_render import execute_stage6_render
from pipeline.stage7_shorts import generate_shorts_for_run
from pipeline.subtitles import generate_subtitles_from_words
from pipeline.utils_vram import flush_cuda_memory
from pipeline.youtube_metadata import generate_youtube_metadata


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "_", text)


def run_pipeline(
    topic: str,
    mode: str = "broadcast_long_form_8_12m",
    video_id: str = None,
    api_key: str = None,
    generate_shorts: bool = True,
    skip_existing: bool = False,
) -> Path:
    t_start = time.time()
    if not video_id:
        video_id = slugify(topic)[:40]

    # Working scratch directory for ephemeral intermediate render files
    run_dir = RUNS_DIR / video_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Final organized production package directory
    prod_dir = OUTPUT_DIR / video_id
    long_form_dir = prod_dir / "long_form"
    shorts_dir = prod_dir / "shorts"
    prod_assets_dir = prod_dir / "assets"
    timeline_dir = prod_dir / "timeline"

    for d in (long_form_dir, shorts_dir, prod_assets_dir, timeline_dir):
        d.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 70)
    print("VEXLOCI FORENSIC VIDEO ENGINE // PRODUCTION COMPILER")
    print(f"Topic:       '{topic}'")
    print(f"Video ID:    '{video_id}'")
    print(f"Mode:        '{mode}'")
    print(f"Package Dir: {prod_dir}")
    print(f"Resolution:  {CANVAS_WIDTH}x{CANVAS_HEIGHT} @ {CANVAS_FPS}fps")
    print("=" * 70 + "\n")

    # STAGE 1: Research & Script Compiler
    print(">>> [STAGE 1/7] Topic Research & 6-Act Forensic Script Compilation")
    script_path = run_dir / "01_script.json"
    if skip_existing and script_path.exists():
        with open(script_path, "r", encoding="utf-8") as f:
            script_data = json.load(f)
        print(f"    [CACHED] 01_script.json ({len(script_data['scenes'])} scenes)")
    else:
        t0 = time.time()
        script_path = compile_research_and_script(topic, video_id, run_dir, mode=mode, api_key=api_key)
        with open(script_path, "r", encoding="utf-8") as f:
            script_data = json.load(f)
        print(f"    Artifact: 01_script.json ({len(script_data['scenes'])} scenes in {round(time.time() - t0, 2)}s)")
        flush_cuda_memory()

    # STAGE 2: Neural Vocal Synthesis & Broadcast Mastering
    print("\n>>> [STAGE 2/7] Enterprise Neural Vocal Synthesis & Mastering")
    mastered_wav = run_dir / "02_voice_mastered.wav"
    if skip_existing and mastered_wav.exists() and mastered_wav.stat().st_size > 1000:
        print(f"    [CACHED] 02_voice_mastered.wav ({mastered_wav.stat().st_size} bytes)")
    else:
        t0 = time.time()
        mastered_wav = generate_voiceover(script_data, run_dir)
        print(f"    Artifact: 02_voice_mastered.wav ({mastered_wav.stat().st_size} bytes in {round(time.time() - t0, 2)}s)")
        flush_cuda_memory()

    # STAGE 3: Forced Word Alignment
    print("\n>>> [STAGE 3/7] Faster-Whisper int8 Word-Level Audio Alignment")
    words_path = run_dir / "03_words.json"
    if skip_existing and words_path.exists():
        with open(words_path, "r", encoding="utf-8") as f:
            aligned_words = json.load(f)
        print(f"    [CACHED] 03_words.json ({len(aligned_words)} words)")
    else:
        t0 = time.time()
        aligned_words = extract_word_timestamps(mastered_wav, words_path)
        print(f"    Artifact: 03_words.json ({len(aligned_words)} words aligned in {round(time.time() - t0, 2)}s)")
        flush_cuda_memory()

    # STAGE 4: Dynamic Media Ingestion & 2.5D Layer Splitting
    print("\n>>> [STAGE 4/7] Dynamic MediaWiki Ingestion & 18s Ken Burns Generation")
    run_assets_dir = run_dir / "04_assets"
    if skip_existing and run_assets_dir.exists() and any(run_assets_dir.glob("*.mp4")):
        print("    [CACHED] 04_assets/ (archival images & b-roll clips ready)")
    else:
        t0 = time.time()
        assets_info = process_assets_for_run(video_id, run_assets_dir, script_data=script_data)
        print(f"    Artifacts: 04_assets/ (archival images & b-roll clips in {round(time.time() - t0, 2)}s)")
        flush_cuda_memory()

    # STAGE 5: Timeline Compilation & DOM QA Gate
    print("\n>>> [STAGE 5/7] Timeline Compilation & Playwright DOM QA Gate")
    timeline_path = run_dir / "05_timeline.json"
    if skip_existing and timeline_path.exists():
        with open(timeline_path, "r", encoding="utf-8") as f:
            timeline_data = json.load(f)
        print(f"    [CACHED] 05_timeline.json ({timeline_data['totalDurationSec']}s duration)")
    else:
        t0 = time.time()
        timeline_data = compile_timeline(script_path, words_path, run_assets_dir, timeline_path, video_id, topic)
        qa_result = verify_dom_qa_playwright(timeline_path)
        if not qa_result["qa_passed"]:
            raise RuntimeError(f"DOM QA gate failed with layout collisions: {qa_result['collisions']}")
        print(f"    Artifact: 05_timeline.json ({timeline_data['totalDurationSec']}s duration, QA passed in {round(time.time() - t0, 2)}s)")
        flush_cuda_memory()

    # STAGE 6: Headless Remotion Render & Sidechain Sound Mixing
    print("\n>>> [STAGE 6/7] Remotion Headless Render & -14 LUFS Sidechain Ducking")
    rendered_long_video = run_dir / "06_final_video.mp4"
    if skip_existing and rendered_long_video.exists() and rendered_long_video.stat().st_size > 1000000:
        receipt = {"sizeBytes": rendered_long_video.stat().st_size, "durationSec": timeline_data["totalDurationSec"]}
        print(f"    [CACHED] 06_final_video.mp4 ({receipt['sizeBytes']} bytes, {receipt['durationSec']}s)")
    else:
        t0 = time.time()
        receipt = execute_stage6_render(run_dir)
        rendered_long_video = run_dir / "06_final_video.mp4"
        print(f"    Artifact: 06_final_video.mp4 ({receipt['sizeBytes']} bytes, {receipt['durationSec']}s in {round(time.time() - t0, 2)}s)")
        flush_cuda_memory()

    # SUBTITLES & METADATA COMPILATION
    print("\n>>> [PACKAGING] Generating Subtitles (.srt & .vtt) & YouTube SEO Package")
    srt_out = long_form_dir / "subtitles.srt"
    vtt_out = long_form_dir / "subtitles.vtt"
    generate_subtitles_from_words(words_path, srt_out, vtt_out)
    print(f"    Subtitles: {srt_out.name} & {vtt_out.name}")

    meta_pkg = generate_youtube_metadata(topic, script_data, timeline_data, long_form_dir)
    print(f"    Metadata:  {meta_pkg['txt_path'].name} (with Nano Bana 2 Pro thumbnail prompts)")

    # Copy long-form video and audio
    final_long_video = long_form_dir / "video.mp4"
    final_long_audio = long_form_dir / "audio.wav"
    shutil.copy2(rendered_long_video, final_long_video)
    shutil.copy2(mastered_wav, final_long_audio)

    # STAGE 7: Multi-Shorts Production Engine (9:16 Vertical)
    if generate_shorts:
        print("\n>>> [STAGE 7/7] Multi-Shorts Production (1080x1920 Vertical 9:16)")
        music_path = MUSIC_DIR / "bg_music_loop.wav"
        shorts_manifest = generate_shorts_for_run(
            topic=topic,
            video_id=video_id,
            timeline_path=timeline_path,
            words_path=words_path,
            voice_mastered_path=mastered_wav,
            music_path=music_path,
            output_shorts_dir=shorts_dir,
        )
        print(f"    Generated {len(shorts_manifest)} packaged Shorts in {shorts_dir}")

    # Copy raw assets and timeline manifests to output package
    for f in run_assets_dir.glob("*"):
        if f.is_file():
            shutil.copy2(f, prod_assets_dir / f.name)

    for f in (script_path, words_path, timeline_path):
        if f.exists():
            shutil.copy2(f, timeline_dir / f.name)
    timings_path = run_dir / "02_scene_timings.json"
    if timings_path.exists():
        shutil.copy2(timings_path, timeline_dir / timings_path.name)

    total_pipeline_time = round(time.time() - t_start, 2)
    print("\n" + "=" * 70)
    print("VEXLOCI PRODUCTION PACKAGE COMPILED SUCCESSFULLY")
    print(f"Total Wall-Clock Time:  {total_pipeline_time}s")
    print(f"Production Directory:   {prod_dir}")
    print(f"├── long_form/video.mp4 ({receipt['sizeBytes']} bytes, {receipt['durationSec']}s)")
    print(f"├── long_form/subtitles.srt & youtube_metadata.txt")
    print(f"├── shorts/ ({len(list(shorts_dir.glob('short_*')))} vertical 9:16 packages)")
    print(f"├── assets/ ({len(list(prod_assets_dir.glob('*')))} visual assets)")
    print(f"└── timeline/ (scripts, word timings, and schemas)")
    print("=" * 70 + "\n")

    return final_long_video


def main():
    parser = argparse.ArgumentParser(description="Vexloci Topic-to-Video Engine")
    parser.add_argument("--topic", type=str, required=True, help="Topic headline (e.g. 'The 2012 Knight Capital $440M Trading Glitch')")
    parser.add_argument("--mode", type=str, default="broadcast_long_form_8_12m", choices=["broadcast_long_form_8_12m"], help="Execution mode (hardcoded 8-12 min forensic documentary)")
    parser.add_argument("--video-id", type=str, default=None, help="Custom run ID")
    parser.add_argument("--api-key", type=str, default=None, help="LLM API key for dynamic research")
    parser.add_argument("--no-shorts", action="store_true", help="Skip rendering vertical shorts")
    parser.add_argument("--skip-existing", action="store_true", help="Reuse completed artifacts if already present in runs/<video_id>")

    args = parser.parse_args()

    try:
        final_video = run_pipeline(
            topic=args.topic,
            mode=args.mode,
            video_id=args.video_id,
            api_key=args.api_key,
            generate_shorts=not args.no_shorts,
            skip_existing=args.skip_existing,
        )
        sys.exit(0)
    except Exception as e:
        print(f"\n[FATAL ERROR] Pipeline failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
