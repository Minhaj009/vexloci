"""
Stage 1: Forensic Documentary Research & Universal Script Compiler.
Compiles 24 scenes across 6 acts with forensic telemetry, primary exhibits, and high-retention pacing.
"""

from pathlib import Path
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from pipeline.config import RUNS_DIR
from pipeline.utils_vram import flush_cuda_memory
from pipeline.storytelling_engine import (
    inject_storytelling_contracts,
    NarrativeContractValidator,
)
from pipeline.dossier_parser import (
    ForensicDossier,
    parse_dossier_for_episode,
    fetch_autonomous_research,
)
from pipeline.universal_script_compiler import compile_forensic_script


class SceneScript(BaseModel):
    sceneId: str
    actNumber: int
    template: str
    chapterTitle: str
    narrationText: str
    suggestedDurationSec: float
    keyVisualKeywords: List[str]
    evidenceMetadata: Dict[str, Any] = Field(default_factory=dict)
    props: Optional[Dict[str, Any]] = None


class ForensicScript(BaseModel):
    topic: str
    videoId: str
    totalActs: int = Field(default=6)
    targetDurationSec: float = Field(default=660.0)
    mediaSearchQueries: List[str] = Field(default_factory=list)
    scenes: List[SceneScript]


def classify_topic(topic: str) -> str:
    t = topic.lower()
    if any(k in t for k in ["bangladesh", "swift", "motijheel", "lazarus"]):
        return "bangladesh_bank"
    if any(k in t for k in ["knight capital", "kcg", "power peg", "smars", "440m"]):
        return "knight_capital"
    if any(k in t for k in ["wirecard", "aschheim", "marsalek", "braun", "1.9 billion", "1.9b"]):
        return "wirecard"
    if any(k in t for k in ["mt gox", "mt. gox", "gox", "karpeles", "willy bot", "850,000 bitcoin"]):
        return "mt_gox"
    return "generic"


def generate_generic_niche_script(
    topic: str,
    video_id: str,
    mode: str = "broadcast_long_form_8_12m",
    summary: str = "",
) -> Dict[str, Any]:
    dossier = parse_dossier_for_episode(video_id or topic)
    if summary and not dossier.executive_summary:
        dossier.executive_summary = summary
    script = compile_forensic_script(dossier, mode=mode)
    script["videoId"] = video_id
    return script


def generate_bangladesh_bank_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    dossier = parse_dossier_for_episode("01_bangladesh_bank_heist")
    script = compile_forensic_script(dossier, mode=mode)
    script["videoId"] = video_id
    return script


def generate_knight_capital_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    dossier = parse_dossier_for_episode("07_knight_capital_glitch")
    script = compile_forensic_script(dossier, mode=mode)
    script["videoId"] = video_id
    return script


def generate_wirecard_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    dossier = parse_dossier_for_episode("11_wirecard_missing_billions")
    script = compile_forensic_script(dossier, mode=mode)
    script["videoId"] = video_id
    return script


def generate_mt_gox_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    dossier = parse_dossier_for_episode("31_mt_gox_850k_btc")
    script = compile_forensic_script(dossier, mode=mode)
    script["videoId"] = video_id
    return script


def compile_research_and_script(
    topic: str,
    video_id: str,
    output_dir: Path,
    mode: str = "broadcast_long_form_8_12m",
    api_key: Optional[str] = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    script_path = output_dir / "01_script.json"

    dossier = parse_dossier_for_episode(video_id or topic)
    raw_script = compile_forensic_script(dossier, mode=mode, api_key=api_key)
    raw_script["videoId"] = video_id

    is_valid, narrative_errors = NarrativeContractValidator.validate_script(raw_script)
    if not is_valid:
        raise ValueError(f"Script narrative validation failed: {narrative_errors}")

    validated = ForensicScript(**raw_script)

    with open(script_path, "w", encoding="utf-8") as f:
        json.dump(validated.model_dump(), f, indent=2)

    flush_cuda_memory()
    return script_path
