import json
from pathlib import Path
import tempfile
import unittest

from pipeline.dossier_parser import (
    ForensicDossier,
    parse_dossier_file,
    parse_dossier_for_episode,
    fetch_autonomous_research,
)
from pipeline.universal_script_compiler import compile_forensic_script
from pipeline.storytelling_engine import NarrativeContractValidator
from pipeline.stage1_research import compile_research_and_script


class TestUniversalCompiler(unittest.TestCase):

    def test_parse_dossier_colonial_pipeline(self):
        dossier = parse_dossier_for_episode("02_colonial_pipeline_crisis")
        self.assertIsInstance(dossier, ForensicDossier)
        self.assertIn("Colonial Pipeline", dossier.title)
        self.assertTrue(len(dossier.technical_vector) > 5)
        self.assertTrue(len(dossier.financial_damage) > 0)
        self.assertTrue(len(dossier.chronological_milestones) >= 4)

    def test_autonomous_research_fallback(self):
        dossier = fetch_autonomous_research("2024 Change Healthcare Ransomware Attack")
        self.assertIsInstance(dossier, ForensicDossier)
        self.assertTrue(len(dossier.title) > 0)
        self.assertTrue(len(dossier.executive_summary) > 0)
        self.assertEqual(len(dossier.chronological_milestones), 4)

    def test_compile_forensic_script_24_scenes(self):
        dossier = parse_dossier_for_episode("02_colonial_pipeline_crisis")
        script = compile_forensic_script(dossier)

        self.assertEqual(len(script["scenes"]), 24)
        self.assertEqual(script["totalActs"], 6)

        is_valid, errors = NarrativeContractValidator.validate_script(script)
        self.assertTrue(is_valid, f"Universal script failed narrative validation: {errors}")

        for s in script["scenes"]:
            text = s["narrationText"]
            self.assertNotIn("{clean_title}", text)
            self.assertNotIn("{metric_str}", text)
            self.assertNotIn("{", text)

    def test_stage1_compile_research_and_script_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            out_path = compile_research_and_script(
                topic="The 2021 Colonial Pipeline DarkSide Ransomware Crisis",
                video_id="colonial_pipeline_crisis",
                output_dir=tmp_path,
            )
            self.assertTrue(out_path.exists())
            with open(out_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.assertEqual(len(data["scenes"]), 24)
            is_valid, errors = NarrativeContractValidator.validate_script(data)
            self.assertTrue(is_valid, f"Validation failed: {errors}")


if __name__ == "__main__":
    unittest.main()
