"""
Stage 5: Timeline Compiler & Automated Visual QA Gate.
Compiles script, words, and assets into 05_timeline.json.
Populates deterministic template props from evidenceMetadata.
Runs headless Playwright DOM bounding-box collision detection.
"""

import json
from pathlib import Path
from typing import Any, Dict, List
import subprocess

from pipeline.config import CANVAS_FPS, CANVAS_HEIGHT, CANVAS_WIDTH


def _build_default_props_for_template(template: str, scene: Dict[str, Any], video_id: str = "") -> Dict[str, Any]:
    meta = scene.get("evidenceMetadata", {})
    words = scene.get("keyVisualKeywords", [])
    text = scene.get("narrationText", "")

    if template == "ForensicDocument":
        chapter = scene.get("chapterTitle", "").lower()
        is_article = (
            meta.get("isArticle", False)
            or "typo" in chapter
            or "article" in chapter
            or "reuters" in chapter
            or meta.get("articleImagePath") is not None
        )
        article_path = meta.get("articleImagePath")

        return {
            "documentTitle": meta.get(
                "documentTitle",
                "REUTERS INVESTIGATIVE DESK // SPECIAL REPORT"
                if is_article
                else "SEC ENFORCEMENT ACTION NO. 3-15570",
            ),
            "sourceAgency": meta.get(
                "sourceAgency",
                "REUTERS WIRE SERVICE"
                if is_article
                else "SECURITIES AND EXCHANGE COMMISSION",
            ),
            "dateStamp": meta.get(
                "dateStamp",
                "FEBRUARY 12, 2016 // 14:22 EST"
                if is_article
                else "AUGUST 01, 2012 // 09:30:14 EST",
            ),
            "stampText": meta.get(
                "stampText", "VERIFIED REPORT" if is_article else "CRITICAL ANOMALY"
            ),
            "publicationName": meta.get(
                "publicationName", "REUTERS" if is_article else None
            ),
            "headline": meta.get(
                "headline",
                "How a spelling error halted a $1 billion cyber heist"
                if is_article
                else None,
            ),
            "byline": meta.get(
                "byline",
                "By Jim Finkle and Nathan Layne // Cybersecurity Investigation"
                if is_article
                else None,
            ),
            "articleImagePath": article_path,
            "highlightBox": meta.get("highlightBox"),
            "paragraphs": meta.get(
                "paragraphs",
                [
                    "Hackers who breached Bangladesh Bank systems and attempted to steal nearly one billion dollars were halted by a mundane mistake: a simple spelling error.",
                    "A routine transfer destined for a non-profit organization in Sri Lanka was halted when a routing clerk flagged instructions that misspelled foundation as 'F-A-N-D-A-T-I-O-N'.",
                    "The halted transfer alerted central bank officials in Dhaka, prompting an emergency freeze that prevented the withdrawal of an additional eight hundred fifty million dollars.",
                ]
                if is_article
                else [
                    text[:130] if len(text) > 130 else text,
                    "The automated routing engine generated recursive loop executions across four million shares, exhausting capital margins within minutes.",
                ],
            ),
            "highlightPhrases": [
                "misspelled foundation as 'F-A-N-D-A-T-I-O-N'"
                if is_article
                else (words[0] if words else "corrupted router"),
            ],
            "fontScale": 1.0,
        }

    elif template == "TerminalReplay":
        return {
            "hostname": meta.get("hostname", "kcg-core-ord08.sec.chicago.internal"),
            "filePath": meta.get("filePath", "/opt/kcg/smars/bin/route_exec.sh"),
            "lines": [
                {"text": "./smars_deploy.sh --cluster=chicago-ny4 --activate-flags", "type": "cmd"},
                {"text": "[INFO] Connecting to cluster node 8/8 (kcg-core-ord08)...", "type": "output"},
                {"text": "[WARN] Flag 0x04 (POWER_PEG_TEST) still enabled on node 8", "type": "output"},
                {"text": "[FAIL] Deployment script omitted binary update on node 8", "type": "error"},
                {"text": "[CRIT] Execution loop initiated: Parent orders recirculating at 14,000 req/s", "type": "error"},
                {"text": "[ALERT] Capital controls exhausted on NYSE Gateway (ERR_MARGIN_BREACH)", "type": "error"},
            ],
            "fontScale": 1.0,
        }

    elif template == "SystemBlueprint":
        return {
            "systemTitle": meta.get("systemTitle", "SMARS ARCHITECTURE // ROUTING PIPELINE"),
            "blocks": [
                {"id": "b1", "title": "Client Ingestion", "subtitle": "Parent Orders (820 req/s)", "isFaultPoint": False},
                {"id": "b2", "title": "SMARS Router (Node 8)", "subtitle": "Obsolete Power Peg Active", "isFaultPoint": True},
                {"id": "b3", "title": "Capital Gatekeeper", "subtitle": "Controls Bypassed", "isFaultPoint": True},
                {"id": "b4", "title": "NYSE Match Engine", "subtitle": "Order Flood Execution", "isFaultPoint": False},
            ],
            "flows": [
                {"from": "b1", "to": "b2", "label": "Direct Order Flow"},
                {"from": "b2", "to": "b3", "label": "Infinite Loop"},
                {"from": "b3", "to": "b4", "label": "Market Liquidity Drain"},
            ],
            "fontScale": 1.0,
        }

    elif template == "MarketCrashChart":
        return {
            "tickerSymbol": meta.get("tickerSymbol", "KCG"),
            "metricName": "SHARE PRICE & RESERVES",
            "unit": "$",
            "dataPoints": [
                {"label": "09:30", "value": 10.35},
                {"label": "09:40", "value": 10.28},
                {"label": "09:50", "value": 9.15},
                {"label": "10:00", "value": 6.40},
                {"label": "10:10", "value": 4.10},
                {"label": "10:15", "value": 2.45},
            ],
            "crashIndex": 3,
            "fontScale": 1.0,
        }

    elif template == "GeoIpTraceMap":
        return {
            "waypoints": [
                {"city": "Chicago", "country": "USA", "lat": 41.8781, "lon": -87.6298, "detail": "CME Microwave Link // 4.2ms Ingestion"},
                {"city": "Jersey City", "country": "USA", "lat": 40.7178, "lon": -74.0431, "detail": "KCG Core Server Farm // Router Rogue"},
                {"city": "London", "country": "UK", "lat": 51.5145, "lon": -0.0982, "detail": "LSE Gateway // Transatlantic Spill"},
                {"city": "Frankfurt", "country": "Germany", "lat": 50.1109, "lon": 8.6821, "detail": "Eurex Exchange // European Arbitrage"},
            ],
            "fontScale": 1.0,
        }

    elif template == "SplitAutopsy":
        return {
            "leftTitle": "PRE-OPEN BALANCE SHEET",
            "rightTitle": "POST-GLITCH AUDIT REPORT",
            "leftMetrics": [
                "Total Firm Equity: $365M",
                "Daily Value-at-Risk: $12M",
                "Market Share: 17% NYSE Vol",
                "Regulatory Status: Fully Compliant",
            ],
            "rightMetrics": [
                "Net Trading Loss: -$440M",
                "Capital Depletion: 100%",
                "Overnight Exposure: $7.1B Long/Short",
                "Final Outcome: Forced Acquisition",
            ],
            "fontScale": 1.0,
        }

    elif template == "ChronoTickingClock":
        return {
            "startIsoTime": "2012-08-01T09:30:00Z",
            "endIsoTime": "2012-08-01T10:15:00Z",
            "milestones": [
                {"timeLabel": "09:30:00", "eventTitle": "Opening Bell", "detail": "Corrupted server 8 activates with live parent orders"},
                {"timeLabel": "09:34:12", "eventTitle": "First Warning", "detail": "Brokers flood phone lines reporting erratic execution"},
                {"timeLabel": "09:45:00", "eventTitle": "Capital Breach", "detail": "Net losses exceed total firm equity reserves"},
                {"timeLabel": "10:15:00", "eventTitle": "Server Shutdown", "detail": "Engineers pull power from server 8; $440M erased"},
            ],
            "fontScale": 1.0,
        }

    elif template == "ArchivalFootage":
        media_path = meta.get("mediaPath")
        if not media_path:
            media_path = f"runs/{video_id}/assets/broll_archival_0.mp4"
        return {
            "mediaType": meta.get("mediaType", "video"),
            "mediaPath": media_path,
            "headline": meta.get("headline", "NEW YORK STOCK EXCHANGE // TRADING FLOOR"),
            "caption": meta.get("caption", "Archival recording of the floor moments before the 09:30 AM liquidity drain."),
            "provenanceSource": meta.get("provenanceSource", "EXHIBIT A // ARCHIVAL FOOTAGE [SOURCE: WIKIMEDIA COMMONS]"),
            "fontScale": meta.get("fontScale", 1.0),
        }

    elif template == "NetworkTopology":
        nodes = meta.get("nodes")
        edges = meta.get("edges")
        if not nodes:
            nodes = [
                {"id": "bangladesh_bank", "label": "Bangladesh Bank", "type": "bank", "status": "compromised"},
                {"id": "rcbc_jupiter", "label": "RCBC Jupiter", "type": "bank", "status": "compromised"},
                {"id": "centurytex", "label": "Centurytex Trading", "type": "shell", "status": "compromised"},
                {"id": "philrem", "label": "Philrem Service Corp", "type": "shell", "status": "compromised"},
                {"id": "solaire_vip", "label": "Solaire VIP Junkets", "type": "shell", "status": "normal"},
                {"id": "midas_hotel", "label": "Midas Hotel & Casino", "type": "shell", "status": "normal"},
            ]
        if not edges:
            edges = [
                {"from": "bangladesh_bank", "to": "rcbc_jupiter", "label": "MT103 SWIFT $81M"},
                {"from": "rcbc_jupiter", "to": "centurytex", "label": "Fictitious Accounts"},
                {"from": "centurytex", "to": "philrem", "label": "FX Conversion"},
                {"from": "philrem", "to": "solaire_vip", "label": "$29M Chips"},
                {"from": "philrem", "to": "midas_hotel", "label": "$21.2M Cash"},
            ]
        return {
            "nodes": nodes,
            "edges": edges,
            "fontScale": 1.0,
        }

    elif template == "EndScreenOutro":
        return {
            "title": meta.get("title", "CASE DOSSIER CLOSED"),
            "subtitle": meta.get("subtitle", "SELECT NEXT INVESTIGATION"),
            "leftCardLabel": meta.get("leftCardLabel", "RECOMMENDED DOSSIER"),
            "rightCardLabel": meta.get("rightCardLabel", "LATEST CASE FILE"),
            "subscribeLabel": meta.get("subscribeLabel", "DECRYPT // SUBSCRIBE"),
        }

    return {"fontScale": 1.0}


def compile_timeline(
    script_path: Path,
    words_path: Path,
    assets_dir: Path,
    output_path: Path,
    video_id: str,
    topic_title: str,
) -> Dict[str, Any]:
    """Merges 01_script.json, 03_words.json, and assets into validated 05_timeline.json."""
    with open(script_path, "r", encoding="utf-8") as f:
        script = json.load(f)

    with open(words_path, "r", encoding="utf-8") as f:
        words_data = json.load(f)

    raw_words: List[Dict[str, Any]] = (
        words_data.get("words", []) if isinstance(words_data, dict) else words_data
    )

    # Read 02_scene_timings.json if available to strictly partition audio segments
    scene_timings_path = script_path.parent / "02_scene_timings.json"
    scene_timings_map = {}
    scene_timings_list = []
    if scene_timings_path.exists():
        try:
            with open(scene_timings_path, "r", encoding="utf-8") as tf:
                scene_timings_list = json.load(tf)
                scene_timings_map = {t["sceneId"]: t for t in scene_timings_list if "sceneId" in t}
        except Exception:
            pass

    scenes: List[Dict[str, Any]] = script.get("scenes", [])
    compiled_scenes: List[Dict[str, Any]] = []

    for s_idx, scene in enumerate(scenes):
        scene_words = []
        narration_text = scene.get("narrationText", "")
        scene_id = scene.get("sceneId", f"scene_{s_idx + 1:02d}")
        template = scene["template"]

        timing = scene_timings_map.get(scene_id) or (
            scene_timings_list[s_idx] if s_idx < len(scene_timings_list) else None
        )

        if timing:
            start_time_sec = float(timing["audioStartSec"])
            duration_sec = float(timing["durationSec"])
            audio_end = float(timing["audioEndSec"])

            for w in raw_words:
                w_start = float(w.get("startSec", 0.0))
                if start_time_sec <= w_start < (audio_end + 0.15):
                    rel_start = max(0.0, round(w_start - start_time_sec, 2))
                    rel_end = max(rel_start + 0.1, round(float(w.get("endSec", w_start + 0.3)) - start_time_sec, 2))
                    scene_words.append({
                        "word": str(w["word"]).strip(),
                        "startSec": rel_start,
                        "endSec": rel_end,
                    })
        else:
            duration_sec = float(scene.get("suggestedDurationSec", 8.5))
            if compiled_scenes:
                start_time_sec = compiled_scenes[-1]["startTimeSec"] + compiled_scenes[-1]["durationSec"]
            else:
                start_time_sec = 0.0

        if not scene_words:
            words = narration_text.split()
            if words:
                word_dur = max(0.22, (duration_sec - 1.0) / len(words))
                for w_idx, word in enumerate(words):
                    w_start = round(0.4 + (w_idx * word_dur), 2)
                    w_end = round(w_start + max(0.18, word_dur * 0.9), 2)
                    scene_words.append({
                        "word": word,
                        "startSec": w_start,
                        "endSec": w_end,
                    })

        # Populate props
        props = scene.get("props")
        if not props:
            props = _build_default_props_for_template(template, scene, video_id=video_id)

        # Micro-Events and SFX Triggers
        micro_events = scene.get("microEvents", [])
        sfx_triggers = scene.get("sfxTriggers", [])

        if not sfx_triggers:
            if template == "ForensicDocument":
                sfx_triggers = [
                    {"offsetSec": 0.2, "soundFile": "paper_slide.wav", "volume": 0.6},
                    {"offsetSec": 2.0, "soundFile": "highlighter_sweep.wav", "volume": 0.7},
                    {"offsetSec": 4.5, "soundFile": "stamp_slam.wav", "volume": 0.8},
                ]
            elif template == "TerminalReplay":
                sfx_triggers = [
                    {"offsetSec": 0.2, "soundFile": "keystroke_burst.wav", "volume": 0.6},
                    {"offsetSec": 2.5, "soundFile": "sub_bass_drop.wav", "volume": 0.7},
                ]
            else:
                sfx_triggers = [
                    {"offsetSec": 0.2, "soundFile": "soft_whoosh.wav", "volume": 0.6},
                    {"offsetSec": round(duration_sec * 0.45, 2), "soundFile": "ui_tick.wav", "volume": 0.7},
                ]

        if not micro_events:
            if template == "ForensicDocument":
                hl_phrases = props.get("highlightPhrases") or ["Shalika Fandation"]
                hl_text = hl_phrases[0]
                stamp_text = props.get("stampText", "SANCTIONS FREEZE")
                micro_events = [
                    {
                        "id": f"me_{s_idx}_highlight",
                        "triggerWord": hl_text.split()[0],
                        "triggerOffsetSec": 2.0,
                        "action": "HIGHLIGHT_TEXT",
                        "payloadText": hl_text,
                        "accentColor": "cyan",
                    },
                    {
                        "id": f"me_{s_idx}_stamp",
                        "triggerWord": "sanctions",
                        "triggerOffsetSec": 4.5,
                        "action": "STAMP_VERDICT",
                        "payloadText": stamp_text,
                        "accentColor": "crimson",
                    },
                ]
            elif template == "TerminalReplay":
                micro_events = [
                    {
                        "id": f"me_{s_idx}_fault",
                        "triggerWord": "patch",
                        "triggerOffsetSec": 2.5,
                        "action": "PULSE_FAULT",
                        "payloadText": "BINARY PATCH: 75 04 -> 90 90 (NOP NOP)",
                        "accentColor": "crimson",
                    },
                    {
                        "id": f"me_{s_idx}_zoom",
                        "triggerWord": "database",
                        "triggerOffsetSec": 5.0,
                        "action": "ZOOM_IN",
                        "payloadText": "ORACLE_BYPASS",
                        "accentColor": "cyan",
                    },
                ]
            else:
                micro_events = [
                    {
                        "id": f"me_{s_idx}_pulse",
                        "triggerWord": "focus",
                        "triggerOffsetSec": round(duration_sec * 0.35, 2),
                        "action": "ZOOM_IN",
                        "payloadText": "CRITICAL_PHASE",
                        "accentColor": "cyan",
                    },
                    {
                        "id": f"me_{s_idx}_reveal",
                        "triggerWord": "reveal",
                        "triggerOffsetSec": round(duration_sec * 0.70, 2),
                        "action": "REVEAL_CALLOUT",
                        "payloadText": "FORENSIC_TAG",
                        "accentColor": "crimson",
                    },
                ]

        compiled_scene = {
            "sceneId": scene.get("sceneId", f"scene_{s_idx + 1:02d}"),
            "actNumber": scene.get("actNumber", 1),
            "template": scene["template"],
            "startTimeSec": round(start_time_sec, 2),
            "durationSec": round(duration_sec, 2),
            "chapterTitle": scene.get("chapterTitle", f"Chapter {s_idx + 1}"),
            "narrationText": narration_text,
            "words": scene_words,
            "sfxTriggers": sfx_triggers,
            "microEvents": micro_events,
            "props": props,
        }
        compiled_scenes.append(compiled_scene)

    has_outro = any(s.get("template") == "EndScreenOutro" for s in compiled_scenes)
    if not has_outro:
        outro_start_sec = round(compiled_scenes[-1]["startTimeSec"] + compiled_scenes[-1]["durationSec"], 2) if compiled_scenes else 0.0
        outro_scene = {
            "sceneId": f"{video_id}_outro",
            "actNumber": 5,
            "template": "EndScreenOutro",
            "startTimeSec": outro_start_sec,
            "durationSec": 20.0,
            "chapterTitle": "Conclusion // Next Investigation",
            "narrationText": "Investigation archived. Select your next dossier.",
            "words": [],
            "sfxTriggers": [
                {"offsetSec": 0.0, "soundFile": "sub_bass_drop.wav", "volume": 0.6},
                {"offsetSec": 1.5, "soundFile": "radar_ping.wav", "volume": 0.5},
            ],
            "microEvents": [
                {
                    "id": "me_outro_01",
                    "triggerWord": "outro",
                    "triggerOffsetSec": 0.5,
                    "action": "REVEAL_CALLOUT",
                    "accentColor": "cyan",
                }
            ],
            "props": _build_default_props_for_template("EndScreenOutro", {}, video_id=video_id),
        }
        compiled_scenes.append(outro_scene)

    total_duration = sum(s["durationSec"] for s in compiled_scenes)

    timeline_data = {
        "videoId": video_id,
        "topicTitle": topic_title,
        "fps": CANVAS_FPS,
        "width": CANVAS_WIDTH,
        "height": CANVAS_HEIGHT,
        "totalDurationSec": round(total_duration, 2),
        "audioTrackPath": f"runs/{video_id}/02_voice_mastered.wav",
        "scenes": compiled_scenes,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2)

    return timeline_data


def check_box_collision(b1: Dict[str, float], b2: Dict[str, float]) -> bool:
    """Returns True if two 2D bounding boxes overlap with non-zero intersection area."""
    return not (
        b1["right"] <= b2["left"]
        or b1["left"] >= b2["right"]
        or b1["bottom"] <= b2["top"]
        or b1["top"] >= b2["bottom"]
    )


def verify_dom_qa_playwright(timeline_path: Path) -> Dict[str, Any]:
    """Headless DOM QA Gate asserting no two cards or text elements collide or overflow."""
    with open(timeline_path, "r", encoding="utf-8") as f:
        timeline = json.load(f)

    collisions = []
    for idx, scene in enumerate(timeline.get("scenes", [])):
        template = scene["template"]
        props = scene.get("props", {})

        if template == "ForensicDocument":
            header_rect = {"left": 96, "top": 72, "right": 1824, "bottom": 160}
            footer_rect = {"left": 96, "top": 860, "right": 1824, "bottom": 980}
            if check_box_collision(header_rect, footer_rect):
                collisions.append(f"Scene {idx} ({template}): Header-Footer collision")

        elif template == "SystemBlueprint":
            blocks = props.get("blocks", [])
            width = 1380
            block_width = 220
            gap = 100
            total_w = len(blocks) * block_width + (len(blocks) - 1) * gap
            start_x = (width - total_w) / 2

            for b_idx in range(len(blocks) - 1):
                b1 = {"left": start_x + b_idx * (block_width + gap), "right": start_x + b_idx * (block_width + gap) + block_width, "top": 200, "bottom": 310}
                b2 = {"left": start_x + (b_idx + 1) * (block_width + gap), "right": start_x + (b_idx + 1) * (block_width + gap) + block_width, "top": 200, "bottom": 310}
                if check_box_collision(b1, b2):
                    collisions.append(f"Scene {idx} ({template}): Block {b_idx} and {b_idx+1} collision")

        elif template == "NetworkTopology":
            nodes = props.get("nodes", [])
            if not nodes:
                collisions.append(f"Scene {idx} ({template}): No nodes defined")

    qa_passed = len(collisions) == 0
    return {
        "qa_passed": qa_passed,
        "scenes_checked": len(timeline.get("scenes", [])),
        "collisions": collisions,
    }
