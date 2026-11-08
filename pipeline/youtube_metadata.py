"""
YouTube Metadata & Nano Bana 2 Pro Thumbnail Prompt Generator.
Compiles SEO-optimized YouTube packages:
- 3 High-CTR Title Options (Hook, Investigative, Search-Optimized)
- Chapter Markers / Timestamps formatted for YouTube scrubbing
- Rich SEO Description, 25-35 Keyword Tags, Hashtags, and Pinned Comment
- Photorealistic Nano Bana 2 Pro / Imagen 3 Cinematic Thumbnail Prompts (16:9 & 9:16)
Outputs both youtube_metadata.json and human-readable youtube_metadata.txt.
"""

import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional


def format_seconds_to_timestamp(sec: float) -> str:
    total_sec = int(round(sec))
    mins = total_sec // 60
    secs = total_sec % 60
    return f"{mins}:{secs:02d}"


def derive_topic_entities(topic: str, script_data: Dict[str, Any]) -> Dict[str, Any]:
    t_lower = topic.lower()
    entities = {
        "primary_entity": topic,
        "focal_subject": "forensic financial documents and glowing data terminals",
        "dollar_metric": "",
        "category": "Financial Crime / Cyber Investigation",
    }

    if "bangladesh" in t_lower or "swift" in t_lower:
        entities["primary_entity"] = "Bangladesh Bank & The Federal Reserve"
        entities["focal_subject"] = "the 31-story Bangladesh Bank Motijheel tower shrouded in midnight fog with glowing digital transfer wires connecting to the New York Federal Reserve"
        entities["dollar_metric"] = "$951 Million"
        entities["category"] = "Cyber-Heist & Nation-State Infiltration"
    elif "knight" in t_lower or "440" in t_lower:
        entities["primary_entity"] = "Knight Capital Group & NYSE"
        entities["focal_subject"] = "the chaotic New York Stock Exchange floor at opening bell with flashing red liquidation screens and corrupted algorithmic server racks"
        entities["dollar_metric"] = "$440 Million"
        entities["category"] = "Algorithmic Trading & High-Frequency Collapse"
    elif "wirecard" in t_lower or "marsalek" in t_lower:
        entities["primary_entity"] = "Wirecard AG & Markus Braun"
        entities["focal_subject"] = "the sleek glass facade of Wirecard headquarters in Aschheim Munich at night, casting red warning reflections onto audit ledgers and falsified Philippine bank letters"
        entities["dollar_metric"] = "€1.9 Billion"
        entities["category"] = "Corporate Accounting Fraud & Fugitive FinTech"
    elif "gox" in t_lower or "bitcoin" in t_lower:
        entities["primary_entity"] = "Mt. Gox & Mark Karpeles"
        entities["focal_subject"] = "a physical gold Bitcoin locked inside an abandoned Tokyo bank vault with encrypted cold wallet hard drives and glowing memory dump screens"
        entities["dollar_metric"] = "850,000 Bitcoins"
        entities["category"] = "Cryptocurrency Exchange Exploit"
    elif "pipeline" in t_lower or "darkside" in t_lower:
        entities["primary_entity"] = "Colonial Pipeline & DarkSide"
        entities["focal_subject"] = "massive industrial fuel pipelines cutting through dark pine forests with red scada terminal emergency shutoff overrides"
        entities["dollar_metric"] = "$5 Million Ransom"
        entities["category"] = "Critical Infrastructure Ransomware"

    return entities


def generate_youtube_metadata(
    topic: str,
    script_data: Dict[str, Any],
    timeline_data: Dict[str, Any],
    output_dir: Path,
) -> Dict[str, Any]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    entities = derive_topic_entities(topic, script_data)
    scenes = timeline_data.get("scenes", script_data.get("scenes", []))

    # 1. High-CTR Titles (3 distinct angles)
    clean_topic = topic.strip()
    if entities["dollar_metric"]:
        title_1 = f"The {entities['dollar_metric']} Disaster: How One Mistake Erased Everything"
        title_2 = f"{clean_topic} — The Full Forensic Investigation"
        title_3 = f"How {entities['primary_entity']} Was Infiltrated | Forensic Documentary"
    else:
        title_1 = f"The Unthinkable Collapse: Inside {clean_topic}"
        title_2 = f"{clean_topic} — Complete Forensic Dissection"
        title_3 = f"How It Happened: The Untold Story of {clean_topic}"

    # 2. Chapters / Timestamps
    chapters = []
    for s_idx, scene in enumerate(scenes):
        start_sec = float(scene.get("startTimeSec", 0.0))
        time_str = format_seconds_to_timestamp(start_sec)
        title = scene.get("chapterTitle", f"Act {scene.get('actNumber', 1)}: Forensic Evidence")
        chapters.append(f"{time_str} - {title}")

    # 3. Rich Description
    duration_min = round(float(timeline_data.get("totalDurationSec", 60.0)) / 60.0, 1)
    description_lines = [
        f"An in-depth forensic investigation into {clean_topic}.",
        "",
        "Behind closed doors, a single vulnerability, corrupted line of code, or falsified balance sheet triggered one of the most consequential events in modern financial history. In this comprehensive documentary, we reconstruct the exact sequence of events using primary source documents, server logs, network topologies, and official regulatory filings.",
        "",
        "TIMESTAMPS:",
        "\n".join(chapters),
        "",
        "INVESTIGATION EXHIBITS ANALYZED:",
        "• Primary regulatory enforcement filings and audit statements",
        "• Internal server logs, routing execution scripts, and database hooks",
        "• Cross-border capital flight routes and financial forensics",
        "",
        "SUBSCRIBE for more deep-dive forensic documentaries on technological mysteries, financial heists, and catastrophic system failures.",
        "",
        "DISCLAIMER: This documentary is produced for investigative, educational, and historical analysis purposes under fair use guidelines.",
    ]
    description = "\n".join(description_lines)

    # 4. SEO Tags (30 high-ranking keywords)
    base_tags = [
        "documentary",
        "forensic investigation",
        "financial crime",
        "cyber heist",
        "true crime documentary",
        "investigative journalism",
        "history documentary",
        "cold case",
        "system failure",
        "audit report",
    ]
    topic_keywords = [w.strip(".,;:?!()\"'").lower() for w in clean_topic.split() if len(w) > 3]
    entity_keywords = [w.lower() for w in entities["primary_entity"].split() if len(w) > 3]
    combined_tags = list(dict.fromkeys(topic_keywords + entity_keywords + [clean_topic.lower()] + base_tags))[:32]

    # 5. Hashtags
    hashtags = [
        "#Documentary",
        "#ForensicInvestigation",
        "#TrueCrime",
        "#FinancialFraud",
        "#TechMystery",
    ]

    # 6. Pinned Comment
    pinned_comment = (
        f"Which moment of the {clean_topic} investigation shocked you the most? "
        "Let us know your theories in the comments below. We read every response.\n\n"
        "Watch our latest short-form forensic breakdowns on our channel page!"
    )

    # 7. Nano Bana 2 Pro / Imagen 3 Cinematic Thumbnail Prompts
    focal = entities["focal_subject"]
    nanobana_16_9 = (
        f"Cinematic 8k documentary YouTube thumbnail for '{title_1}'. "
        f"Hyper-realistic, dramatic low-key forensic lighting, central focal subject of {focal} "
        "emerging from deep obsidian shadows (#080A0F), subtle glowing tactical cyan (#00F5D4) data pulses "
        "and warning crimson (#FF2A54) rim light, atmospheric dust particles and volumetric haze, "
        "anamorphic 35mm f/1.8 lens, high contrast, clean composition with generous negative space on the left third "
        "for bold title text overlay. Photorealistic, masterpiece, Unreal Engine 5 render style, Arri Alexa cinematography "
        "--ar 16:9 --style raw"
    )

    nanobana_9_16 = (
        f"Dramatic vertical 9:16 cinematic YouTube Shorts thumbnail for '{title_1}'. "
        f"Extreme close-up of {focal} surrounded by glowing data telemetry, red exclamation warning badges, "
        "and high-contrast forensic lighting, deep obsidian black background with intense atmospheric rim illumination, "
        "mobile-optimized vertical portrait composition, photorealistic, 8k --ar 9:16 --style raw"
    )

    metadata_pkg = {
        "titles": [title_1, title_2, title_3],
        "primaryTitle": title_1,
        "description": description,
        "chapters": chapters,
        "tags": combined_tags,
        "hashtags": hashtags,
        "pinnedComment": pinned_comment,
        "nanobanaPrompt_16_9": nanobana_16_9,
        "nanobanaPrompt_9_16": nanobana_9_16,
    }

    # Write JSON
    json_path = output_dir / "youtube_metadata.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(metadata_pkg, f, indent=2)

    # Write formatted TXT for human copy-pasting
    txt_path = output_dir / "youtube_metadata.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("VEXLOCI // YOUTUBE METADATA & PRODUCTION PACKAGE\n")
        f.write("=" * 70 + "\n\n")

        f.write("### RECOMMENDED TITLES (Pick 1 for highest CTR):\n")
        f.write(f"1. [Intrigue/Hook]:      {title_1}\n")
        f.write(f"2. [Documentary]:        {title_2}\n")
        f.write(f"3. [Search-Optimized]:   {title_3}\n\n")

        f.write("-" * 70 + "\n")
        f.write("### YOUTUBE DESCRIPTION:\n")
        f.write("-" * 70 + "\n")
        f.write(description + "\n\n")

        f.write("-" * 70 + "\n")
        f.write("### YOUTUBE TAGS (Copy-paste directly into YouTube Studio tag box):\n")
        f.write("-" * 70 + "\n")
        f.write(", ".join(combined_tags) + "\n\n")

        f.write("-" * 70 + "\n")
        f.write("### HASHTAGS:\n")
        f.write("-" * 70 + "\n")
        f.write(" ".join(hashtags) + "\n\n")

        f.write("-" * 70 + "\n")
        f.write("### PINNED COMMENT:\n")
        f.write("-" * 70 + "\n")
        f.write(pinned_comment + "\n\n")

        f.write("=" * 70 + "\n")
        f.write("### NANOBANA 2 PRO // CINEMATIC THUMBNAIL PROMPTS\n")
        f.write("=" * 70 + "\n\n")
        f.write("[16:9 Long-Form Thumbnail Prompt]:\n")
        f.write(nanobana_16_9 + "\n\n")
        f.write("[9:16 Vertical Shorts Thumbnail Prompt]:\n")
        f.write(nanobana_9_16 + "\n")

    return {
        "json_path": json_path,
        "txt_path": txt_path,
        "metadata": metadata_pkg,
    }
