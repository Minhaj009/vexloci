import json
from pathlib import Path
import unittest
import numpy as np
import cv2

from pipeline.dossier_parser import parse_dossier_for_episode
from pipeline.universal_script_compiler import compile_forensic_script
from pipeline.stage2_audio import normalize_narration_for_tts
from pipeline.stage3_align import post_process_word_glossary
from pipeline.stage4_assets import (
    create_dark_forensic_plate,
    apply_dark_forensic_lut,
    generate_sample_article_screenshot,
)
from pipeline.stage5_compile import compile_timeline


class TestForensicPipelineQuality(unittest.TestCase):
    def test_bangladesh_bank_script_quality(self):
        dossier = parse_dossier_for_episode("bangladesh_bank_heist")
        self.assertIn("bangladesh bank", dossier.target_victim.lower())

        script = compile_forensic_script(dossier, mode="broadcast_long_form_8_12m")
        scenes = script["scenes"]
        self.assertEqual(len(scenes), 24)

        total_words = sum(len(s["narrationText"].split()) for s in scenes)
        self.assertGreaterEqual(total_words, 1350, f"Expected >= 1350 words, got {total_words}")

        script_json = json.dumps(script)
        self.assertNotIn("SMARS", script_json)
        self.assertNotIn("kcg-core-ord08", script_json)
        self.assertNotIn("Power Peg", script_json)

        article_scenes = [
            s for s in scenes
            if s.get("props") and s["props"].get("articleImagePath")
        ]
        self.assertGreaterEqual(len(article_scenes), 1, "Expected at least 1 article scene with articleImagePath")
        self.assertTrue(article_scenes[0]["props"]["articleImagePath"].endswith("article_reuters.png"))

        archival_scenes = [s for s in scenes if s["template"] == "ArchivalFootage"]
        self.assertGreaterEqual(len(archival_scenes), 4)
        media_paths = [s["props"]["mediaPath"] for s in archival_scenes]
        self.assertGreater(len(set(media_paths)), 1, "Archival media must rotate across distinct B-roll clips")

    def test_plate_and_lut_luminance_floor(self):
        tmp_plate = Path("runs/test_qc_plate.png")
        tmp_plate.parent.mkdir(parents=True, exist_ok=True)
        try:
            plate = create_dark_forensic_plate(1920, 1080)
            plate.save(tmp_plate)
            apply_dark_forensic_lut(tmp_plate, tmp_plate)

            img = cv2.imread(str(tmp_plate))
            mean_lum = float(np.mean(img))
            self.assertGreaterEqual(mean_lum, 35.0, f"Expected mean luminance >= 35.0, got {mean_lum:.2f}")
        finally:
            if tmp_plate.exists():
                tmp_plate.unlink()

    def test_article_screenshot_generation(self):
        tmp_art = Path("runs/test_qc_article.png")
        tmp_art.parent.mkdir(parents=True, exist_ok=True)
        try:
            generate_sample_article_screenshot(tmp_art)
            self.assertTrue(tmp_art.exists())
            img = cv2.imread(str(tmp_art))
            self.assertEqual(img.shape[0], 800)
            self.assertEqual(img.shape[1], 1400)
            mean_lum = float(np.mean(img))
            self.assertGreaterEqual(mean_lum, 30.0)
        finally:
            if tmp_art.exists():
                tmp_art.unlink()

    def test_normalize_narration_for_tts(self):
        self.assertEqual(
            normalize_narration_for_tts("$81M"),
            "eighty-one million dollars",
        )
        self.assertEqual(
            normalize_narration_for_tts("$951M"),
            "nine-hundred fifty-one million dollars",
        )
        self.assertEqual(
            normalize_narration_for_tts("$20M"),
            "twenty million dollars",
        )
        self.assertEqual(
            normalize_narration_for_tts("$850 million"),
            "eight-hundred fifty million dollars",
        )
        self.assertEqual(
            normalize_narration_for_tts("$10"),
            "ten dollars",
        )
        self.assertEqual(
            normalize_narration_for_tts("35"),
            "thirty-five",
        )
        self.assertEqual(
            normalize_narration_for_tts("101"),
            "one hundred and one",
        )
        self.assertEqual(
            normalize_narration_for_tts("2016"),
            "twenty sixteen",
        )
        self.assertEqual(
            normalize_narration_for_tts("10th"),
            "tenth",
        )
        self.assertEqual(
            normalize_narration_for_tts("RCBC"),
            "R. C. B. C.",
        )
        self.assertEqual(
            normalize_narration_for_tts("SWIFT"),
            "S. W. I. F. T.",
        )
        self.assertEqual(
            normalize_narration_for_tts("OFAC"),
            "O. F. A. C.",
        )
        self.assertEqual(
            normalize_narration_for_tts("NY Fed"),
            "New York Fed",
        )

    def test_subtitle_glossary_post_processing(self):
        words_in = [
            {"word": "Attackers", "startSec": 0.0, "endSec": 0.5},
            {"word": "targeted", "startSec": 0.5, "endSec": 1.0},
            {"word": "Daca,", "startSec": 1.0, "endSec": 1.5},
            {"word": "via", "startSec": 1.5, "endSec": 1.8},
            {"word": "Our", "startSec": 1.8, "endSec": 2.1},
            {"word": "CBC", "startSec": 2.1, "endSec": 2.5},
            {"word": "and", "startSec": 2.5, "endSec": 2.7},
            {"word": "fandation", "startSec": 2.7, "endSec": 3.2},
        ]
        processed = post_process_word_glossary(words_in)
        word_texts = [w["word"] for w in processed]

        self.assertIn("Dhaka,", word_texts)
        self.assertNotIn("Daca,", word_texts)
        self.assertIn("RCBC", word_texts)
        self.assertNotIn("Our", word_texts)
        self.assertNotIn("CBC", word_texts)
        self.assertIn("Fandation", word_texts)
        self.assertNotIn("fandation", word_texts)

        # Also test 4-token spelled out sequence: 'R', '.C', '.B', '.C'
        words_spelled = [
            {"word": "The", "startSec": 10.0, "endSec": 10.2},
            {"word": "R", "startSec": 10.2, "endSec": 10.4},
            {"word": ".C", "startSec": 10.4, "endSec": 10.6},
            {"word": ".B", "startSec": 10.6, "endSec": 10.8},
            {"word": ".C.,", "startSec": 10.8, "endSec": 11.0},
            {"word": "branch", "startSec": 11.0, "endSec": 11.4},
        ]
        processed_spelled = post_process_word_glossary(words_spelled)
        spelled_texts = [w["word"] for w in processed_spelled]
        self.assertIn("RCBC.,", spelled_texts)
        self.assertEqual(len(processed_spelled), 3)


if __name__ == "__main__":
    unittest.main()
