"""
Centralized Configuration for Vexloci Video Engine.
Defines paths, tokens, vocal mastering parameters, and hardware safety budgets.
"""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output"
RUNS_DIR = PROJECT_ROOT / "runs"
ASSETS_DIR = PROJECT_ROOT / "assets"
PUBLIC_DIR = PROJECT_ROOT / "public"
SFX_DIR = ASSETS_DIR / "sfx"
MUSIC_DIR = ASSETS_DIR / "music"
LUTS_DIR = ASSETS_DIR / "luts"

CANVAS_WIDTH = 1920
CANVAS_HEIGHT = 1080
CANVAS_FPS = 30
SAFE_ZONE_X = 96
SAFE_ZONE_Y = 72

DESIGN_TOKENS = {
    "bg_canvas": "#080A0F",
    "bg_surface": "#11151F",
    "border_grid": "#1E2536",
    "text_primary": "#F1F5F9",
    "text_muted": "#94A3B8",
    "accent_cyan": "#00F5D4",
    "accent_amber": "#F59E0B",
    "accent_crimson": "#FF2A54",
}

VOICE_ENGINE: str = "edge-tts"

EDGE_TTS_CONFIG = {
    "voice": "en-US-ChristopherNeural",
    "rate": "+3%",
    "pitch": "-1Hz",
}

ENABLE_SFX: bool = False

VOICE_CONFIG = {
    "model": "kokoro-v0_19.onnx",
    "blend": {"am_adam": 0.70, "bm_george": 0.30},
    "speed_multipliers": {
        "hook": 0.96,
        "technical": 0.94,
        "reveal": 0.92,
        "default": 0.94,
    },
    "silence_buffers_ms": {
        "sentence": 0,
        "scene": 180,
        "act": 280,
    },
    "mastering": {
        "highpass_hz": 75,
        "eq_low_gain_db": 1.5,
        "eq_high_gain_db": -2.0,
        "compressor_threshold_db": -16,
        "compressor_ratio": 2.5,
        "target_lufs": -14.0,
        "true_peak_db": -1.5,
        "lra": 9.0,
    },
}

WHISPER_CONFIG = {
    "model_size": "small.en",
    "compute_type": "int8",
    "beam_size": 5,
}

HARDWARE_SAFETY = {
    "max_vram_gb": 6.0,
    "cuda_flush_after_stage": True,
}
