"""
Unit tests for Subtitles, YouTube Metadata, and Shorts packaging logic.
"""

import json
from pathlib import Path
import tempfile
import unittest

from pipeline.stage7_shorts import select_peak_short_scenes
from pipeline.subtitles import (
    format_timestamp_srt,
    format_timestamp_vtt,
    group_words_into_cues,
    generate_subtitles_from_words,
    slice_subtitles_for_range,
)
from pipeline.youtube_metadata import generate_youtube_metadata


class TestSubtitlesAndMetadata(unittest.TestCase):

    def test_timestamp_formatting(self):
        # 1 hour, 2 minutes, 3 seconds, 456 milliseconds
        sec = 3600 + 120 + 3.456
        srt_ts = format_timestamp_srt(sec)
        vtt_ts = format_timestamp_vtt(sec)
        self.assertEqual(srt_ts, "01:02:03,456")
        self.assertEqual(vtt_ts, "01:02:03.456")

    def test_group_words_into_cues(self):
        words = [
            {"word": "In", "startSec": 0.0, "endSec": 0.2},
            {"word": "2012,", "startSec": 0.2, "endSec": 0.6},
            {"word": "Knight", "startSec": 0.6, "endSec": 0.9},
            {"word": "Capital", "startSec": 0.9, "endSec": 1.4},
            {"word": "collapsed.", "startSec": 1.4, "endSec": 2.1},
        ]
        cues = group_words_into_cues(words, max_words=3, max_chars=30)
        self.assertGreaterEqual(len(cues), 2)
        self.assertEqual(cues[0]["text"], "In 2012, Knight")
        self.assertEqual(cues[1]["text"], "Capital collapsed.")

    def test_youtube_metadata_generation(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir)
            topic = "The 2012 Knight Capital Trading Glitch"
            mock_script = {
                "scenes": [
                    {"sceneId": "s1", "actNumber": 1, "narrationText": "At 9:30 AM trading opened."},
                    {"sceneId": "s2", "actNumber": 3, "narrationText": "The algorithm went rogue."},
                ]
            }
            mock_timeline = {
                "totalDurationSec": 58.6,
                "scenes": [
                    {"chapterTitle": "The Opening Bell", "startTimeSec": 0.0},
                    {"chapterTitle": "The Algorithmic Failure", "startTimeSec": 25.4},
                ]
            }

            meta = generate_youtube_metadata(topic, mock_script, mock_timeline, out_dir)
            self.assertTrue(meta["json_path"].exists())
            self.assertTrue(meta["txt_path"].exists())

            # Verify contents
            with open(meta["json_path"], "r", encoding="utf-8") as f:
                data = json.load(f)

            self.assertIn("titles", data)
            self.assertEqual(len(data["titles"]), 3)
            self.assertIn("nanobanaPrompt_16_9", data)
            self.assertIn("nanobanaPrompt_9_16", data)
            self.assertIn("--ar 16:9", data["nanobanaPrompt_16_9"])
            self.assertIn("--ar 9:16", data["nanobanaPrompt_9_16"])

            with open(meta["txt_path"], "r", encoding="utf-8") as f:
                text_content = f.read()

            self.assertIn("NANOBANA 2 PRO", text_content)
            self.assertIn("RECOMMENDED TITLES", text_content)
            self.assertIn("TIMESTAMPS:", text_content)
            self.assertIn("0:00 - The Opening Bell", text_content)

    def test_select_peak_short_scenes(self):
        scenes = [
            {"sceneId": "s1", "template": "ForensicDocument", "chapterTitle": "Hook", "durationSec": 15.0},
            {"sceneId": "s2", "template": "EvidenceCard", "chapterTitle": "Context", "durationSec": 20.0},
            {"sceneId": "s3", "template": "MarketCrashChart", "chapterTitle": "Crash", "durationSec": 22.0},
            {"sceneId": "s4", "template": "SplitAutopsy", "chapterTitle": "Autopsy", "durationSec": 18.0},
        ]
        selected = select_peak_short_scenes(scenes)
        self.assertLessEqual(len(selected), 3)
        self.assertGreaterEqual(len(selected), 1)

    def test_build_short_packages_duration_between_30_and_60_seconds(self):
        from pipeline.stage7_shorts import build_short_packages
        scenes = [
            {"sceneId": f"s{i}", "template": "ForensicDocument", "chapterTitle": f"Scene {i}", "durationSec": 18.0, "startTimeSec": i * 18.0}
            for i in range(24)
        ]
        packages = build_short_packages(scenes)
        self.assertEqual(len(packages), 3)
        for pkg in packages:
            self.assertGreater(pkg["durationSec"], 30.0, f"Short {pkg['packageId']} must be > 30s")
            self.assertLessEqual(pkg["durationSec"], 60.0, f"Short {pkg['packageId']} must be <= 60s")


if __name__ == "__main__":
    unittest.main()
