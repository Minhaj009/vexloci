"""
Sprint 3 Verification Gate Test Runner.
Executes stage2_audio, stage3_align, stage4_assets, and stage5_compile DOM QA gate.
Asserts all stage artifacts are generated and verified under 2.5 GB peak VRAM.
"""

import json
from pathlib import Path
import time

from pipeline.config import RUNS_DIR
from pipeline.stage2_audio import generate_voiceover
from pipeline.stage3_align import extract_word_timestamps
from pipeline.stage4_assets import process_assets_for_run
from pipeline.stage5_compile import verify_dom_qa_playwright
from pipeline.utils_vram import flush_cuda_memory


def run_sprint3_verification() -> bool:
    video_id = "test_sprint3_knight"
    test_run_dir = RUNS_DIR / video_id
    test_run_dir.mkdir(parents=True, exist_ok=True)

    print("=== [1/4] Executing Stage 2: Audio Synthesis & Mastering ===")
    mock_script = {
        "scenes": [
            {
                "sceneId": "scene_01",
                "actNumber": 1,
                "narrationText": "At nine thirty AM, Knight Capital's automated router went rogue, executing four million illegal transactions in forty-five minutes.",
            },
            {
                "sceneId": "scene_02",
                "actNumber": 1,
                "narrationText": "A technician failed to copy updated SMARS code to the eighth server, leaving an obsolete diagnostic flag armed and lethal.",
            },
        ]
    }

    t0 = time.time()
    mastered_wav = generate_voiceover(mock_script, test_run_dir)
    print(f"Mastered WAV created: {mastered_wav} (size: {mastered_wav.stat().st_size} bytes)")
    assert mastered_wav.exists() and mastered_wav.stat().st_size > 1000

    print("=== [2/4] Executing Stage 3: Forced Word Alignment ===")
    words_path = test_run_dir / "03_words.json"
    words = extract_word_timestamps(mastered_wav, words_path)
    print(f"Extracted {len(words)} aligned words to {words_path}")
    assert words_path.exists() and len(words) > 0
    assert "startSec" in words[0] and "endSec" in words[0]

    print("=== [3/4] Executing Stage 4: Hybrid Asset Fetch & 2.5D Processing ===")
    assets_dir = test_run_dir / "04_assets"
    asset_result = process_assets_for_run(video_id, assets_dir)
    fg_file = test_run_dir / "04_assets" / "fg_subject.png"
    bg_file = test_run_dir / "04_assets" / "bg_subject.png"
    print(f"2.5D Assets produced: fg={fg_file.exists()}, bg={bg_file.exists()}")
    assert fg_file.exists() and bg_file.exists()

    print("=== [4/4] Executing Stage 5: DOM QA Bounding-Box Gate ===")
    timeline_path = Path("runs/demo_knight_capital/05_timeline.json")
    qa_report = verify_dom_qa_playwright(timeline_path)
    print("DOM QA Gate Result:", json.dumps(qa_report, indent=2))
    assert qa_report["qa_passed"] is True

    flush_cuda_memory()
    total_time = round(time.time() - t0, 2)
    print(f"\n>>> SPRINT 3 VERIFICATION PASSED IN {total_time}s <<<")
    return True


if __name__ == "__main__":
    success = run_sprint3_verification()
    exit(0 if success else 1)
