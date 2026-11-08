"""
Stage 6: Headless Remotion Renderer & FFmpeg Sidechain Audio Mixer.
Renders video_silent.mp4, compiles 06_sfx_mix.wav from timeline sfxTriggers,
and executes FFmpeg sidechaincompress to produce broadcast-ready 06_final_video.mp4.
"""

import json
from pathlib import Path
import subprocess
import time
from typing import Any, Dict
import numpy as np
from scipy.io import wavfile

from pipeline import config
from pipeline.config import SFX_DIR, MUSIC_DIR, ENABLE_SFX
from pipeline.audio_synth import generate_dark_synth_score, generate_all_sfx
from pipeline.utils_vram import flush_cuda_memory


SAMPLE_RATE = 48000


def compile_sfx_stem(timeline_path: Path, output_wav: Path) -> Path:
    if not ENABLE_SFX:
        output_wav.parent.mkdir(parents=True, exist_ok=True)
        wavfile.write(str(output_wav), SAMPLE_RATE, np.zeros((SAMPLE_RATE, 2), dtype=np.int16))
        return output_wav

    with open(timeline_path, "r", encoding="utf-8") as f:
        timeline = json.load(f)

    total_duration_sec = timeline.get("totalDurationSec", 60.0)
    total_samples = int((total_duration_sec + 2.0) * SAMPLE_RATE)
    mix_left = np.zeros(total_samples, dtype=np.float32)
    mix_right = np.zeros(total_samples, dtype=np.float32)

    # Ensure SFX exist
    if not SFX_DIR.exists() or len(list(SFX_DIR.glob("*.wav"))) < 8:
        generate_all_sfx(SFX_DIR)

    for scene in timeline.get("scenes", []):
        scene_start = scene.get("startTimeSec", 0.0)
        for trig in scene.get("sfxTriggers", []):
            offset_sec = scene_start + trig.get("offsetSec", 0.0)
            sound_name = trig.get("soundFile", "ui_tick.wav")
            volume = float(trig.get("volume", 0.7))

            wav_file = SFX_DIR / sound_name
            if not wav_file.exists():
                continue

            try:
                sr, raw_data = wavfile.read(str(wav_file))
                # Normalize to float32 [-1, 1]
                if raw_data.dtype == np.int16:
                    audio_data = raw_data.astype(np.float32) / 32768.0
                else:
                    audio_data = raw_data.astype(np.float32)

                if audio_data.ndim == 1:
                    left = audio_data
                    right = audio_data
                else:
                    left = audio_data[:, 0]
                    right = audio_data[:, 1]

                start_idx = int(offset_sec * SAMPLE_RATE)
                end_idx = min(total_samples, start_idx + len(left))
                chunk_len = end_idx - start_idx

                if chunk_len > 0 and start_idx < total_samples:
                    mix_left[start_idx:end_idx] += left[:chunk_len] * volume
                    mix_right[start_idx:end_idx] += right[:chunk_len] * volume
            except Exception as e:
                print(f"[Stage 6 Warning] Failed mixing {sound_name}: {e}")

    # Clip and write 16-bit PCM WAV
    mix_left = np.clip(mix_left, -0.98, 0.98)
    mix_right = np.clip(mix_right, -0.98, 0.98)
    stereo = np.column_stack((mix_left, mix_right))
    pcm = (stereo * 32767).astype(np.int16)

    output_wav.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(str(output_wav), SAMPLE_RATE, pcm)
    return output_wav


compile_sfx_stem_for_timeline = compile_sfx_stem


def render_silent_video(timeline_path: Path, output_mp4: Path) -> Path:
    """Invokes Remotion CLI to render video_silent.mp4 from 05_timeline.json."""
    output_mp4.parent.mkdir(parents=True, exist_ok=True)
    print(f"[Stage 6] Rendering silent video via Remotion CLI...")

    cmd = (
        f'npx remotion render MainForensicComposition "{output_mp4.as_posix()}" '
        f'--props="{timeline_path.as_posix()}" --muted --gl=angle --concurrency=4'
    )

    t0 = time.time()
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(config.PROJECT_ROOT))

    if res.returncode != 0 or not output_mp4.exists():
        err_msg = res.stderr[-500:] if res.stderr else res.stdout[-500:]
        raise RuntimeError(f"Remotion render failed (code {res.returncode}): {err_msg}")

    render_dur = round(time.time() - t0, 2)
    print(f"[Stage 6] Remotion render completed in {render_dur}s: {output_mp4} ({output_mp4.stat().st_size} bytes)")
    return output_mp4


def mux_final_audio_sidechain(
    video_path: Path,
    voice_path: Path,
    sfx_path: Path,
    music_path: Path,
    output_mp4: Path,
) -> Path:
    if not music_path.exists():
        generate_dark_synth_score(music_path)

    if not ENABLE_SFX:
        filtergraph = (
            "[2:a]volume=0.65[bg_in];"
            "[bg_in][1:a]sidechaincompress=threshold=0.12:ratio=3.2:attack=30:release=450[bg_ducked];"
            "[1:a]volume=1.0[voice];"
            "[voice][bg_ducked]amix=inputs=2:duration=first:weights=1.0 0.9[mixed];"
            "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_a]"
        )
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-i", str(voice_path),
            "-stream_loop", "-1",
            "-i", str(music_path),
            "-filter_complex", filtergraph,
            "-map", "0:v:0",
            "-map", "[out_a]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "320k",
            "-ar", "48000",
            "-shortest",
            str(output_mp4),
        ]
    else:
        filtergraph = (
            "[3:a]volume=0.60[bg_in];"
            "[bg_in][1:a]sidechaincompress=threshold=0.12:ratio=3.2:attack=30:release=450[bg_ducked];"
            "[1:a]volume=1.0[voice];"
            "[2:a]volume=0.85[sfx];"
            "[voice][bg_ducked][sfx]amix=inputs=3:duration=first:dropout_transition=2:weights=1.0 0.85 0.7[mixed];"
            "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_a]"
        )
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-i", str(voice_path),
            "-i", str(sfx_path),
            "-stream_loop", "-1",
            "-i", str(music_path),
            "-filter_complex", filtergraph,
            "-map", "0:v:0",
            "-map", "[out_a]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "320k",
            "-ar", "48000",
            "-shortest",
            str(output_mp4),
        ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0 or not output_mp4.exists():
        raise RuntimeError(f"FFmpeg muxing failed: {res.stderr[-500:]}")

    return output_mp4


def verify_final_video_ffprobe(video_path: Path) -> Dict[str, Any]:
    """Uses ffprobe to verify video resolution, framerate, duration, and audio stream."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "stream=codec_type,width,height,r_frame_rate,sample_rate:format=duration,size",
        "-of", "json",
        str(video_path),
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {res.stderr}")

    info = json.loads(res.stdout)
    streams = info.get("streams", [])
    format_info = info.get("format", {})

    v_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    receipt = {
        "file": str(video_path),
        "sizeBytes": int(format_info.get("size", 0)),
        "durationSec": float(format_info.get("duration", 0.0)),
        "video": {
            "width": int(v_stream.get("width", 0)) if v_stream else 0,
            "height": int(v_stream.get("height", 0)) if v_stream else 0,
            "fps": v_stream.get("r_frame_rate") if v_stream else "0/1",
        },
        "audio": {
            "sampleRate": int(a_stream.get("sample_rate", 0)) if a_stream else 0,
        },
    }
    return receipt


def execute_stage6_render(run_dir: Path) -> Dict[str, Any]:
    """Stage 6 Master Entry Point."""
    timeline_path = run_dir / "05_timeline.json"
    voice_path = run_dir / "02_voice_mastered.wav"
    video_silent = run_dir / "video_silent.mp4"
    sfx_stem = run_dir / "06_sfx_mix.wav"
    music_loop = MUSIC_DIR / "bg_music_loop.wav"
    final_video = run_dir / "06_final_video.mp4"

    if not timeline_path.exists():
        raise FileNotFoundError(f"Missing {timeline_path}")
    if not voice_path.exists():
        raise FileNotFoundError(f"Missing {voice_path}")

    # Step 1: SFX Stem
    compile_sfx_stem(timeline_path, sfx_stem)

    # Step 2: Remotion Silent Video
    render_silent_video(timeline_path, video_silent)

    # Step 3: FFmpeg Audio Muxing with Sidechain Ducking
    mux_final_audio_sidechain(video_silent, voice_path, sfx_stem, music_loop, final_video)

    # Step 4: Verification via ffprobe
    receipt = verify_final_video_ffprobe(final_video)
    flush_cuda_memory()
    return receipt


if __name__ == "__main__":
    test_run = Path("runs/demo_knight_capital")
    receipt = execute_stage6_render(test_run)
    print("Stage 6 Receipt:", json.dumps(receipt, indent=2))
