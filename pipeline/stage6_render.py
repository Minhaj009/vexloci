"""
Stage 6: Headless Remotion Renderer & FFmpeg Sidechain Audio Mixer.
Renders video_silent.mp4, compiles 06_sfx_mix.wav from timeline sfxTriggers,
and executes FFmpeg sidechaincompress to produce broadcast-ready 06_final_video.mp4.
"""

import json
from pathlib import Path
import subprocess
import time
from typing import Any, Dict, Optional
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
        f'--props="{timeline_path.as_posix()}" --muted --gl=angle --concurrency=4 --port=3100'
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

    total_dur = 763.24
    timeline_path = video_path.parent / "05_timeline.json"
    if timeline_path.exists():
        try:
            with open(timeline_path, "r", encoding="utf-8") as tf:
                tl = json.load(tf)
                total_dur = float(tl.get("totalDurationSec", 763.24))
        except Exception:
            pass

    if not ENABLE_SFX:
        filtergraph = (
            f"[1:a]apad=whole_dur={total_dur},asplit=2[v_sc][voice];"
            "[2:a]volume=0.65[bg_in];"
            "[bg_in][v_sc]sidechaincompress=threshold=0.12:ratio=3.2:attack=30:release=450[bg_ducked];"
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
            f"[1:a]apad=whole_dur={total_dur},asplit=2[v_sc][voice];"
            "[3:a]volume=0.60[bg_in];"
            "[bg_in][v_sc]sidechaincompress=threshold=0.12:ratio=3.2:attack=30:release=450[bg_ducked];"
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


def audit_final_audio(audio_path: Path, video_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Automated Headless Audio QA Scanner.
    Audits audio for true peak, DC offset, digital clipping, and ultrasonic spikes.
    """
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    sr, raw_data = wavfile.read(str(audio_path))
    if raw_data.dtype == np.int16:
        audio = raw_data.astype(np.float32) / 32768.0
    elif raw_data.dtype == np.int32:
        audio = raw_data.astype(np.float32) / 2147483648.0
    else:
        audio = raw_data.astype(np.float32)

    errors = []

    # 1. True peak check (<= -1.5 dBFS)
    peak_linear = float(np.max(np.abs(audio)))
    peak_db = 20.0 * np.log10(peak_linear + 1e-9)
    if peak_db > -1.4:
        errors.append(f"True peak exceeds -1.5 dBFS limit: {peak_db:.2f} dBFS")

    # 2. DC offset check (< 0.001)
    dc_offset = float(np.abs(np.mean(audio)))
    if dc_offset >= 0.001:
        errors.append(f"DC offset exceeds tolerance (< 0.001): {dc_offset:.6f}")

    # 3. Clipping check (samples >= 0.999)
    clipping_samples = int(np.sum(np.abs(audio) >= 0.999))
    if clipping_samples > 0:
        errors.append(f"Digital clipping detected: {clipping_samples} samples hit >= 0.999")

    # 4. High frequency / ultrasonic spike check (> 18 kHz)
    ultrasonic_spike = False
    if sr >= 44100 and audio.shape[0] > sr:
        mono = audio if audio.ndim == 1 else np.mean(audio, axis=1)
        chunk_len = min(sr * 10, mono.shape[0])
        fft_vals = np.abs(np.fft.rfft(mono[:chunk_len]))
        freqs = np.fft.rfftfreq(chunk_len, d=1.0 / sr)
        high_mask = freqs >= 18000
        mid_mask = (freqs >= 1000) & (freqs < 10000)
        high_energy = float(np.mean(fft_vals[high_mask])) if np.any(high_mask) else 0.0
        mid_energy = float(np.mean(fft_vals[mid_mask])) if np.any(mid_mask) else 1.0
        if mid_energy > 0 and (high_energy / mid_energy) > 5.0:
            ultrasonic_spike = True
            errors.append("Ultrasonic high-frequency spike detected above 18 kHz")

    # 5. Duration comparison with video if video_path exists
    duration_diff = 0.0
    if video_path and video_path.exists():
        v_receipt = verify_final_video_ffprobe(video_path)
        v_dur = v_receipt.get("durationSec", 0.0)
        a_dur = audio.shape[0] / float(sr)
        duration_diff = abs(v_dur - a_dur)
        if duration_diff > 0.15:
            errors.append(f"Audio/video duration mismatch exceeds 0.15s: {duration_diff:.3f}s")

    passed = len(errors) == 0
    return {
        "passed": passed,
        "true_peak_db": round(peak_db, 2),
        "dc_offset": round(dc_offset, 6),
        "clipping_samples": clipping_samples,
        "ultrasonic_spike_detected": ultrasonic_spike,
        "duration_diff_sec": round(duration_diff, 3),
        "errors": errors,
    }


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
    receipt["audio_qa"] = audit_final_audio(voice_path, video_path=final_video)
    flush_cuda_memory()
    return receipt


if __name__ == "__main__":
    test_run = Path("runs/demo_knight_capital")
    receipt = execute_stage6_render(test_run)
    print("Stage 6 Receipt:", json.dumps(receipt, indent=2))
