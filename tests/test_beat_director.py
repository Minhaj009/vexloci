import json
from pathlib import Path
import tempfile
import unittest

from pipeline.beat_director import (
    CAMERA_MOTIONS,
    cluster_into_visual_beats,
    compile_scene_visual_beats,
    segment_narration_into_sentences,
)
from pipeline.dossier_parser import fetch_autonomous_research
from pipeline.stage5_compile import (
    compile_timeline,
    verify_choreography_and_anti_repetition,
    verify_dom_qa_playwright,
)
from pipeline.universal_script_compiler import compile_forensic_script


VALID_TRANSITIONS = {"CUT", "DISSOLVE", "WHIP_PAN", "SCANLINE_GLITCH"}
VALID_HIGHLIGHT_MODES = {"spotlight", "pulse_fault", "glow", "reveal_step"}
VALID_ACCENTS = {"cyan", "amber", "crimson"}


def _build_synthetic_words(text: str, start_sec: float = 0.2, word_dur: float = 0.42, gap: float = 0.06):
    words = []
    t = start_sec
    for tok in text.split():
        s = round(t, 2)
        e = round(t + word_dur, 2)
        words.append({"word": tok, "startSec": s, "endSec": e})
        extra_pause = 0.45 if tok.endswith((".", "!", "?", ";")) else (0.18 if tok.endswith(",") else 0.0)
        t = e + gap + extra_pause
    total_dur = round(t + 0.4, 2)
    return words, total_dur


class TestBeatDirector(unittest.TestCase):

    def test_sentence_segmentation_handles_abbreviations_decimals_and_acronyms(self):
        narration = (
            "In 2016, U.S. regulators audited Mr. Braun vs. BitGo over a $4.5B version 2.0 discrepancy. "
            "Losses hit 36.07% across 2,072 accounts after evtdiag.exe modified liboradb.dll! "
            "Did Dr. Chen flag the anomaly? No automated alert fired."
        )
        words, dur = _build_synthetic_words(narration)
        sentences = segment_narration_into_sentences(narration, words, dur)

        self.assertEqual(len(sentences), 4)
        self.assertIn("U.S.", sentences[0]["text"])
        self.assertIn("$4.5B", sentences[0]["text"])
        self.assertIn("2.0", sentences[0]["text"])
        self.assertIn("36.07%", sentences[1]["text"])
        self.assertIn("liboradb.dll!", sentences[1]["text"])

        conserved = [w["word"] for s in sentences for w in s["words"]]
        self.assertEqual(conserved, [w["word"] for w in words])

        for i in range(len(sentences)):
            self.assertLessEqual(sentences[i]["startSec"], sentences[i]["endSec"])
            if i > 0:
                self.assertGreaterEqual(sentences[i]["startSec"], sentences[i - 1]["endSec"])

    def test_zero_midword_splitting_with_whisper_subtokens(self):
        narration = (
            "Ilya Lichtenstein bypassed BitGo 2-of-3 multi-sig velocity limits to drain 119,756 BTC "
            "across 2,072 transactions; IRS-CI and FBI traced a $500 Walmart gift card and decrypted "
            "cloud keys to seize 94,636 BTC ($3.6B/$4.5B) in 2022. "
            "Critical settlement pipelines lacked micro-segmentation across core systems."
        )
        raw_tokens = [
            "Ilya", "Lichtenstein", "bypassed", "BitGo", "2", "of", "3", "multi", "-sig",
            "velocity", "limits", "to", "drain", "119", "756", "BTC", "across", "2,072",
            "transactions;", "IRS-CI", "and", "FBI", "traced", "a", "$500", "Walmart", "gift",
            "card", "and", "decrypted", "cloud", "keys", "to", "seize", "94", "636", "BTC",
            "$3", ".6", "billion", "slash", "$4", ".5", "billion", "in", "2022.",
            "Critical", "settlement", "pipelines", "lacked", "micro", "-segmentation",
            "across", "core", "systems.",
        ]
        words = []
        t = 0.2
        for tok in raw_tokens:
            dur = 0.25 if tok.startswith("-") or tok.startswith(".") else 0.6
            words.append({"word": tok, "startSec": round(t, 2), "endSec": round(t + dur, 2)})
            t += dur + (0.65 if tok.endswith((".", ";")) else 0.05)
        scene_dur = round(t + 0.5, 2)

        sentences = segment_narration_into_sentences(narration, words, scene_dur)
        beats = cluster_into_visual_beats(sentences, words, scene_dur)

        beat_words = [w["word"] for b in beats for w in b["words"]]
        self.assertEqual(beat_words, raw_tokens)

        for b in beats:
            if b["words"]:
                first_w = b["words"][0]["word"]
                self.assertFalse(first_w.startswith("-"), f"Beat started mid-word on {first_w}")
                self.assertFalse(first_w.startswith("."), f"Beat started mid-decimal on {first_w}")

    def test_duration_bounds_and_exact_continuity_30_to_53s(self):
        long_narration = (
            "Forensic decompilation revealed a fatal flaw: attackers bypassed multi-sig limits to drain 119,756 BTC "
            "across 2,072 transactions; federal agents traced a $500 gift card and seized $4.5B in 2022. "
            "Short burst happened. "
            "Another short clause fired. "
            "Primary clearing systems lacked isolation across internal administrative boundaries and privileged keys. "
            "A secondary relay silently routed illicit traffic offshore while telemetry alarms remained muted."
        )
        words, dur = _build_synthetic_words(long_narration, start_sec=0.1, word_dur=0.58, gap=0.12)
        self.assertGreaterEqual(dur, 35.0)

        sentences = segment_narration_into_sentences(long_narration, words, dur)
        beats = cluster_into_visual_beats(sentences, words, dur)

        self.assertGreaterEqual(len(beats), 4)
        self.assertEqual(beats[0]["startSec"], 0.0)

        for i, b in enumerate(beats):
            self.assertLessEqual(b["durationSec"], 8.5, f"Beat {i} exceeded 8.5s: {b['durationSec']}")
            self.assertGreaterEqual(b["durationSec"], 4.5, f"Beat {i} below 4.5s: {b['durationSec']}")
            if i > 0:
                expected_start = round(sum(prev["durationSec"] for prev in beats[:i]), 2)
                self.assertEqual(b["startSec"], expected_start)

        self.assertEqual(beats[-1]["durationSec"], round(dur - beats[-1]["startSec"], 2))
        self.assertEqual(round(sum(b["durationSec"] for b in beats), 2), round(dur, 2))

    def test_short_scene_gets_at_most_two_beats(self):
        narration = "System telemetry failed at open. Losses reached $500 across two relays."
        words, _ = _build_synthetic_words(narration, start_sec=0.2, word_dur=0.45, gap=0.05)

        for short_dur in (7.5, 9.6):
            sentences = segment_narration_into_sentences(narration, words, short_dur)
            beats = cluster_into_visual_beats(sentences, words, short_dur)
            self.assertGreaterEqual(len(beats), 1)
            self.assertLessEqual(len(beats), 2)
            self.assertEqual(beats[0]["startSec"], 0.0)
            self.assertEqual(round(sum(b["durationSec"] for b in beats), 2), round(short_dur, 2))
            for b in beats:
                self.assertLessEqual(b["durationSec"], 8.5)

    def test_visual_beat_schema_variants_and_real_stats_no_stub_leaks(self):
        narration = (
            "Bitfinex suffered an unprecedented compromise affecting 36.07% of customer balances. "
            "Attackers drained 119,756 BTC across 2,072 unauthorized transactions using hijacked keys. "
            "Federal investigators traced a $500 Walmart gift card to unmask the launderers. "
            "Justice Department teams ultimately seized 94,636 BTC valued at $4.5B in historic forfeitures. "
            "This enforcement action transformed digital asset forensics permanently."
        )
        words, dur = _build_synthetic_words(narration, start_sec=0.2, word_dur=0.52, gap=0.1)
        assets = {
            "videos": [
                "runs/bitfinex_test/assets/broll_archival_0.mp4",
                "runs/bitfinex_test/assets/broll_archival_1.mp4",
            ],
            "images": [
                "runs/bitfinex_test/assets/archival_img_0.png",
                "runs/bitfinex_test/assets/archival_img_1.png",
            ],
        }
        beats = compile_scene_visual_beats(
            scene_id="scene_05",
            template="SystemBlueprint",
            narration_text=narration,
            words=words,
            scene_duration_sec=dur,
            evidence_metadata={"victim": "Bitfinex", "financialDamage": "$4.5B"},
            available_assets=assets,
            assigned_accent="amber",
            props={"blocks": [{"id": f"b{i}", "title": f"Block {i}", "subtitle": "Node"} for i in range(4)]},
            chapter_title="Historic Bitcoin Seizure",
        )

        self.assertGreaterEqual(len(beats), 5)
        self.assertEqual(beats[0]["beatType"], "TEMPLATE_STATE")
        self.assertEqual(beats[0]["templateFocus"]["targetIndex"], 0)

        beat_types_seen = set()
        stat_values = []
        for idx, b in enumerate(beats):
            self.assertEqual(b["beatIndex"], idx)
            self.assertTrue(b["beatId"].startswith("scene_05_beat_"))
            self.assertGreater(b["durationSec"], 0.4)
            self.assertIn(b["cameraMotion"], CAMERA_MOTIONS)
            self.assertIn(b["transitionIn"], VALID_TRANSITIONS)
            self.assertIn("phaseBadge", b["hudOverlay"])
            self.assertIn("telemetryTag", b["hudOverlay"])
            if "statCallout" in b["hudOverlay"]:
                self.assertIsNotNone(b["hudOverlay"]["statCallout"])

            bt = b["beatType"]
            beat_types_seen.add(bt)
            if bt == "TEMPLATE_STATE":
                tf = b["templateFocus"]
                self.assertGreaterEqual(tf["targetIndex"], 0)
                self.assertIn(tf["highlightMode"], VALID_HIGHLIGHT_MODES)
                self.assertEqual(tf["spotlightIntensity"], 0.9)
            elif bt == "CUTAWAY_BROLL":
                br = b["cutawayBroll"]
                self.assertIn(br["mediaType"], ("video", "image"))
                self.assertTrue(br["mediaPath"].startswith("runs/bitfinex_test/assets/"))
                self.assertEqual(br["videoDurationSec"], 18.0)
                self.assertGreaterEqual(br["videoStartOffsetSec"], 0.0)
                self.assertTrue(br["headline"])
                self.assertTrue(br["caption"])
                self.assertTrue(br["provenanceSource"])
            elif bt == "CUTAWAY_STATCARD":
                st = b["cutawayStat"]
                self.assertIn(st["accentColor"], VALID_ACCENTS)
                self.assertIsInstance(st["deltaPositive"], bool)
                self.assertTrue(st["statValue"])
                stat_values.append(st["statValue"])
            elif bt == "CUTAWAY_SPLIT":
                sp = b["cutawaySplit"]
                self.assertEqual(sp["splitRatio"], 0.5)
                self.assertIn("brollMedia", sp)
                self.assertIn("statCard", sp)
                stat_values.append(sp["statCard"]["statValue"])

            if idx > 0:
                prev_key = (beats[idx - 1]["beatType"], beats[idx - 1].get("templateFocus", {}).get("targetIndex"))
                curr_key = (bt, b.get("templateFocus", {}).get("targetIndex"))
                self.assertNotEqual(prev_key, curr_key)

        self.assertIn("CUTAWAY_STATCARD", beat_types_seen)
        self.assertTrue(
            any(tok in val for val in stat_values for tok in ("$4.5B", "119,756", "2,072", "36.07%", "$500", "94,636")),
            f"Expected real extracted metrics, got {stat_values}",
        )

        serialized = json.dumps(beats)
        for forbidden in ("KCG", "SMARS", "Knight Capital", "Bangladesh", "Shalika", "Fandation", "$440M", "$81M"):
            self.assertNotIn(forbidden, serialized)

        self.assertEqual(compile_scene_visual_beats("outro", "EndScreenOutro", "", [], 20.0), [])

    def test_no_assets_fallback_avoids_broll_and_split(self):
        narration = (
            "Unauthorized transfers totaled $4.5B across 2,072 transactions. "
            "Investigators isolated 36.07% of affected reserves during triage. "
            "Emergency controls locked remaining cold storage modules."
        )
        words, dur = _build_synthetic_words(narration, start_sec=0.2, word_dur=0.65, gap=0.15)
        beats = compile_scene_visual_beats(
            scene_id="scene_02",
            template="TerminalReplay",
            narration_text=narration,
            words=words,
            scene_duration_sec=dur,
            available_assets={"videos": [], "images": []},
        )
        for b in beats:
            self.assertNotIn(b["beatType"], ("CUTAWAY_BROLL", "CUTAWAY_SPLIT"))

    def test_end_to_end_compile_timeline_with_visual_beats_and_archival_props(self):
        dossier = fetch_autonomous_research("The 2016 Bitfinex 120,000 Bitcoin Hack ($4.5B Seizure)")
        script = compile_forensic_script(dossier, video_id="bitfinex_e2e")
        self.assertEqual(len(script["scenes"]), 24)

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            script_path = tmp_path / "01_script.json"
            timings_path = tmp_path / "02_scene_timings.json"
            words_path = tmp_path / "03_words.json"
            assets_dir = tmp_path / "04_assets"
            assets_dir.mkdir(parents=True, exist_ok=True)
            output_path = tmp_path / "05_timeline.json"

            for idx in range(3):
                (assets_dir / f"broll_archival_{idx}.mp4").write_bytes(b"mp4")
            for idx in range(2):
                (assets_dir / f"archival_img_{idx}.png").write_bytes(b"png")

            timings = []
            all_words = []
            cursor = 0.0
            for s in script["scenes"]:
                s_words, s_dur = _build_synthetic_words(s["narrationText"], start_sec=0.2, word_dur=0.45, gap=0.08)
                s_dur = max(29.0, s_dur)
                for w in s_words:
                    all_words.append({
                        "word": w["word"],
                        "startSec": round(cursor + w["startSec"], 2),
                        "endSec": round(cursor + w["endSec"], 2),
                    })
                timings.append({
                    "sceneId": s["sceneId"],
                    "audioStartSec": round(cursor, 2),
                    "audioEndSec": round(cursor + s_dur - 0.2, 2),
                    "durationSec": round(s_dur, 2),
                })
                cursor += s_dur

            script_path.write_text(json.dumps(script), encoding="utf-8")
            timings_path.write_text(json.dumps(timings), encoding="utf-8")
            words_path.write_text(json.dumps(all_words), encoding="utf-8")

            timeline = compile_timeline(
                script_path=script_path,
                words_path=words_path,
                assets_dir=assets_dir,
                output_path=output_path,
                video_id="bitfinex_e2e",
                topic_title="Bitfinex E2E",
            )

            scenes = timeline["scenes"]
            self.assertEqual(len(scenes), 25)
            self.assertEqual(scenes[-1]["template"], "EndScreenOutro")
            self.assertEqual(scenes[-1]["visualBeats"], [])

            choreo_ok, choreo_errs = verify_choreography_and_anti_repetition(scenes)
            self.assertTrue(choreo_ok, f"Choreography errors: {choreo_errs}")

            qa = verify_dom_qa_playwright(output_path)
            self.assertTrue(qa["qa_passed"], f"DOM QA failed: {qa}")

            for s in scenes[:-1]:
                beats = s["visualBeats"]
                self.assertGreaterEqual(len(beats), 3)
                self.assertEqual(beats[0]["beatType"], "TEMPLATE_STATE")
                self.assertEqual(round(sum(b["durationSec"] for b in beats), 2), s["durationSec"])
                for b in beats:
                    self.assertLessEqual(b["durationSec"], 8.5)

                if s["template"] == "ArchivalFootage":
                    self.assertTrue(s["props"]["loop"])
                    self.assertEqual(s["props"]["videoDurationSec"], 18.0)
                    self.assertGreaterEqual(len(s["props"]["secondaryMediaPaths"]), 2)
                    self.assertNotIn(s["props"]["mediaPath"], s["props"]["secondaryMediaPaths"])
                    self.assertTrue(all(p.endswith(".mp4") for p in s["props"]["secondaryMediaPaths"]))

                template_beats = [b for b in beats if b["beatType"] == "TEMPLATE_STATE"]
                expected_snap = template_beats[-1]["startSec"] if template_beats else round(s["durationSec"] * 0.68, 2)
                for me in s["microEvents"]:
                    if me["action"] in ("STAMP_VERDICT", "PULSE_FAULT", "TRIGGER_CRASH_DROP") and s["durationSec"] > 15.0:
                        self.assertAlmostEqual(me["triggerOffsetSec"], expected_snap, places=2)
                for st in s["sfxTriggers"]:
                    if st["soundFile"] in ("stamp_slam.wav", "sub_bass_drop.wav") and s["durationSec"] > 15.0:
                        self.assertAlmostEqual(st["offsetSec"], expected_snap, places=2)

    def test_stage5_uses_chosen_template_and_default_archival_props(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            script_path = tmp_path / "01_script.json"
            words_path = tmp_path / "03_words.json"
            assets_dir = tmp_path / "04_assets"
            assets_dir.mkdir(parents=True, exist_ok=True)
            output_path = tmp_path / "05_timeline.json"

            for idx in range(2):
                (assets_dir / f"broll_archival_{idx}.mp4").write_bytes(b"mp4")
                (assets_dir / f"archival_img_{idx}.png").write_bytes(b"png")

            scenes = []
            for idx in range(24):
                scenes.append({
                    "sceneId": f"scene_{idx + 1:02d}",
                    "actNumber": (idx // 4) + 1,
                    "template": "ForensicDocument",
                    "suggestedDurationSec": 20.0,
                    "chapterTitle": f"Chapter {idx + 1}",
                    "narrationText": f"Scene {idx + 1} recorded $4.5B across 2,072 operations. Containment halted transfers.",
                })
            script_path.write_text(json.dumps({"scenes": scenes}), encoding="utf-8")
            words_path.write_text(json.dumps([]), encoding="utf-8")

            timeline = compile_timeline(
                script_path=script_path,
                words_path=words_path,
                assets_dir=assets_dir,
                output_path=output_path,
                video_id="chosen_tpl_vid",
                topic_title="Chosen Template Test",
            )

            compiled = timeline["scenes"]
            self.assertEqual(len(compiled), 25)
            self.assertEqual(compiled[1]["template"], "SystemBlueprint")
            self.assertEqual(compiled[3]["template"], "ArchivalFootage")
            self.assertTrue(compiled[3]["props"]["loop"])
            self.assertEqual(compiled[3]["props"]["videoDurationSec"], 18.0)
            self.assertEqual(len(compiled[3]["props"]["secondaryMediaPaths"]), 1)
            self.assertTrue(compiled[3]["props"]["secondaryMediaPaths"][0].endswith(".mp4"))


    def test_numeric_continuations_never_split_across_beats(self):
        from pipeline.beat_alignment import _is_continuation_word, compute_word_pauses

        self.assertTrue(_is_continuation_word("zero", "120"))
        self.assertTrue(_is_continuation_word("000", "120"))
        self.assertTrue(_is_continuation_word("Bitcoin", "zero"))
        self.assertTrue(_is_continuation_word(".6", "$3"))
        self.assertTrue(_is_continuation_word("billion", ".6"))
        self.assertTrue(_is_continuation_word("BTC", "756"))
        self.assertFalse(_is_continuation_word("Bitcoin", "everything."))

        narration = (
            "Attacking operators bypassed perimeter controls to move 120,000 Bitcoin across relays. "
            "Investigators later recovered $3.6 billion alongside 119,756 BTC from offshore accounts. "
            "Federal marshals secured every cold wallet before final liquidation occurred."
        )
        raw_tokens = [
            "Attacking", "operators", "bypassed", "perimeter", "controls", "to", "move",
            "120", "zero", "Bitcoin", "across", "relays.",
            "Investigators", "later", "recovered", "$3", ".6", "billion", "alongside",
            "119", "756", "BTC", "from", "offshore", "accounts.",
            "Federal", "marshals", "secured", "every", "cold", "wallet", "before", "final", "liquidation", "occurred.",
        ]
        words = []
        t = 0.2
        for tok in raw_tokens:
            dur = 0.55 if tok not in ("zero", ".6", "756") else 0.35
            words.append({"word": tok, "startSec": round(t, 2), "endSec": round(t + dur, 2)})
            t += dur + 0.08
        scene_dur = round(t + 0.5, 2)

        pauses = compute_word_pauses(words)
        self.assertEqual(len(pauses), len(words))
        self.assertTrue(all(p >= 0.0 for p in pauses))

        sentences = segment_narration_into_sentences(narration, words, scene_dur)
        beats = cluster_into_visual_beats(sentences, words, scene_dur)

        self.assertEqual([w["word"] for b in beats for w in b["words"]], raw_tokens)
        for b in beats:
            bw = [w["word"] for w in b["words"]]
            if "120" in bw:
                self.assertIn("zero", bw)
            if "$3" in bw:
                self.assertIn(".6", bw)
                self.assertIn("billion", bw)
            if "119" in bw:
                self.assertIn("756", bw)
                self.assertIn("BTC", bw)

    def test_no_dictionary_word_stats_and_no_global_financial_damage_spam(self):
        from pipeline.beat_director import _extract_stat_candidates

        self.assertEqual(_extract_stat_candidates("Short sentence verified without numbers."), [])
        self.assertEqual([c[1] for c in _extract_stat_candidates("In 2016, reserves shifted.")], ["2016"])

        beats = compile_scene_visual_beats(
            scene_id="scene_07",
            template="NetworkTopology",
            narration_text=(
                "Short sentence described the anomaly without any numerical metric. "
                "Verified operators isolated secondary relays during emergency triage. "
                "Telemetry logs confirmed clean containment across regional nodes."
            ),
            words=[],
            scene_duration_sec=22.0,
            evidence_metadata={"victim": "Bitfinex", "financialDamage": "120,000 Bitcoin"},
            available_assets={
                "videos": ["runs/test/assets/broll_archival_0.mp4"],
                "images": [],
                "durations": {"runs/test/assets/broll_archival_0.mp4": 18.0},
            },
            props={"nodes": [{"id": f"n{i}", "label": f"Node {i}", "type": "server", "status": "normal"} for i in range(4)]},
        )
        self.assertTrue(all(b["beatType"] not in ("CUTAWAY_STATCARD", "CUTAWAY_SPLIT") for b in beats))
        for b in beats:
            self.assertNotIn("statCallout", b["hudOverlay"])
            self.assertNotIn("cutawayStat", b)
            self.assertNotIn("cutawaySplit", b)
            self.assertNotIn("120,000 Bitcoin", json.dumps(b))

    def test_sparse_overlapping_and_9_5s_to_12s_duration_bounds(self):
        sparse_words = [
            {"word": "Initial", "startSec": 0.4, "endSec": 1.0},
            {"word": "breach.", "startSec": 11.1, "endSec": 11.6},
        ]
        for dur in (9.5, 9.8, 12.0):
            beats_no_words = cluster_into_visual_beats(
                [{"sentenceIndex": 0, "text": "Single sentence exceeding nine seconds.", "startSec": 0.0, "endSec": dur, "wordStartIdx": 0, "wordEndIdx": 0}],
                [],
                dur,
            )
            self.assertGreaterEqual(len(beats_no_words), 2)
            self.assertEqual(round(sum(b["durationSec"] for b in beats_no_words), 2), round(dur, 2))
            for b in beats_no_words:
                self.assertGreater(b["durationSec"], 0.4)
                self.assertLessEqual(b["durationSec"], 8.5)

        beats_sparse = cluster_into_visual_beats(
            [{"sentenceIndex": 0, "text": "Initial breach.", "startSec": 0.4, "endSec": 11.6, "wordStartIdx": 0, "wordEndIdx": 2}],
            sparse_words,
            12.0,
        )
        self.assertGreaterEqual(len(beats_sparse), 2)
        self.assertEqual(round(sum(b["durationSec"] for b in beats_sparse), 2), 12.0)
        for b in beats_sparse:
            self.assertGreater(b["durationSec"], 0.4)
            self.assertLessEqual(b["durationSec"], 8.5)

        overlapping = [
            {"word": "One", "startSec": 0.2, "endSec": 5.9},
            {"word": "two", "startSec": 5.5, "endSec": 5.8},
            {"word": "three", "startSec": 5.7, "endSec": 6.1},
            {"word": "four.", "startSec": 8.9, "endSec": 9.4},
        ]
        beats_ov = cluster_into_visual_beats(
            [{"sentenceIndex": 0, "text": "One two three four.", "startSec": 0.2, "endSec": 9.4, "wordStartIdx": 0, "wordEndIdx": 4}],
            overlapping,
            9.6,
        )
        self.assertEqual(round(sum(b["durationSec"] for b in beats_ov), 2), 9.6)
        for idx, b in enumerate(beats_ov):
            self.assertGreater(b["durationSec"], 0.4)
            self.assertLessEqual(b["durationSec"], 8.5)
            if idx > 0:
                self.assertGreaterEqual(b["startSec"], beats_ov[idx - 1]["startSec"])

    def test_planning_rules_archival_no_broll_no_adjacent_cutaways_and_target_index_range(self):
        narration = (
            "Phase one recorded $4.5B exposure across core relays. "
            "Phase two traced 2,072 unauthorized orders. "
            "Phase three recovered 94,636 BTC in federal custody. "
            "Phase four isolated 36.07% of compromised endpoints."
        )
        words, dur = _build_synthetic_words(narration, start_sec=0.2, word_dur=0.65, gap=0.15)
        assets = {
            "videos": ["runs/t/assets/broll_archival_0.mp4", "runs/t/assets/broll_archival_1.mp4"],
            "images": [],
            "durations": {"runs/t/assets/broll_archival_0.mp4": 15.0, "runs/t/assets/broll_archival_1.mp4": 12.0},
        }
        bp_beats = compile_scene_visual_beats(
            scene_id="scene_05",
            template="SystemBlueprint",
            narration_text=narration,
            words=words,
            scene_duration_sec=dur,
            available_assets=assets,
            props={"blocks": [{"id": f"b{i}", "title": f"B{i}", "subtitle": "S"} for i in range(4)]},
        )
        self.assertEqual(bp_beats[0]["beatType"], "TEMPLATE_STATE")
        self.assertEqual(bp_beats[-1]["beatType"], "TEMPLATE_STATE")
        for i in range(1, len(bp_beats)):
            self.assertFalse(
                bp_beats[i]["beatType"] != "TEMPLATE_STATE" and bp_beats[i - 1]["beatType"] != "TEMPLATE_STATE",
                f"Consecutive cutaways at beats {i-1} and {i}",
            )
        for b in bp_beats:
            if b["beatType"] != "TEMPLATE_STATE":
                self.assertNotIn("statCallout", b["hudOverlay"])
        reached = {b["templateFocus"]["targetIndex"] for b in bp_beats if b["beatType"] == "TEMPLATE_STATE"}
        self.assertIn(3, reached, f"Expected final item index 3 to be reached, got {reached}")

        arch_beats = compile_scene_visual_beats(
            scene_id="scene_04",
            template="ArchivalFootage",
            narration_text="Engineers watched alerts cascade across primary operations desks without any numbers.",
            words=[],
            scene_duration_sec=24.0,
            available_assets=assets,
            props={"mediaPath": "runs/t/assets/broll_archival_0.mp4", "secondaryMediaPaths": ["runs/t/assets/broll_archival_1.mp4"]},
        )
        self.assertTrue(all(b["beatType"] == "TEMPLATE_STATE" for b in arch_beats))

    def test_stage7_shorts_retains_words_and_clips_durations_cleanly(self):
        from unittest.mock import patch
        from pipeline.stage7_shorts import build_short_packages, generate_shorts_for_run, normalize_short_scenes

        scenes = []
        cursor = 0.0
        for idx in range(24):
            dur = 30.0
            words = [{"word": f"w{idx}_{k}", "startSec": round(k * 1.5 + 0.2, 2), "endSec": round(k * 1.5 + 0.8, 2)} for k in range(18)]
            beats = [
                {"beatId": f"s{idx}_b{bi}", "beatIndex": bi, "startSec": round(bi * 6.0, 2), "durationSec": 6.0, "beatType": "TEMPLATE_STATE"}
                for bi in range(5)
            ]
            scenes.append({
                "sceneId": f"scene_{idx + 1:02d}",
                "actNumber": (idx // 4) + 1,
                "template": "SystemBlueprint",
                "startTimeSec": cursor,
                "durationSec": dur,
                "chapterTitle": f"Chapter {idx + 1}",
                "narrationText": "Test narration.",
                "words": words,
                "props": {"systemTitle": "CORE", "blocks": [{"id": "b1", "title": "B1", "subtitle": "S"}], "flows": []},
                "microEvents": [{"id": f"me_{idx}", "triggerWord": "focus", "triggerOffsetSec": 2.0, "action": "ZOOM_IN", "accentColor": "cyan"}],
                "sfxTriggers": [{"offsetSec": 0.2, "soundFile": "soft_whoosh.wav", "volume": 0.6}],
                "visualBeats": beats,
            })
            cursor += dur

        packages = build_short_packages(scenes)
        self.assertEqual(len(packages), 3)
        for pkg in packages:
            norm = normalize_short_scenes(pkg["scenes"], pkg["durationSec"])
            self.assertEqual(round(sum(s["durationSec"] for s in norm), 2), round(pkg["durationSec"], 2))
            for ns in norm:
                self.assertGreater(len(ns["words"]), 0, f"{pkg['packageId']} dropped words on {ns['sceneId']}")
                for w in ns["words"]:
                    self.assertLess(w["startSec"], ns["durationSec"])
                    self.assertLessEqual(w["endSec"], ns["durationSec"])
                self.assertEqual(round(sum(b["durationSec"] for b in ns["visualBeats"]), 2), ns["durationSec"])
                for b in ns["visualBeats"]:
                    self.assertGreater(b["durationSec"], 0.45)

        sliver_clip = normalize_short_scenes(
            [{"sceneId": "s0", "durationSec": 30.0, "words": [{"word": "hi", "startSec": 0.2, "endSec": 0.5}], "visualBeats": [
                {"beatIndex": 0, "startSec": 0.0, "durationSec": 24.2},
                {"beatIndex": 1, "startSec": 24.2, "durationSec": 5.8},
            ]}],
            24.4,
        )
        self.assertEqual(sliver_clip[0]["durationSec"], 24.4)
        self.assertEqual(round(sum(b["durationSec"] for b in sliver_clip[0]["visualBeats"]), 2), 24.4)
        self.assertTrue(all(b["durationSec"] > 0.45 for b in sliver_clip[0]["visualBeats"]))

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            tl_path = tmp_path / "05_timeline.json"
            w_path = tmp_path / "03_words.json"
            shorts_dir = tmp_path / "shorts"
            tl_path.write_text(json.dumps({"videoId": "s7_test", "topicTitle": "Test", "scenes": scenes}), encoding="utf-8")
            w_path.write_text(json.dumps([{"word": "hi", "startSec": i * 5.0, "endSec": i * 5.0 + 0.5} for i in range(140)]), encoding="utf-8")
            with patch("pipeline.stage7_shorts.subprocess.run") as mock_run:
                mock_run.return_value = type("Res", (), {"returncode": 0, "stderr": ""})()
                manifest = generate_shorts_for_run("Test Topic", "s7_test", tl_path, w_path, tmp_path / "v.wav", tmp_path / "m.wav", shorts_dir)
            self.assertEqual(len(manifest), 3)
            for sid in ("short_01", "short_02", "short_03"):
                sp = json.loads((shorts_dir / sid / "short_props.json").read_text(encoding="utf-8"))
                self.assertEqual(round(sum(sc["durationSec"] for sc in sp["scenes"]), 2), sp["totalDurationSec"])
                for sc in sp["scenes"]:
                    self.assertGreater(len(sc["words"]), 0, f"{sid} {sc['sceneId']} missing words")

    def test_compiled_timeline_no_global_damage_repeat_and_validates_zod(self):
        import shutil
        import subprocess

        npx_bin = shutil.which("npx") or shutil.which("npx.cmd")
        if not npx_bin:
            self.skipTest("npx not available")

        dossier = fetch_autonomous_research("The 2021 Colonial Pipeline Ransomware Attack ($4.4M Ransom)")
        script = compile_forensic_script(dossier, video_id="colonial_zod_test")
        for sc in script["scenes"]:
            sc.setdefault("evidenceMetadata", {})["financialDamage"] = "120,000 Bitcoin"
            if sc["sceneId"] != "scene_01":
                sc["narrationText"] = "Telemetry monitors detected operational disruption across clearing relays without numeric figures."
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            script_path = tmp_path / "01_script.json"
            words_path = tmp_path / "03_words.json"
            assets_dir = tmp_path / "04_assets"
            assets_dir.mkdir(parents=True, exist_ok=True)
            output_path = tmp_path / "05_timeline.json"
            script_path.write_text(json.dumps(script), encoding="utf-8")
            words_path.write_text(json.dumps([]), encoding="utf-8")

            timeline = compile_timeline(
                script_path=script_path,
                words_path=words_path,
                assets_dir=assets_dir,
                output_path=output_path,
                video_id="colonial_zod_test",
                topic_title="Colonial Pipeline",
            )
            serialized = json.dumps(timeline)
            for leaked in ("Shalika Fandation", "BINARY PATCH: 75 04 -> 90 90 (NOP NOP)", "ORACLE_BYPASS"):
                self.assertNotIn(leaked, serialized)
            self.assertEqual(timeline["scenes"][-1]["actNumber"], 6)
            damage_scenes = [
                sc["sceneId"]
                for sc in timeline["scenes"][:-1]
                if "120,000 Bitcoin" in json.dumps(sc["visualBeats"])
            ]
            self.assertLessEqual(len(damage_scenes), 1, f"financialDamage repeated across scenes: {damage_scenes}")

            project_root = Path(__file__).resolve().parent.parent
            schema_import = (project_root / "src" / "schemas" / "timeline.schema.ts").as_uri()
            check_script = tmp_path / "validate_timeline.mts"
            check_script.write_text(
                f"import fs from 'node:fs';\n"
                f"import {{ TimelineSchema }} from {json.dumps(schema_import)};\n"
                f"const data = JSON.parse(fs.readFileSync({json.dumps(output_path.as_posix())}, 'utf-8'));\n"
                f"TimelineSchema.parse(data);\n",
                encoding="utf-8",
            )
            res = subprocess.run(
                [npx_bin, "tsx", str(check_script)],
                cwd=str(project_root),
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(res.returncode, 0, f"Zod TimelineSchema validation failed:\n{res.stderr}")


if __name__ == "__main__":
    unittest.main()
