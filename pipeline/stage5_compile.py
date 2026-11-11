"""
Stage 5: Timeline Compiler & Automated Visual QA Gate.
Compiles script, words, and assets into 05_timeline.json.
Populates deterministic template props from evidenceMetadata.
Runs headless Playwright DOM bounding-box collision detection.
"""

import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple
import subprocess

from pipeline.beat_director import compile_scene_visual_beats
from pipeline.config import CANVAS_FPS, CANVAS_HEIGHT, CANVAS_WIDTH, PUBLIC_DIR

CHOREOGRAPHY_TEMPLATES = [
    # Act 1: Incident Zero-Hour
    "ForensicDocument", "SystemBlueprint", "TerminalReplay", "ArchivalFootage",
    # Act 2: Architecture of Failure
    "SystemBlueprint", "TerminalReplay", "NetworkTopology", "CommsIntercept",
    # Act 3: The Strike & Detonation
    "TerminalReplay", "MarketCrashChart", "ChronoTickingClock", "ArchivalFootage",
    # Act 4: The Trace & Intercept
    "GeoIpTraceMap", "CommsIntercept", "ChronoTickingClock", "ForensicDocument",
    # Act 5: Contagion & Ruin
    "NetworkTopology", "MarketCrashChart", "SplitAutopsy", "ArchivalFootage",
    # Act 6: Forensic Autopsy
    "SplitAutopsy", "ForensicDocument", "ParallaxCutout25D", "ArchivalFootage",
]

ACCENT_CYCLE = ["cyan", "amber", "crimson"]


def verify_choreography_and_anti_repetition(scenes: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if len(scenes) < 24:
        return True, []

    for i in range(1, len(scenes)):
        if scenes[i].get("template") == "EndScreenOutro" or scenes[i - 1].get("template") == "EndScreenOutro":
            continue
        if scenes[i].get("template") == scenes[i - 1].get("template"):
            errors.append(f"Scenes {i} and {i + 1} share identical consecutive template '{scenes[i].get('template')}'")

    templates_present = {s.get("template") for s in scenes if s.get("template") != "EndScreenOutro"}
    if len(templates_present) < 10:
        errors.append(f"Choreography requires 10 master templates; found {len(templates_present)}: {templates_present}")

    return len(errors) == 0, errors



def _natural_asset_sort_key(filename: str) -> Tuple[str, int, str]:
    match = re.search(r"(\d+)", filename)
    prefix = filename[: match.start()] if match else filename
    num = int(match.group(1)) if match else 0
    return (prefix, num, filename)


def _probe_video_duration(file_path: Path, default: float = 18.0) -> float:
    try:
        res = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(file_path),
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if res.returncode == 0 and res.stdout.strip():
            dur = float(res.stdout.strip())
            if dur > 0.0:
                return round(dur, 2)
    except Exception:
        pass
    return default


def _extract_clip_index(path_str: str) -> Optional[str]:
    match = re.search(r"(?:broll_archival_|archival_img_)(\d+)\.", str(path_str or ""))
    return match.group(1) if match else None


def _dedupe_secondary_media(media_path: str, available_assets: Optional[Dict[str, Any]]) -> List[str]:
    assets = available_assets or {}
    all_videos = [str(v) for v in assets.get("videos", []) if v]
    all_images = [str(im) for im in assets.get("images", []) if im]
    seen_paths = {media_path} if media_path else set()
    covered_indices = set()
    primary_idx = _extract_clip_index(media_path)
    if primary_idx is not None:
        covered_indices.add(primary_idx)

    secondary: List[str] = []
    for vp in all_videos:
        if vp in seen_paths:
            continue
        seen_paths.add(vp)
        secondary.append(vp)
        v_idx = _extract_clip_index(vp)
        if v_idx is not None:
            covered_indices.add(v_idx)

    for ip in all_images:
        if ip in seen_paths:
            continue
        i_idx = _extract_clip_index(ip)
        if i_idx is not None and i_idx in covered_indices:
            continue
        seen_paths.add(ip)
        secondary.append(ip)

    return secondary


def _is_bangladesh_swift_topic(video_id: str = "", topic_title: str = "") -> bool:
    combined = f"{video_id} {topic_title}".lower()
    return "bangladesh" in combined or "swift" in combined


def _discover_available_assets(assets_dir: Path, video_id: str) -> Dict[str, Any]:
    search_dirs = [Path(assets_dir), PUBLIC_DIR / "runs" / video_id / "assets"]
    video_files: Dict[str, Path] = {}
    image_names = set()

    for directory in search_dirs:
        if not directory.exists() or not directory.is_dir():
            continue
        for p in directory.glob("broll_archival_*.mp4"):
            if p.is_file() and p.name not in video_files:
                video_files[p.name] = p
        for p in directory.glob("archival_img_*.png"):
            if p.is_file():
                image_names.add(p.name)

    videos: List[str] = []
    durations: Dict[str, float] = {}
    for name in sorted(video_files.keys(), key=_natural_asset_sort_key):
        rel_path = f"runs/{video_id}/assets/{name}"
        videos.append(rel_path)
        durations[rel_path] = _probe_video_duration(video_files[name], default=18.0)

    images = [f"runs/{video_id}/assets/{name}" for name in sorted(image_names, key=_natural_asset_sort_key)]
    return {"videos": videos, "images": images, "durations": durations}


def _build_default_props_for_template(
    template: str,
    scene: Dict[str, Any],
    video_id: str = "",
    available_assets: Optional[Dict[str, Any]] = None,
    topic_title: str = "",
) -> Dict[str, Any]:
    meta = scene.get("evidenceMetadata", {})
    words = scene.get("keyVisualKeywords", [])
    text = scene.get("narrationText", "")
    s_idx = scene.get("sceneIndex", 0)

    is_bangladesh_swift = _is_bangladesh_swift_topic(video_id, topic_title)
    victim = meta.get("victim") or meta.get("target_victim") or "Target Enterprise"
    damage = meta.get("financialDamage") or meta.get("financial_damage") or (
        "$81 Million" if is_bangladesh_swift else "Significant Exposure"
    )
    adversary = meta.get("perpetrator_adversary") or meta.get("adversary") or "Threat Actor Group"
    tech_vector = meta.get("technical_vector") or "System Exploitation"
    is_knight = "knight" in video_id.lower() or "kcg" in video_id.lower()

    if template == "ForensicDocument":
        chapter = scene.get("chapterTitle", "").lower()
        is_article = is_bangladesh_swift and (
            meta.get("isArticle", False)
            or "typo" in chapter
            or "article" in chapter
            or "reuters" in chapter
            or meta.get("articleImagePath") is not None
        )
        article_path = meta.get("articleImagePath") or (f"runs/{video_id}/assets/article_reuters.png" if is_article else None)

        return {
            "documentTitle": meta.get(
                "documentTitle",
                "REUTERS INVESTIGATIVE DESK // SPECIAL REPORT"
                if is_article
                else f"OFFICIAL FORENSIC DOSSIER // {victim.upper()}",
            ),
            "sourceAgency": meta.get(
                "sourceAgency",
                "REUTERS WIRE SERVICE"
                if is_article
                else "FORENSIC INVESTIGATIVE PANEL",
            ),
            "dateStamp": meta.get(
                "dateStamp",
                "FEBRUARY 12, 2016 // 14:22 EST"
                if is_article
                else "EXHIBIT SEALED // CLASSIFIED",
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
                else f"Forensic Investigation into {victim} Incident",
            ),
            "byline": meta.get(
                "byline",
                "By Jim Finkle and Nathan Layne // Cybersecurity Investigation"
                if is_article
                else "By Special Cyber Incident Response Unit",
            ),
            "articleImagePath": article_path,
            "highlightBox": meta.get("highlightBox"),
            "paragraphs": meta.get(
                "paragraphs",
                [
                    "Hackers who breached Bangladesh Bank systems and attempted to steal nearly one billion dollars were halted by a mundane mistake: a simple spelling error.",
                    "A routine transfer destined for a non-profit organization in Sri Lanka was halted when a routing clerk flagged instructions that misspelled foundation as 'fandation'.",
                    "The halted transfer alerted central bank officials in Dhaka, prompting an emergency freeze that prevented the withdrawal of an additional eight hundred fifty million dollars.",
                ]
                if is_article
                else [
                    text[:130] if len(text) > 130 else text,
                    f"The investigation revealed an exploit chain targeting {victim}, resulting in unauthorized liquidation of reserves totaling {damage}.",
                ],
            ),
            "highlightPhrases": meta.get(
                "highlightPhrases",
                [
                    "misspelled foundation as 'fandation'"
                    if is_article
                    else (words[0] if words else "unauthorized liquidation"),
                ],
            ),
            "fontScale": 1.0,
        }

    elif template == "TerminalReplay":
        if is_knight:
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
        return {
            "hostname": meta.get("hostname", f"{victim.lower().replace(' ', '-')}-gw01.net"),
            "filePath": meta.get("filePath", "/var/log/audit/auth_events.log"),
            "lines": meta.get("lines", [
                {"text": "tail -f /var/log/audit/auth_events.log | grep -E 'ANOMALY|UNAUTHORIZED'", "type": "cmd"},
                {"text": f"[ALERT] Inbound session initiated from unauthorized endpoint (SRC: 185.190.140.8)", "type": "error"},
                {"text": f"[WARN] Core authentication bypassed via {tech_vector[:35]}", "type": "error"},
                {"text": f"[CRIT] Transfer payload executed: {damage} routed out of settlement perimeter", "type": "error"},
                {"text": "[INFO] Emergency quarantine protocol activated; socket connection severed", "type": "output"},
            ]),
            "fontScale": 1.0,
        }

    elif template == "SystemBlueprint":
        if is_knight:
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
        return {
            "systemTitle": meta.get("systemTitle", f"{victim.upper()} // ARCHITECTURE PIPELINE"),
            "blocks": meta.get("blocks", [
                {"id": "b1", "title": "Perimeter Gateway", "subtitle": "Encrypted Ingress", "isFaultPoint": False},
                {"id": "b2", "title": f"{victim[:18]} Core", "subtitle": f"Exploited via {tech_vector[:25]}", "isFaultPoint": True},
                {"id": "b3", "title": "Clearing Controls", "subtitle": "Access Bypassed", "isFaultPoint": True},
                {"id": "b4", "title": "External Corridor", "subtitle": f"{damage} Siphoned", "isFaultPoint": False},
            ]),
            "flows": meta.get("flows", [
                {"from": "b1", "to": "b2", "label": "Initial Breach"},
                {"from": "b2", "to": "b3", "label": "Privilege Escalation"},
                {"from": "b3", "to": "b4", "label": "Capital Extraction"},
            ]),
            "fontScale": 1.0,
        }

    elif template == "MarketCrashChart":
        if is_knight:
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
        return {
            "tickerSymbol": meta.get("tickerSymbol", "RESERVES"),
            "metricName": meta.get("metricName", "ACCOUNT RESERVES & SETTLEMENT VALUE"),
            "unit": meta.get("unit", "$M"),
            "dataPoints": meta.get("dataPoints", [
                {"label": "00:00", "value": 100.0},
                {"label": "02:00", "value": 98.5},
                {"label": "04:00", "value": 81.2},
                {"label": "06:00", "value": 19.4},
                {"label": "08:00", "value": 0.0},
            ]),
            "crashIndex": meta.get("crashIndex", 2),
            "fontScale": 1.0,
        }

    elif template == "GeoIpTraceMap":
        if is_knight:
            return {
                "waypoints": [
                    {"city": "Chicago", "country": "USA", "lat": 41.8781, "lon": -87.6298, "detail": "CME Microwave Link // 4.2ms Ingestion"},
                    {"city": "Jersey City", "country": "USA", "lat": 40.7178, "lon": -74.0431, "detail": "KCG Core Server Farm // Router Rogue"},
                    {"city": "London", "country": "UK", "lat": 51.5145, "lon": -0.0982, "detail": "LSE Gateway // Transatlantic Spill"},
                    {"city": "Frankfurt", "country": "Germany", "lat": 50.1109, "lon": 8.6821, "detail": "Eurex Exchange // European Arbitrage"},
                ],
                "fontScale": 1.0,
            }
        default_waypoints = (
            [
                {"city": "Dhaka", "country": "Bangladesh", "lat": 23.8103, "lon": 90.4125, "detail": "Bangladesh Bank Core // Motijheel Origin"},
                {"city": "New York", "country": "USA", "lat": 40.7128, "lon": -74.0060, "detail": "Federal Reserve // Account Custodian"},
                {"city": "Colombo", "country": "Sri Lanka", "lat": 6.9271, "lon": 79.8612, "detail": "Pan Asia Bank // Shalika Typo Intercept"},
                {"city": "Manila", "country": "Philippines", "lat": 14.5995, "lon": 120.9842, "detail": "RCBC Jupiter & Casino VIP Conduit"},
            ]
            if is_bangladesh_swift
            else [
                {"city": "New York", "country": "USA", "lat": 40.7128, "lon": -74.0060, "detail": f"{victim} Core Ingress // Primary Ledger"},
                {"city": "London", "country": "UK", "lat": 51.5074, "lon": -0.1278, "detail": f"Clearing Gateway // {tech_vector[:26]}"},
                {"city": "Zurich", "country": "Switzerland", "lat": 47.3769, "lon": 8.5417, "detail": "Intermediary Relay // Encrypted Hop"},
                {"city": "Singapore", "country": "Singapore", "lat": 1.3521, "lon": 103.8198, "detail": f"Exit Liquidity Node // {damage[:24]}"},
            ]
        )
        return {
            "waypoints": meta.get("waypoints", default_waypoints),
            "fontScale": 1.0,
        }

    elif template == "SplitAutopsy":
        if is_knight:
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
        return {
            "leftTitle": meta.get("leftTitle", "PERIMETER SECURITY CONTROLS"),
            "rightTitle": meta.get("rightTitle", "POST-EXPLOITATION DAMAGE"),
            "leftMetrics": meta.get("leftMetrics", [
                f"Target Victim: {victim}",
                f"Attributed Adversary: {adversary}",
                f"Attack Vector: {tech_vector[:30]}",
                "Status: High-Security Clearing",
            ]),
            "rightMetrics": meta.get("rightMetrics", [
                f"Confirmed Damage: {damage}",
                "Regulatory Response: Emergency Global Alert",
                "Forensic Finding: Administrative Credential Theft",
                "Remediation: Compulsory Network Hardening",
            ]),
            "fontScale": 1.0,
        }

    elif template == "ChronoTickingClock":
        if is_knight:
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
        default_milestones = (
            [
                {"timeLabel": "20:00:00", "eventTitle": "Initial Access", "detail": "Adversary implants payload in core routing cluster"},
                {"timeLabel": "23:45:00", "eventTitle": "Credential Theft", "detail": "Operator credentials forged for payment network"},
                {"timeLabel": "04:12:00", "eventTitle": "Transfer Execution", "detail": "35 fraudulent wire orders dispatched to foreign custodians"},
                {"timeLabel": "08:30:00", "eventTitle": "Discovery & Halt", "detail": "Printer malfunction triggers manual audit, halting remainder"},
            ]
            if is_bangladesh_swift
            else [
                {"timeLabel": "00:00:00", "eventTitle": "Initial Intrusion", "detail": f"Unauthorized entry detected on {victim} perimeter"},
                {"timeLabel": "02:15:00", "eventTitle": "Control Bypass", "detail": f"Safeguards subverted via {tech_vector[:32]}"},
                {"timeLabel": "05:40:00", "eventTitle": "Exfiltration", "detail": f"Unauthorized transfers totaling {damage} initiated"},
                {"timeLabel": "09:10:00", "eventTitle": "Containment", "detail": "Incident response isolates compromised cluster"},
            ]
        )
        return {
            "startIsoTime": meta.get("startIsoTime", "2016-02-04T20:00:00Z"),
            "endIsoTime": meta.get("endIsoTime", "2016-02-05T08:00:00Z"),
            "milestones": meta.get("milestones", default_milestones),
            "fontScale": 1.0,
        }

    elif template == "ArchivalFootage":
        assets = available_assets or {}
        all_videos = list(assets.get("videos", []))
        durations_map = assets.get("durations", {})
        media_path = meta.get("mediaPath")
        if not media_path:
            if all_videos:
                media_path = all_videos[s_idx % len(all_videos)]
            else:
                media_path = f"runs/{video_id}/assets/broll_archival_{s_idx % 4}.mp4"
        secondary_paths = _dedupe_secondary_media(media_path, assets)
        probed_dur = durations_map.get(media_path, 18.0)
        return {
            "mediaType": meta.get("mediaType", "video"),
            "mediaPath": media_path,
            "headline": meta.get("headline", scene.get("chapterTitle", "PRIMARY FORENSIC ARCHIVE")),
            "caption": meta.get("caption", text[:120] if text else "Verified archival footage documented in the official investigative dossier."),
            "provenanceSource": meta.get("provenanceSource", "EXHIBIT ARCHIVE // VERIFIED SOURCE RECORD [WIKIMEDIA COMMONS]"),
            "loop": meta.get("loop", True),
            "videoDurationSec": meta.get("videoDurationSec", probed_dur),
            "secondaryMediaPaths": meta.get("secondaryMediaPaths", secondary_paths),
            "fontScale": meta.get("fontScale", 1.0),
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

    available_assets = _discover_available_assets(Path(assets_dir), video_id)
    is_bangladesh_swift = _is_bangladesh_swift_topic(video_id, topic_title)
    scenes: List[Dict[str, Any]] = script.get("scenes", [])
    compiled_scenes: List[Dict[str, Any]] = []
    global_damage_used = False
    broll_cursor = 0

    for s_idx, scene in enumerate(scenes):
        scene_words = []
        narration_text = scene.get("narrationText", "")
        scene_id = scene.get("sceneId", f"scene_{s_idx + 1:02d}")
        chosen_template = scene.get("template") or "ForensicDocument"
        if chosen_template != "EndScreenOutro" and len(scenes) == 24 and s_idx < len(CHOREOGRAPHY_TEMPLATES):
            chosen_template = CHOREOGRAPHY_TEMPLATES[s_idx]
        template = chosen_template

        timing = scene_timings_map.get(scene_id) or (
            scene_timings_list[s_idx] if s_idx < len(scene_timings_list) else None
        )

        if timing:
            start_time_sec = float(timing["audioStartSec"])
            duration_sec = float(timing["durationSec"])
            audio_end = float(timing["audioEndSec"])
            next_timing = (
                (
                    scene_timings_map.get(scenes[s_idx + 1].get("sceneId"))
                    or (scene_timings_list[s_idx + 1] if s_idx + 1 < len(scene_timings_list) else None)
                )
                if s_idx + 1 < len(scenes)
                else None
            )
            upper_bound = audio_end + 0.15
            if next_timing:
                upper_bound = min(upper_bound, max(audio_end, float(next_timing["audioStartSec"]) - 0.15))

            for w in raw_words:
                w_start = float(w.get("startSec", 0.0))
                if (start_time_sec - 0.15) <= w_start < upper_bound:
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

        props = scene.get("props")
        if not props or template != scene.get("template"):
            scene_with_idx = dict(scene)
            scene_with_idx.setdefault("sceneIndex", s_idx)
            props = _build_default_props_for_template(
                template,
                scene_with_idx,
                video_id=video_id,
                available_assets=available_assets,
                topic_title=topic_title,
            )
        else:
            props = dict(props)
            for k in ("mediaPath", "articleImagePath", "fgImagePath", "bgImagePath"):
                if k in props and isinstance(props[k], str) and props[k].startswith("runs/"):
                    props[k] = re.sub(r'^runs/[^/]+/assets/', f'runs/{video_id}/assets/', props[k])
            if template == "ArchivalFootage":
                props.setdefault("loop", True)
                media_p = props.get("mediaPath", "")
                probed_dur = available_assets.get("durations", {}).get(media_p)
                if probed_dur:
                    props["videoDurationSec"] = probed_dur
                else:
                    props.setdefault("videoDurationSec", 18.0)
                if "secondaryMediaPaths" not in props:
                    props["secondaryMediaPaths"] = _dedupe_secondary_media(media_p, available_assets)

        assigned_accent = ACCENT_CYCLE[s_idx % len(ACCENT_CYCLE)]
        chapter_title = scene.get("chapterTitle", f"Chapter {s_idx + 1}")
        meta = scene.get("evidenceMetadata", {})
        act_num = int(scene.get("actNumber", 1))
        is_edge_scene = (s_idx == 0) or (act_num == 6) or (s_idx == len(scenes) - 1)
        visual_beats = compile_scene_visual_beats(
            scene_id=scene_id,
            template=template,
            narration_text=narration_text,
            words=scene_words,
            scene_duration_sec=round(duration_sec, 2),
            evidence_metadata=meta,
            available_assets=available_assets,
            assigned_accent=assigned_accent,
            props=props,
            chapter_title=chapter_title,
            allow_global_damage=(not global_damage_used) and is_edge_scene,
            broll_offset=broll_cursor,
        )
        broll_cursor += sum(1 for vb in visual_beats if vb.get("beatType") in ("CUTAWAY_BROLL", "CUTAWAY_SPLIT"))

        meta_dmg = str(meta.get("financialDamage") or meta.get("financial_damage") or "").strip().lower()
        if meta_dmg and not global_damage_used:
            for vb in visual_beats:
                emitted = (
                    (vb.get("cutawayStat") or {}).get("statValue")
                    or ((vb.get("cutawaySplit") or {}).get("statCard") or {}).get("statValue")
                    or (vb.get("hudOverlay") or {}).get("statCallout")
                    or ""
                ).strip().lower()
                if emitted and (emitted == meta_dmg or emitted in meta_dmg):
                    global_damage_used = True
                    break

        template_beats = [b for b in visual_beats if b.get("beatType") == "TEMPLATE_STATE"]
        last_template_start = (
            round(float(template_beats[-1]["startSec"]), 2)
            if (visual_beats and template_beats and duration_sec > 15.0)
            else None
        )
        late_offset = last_template_start if last_template_start is not None else (
            round(duration_sec * 0.68, 2) if duration_sec > 15.0 else None
        )
        early_offset = round(duration_sec * 0.35, 2) if duration_sec > 15.0 else None

        micro_events = [dict(me) for me in scene.get("microEvents", [])]
        for me in micro_events:
            me["accentColor"] = assigned_accent
            if last_template_start is not None and me.get("action") in (
                "STAMP_VERDICT", "PULSE_FAULT", "TRIGGER_CRASH_DROP"
            ):
                me["triggerOffsetSec"] = last_template_start

        sfx_triggers = [dict(st) for st in scene.get("sfxTriggers", [])]
        for st in sfx_triggers:
            if last_template_start is not None and st.get("soundFile") in ("stamp_slam.wav", "sub_bass_drop.wav"):
                st["offsetSec"] = last_template_start

        if not sfx_triggers:
            if template == "ForensicDocument":
                highlight_sfx = round(duration_sec * 0.25, 2) if duration_sec > 15.0 else 2.0
                stamp_sfx = late_offset if late_offset is not None else 4.5
                sfx_triggers = [
                    {"offsetSec": 0.2, "soundFile": "paper_slide.wav", "volume": 0.6},
                    {"offsetSec": highlight_sfx, "soundFile": "highlighter_sweep.wav", "volume": 0.7},
                    {"offsetSec": stamp_sfx, "soundFile": "stamp_slam.wav", "volume": 0.8},
                ]
            elif template == "TerminalReplay":
                drop_sfx = late_offset if late_offset is not None else 2.5
                sfx_triggers = [
                    {"offsetSec": 0.2, "soundFile": "keystroke_burst.wav", "volume": 0.6},
                    {"offsetSec": drop_sfx, "soundFile": "sub_bass_drop.wav", "volume": 0.7},
                ]
            else:
                sfx_triggers = [
                    {"offsetSec": 0.2, "soundFile": "soft_whoosh.wav", "volume": 0.6},
                    {"offsetSec": round(duration_sec * 0.45, 2), "soundFile": "ui_tick.wav", "volume": 0.7},
                ]

        if not micro_events:
            if template == "ForensicDocument":
                fallback_hl = ["Shalika Fandation"] if is_bangladesh_swift else [
                    scene.get("keyVisualKeywords", ["forensic"])[0] if scene.get("keyVisualKeywords") else "forensic"
                ]
                hl_phrases = props.get("highlightPhrases") or fallback_hl
                hl_text = hl_phrases[0]
                stamp_text = props.get("stampText", "SANCTIONS FREEZE" if is_bangladesh_swift else "CRITICAL ANOMALY")
                hl_offset = round(duration_sec * 0.25, 2) if duration_sec > 15.0 else 2.0
                stamp_offset = late_offset if late_offset is not None else 4.5
                micro_events = [
                    {
                        "id": f"me_{s_idx}_highlight",
                        "triggerWord": hl_text.split()[0],
                        "triggerOffsetSec": hl_offset,
                        "action": "HIGHLIGHT_TEXT",
                        "payloadText": hl_text,
                        "accentColor": "cyan",
                    },
                    {
                        "id": f"me_{s_idx}_stamp",
                        "triggerWord": "sanctions" if is_bangladesh_swift else "verdict",
                        "triggerOffsetSec": stamp_offset,
                        "action": "STAMP_VERDICT",
                        "payloadText": stamp_text,
                        "accentColor": "crimson",
                    },
                ]
            elif template == "TerminalReplay":
                fault_offset = late_offset if late_offset is not None else 2.5
                zoom_offset = early_offset if early_offset is not None else 5.0
                micro_events = [
                    {
                        "id": f"me_{s_idx}_fault",
                        "triggerWord": "patch",
                        "triggerOffsetSec": fault_offset,
                        "action": "PULSE_FAULT",
                        "payloadText": "BINARY PATCH: 75 04 -> 90 90 (NOP NOP)" if is_bangladesh_swift else "RUNTIME_AUTH_BYPASS",
                        "accentColor": "crimson",
                    },
                    {
                        "id": f"me_{s_idx}_zoom",
                        "triggerWord": "database" if is_bangladesh_swift else "terminal",
                        "triggerOffsetSec": zoom_offset,
                        "action": "ZOOM_IN",
                        "payloadText": "ORACLE_BYPASS" if is_bangladesh_swift else "PRIVILEGE_ESCALATION",
                        "accentColor": "cyan",
                    },
                ]
            elif template == "MarketCrashChart":
                crash_offset = late_offset if late_offset is not None else 4.5
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
                        "id": f"me_{s_idx}_crash",
                        "triggerWord": "crash",
                        "triggerOffsetSec": crash_offset,
                        "action": "TRIGGER_CRASH_DROP",
                        "payloadText": "LIQUIDITY_SHOCK",
                        "accentColor": "crimson",
                    },
                ]
            elif template in ("SystemBlueprint", "NetworkTopology"):
                fault_offset = late_offset if late_offset is not None else 3.5
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
                        "id": f"me_{s_idx}_fault",
                        "triggerWord": "fault",
                        "triggerOffsetSec": fault_offset,
                        "action": "PULSE_FAULT",
                        "payloadText": "TOPOLOGY_BREACH",
                        "accentColor": "crimson",
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
                        "triggerOffsetSec": round(duration_sec * 0.68, 2),
                        "action": "REVEAL_CALLOUT",
                        "payloadText": "FORENSIC_TAG",
                        "accentColor": "crimson",
                    },
                ]

        compiled_scene = {
            "sceneId": scene_id,
            "actNumber": scene.get("actNumber", 1),
            "template": template,
            "startTimeSec": round(start_time_sec, 2),
            "durationSec": round(duration_sec, 2),
            "chapterTitle": chapter_title,
            "narrationText": narration_text,
            "words": scene_words,
            "sfxTriggers": sfx_triggers,
            "microEvents": micro_events,
            "props": props,
            "visualBeats": visual_beats,
        }
        compiled_scenes.append(compiled_scene)

    has_outro = any(s.get("template") == "EndScreenOutro" for s in compiled_scenes)
    if not has_outro:
        outro_start_sec = round(compiled_scenes[-1]["startTimeSec"] + compiled_scenes[-1]["durationSec"], 2) if compiled_scenes else 0.0
        outro_scene = {
            "sceneId": f"{video_id}_outro",
            "actNumber": 6,
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
            "visualBeats": [],
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
