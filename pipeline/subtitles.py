"""
Subtitles Engine: Generates timecoded .srt and .vtt subtitle packages from Whisper word timestamps.
Produces compliant SubRip (.srt) for YouTube closed captions & SEO indexing,
and WebVTT (.vtt) for web players and video previews.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


def format_timestamp_srt(seconds: float) -> str:
    total_ms = int(round(seconds * 1000))
    hours = total_ms // 3600000
    minutes = (total_ms % 3600000) // 60000
    secs = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    total_ms = int(round(seconds * 1000))
    hours = total_ms // 3600000
    minutes = (total_ms % 3600000) // 60000
    secs = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


def group_words_into_cues(
    words: List[Dict[str, Any]],
    max_words: int = 6,
    max_chars: int = 36,
    max_gap_sec: float = 0.65,
) -> List[Dict[str, Any]]:
    if not words:
        return []

    cues: List[Dict[str, Any]] = []
    current_words: List[Dict[str, Any]] = []
    current_chars = 0

    for w in words:
        word_text = str(w.get("word", "")).strip()
        if not word_text:
            continue

        start_sec = float(w.get("startSec", 0.0))
        end_sec = float(w.get("endSec", start_sec + 0.3))

        should_break = False
        if current_words:
            prev_end = float(current_words[-1].get("endSec", start_sec))
            gap = start_sec - prev_end
            if gap > max_gap_sec:
                should_break = True
            elif len(current_words) >= max_words:
                should_break = True
            elif (current_chars + len(word_text) + 1) > max_chars:
                should_break = True
            elif current_words[-1].get("word", "").endswith((".", "!", "?", ";", ":")):
                should_break = True

        if should_break and current_words:
            cue_text = " ".join(cw["word"].strip() for cw in current_words)
            cues.append({
                "startSec": float(current_words[0]["startSec"]),
                "endSec": float(current_words[-1]["endSec"]),
                "text": cue_text,
            })
            current_words = []
            current_chars = 0

        current_words.append({"word": word_text, "startSec": start_sec, "endSec": end_sec})
        current_chars += len(word_text) + 1

    if current_words:
        cue_text = " ".join(cw["word"].strip() for cw in current_words)
        cues.append({
            "startSec": float(current_words[0]["startSec"]),
            "endSec": float(current_words[-1]["endSec"]),
            "text": cue_text,
        })

    return cues


def load_words(words_input: Union[Path, str, List[Dict[str, Any]], Dict[str, Any]]) -> List[Dict[str, Any]]:
    if isinstance(words_input, (str, Path)):
        p = Path(words_input)
        if not p.exists():
            return []
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = words_input

    if isinstance(data, dict):
        return data.get("words", [])
    if isinstance(data, list):
        return data
    return []


def generate_subtitles_from_words(
    words_input: Union[Path, str, List[Dict[str, Any]], Dict[str, Any]],
    output_srt: Path,
    output_vtt: Optional[Path] = None,
) -> Dict[str, Path]:
    output_srt = Path(output_srt)
    output_srt.parent.mkdir(parents=True, exist_ok=True)

    words = load_words(words_input)
    cues = group_words_into_cues(words)

    srt_lines = []
    for idx, cue in enumerate(cues, 1):
        start_str = format_timestamp_srt(cue["startSec"])
        end_str = format_timestamp_srt(cue["endSec"])
        srt_lines.append(f"{idx}\n{start_str} --> {end_str}\n{cue['text']}\n")

    srt_content = "\n".join(srt_lines).strip() + "\n"
    with open(output_srt, "w", encoding="utf-8") as f:
        f.write(srt_content)

    results = {"srt": output_srt}

    if output_vtt:
        output_vtt = Path(output_vtt)
        output_vtt.parent.mkdir(parents=True, exist_ok=True)
        vtt_lines = ["WEBVTT\n"]
        for idx, cue in enumerate(cues, 1):
            start_str = format_timestamp_vtt(cue["startSec"])
            end_str = format_timestamp_vtt(cue["endSec"])
            vtt_lines.append(f"{idx}\n{start_str} --> {end_str}\n{cue['text']}\n")
        vtt_content = "\n".join(vtt_lines).strip() + "\n"
        with open(output_vtt, "w", encoding="utf-8") as f:
            f.write(vtt_content)
        results["vtt"] = output_vtt

    return results


def slice_subtitles_for_range(
    words_input: Union[Path, str, List[Dict[str, Any]], Dict[str, Any]],
    start_sec: float,
    end_sec: float,
    output_srt: Path,
    output_vtt: Optional[Path] = None,
) -> Dict[str, Path]:
    output_srt = Path(output_srt)
    output_srt.parent.mkdir(parents=True, exist_ok=True)

    all_words = load_words(words_input)
    filtered_words = []
    for w in all_words:
        w_start = float(w.get("startSec", 0.0))
        w_end = float(w.get("endSec", w_start + 0.3))
        if w_start >= start_sec - 0.1 and w_end <= end_sec + 0.2:
            rel_start = max(0.0, round(w_start - start_sec, 3))
            rel_end = max(rel_start + 0.05, round(w_end - start_sec, 3))
            filtered_words.append({
                "word": w.get("word", ""),
                "startSec": rel_start,
                "endSec": rel_end,
            })

    return generate_subtitles_from_words(filtered_words, output_srt, output_vtt)
