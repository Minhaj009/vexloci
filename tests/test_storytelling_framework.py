import tempfile
import unittest
from pathlib import Path

from pipeline.stage1_research import (
    generate_bangladesh_bank_script,
    generate_knight_capital_script,
    generate_wirecard_script,
    generate_mt_gox_script,
    generate_generic_niche_script,
    compile_research_and_script,
)
from pipeline.storytelling_engine import (
    NarrativeContractValidator,
    NarrativeBeatEnum,
    TransitionCausalityEnum,
    inject_storytelling_contracts,
)


class TestStorytellingFramework(unittest.TestCase):
    def test_all_built_in_scripts_pass_narrative_validation(self):
        generators = [
            ("Bangladesh Bank", generate_bangladesh_bank_script("Bangladesh Bank SWIFT Heist", "bb_01")),
            ("Knight Capital", generate_knight_capital_script("Knight Capital Glitch", "kc_01")),
            ("Wirecard", generate_wirecard_script("Wirecard Collapse", "wc_01")),
            ("Mt Gox", generate_mt_gox_script("Mt Gox Bitcoin Drain", "mg_01")),
            ("Generic Niche", generate_generic_niche_script("Colonial Pipeline Ransomware", "cp_01")),
        ]

        for name, script in generators:
            is_valid, errors = NarrativeContractValidator.validate_script(script)
            self.assertTrue(is_valid, f"{name} failed narrative validation: {errors}")
            self.assertEqual(len(errors), 0)
            self.assertEqual(len(script["scenes"]), 24)

    def test_rule_1_hook_law_enforced(self):
        script = generate_generic_niche_script("Test Anomaly", "test_01")
        # Break rule 1: Change beat of Scene 1 to a non-hook beat
        script["scenes"][0]["evidenceMetadata"]["narrative"]["beat"] = NarrativeBeatEnum.SYSTEMIC_CATHARSIS.value
        is_valid, errors = NarrativeContractValidator.validate_script(script)
        self.assertFalse(is_valid)
        self.assertTrue(any("COLD_OPEN_HOOK" in err for err in errors))

    def test_rule_2_causal_transition_law_enforced(self):
        script = generate_generic_niche_script("Test Anomaly", "test_02")
        # Break rule 2: Introduce an invalid 'AND THEN' / non-causal transition in Scene 3
        script["scenes"][2]["evidenceMetadata"]["narrative"]["causalTransition"] = "AND_THEN"
        is_valid, errors = NarrativeContractValidator.validate_script(script)
        self.assertFalse(is_valid)
        self.assertTrue(any("non-causal transition" in err for err in errors))

    def test_rule_3_active_open_loops_invariant(self):
        script = generate_generic_niche_script("Test Anomaly", "test_03")
        # Break rule 3: Prematurely close all open loops at scene 5
        script["scenes"][4]["evidenceMetadata"]["narrative"]["openLoop"] = {
            "loopId": "loop_master_mystery",
            "question": "Premature closure.",
            "action": "RESOLVE",
        }
        is_valid, errors = NarrativeContractValidator.validate_script(script)
        self.assertFalse(is_valid)
        self.assertTrue(any("dropped active open loops to 0" in err for err in errors))

    def test_rule_4_stakes_tension_curve(self):
        script = generate_generic_niche_script("Test Anomaly", "test_04")
        # Break rule 4: Flatten tension scores so Act 5 peak never reaches 90%
        for s in script["scenes"]:
            s["evidenceMetadata"]["narrative"]["tensionScore"] = 50.0
        is_valid, errors = NarrativeContractValidator.validate_script(script)
        self.assertFalse(is_valid)
        self.assertTrue(any("peak tension" in err for err in errors))

    def test_compile_research_and_script_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            script_path = compile_research_and_script(
                topic="FTX and Alameda Backdoor",
                video_id="ftx_01",
                output_dir=tmp_path,
            )
            self.assertTrue(script_path.exists())
            import json
            with open(script_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.assertEqual(len(data["scenes"]), 24)
            is_valid, errors = NarrativeContractValidator.validate_script(data)
            self.assertTrue(is_valid, f"Compiled script failed validation: {errors}")

    def test_archival_footage_distributed_across_acts(self):
        script = generate_bangladesh_bank_script("Bangladesh Bank SWIFT Heist", "bb_01")
        archival_acts = {s["actNumber"] for s in script["scenes"] if s["template"] == "ArchivalFootage"}
        self.assertTrue(len(archival_acts) >= 4, f"Archival footage only present in acts: {archival_acts}")

    def test_film_grain_processing(self):
        from pipeline.stage4_assets import apply_film_grain
        import numpy as np
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        grained = apply_film_grain(test_img, strength=0.05)
        self.assertEqual(grained.shape, (100, 100, 3))
        self.assertGreater(float(np.mean(grained)), 0.0)


if __name__ == "__main__":
    unittest.main()
