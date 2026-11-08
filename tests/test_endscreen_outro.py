import json
import tempfile
import unittest
from pathlib import Path
from pipeline.stage5_compile import compile_timeline


class TestEndScreenOutro(unittest.TestCase):
    def test_outro_appended_automatically(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            script_path = tmp_path / "01_script.json"
            words_path = tmp_path / "03_words.json"
            assets_dir = tmp_path / "assets"
            assets_dir.mkdir(parents=True, exist_ok=True)
            output_path = tmp_path / "05_timeline.json"

            script_data = {
                "scenes": [
                    {
                        "sceneId": "scene_01",
                        "actNumber": 1,
                        "template": "ForensicDocument",
                        "suggestedDurationSec": 8.5,
                        "narrationText": "Forensic investigation into automated routing engine failure.",
                    }
                ]
            }
            with open(script_path, "w", encoding="utf-8") as f:
                json.dump(script_data, f)

            with open(words_path, "w", encoding="utf-8") as f:
                json.dump([], f)

            timeline = compile_timeline(
                script_path=script_path,
                words_path=words_path,
                assets_dir=assets_dir,
                output_path=output_path,
                video_id="test_vid",
                topic_title="Test Outro",
            )

            self.assertEqual(len(timeline["scenes"]), 2)
            outro = timeline["scenes"][-1]
            self.assertEqual(outro["sceneId"], "test_vid_outro")
            self.assertEqual(outro["actNumber"], 5)
            self.assertEqual(outro["template"], "EndScreenOutro")
            self.assertEqual(outro["startTimeSec"], 8.5)
            self.assertEqual(outro["durationSec"], 20.0)
            self.assertEqual(outro["chapterTitle"], "Conclusion // Next Investigation")
            self.assertEqual(outro["narrationText"], "Investigation archived. Select your next dossier.")
            self.assertEqual(outro["words"], [])
            self.assertEqual(
                outro["sfxTriggers"],
                [
                    {"offsetSec": 0.0, "soundFile": "sub_bass_drop.wav", "volume": 0.6},
                    {"offsetSec": 1.5, "soundFile": "radar_ping.wav", "volume": 0.5},
                ],
            )
            self.assertEqual(len(outro["microEvents"]), 1)
            self.assertEqual(outro["microEvents"][0]["id"], "me_outro_01")
            self.assertEqual(outro["microEvents"][0]["triggerWord"], "outro")
            self.assertEqual(outro["microEvents"][0]["triggerOffsetSec"], 0.5)
            self.assertEqual(outro["microEvents"][0]["action"], "REVEAL_CALLOUT")
            self.assertEqual(outro["microEvents"][0]["accentColor"], "cyan")
            self.assertEqual(outro["props"]["title"], "CASE DOSSIER CLOSED")
            self.assertEqual(outro["props"]["subtitle"], "SELECT NEXT INVESTIGATION")
            self.assertEqual(outro["props"]["leftCardLabel"], "RECOMMENDED DOSSIER")
            self.assertEqual(outro["props"]["rightCardLabel"], "LATEST CASE FILE")
            self.assertEqual(outro["props"]["subscribeLabel"], "DECRYPT // SUBSCRIBE")
            self.assertEqual(timeline["totalDurationSec"], 28.5)

    def test_outro_not_duplicated_if_already_present(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            script_path = tmp_path / "01_script.json"
            words_path = tmp_path / "03_words.json"
            assets_dir = tmp_path / "assets"
            assets_dir.mkdir(parents=True, exist_ok=True)
            output_path = tmp_path / "05_timeline.json"

            script_data = {
                "scenes": [
                    {
                        "sceneId": "scene_01",
                        "actNumber": 1,
                        "template": "ForensicDocument",
                        "suggestedDurationSec": 8.5,
                        "narrationText": "Initial scene.",
                    },
                    {
                        "sceneId": "custom_outro",
                        "actNumber": 5,
                        "template": "EndScreenOutro",
                        "suggestedDurationSec": 20.0,
                        "narrationText": "Custom outro narration.",
                        "evidenceMetadata": {
                            "title": "CUSTOM ARCHIVE CLOSED",
                        },
                    },
                ]
            }
            with open(script_path, "w", encoding="utf-8") as f:
                json.dump(script_data, f)

            with open(words_path, "w", encoding="utf-8") as f:
                json.dump([], f)

            timeline = compile_timeline(
                script_path=script_path,
                words_path=words_path,
                assets_dir=assets_dir,
                output_path=output_path,
                video_id="test_vid",
                topic_title="Test Duplicate Outro",
            )

            self.assertEqual(len(timeline["scenes"]), 2)
            outro = timeline["scenes"][-1]
            self.assertEqual(outro["sceneId"], "custom_outro")
            self.assertEqual(outro["props"]["title"], "CUSTOM ARCHIVE CLOSED")
            self.assertEqual(outro["durationSec"], 20.0)
            self.assertEqual(timeline["totalDurationSec"], 28.5)


if __name__ == "__main__":
    unittest.main()
