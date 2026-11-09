"""
Stage 2: Voiceover Synthesis & FFmpeg Broadcast Vocal Mastering.
"""

from pathlib import Path
import json
import re
import subprocess
from typing import Any, Dict, List
import wave
import numpy as np

from pipeline.config import ASSETS_DIR, VOICE_CONFIG, VOICE_ENGINE, EDGE_TTS_CONFIG
from pipeline.utils_vram import flush_cuda_memory

KOKORO_MODEL_PATH = ASSETS_DIR / "models" / "kokoro" / "kokoro-v0_19.onnx"
KOKORO_VOICES_PATH = ASSETS_DIR / "models" / "kokoro" / "voices.bin"

_ONES = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
]
_TENS = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
]
_ORDINALS_SPECIAL = {
    1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth",
    6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth",
    11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth",
    15: "fifteenth", 16: "sixteenth", 17: "seventeenth", 18: "eighteenth",
    19: "nineteenth", 20: "twentieth", 30: "thirtieth", 40: "fortieth",
    50: "fiftieth", 60: "sixtieth", 70: "seventieth", 80: "eightieth",
    90: "ninetieth", 100: "one hundredth", 1000: "one thousandth",
}


def cardinal_to_words(n: int) -> str:
    if n < 0:
        return f"minus {cardinal_to_words(-n)}"
    if n < 20:
        return _ONES[n]
    if n < 100:
        tens_part = _TENS[n // 10]
        rem = n % 10
        return f"{tens_part}-{_ONES[rem]}" if rem else tens_part
    if n < 1000:
        hundreds = n // 100
        rem = n % 100
        if rem == 0:
            return f"{_ONES[hundreds]} hundred"
        if rem < 10:
            return f"{_ONES[hundreds]} hundred and {_ONES[rem]}"
        rem_str = cardinal_to_words(rem)
        return f"{_ONES[hundreds]}-hundred {rem_str}"
    if n < 1_000_000:
        thousands = n // 1000
        rem = n % 1000
        prefix = f"{cardinal_to_words(thousands)} thousand"
        if not rem:
            return prefix
        if rem < 100:
            return f"{prefix} and {cardinal_to_words(rem)}"
        return f"{prefix} {cardinal_to_words(rem)}"
    if n < 1_000_000_000:
        millions = n // 1_000_000
        rem = n % 1_000_000
        prefix = f"{cardinal_to_words(millions)} million"
        return f"{prefix} {cardinal_to_words(rem)}" if rem else prefix
    billions = n // 1_000_000_000
    rem = n % 1_000_000_000
    prefix = f"{cardinal_to_words(billions)} billion"
    return f"{prefix} {cardinal_to_words(rem)}" if rem else prefix


def ordinal_to_words(n: int) -> str:
    if n in _ORDINALS_SPECIAL:
        return _ORDINALS_SPECIAL[n]
    if n < 100:
        rem = n % 10
        if rem and rem in _ORDINALS_SPECIAL:
            return f"{_TENS[n // 10]}-{_ORDINALS_SPECIAL[rem]}"
    base_card = cardinal_to_words(n)
    if base_card.endswith("y"):
        return base_card[:-1] + "ieth"
    if base_card.endswith("e"):
        return base_card[:-1] + "th"
    return base_card + "th"


def year_to_words(year: int) -> str:
    if 2000 <= year <= 2009:
        if year == 2000:
            return "two thousand"
        return f"two thousand {cardinal_to_words(year % 100)}"
    if 1900 <= year <= 2099:
        c1 = year // 100
        c2 = year % 100
        if c2 == 0:
            return f"{cardinal_to_words(c1)} hundred"
        if c2 < 10:
            return f"{cardinal_to_words(c1)} oh-{cardinal_to_words(c2)}"
        return f"{cardinal_to_words(c1)} {cardinal_to_words(c2)}"
    return cardinal_to_words(year)


def decimal_to_words(s: str) -> str:
    if "." in s:
        int_part, frac_part = s.split(".", 1)
        int_words = cardinal_to_words(int(int_part))
        frac_words = " ".join(_ONES[int(ch)] if ch.isdigit() else ch for ch in frac_part)
        return f"{int_words} point {frac_words}"
    return cardinal_to_words(int(s))


def normalize_narration_for_tts(text: str) -> str:
    normalized = text

    normalized = re.sub(
        r"\b0x0041A28F\b",
        "hex offset double-zero forty-one A-two eight-F",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(r"\b0x00\b", "double-zero", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\b0x40\b", "four-zero", normalized, flags=re.IGNORECASE)

    def _hex_replacer(m: re.Match) -> str:
        val = m.group(1)
        spaced = " ".join(list(val))
        return f"hex {spaced}"

    normalized = re.sub(r"0x([0-9a-fA-F]+)", _hex_replacer, normalized)

    normalized = re.sub(r"\bevtdiag\.exe\b", "event diag dot E X E", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\bliboradb\.dll\b", "lib ora D B dot D L L", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\bnroff_b\.exe\b", "N-roff B dot E X E", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\bResum\.zip\b", "Resume dot zip", normalized, flags=re.IGNORECASE)

    def _dollar_replacer(m: re.Match) -> str:
        raw_num = m.group("num")
        scale = (m.group("scale") or "").strip().lower()
        if "." in raw_num:
            num_str = decimal_to_words(raw_num)
        else:
            num_str = cardinal_to_words(int(raw_num))

        if scale in ("m", "million"):
            return f"{num_str} million dollars"
        elif scale in ("b", "billion"):
            return f"{num_str} billion dollars"
        elif scale in ("k", "thousand"):
            return f"{num_str} thousand dollars"
        else:
            if raw_num == "1":
                return f"{num_str} dollar"
            return f"{num_str} dollars"

    normalized = re.sub(
        r"\$(?P<num>[0-9]+(?:\.[0-9]+)?)\s*(?P<scale>million|billion|thousand|[MBKmbk])?\b",
        _dollar_replacer,
        normalized,
    )

    def _ordinal_replacer(m: re.Match) -> str:
        num = int(m.group(1))
        return ordinal_to_words(num)

    normalized = re.sub(r"\b([0-9]+)(?:st|nd|rd|th)\b", _ordinal_replacer, normalized, flags=re.IGNORECASE)

    def _year_replacer(m: re.Match) -> str:
        year = int(m.group(1))
        return year_to_words(year)

    normalized = re.sub(r"\b(19\d\d|20\d\d)\b", _year_replacer, normalized)

    def _number_replacer(m: re.Match) -> str:
        num = int(m.group(1))
        return cardinal_to_words(num)

    normalized = re.sub(r"\b([0-9]+)\b", _number_replacer, normalized)

    normalized = re.sub(r"\bNY Fed\b", "New York Fed", normalized)
    normalized = re.sub(r"\bRCBC's\b", "R. C. B. C.'s", normalized)
    normalized = re.sub(r"\bRCBC\b", "R. C. B. C.", normalized)
    normalized = re.sub(r"\bSWIFT\b", "S. W. I. F. T.", normalized)
    normalized = re.sub(r"\bOFAC\b", "O. F. A. C.", normalized)
    normalized = re.sub(r"\bMT103\b", "M-T one-oh-three", normalized)
    normalized = re.sub(r"\bNOP\b", "no-operation", normalized)
    normalized = re.sub(r"\bHP\b", "H-P", normalized)
    normalized = re.sub(r"\bH-P\b", "H-P", normalized)
    normalized = re.sub(r"\bFX\b", "F-X", normalized)
    normalized = re.sub(r"\bNY\b", "New York", normalized)

    return normalized


def create_organic_pause_buffer(duration_ms: int, sample_rate: int = 24000) -> np.ndarray:
    samples_count = int((duration_ms / 1000.0) * sample_rate)
    if samples_count <= 0:
        return np.zeros(0, dtype=np.float32)
    return np.random.normal(0.0, 1e-4, samples_count).astype(np.float32)


def create_silence_buffer(duration_ms: int, sample_rate: int = 24000) -> np.ndarray:
    return create_organic_pause_buffer(duration_ms, sample_rate)


def apply_boundary_fade(
    audio: np.ndarray, fade_ms: float = 12.0, sample_rate: int = 24000
) -> np.ndarray:
    if len(audio) == 0:
        return audio
    fade_len = int((fade_ms / 1000.0) * sample_rate)
    if fade_len <= 0:
        return audio
    fade_len = min(fade_len, len(audio) // 2)
    if fade_len == 0:
        return audio

    out = audio.copy()
    fade_in = 0.5 * (1.0 - np.cos(np.linspace(0.0, np.pi, fade_len, endpoint=False)))
    fade_out = 0.5 * (1.0 + np.cos(np.linspace(0.0, np.pi, fade_len, endpoint=False)))

    out[:fade_len] *= fade_in.astype(np.float32)
    out[-fade_len:] *= fade_out.astype(np.float32)
    return out


def synthesize_with_edge_tts(
    text: str,
    voice: str = "en-US-ChristopherNeural",
    rate: str = "+3%",
    pitch: str = "-1Hz",
    sample_rate: int = 24000,
) -> np.ndarray:
    import asyncio
    import edge_tts
    import time

    async def _render_full_text(t: str, out_file: str) -> None:
        comm = edge_tts.Communicate(t, voice, rate=rate, pitch=pitch)
        await comm.save(out_file)

    scratch_dir = Path("scratch")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    tmp_mp3 = scratch_dir / f"edge_{time.time_ns()}.mp3"

    try:
        asyncio.run(_render_full_text(text, str(tmp_mp3)))
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp_mp3),
            "-f",
            "f32le",
            "-ar",
            str(sample_rate),
            "-ac",
            "1",
            "pipe:1",
        ]
        res = subprocess.run(cmd, capture_output=True, check=True)
        samples = np.frombuffer(res.stdout, dtype=np.float32)
        return apply_boundary_fade(samples, fade_ms=10.0, sample_rate=sample_rate)
    finally:
        tmp_mp3.unlink(missing_ok=True)


def generate_synthesized_voice_segment(
    text: str, speed_multiplier: float = 0.94, sample_rate: int = 24000
) -> np.ndarray:
    if VOICE_ENGINE == "edge-tts":
        try:
            voice = EDGE_TTS_CONFIG.get("voice", "en-US-ChristopherNeural")
            rate = EDGE_TTS_CONFIG.get("rate", "+3%")
            pitch = EDGE_TTS_CONFIG.get("pitch", "-1Hz")
            return synthesize_with_edge_tts(
                text, voice=voice, rate=rate, pitch=pitch, sample_rate=sample_rate
            )
        except Exception:
            pass

    if KOKORO_MODEL_PATH.exists() and KOKORO_VOICES_PATH.exists():
        try:
            from kokoro_onnx import Kokoro
            kokoro = Kokoro(str(KOKORO_MODEL_PATH), str(KOKORO_VOICES_PATH))

            try:
                voice_adam = kokoro.get_voice_style("am_adam")
                voice_george = kokoro.get_voice_style("bm_george")
                blended_voice = 0.70 * voice_adam + 0.30 * voice_george
            except Exception:
                voice_adam = kokoro.get_voice_style("am_adam")
                voice_michael = kokoro.get_voice_style("am_michael")
                blended_voice = 0.65 * voice_adam + 0.35 * voice_michael

            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
            if not sentences:
                sentences = [text]

            sentence_segments: List[np.ndarray] = []
            for s_idx, sentence in enumerate(sentences):
                samples, _ = kokoro.create(
                    sentence,
                    voice=blended_voice,
                    speed=float(speed_multiplier),
                    lang="en-us",
                )
                faded_samples = apply_boundary_fade(samples.astype(np.float32), fade_ms=12.0, sample_rate=sample_rate)
                sentence_segments.append(faded_samples)

                if s_idx < len(sentences) - 1:
                    sentence_segments.append(create_organic_pause_buffer(240, sample_rate))

            return np.concatenate(sentence_segments)
        except Exception:
            pass

    words = text.split()
    total_sec = max(1.2, len(words) * 0.38 / speed_multiplier)
    num_samples = int(total_sec * sample_rate)
    t = np.linspace(0, total_sec, num_samples, endpoint=False)
    carrier = (
        0.4 * np.sin(2 * np.pi * 135 * t)
        + 0.25 * np.sin(2 * np.pi * 270 * t)
        + 0.15 * np.sin(2 * np.pi * 405 * t)
    )
    return apply_boundary_fade(carrier.astype(np.float32), fade_ms=12.0, sample_rate=sample_rate)


def master_voice_with_ffmpeg(raw_wav_path: Path, output_mastered_path: Path) -> Path:
    filter_chain = (
        "highpass=f=80,"
        "equalizer=f=160:width_type=q:w=0.7:g=2.2,"
        "equalizer=f=450:width_type=q:w=1.2:g=-1.8,"
        "equalizer=f=2800:width_type=q:w=1.0:g=1.8,"
        "equalizer=f=6200:width_type=q:w=2.2:g=-2.5,"
        "equalizer=f=11000:width_type=h:g=1.8,"
        "acompressor=threshold=-18dB:ratio=2.8:attack=20:release=180:knee=4:makeup=1.5,"
        "aecho=0.8:0.9:14|20:0.035|0.025,"
        "loudnorm=I=-14:TP=-1.5:LRA=7"
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(raw_wav_path),
        "-af",
        filter_chain,
        "-ar",
        "48000",
        str(output_mastered_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_mastered_path


def generate_voiceover(
    script_data: Dict[str, Any], output_dir: Path
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_wav_path = output_dir / "02_voice_raw.wav"
    mastered_wav_path = output_dir / "02_voice_mastered.wav"

    sample_rate = 24000
    all_audio_segments: List[np.ndarray] = []
    scene_timings: List[Dict[str, Any]] = []
    current_time_sec = 0.0

    scenes = script_data.get("scenes", [])
    for s_idx, scene in enumerate(scenes):
        act_num = scene.get("actNumber", 1)
        narration = scene.get("narrationText", "")
        scene_id = scene.get("sceneId", f"scene_{s_idx + 1:02d}")

        speed = VOICE_CONFIG["speed_multipliers"]["default"]
        if act_num == 1:
            speed = VOICE_CONFIG["speed_multipliers"]["hook"]
        elif "glitch" in narration.lower() or "code" in narration.lower():
            speed = VOICE_CONFIG["speed_multipliers"]["technical"]
        elif "lost" in narration.lower() or "crash" in narration.lower():
            speed = VOICE_CONFIG["speed_multipliers"]["reveal"]

        tts_narration = normalize_narration_for_tts(narration)

        segment = generate_synthesized_voice_segment(tts_narration, speed, sample_rate)
        all_audio_segments.append(segment)
        seg_duration = len(segment) / sample_rate

        silence_sec = 0.0
        if s_idx < len(scenes) - 1:
            next_act = scenes[s_idx + 1].get("actNumber", act_num)
            silence_ms = (
                VOICE_CONFIG["silence_buffers_ms"]["act"]
                if next_act != act_num
                else VOICE_CONFIG["silence_buffers_ms"]["scene"]
            )
            all_audio_segments.append(create_organic_pause_buffer(silence_ms, sample_rate))
            silence_sec = silence_ms / 1000.0

        audio_start_sec = round(current_time_sec, 3)
        audio_end_sec = round(current_time_sec + seg_duration, 3)
        total_scene_dur = round(seg_duration + silence_sec, 3)

        scene_timings.append({
            "sceneId": scene_id,
            "audioStartSec": audio_start_sec,
            "audioEndSec": audio_end_sec,
            "durationSec": total_scene_dur,
        })
        current_time_sec += (seg_duration + silence_sec)

    timings_path = output_dir / "02_scene_timings.json"
    with open(timings_path, "w", encoding="utf-8") as f:
        json.dump(scene_timings, f, indent=2)

    combined = np.concatenate(all_audio_segments)

    combined_int16 = (np.clip(combined, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(raw_wav_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(combined_int16.tobytes())

    master_voice_with_ffmpeg(raw_wav_path, mastered_wav_path)
    flush_cuda_memory()
    return mastered_wav_path
