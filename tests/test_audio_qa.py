from pathlib import Path
import tempfile
import unittest
import numpy as np
from scipy.io import wavfile

from pipeline.stage6_render import audit_final_audio


class TestAudioQA(unittest.TestCase):

    def test_clean_audio_passes_qa(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            wav_path = Path(tmp_dir) / "clean.wav"
            sr = 48000
            t = np.linspace(0, 3.0, sr * 3, endpoint=False)
            sine = (0.5 * np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
            stereo = np.column_stack((sine, sine))
            wavfile.write(str(wav_path), sr, stereo)

            res = audit_final_audio(wav_path)
            self.assertTrue(res["passed"], f"Clean audio failed QA: {res['errors']}")
            self.assertLessEqual(res["true_peak_db"], -1.5)
            self.assertEqual(res["clipping_samples"], 0)
            self.assertLess(res["dc_offset"], 0.001)

    def test_clipped_audio_fails_qa(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            wav_path = Path(tmp_dir) / "clipped.wav"
            sr = 48000
            sine = np.full((sr,), 32767, dtype=np.int16)
            wavfile.write(str(wav_path), sr, sine)

            res = audit_final_audio(wav_path)
            self.assertFalse(res["passed"])
            self.assertGreater(res["clipping_samples"], 0)

    def test_dc_offset_fails_qa(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            wav_path = Path(tmp_dir) / "dc_offset.wav"
            sr = 48000
            t = np.linspace(0, 1.0, sr, endpoint=False)
            sine = (0.2 * np.sin(2 * np.pi * 440 * t) + 0.1) * 32767
            wavfile.write(str(wav_path), sr, sine.astype(np.int16))

            res = audit_final_audio(wav_path)
            self.assertFalse(res["passed"])
            self.assertGreaterEqual(res["dc_offset"], 0.001)


if __name__ == "__main__":
    unittest.main()
