import unittest
from pipeline.stage5_compile import (
    CHOREOGRAPHY_TEMPLATES,
    ACCENT_CYCLE,
    verify_choreography_and_anti_repetition,
)


class TestChoreography(unittest.TestCase):

    def test_choreography_covers_all_10_master_templates(self):
        all_10_templates = {
            "ForensicDocument",
            "SystemBlueprint",
            "TerminalReplay",
            "ArchivalFootage",
            "NetworkTopology",
            "CommsIntercept",
            "MarketCrashChart",
            "ChronoTickingClock",
            "GeoIpTraceMap",
            "SplitAutopsy",
        }
        used_templates = set(CHOREOGRAPHY_TEMPLATES)
        for t in all_10_templates:
            self.assertIn(t, used_templates, f"Template {t} must be utilized in choreography")

    def test_choreography_zero_consecutive_duplicates(self):
        dummy_scenes = [{"template": t, "actNumber": (i // 4) + 1} for i, t in enumerate(CHOREOGRAPHY_TEMPLATES)]
        is_valid, errors = verify_choreography_and_anti_repetition(dummy_scenes)
        self.assertTrue(is_valid, f"Choreography failed anti-repetition check: {errors}")

    def test_accent_rotation_no_consecutive_identical_colors(self):
        accents = [ACCENT_CYCLE[i % len(ACCENT_CYCLE)] for i in range(24)]
        for i in range(1, len(accents)):
            self.assertNotEqual(accents[i], accents[i - 1], f"Consecutive scenes {i-1} and {i} share accent {accents[i]}")


if __name__ == "__main__":
    unittest.main()
