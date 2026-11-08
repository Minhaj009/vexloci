"""
Procedural Audio Synthesizer for Vexloci Video Engine.
Generates 8 tactile micro-SFX WAVs and a seamless 60-second dark-forensic
ambient synth score loop using numpy and scipy.signal.
"""

import sys
from pathlib import Path
if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from scipy.io import wavfile
from scipy import signal

from pipeline.config import SFX_DIR, MUSIC_DIR


SAMPLE_RATE = 48000


def _save_wav_mono(path: Path, data: np.ndarray):
    data = np.clip(data, -0.98, 0.98)
    pcm = (data * 32767).astype(np.int16)
    wavfile.write(str(path), SAMPLE_RATE, pcm)


def _save_wav_stereo(path: Path, left: np.ndarray, right: np.ndarray):
    left = np.clip(left, -0.98, 0.98)
    right = np.clip(right, -0.98, 0.98)
    stereo = np.column_stack((left, right))
    pcm = (stereo * 32767).astype(np.int16)
    wavfile.write(str(path), SAMPLE_RATE, pcm)


def generate_ui_tick(path: Path):
    duration = 0.025
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    freq = 1000.0
    decay = np.exp(-t / 0.003)
    tone = np.sin(2 * np.pi * freq * t) * decay
    noise = np.random.uniform(-0.2, 0.2, len(t)) * np.exp(-t / 0.002)
    out = (tone * 0.5 + noise * 0.5)
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.45)


def generate_keystroke_burst(path: Path):
    duration = 0.09
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    click1 = np.sin(2 * np.pi * 920.0 * t) * np.exp(-t / 0.012)
    click2 = np.sin(2 * np.pi * 2600.0 * t) * np.exp(-t / 0.008)
    noise = np.random.uniform(-0.4, 0.4, len(t)) * np.exp(-t / 0.018)
    out = click1 * 0.45 + click2 * 0.35 + noise * 0.2
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.8)


def generate_soft_whoosh(path: Path):
    duration = 0.42
    n_samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    raw_noise = np.random.uniform(-1.0, 1.0, n_samples)

    nyq = 0.5 * SAMPLE_RATE
    b, a = signal.butter(3, [200.0 / nyq, 1100.0 / nyq], btype="band")
    filtered = signal.filtfilt(b, a, raw_noise)

    envelope = signal.windows.hann(n_samples) ** 1.8
    out = filtered * envelope
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.7)


def generate_sub_bass_drop(path: Path):
    duration = 0.85
    n_samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)

    f_start = 98.0
    f_end = 34.0
    freq = f_start * (f_end / f_start) ** (t / duration)
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE

    sub = np.sin(phase)
    harm2 = np.sin(2 * phase) * 0.18
    env = np.exp(-t / 0.35)
    out = np.tanh((sub + harm2) * 1.4) * env
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.85)


def generate_paper_slide(path: Path):
    duration = 0.32
    n_samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    noise = np.random.uniform(-1.0, 1.0, n_samples)

    nyq = 0.5 * SAMPLE_RATE
    b, a = signal.butter(2, [800.0 / nyq, 3800.0 / nyq], btype="band")
    filtered = signal.filtfilt(b, a, noise)

    attack_samples = int(0.06 * SAMPLE_RATE)
    decay_samples = n_samples - attack_samples
    attack = np.linspace(0, 1, attack_samples)
    decay = np.exp(-np.linspace(0, 3.5, decay_samples))
    envelope = np.concatenate((attack, decay))

    out = filtered * envelope
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.65)


def generate_highlighter_sweep(path: Path):
    duration = 0.32
    n_samples = int(SAMPLE_RATE * duration)
    noise = np.random.uniform(-1.0, 1.0, n_samples)
    nyq = 0.5 * SAMPLE_RATE
    b, a = signal.butter(2, [800.0 / nyq, 2200.0 / nyq], btype="band")
    filtered = signal.filtfilt(b, a, noise)
    envelope = signal.windows.hann(n_samples) ** 1.5
    out = filtered * envelope
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.55)


def generate_radar_ping(path: Path):
    duration = 0.45
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    freq = 980.0
    overtone = 1960.0
    env = np.exp(-t / 0.12)
    tone = np.sin(2 * np.pi * freq * t) + 0.05 * np.sin(2 * np.pi * overtone * t)
    out = tone * env
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.40)


def generate_stamp_slam(path: Path):
    duration = 0.45
    n_samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)

    thud = np.sin(2 * np.pi * 54.0 * t) * np.exp(-t / 0.08)
    slap = np.sin(2 * np.pi * 210.0 * t) * np.exp(-t / 0.025)
    noise = np.random.uniform(-0.6, 0.6, n_samples) * np.exp(-t / 0.015)
    out = np.tanh(thud * 1.8 + slap * 0.8 + noise * 0.4)
    _save_wav_mono(path, out / (np.max(np.abs(out)) + 1e-6) * 0.9)


def generate_all_sfx(sfx_dir: Path = SFX_DIR):
    sfx_dir.mkdir(parents=True, exist_ok=True)
    generators = {
        "ui_tick.wav": generate_ui_tick,
        "keystroke_burst.wav": generate_keystroke_burst,
        "soft_whoosh.wav": generate_soft_whoosh,
        "sub_bass_drop.wav": generate_sub_bass_drop,
        "paper_slide.wav": generate_paper_slide,
        "highlighter_sweep.wav": generate_highlighter_sweep,
        "radar_ping.wav": generate_radar_ping,
        "stamp_slam.wav": generate_stamp_slam,
    }

    created = []
    for filename, fn in generators.items():
        out_path = sfx_dir / filename
        fn(out_path)
        created.append(out_path)
    return created


def generate_dark_synth_score(output_path: Path = MUSIC_DIR / "bg_music_loop.wav", duration_sec: float = 60.0):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    n_samples = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)

    # D minor tonic: D2 (73.42Hz), A2 (110.0Hz), F3 (174.61Hz), D3 (146.83Hz)
    chord_freqs = [73.42, 110.0, 146.83, 174.61]

    left = np.zeros(n_samples)
    right = np.zeros(n_samples)

    # Layer detuned analog saw/sine oscillators
    for f in chord_freqs:
        detune_l = f * (2.0 ** (-5.0 / 1200.0))
        detune_r = f * (2.0 ** (5.0 / 1200.0))

        # Sine fundamental
        left += 0.35 * np.sin(2 * np.pi * detune_l * t)
        right += 0.35 * np.sin(2 * np.pi * detune_r * t)

        # Warm 2nd harmonic
        left += 0.18 * np.sin(4 * np.pi * detune_l * t + 0.3)
        right += 0.18 * np.sin(4 * np.pi * detune_r * t - 0.3)

    # Slow breathing LFO (0.08 Hz = ~12.5s cycle)
    lfo_swell = 0.72 + 0.28 * np.sin(2 * np.pi * 0.08 * t)

    # Subtle 60 BPM tension pulse (1.0 Hz)
    pulse = 0.88 + 0.12 * (np.sin(2 * np.pi * 1.0 * t) ** 4)

    left *= lfo_swell * pulse
    right *= lfo_swell * pulse

    # Low-pass filter at 320 Hz to leave vocal spectrum clear
    nyq = 0.5 * SAMPLE_RATE
    b, a = signal.butter(3, 320.0 / nyq, btype="low")
    left_filt = signal.filtfilt(b, a, left)
    right_filt = signal.filtfilt(b, a, right)

    # Ensure seamless loop via 2-second cosine crossfade
    fade_len = int(2.0 * SAMPLE_RATE)
    fade_in = 0.5 * (1.0 - np.cos(np.linspace(0, np.pi, fade_len)))
    fade_out = 1.0 - fade_in

    left_loop = left_filt.copy()
    right_loop = right_filt.copy()

    left_loop[:fade_len] = left_filt[:fade_len] * fade_in + left_filt[-fade_len:] * fade_out
    right_loop[:fade_len] = right_filt[:fade_len] * fade_in + right_filt[-fade_len:] * fade_out
    left_loop[-fade_len:] = left_loop[:fade_len]
    right_loop[-fade_len:] = right_loop[:fade_len]

    # Normalize to -18 dBFS peak
    max_val = max(np.max(np.abs(left_loop)), np.max(np.abs(right_loop))) + 1e-6
    target_peak = 0.45
    left_final = (left_loop / max_val) * target_peak
    right_final = (right_loop / max_val) * target_peak

    _save_wav_stereo(output_path, left_final, right_final)
    return output_path


if __name__ == "__main__":
    sfx = generate_all_sfx()
    print(f"Generated {len(sfx)} procedural SFX files.")
    music = generate_dark_synth_score()
    print(f"Generated procedural background score: {music}")
