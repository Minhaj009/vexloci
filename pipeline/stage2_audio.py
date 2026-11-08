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

    normalized = re.sub(r"\bMT103\b", "M-T one-oh-three", normalized)
    normalized = re.sub(r"\bNOP\b", "no-operation", normalized)
    normalized = re.sub(r"\bRCBC\b", "R-C-B-C", normalized)
    normalized = re.sub(r"\bOFAC\b", "O-F-A-C", normalized)
    normalized = re.sub(r"\bHP\b", "H-P", normalized)
    normalized = re.sub(r"\bH-P\b", "H-P", normalized)
    normalized = re.sub(r"\bFX\b", "F-X", normalized)
    normalized = re.sub(r"\bNY\b", "New York", normalized)

    normalized = re.sub(r"\$951M\b", "nine-hundred fifty-one million dollars", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\$81M\b", "eighty-one million dollars", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\$850M\b", "eight-hundred fifty million dollars", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\$20M\b", "twenty million dollars", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\$65\.75M\b", "sixty-five point seven-five million dollars", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\$10\b", "ten-dollar", normalized)

    normalized = re.sub(r"\$([0-9]+(?:\.[0-9]+)?)\s*billion\b", r"\1 billion dollars", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\$([0-9]+(?:\.[0-9]+)?)\s*million\b", r"\1 million dollars", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\$([0-9]+(?:\.[0-9]+)?)\s*M\b", r"\1 million dollars", normalized)
    normalized = re.sub(r"\$([0-9]+(?:\.[0-9]+)?)\s*B\b", r"\1 billion dollars", normalized)

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
