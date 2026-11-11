import hashlib
from io import BytesIO
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

from pipeline.beat_director import compile_scene_visual_beats
from pipeline.dossier_parser import parse_dossier_for_episode
from pipeline.stage4_assets import create_dark_forensic_plate, fetch_copyright_free_images
from pipeline.stage5_compile import compile_timeline
from pipeline.universal_script_compiler import _truncate_clean, compile_forensic_script
from pipeline.youtube_metadata import derive_topic_entities, generate_short_thumbnail_prompts


def _make_png_bytes(rgb: tuple[int, int, int], width: int = 1280, height: int = 720) -> bytes:
    img = Image.new("RGB", (width, height), color=rgb)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestHudCleanlinessAndAssetUniqueness(unittest.TestCase):
    def test_kinetic_hud_has_no_corner_timers_or_scene_debug_text(self):
        hud_path = Path(__file__).resolve().parent.parent / "src/components/director/KineticHUDOverlay.tsx"
        src = hud_path.read_text(encoding="utf-8")
        for forbidden in (
            "formatTimecode",
            "formatClock",
            "SCENE_",
            "BEAT ",
            "ACT {scene.actNumber}",
            "totalBeats > 1",
            "Array.from({ length: totalBeats })",
            "beatList.map",
        ):
            self.assertNotIn(forbidden, src, f"Forbidden debug HUD pattern '{forbidden}' found in KineticHUDOverlay.tsx")

    def test_script_compiler_generates_diverse_non_generic_media_queries(self):
        dossier = parse_dossier_for_episode("bitfinex_bitcoin_hack")
        script = compile_forensic_script(dossier, video_id="bitfinex_bitcoin_hack")
        queries = script.get("mediaSearchQueries", [])
        self.assertGreaterEqual(len(queries), 10, f"Expected >= 10 media queries, got {len(queries)}: {queries}")
        lowered = [q.lower() for q in queries]
        self.assertEqual(len(set(lowered)), len(lowered), f"Duplicate queries found: {queries}")
        for banned in ("adversary syndicate", "threat actor group", "target enterprise"):
            self.assertFalse(
                any(banned in q for q in lowered),
                f"Generic placeholder '{banned}' leaked into mediaSearchQueries: {queries}",
            )

    def test_fetch_copyright_free_images_rejects_duplicate_bytes_and_urls(self):
        dup_bytes = _make_png_bytes((40, 80, 120))
        unique_a = _make_png_bytes((120, 60, 30))
        unique_b = _make_png_bytes((30, 130, 90))
        unique_c = _make_png_bytes((90, 50, 140))

        tmp_dir = Path(tempfile.mkdtemp(prefix="vexloci_dup_test_"))
        try:
            class FakeResp:
                def __init__(self, status_code=200, json_data=None, content=b"", headers=None):
                    self.status_code = status_code
                    self._json = json_data or {}
                    self.content = content
                    self.headers = headers or {"Content-Type": "image/png"}

                def json(self):
                    return self._json

            call_counter = {"n": 0}

            def fake_get(url, params=None, headers=None, timeout=10):
                if "api.php" in url:
                    q = (params or {}).get("gsrsearch", "")
                    if "query_dup" in q:
                        return FakeResp(json_data={
                            "query": {"pages": {
                                "1": {"index": 0, "title": "File:Dup.jpg", "imageinfo": [{"url": "https://upload.wikimedia.org/dup.jpg", "width": 1280, "height": 720, "mime": "image/jpeg"}]},
                                "2": {"index": 1, "title": "File:UniqueA.jpg", "imageinfo": [{"url": "https://upload.wikimedia.org/unique_a.jpg", "width": 1280, "height": 720, "mime": "image/jpeg"}]},
                            }}
                        })
                    call_counter["n"] += 1
                    idx = call_counter["n"]
                    cand = {
                        1: ("https://upload.wikimedia.org/unique_b.jpg", "File:UniqueB.jpg"),
                        2: ("https://upload.wikimedia.org/unique_c.jpg", "File:UniqueC.jpg"),
                    }.get(idx, (f"https://upload.wikimedia.org/fallback_{idx}.jpg", f"File:Fallback_{idx}.jpg"))
                    return FakeResp(json_data={
                        "query": {"pages": {
                            "10": {"index": 0, "title": cand[1], "imageinfo": [{"url": cand[0], "width": 1280, "height": 720, "mime": "image/jpeg"}]}
                        }}
                    })
                if "dup.jpg" in url:
                    return FakeResp(content=dup_bytes)
                if "unique_a.jpg" in url:
                    return FakeResp(content=unique_a)
                if "unique_b.jpg" in url:
                    return FakeResp(content=unique_b)
                if "unique_c.jpg" in url:
                    return FakeResp(content=unique_c)
                return FakeResp(content=_make_png_bytes((20, 40, (hash(url) % 150) + 60)))

            with patch("pipeline.stage4_assets.requests.get", side_effect=fake_get):
                images = fetch_copyright_free_images(
                    ["query_dup_1", "query_dup_2", "query_other_3"],
                    tmp_dir,
                )

            self.assertGreaterEqual(len(images), 3)
            hashes = [hashlib.sha256(p.read_bytes()).hexdigest() for p in images]
            self.assertEqual(len(set(hashes)), len(hashes), "Duplicate image hashes detected in fetched assets!")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_youtube_metadata_does_not_confuse_bitfinex_with_mt_gox(self):
        topic = "The 2016 Bitfinex 120,000 Bitcoin Hack ($4.5B Seizure)"
        entities = derive_topic_entities(topic, {})
        self.assertNotIn("Mt. Gox", entities["primary_entity"])
        self.assertNotIn("850,000", entities["dollar_metric"])
        shorts = generate_short_thumbnail_prompts(topic, entities)
        self.assertNotIn("ONE TYPO HALTED", shorts["short_01"]["title"])
        self.assertNotIn("$81M STOLEN", shorts["short_03"]["title"])

    def test_dossier_parser_matches_lichtenstein_and_morgan(self):
        dossier = parse_dossier_for_episode("bitfinex_bitcoin_hack")
        self.assertIn("Lichtenstein", dossier.perpetrator_adversary)
        self.assertNotEqual(dossier.perpetrator_adversary, "Adversary Syndicate")

        from pipeline.dossier_parser import parse_dossier_file

        tmp_dir = Path(tempfile.mkdtemp(prefix="vexloci_perp_test_"))
        try:
            md_full = tmp_dir / "full.md"
            md_full.write_text(
                "# Research Dossier: Laundering Case\nHeather Rhiannon Morgan laundered funds.",
                encoding="utf-8",
            )
            self.assertEqual(parse_dossier_file(md_full).perpetrator_adversary, "Heather Rhiannon Morgan")

            md_short = tmp_dir / "short.md"
            md_short.write_text(
                "# Research Dossier: Laundering Case\nHeather Morgan laundered funds.",
                encoding="utf-8",
            )
            self.assertEqual(parse_dossier_file(md_short).perpetrator_adversary, "Heather Morgan")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_truncate_clean_preserves_word_and_number_boundaries(self):
        self.assertEqual(
            _truncate_clean("Department of Justice Unsealed Indictment Exhibit 1", 40),
            "Department of Justice Unsealed",
        )
        self.assertEqual(_truncate_clean("draining 119,756 BTC from wallets", 14), "draining")
        self.assertEqual(_truncate_clean("Bitfinex Exchange", 8), "Bitfinex")

    def test_beat_director_cycles_all_broll_and_caps_cutaway_broll(self):
        assets = {
            "videos": [f"runs/cycle_test/assets/broll_archival_{i}.mp4" for i in range(10)],
            "images": [f"runs/cycle_test/assets/archival_img_{i}.png" for i in range(10)],
            "durations": {f"runs/cycle_test/assets/broll_archival_{i}.mp4": 18.0 for i in range(10)},
        }
        narration = (
            "Engineers checked telemetry monitors across the network. "
            "Backup operators inspected isolated gateways during triage. "
            "Auditors traced encrypted packets across relay nodes. "
            "Investigators reviewed system logs after emergency isolation. "
            "Regional hubs remained offline pending verification."
        )
        beats = compile_scene_visual_beats(
            scene_id="scene_05",
            template="SystemBlueprint",
            narration_text=narration,
            words=[],
            scene_duration_sec=32.0,
            available_assets=assets,
            props={"blocks": [{"id": f"b{i}", "title": f"B{i}", "subtitle": "S"} for i in range(4)]},
            broll_offset=4,
        )
        broll_beats = [b for b in beats if b["beatType"] == "CUTAWAY_BROLL"]
        self.assertLessEqual(len(broll_beats), 1)
        if broll_beats:
            self.assertEqual(broll_beats[0]["cutawayBroll"]["mediaPath"], "runs/cycle_test/assets/broll_archival_4.mp4")

    def test_seeded_dark_forensic_plates_are_distinct(self):
        hashes = {hashlib.sha256(create_dark_forensic_plate(1920, 1080, seed=i).tobytes()).hexdigest() for i in range(6)}
        self.assertEqual(len(hashes), 6)

    def test_youtube_metadata_entities_coverage(self):
        cases = {
            "FTX & Alameda Collapse": "FTX",
            "Stuxnet Operation Olympic Games": "Natanz",
            "NotPetya Maersk Wiper": "NotPetya",
            "Terra Luna Death Spiral": "TerraUSD",
            "Enron Raptor SPE Fraud": "Enron",
            "Theranos Edison Fraud": "Theranos",
            "SolarWinds Sunburst Hack": "SolarWinds",
            "SVB $42B Bank Run": "Silicon Valley Bank",
            "Lehman Repo 105 Collapse": "Lehman Brothers",
            "Mt. Gox 850,000 Bitcoin": "Mt. Gox",
        }
        for topic, expected in cases.items():
            ent = derive_topic_entities(topic, {})
            self.assertIn(expected, ent["primary_entity"])


if __name__ == "__main__":
    unittest.main()
