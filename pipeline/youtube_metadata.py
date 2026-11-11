"""
YouTube Metadata & Nano Bana 2 Pro Thumbnail Prompt Generator.
Compiles SEO-optimized YouTube packages:
- 3 High-CTR Title Options (Hook, Investigative, Search-Optimized)
- Chapter Markers / Timestamps formatted for YouTube scrubbing
- Rich SEO Description, 25-35 Keyword Tags, Hashtags, and Pinned Comment
- Photorealistic Nano Bana 2 Pro / Imagen 3 Cinematic Thumbnail Prompts (16:9 & 9:16)
- Dedicated Per-Short 9:16 Thumbnail Prompts with On-Image Typography & Channel Branding
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


_TOPIC_ENTITY_RULES: List[tuple[tuple[str, ...], Dict[str, str]]] = [
    (
        ("bangladesh", "swift"),
        {
            "primary_entity": "Bangladesh Bank & The Federal Reserve",
            "focal_subject": "the 31-story Bangladesh Bank Motijheel tower shrouded in midnight fog with glowing digital transfer wires connecting to the New York Federal Reserve",
            "dollar_metric": "$951 Million",
            "category": "Cyber-Heist & Nation-State Infiltration",
        },
    ),
    (
        ("knight", "440", "smars"),
        {
            "primary_entity": "Knight Capital Group & NYSE",
            "focal_subject": "the chaotic New York Stock Exchange floor at opening bell with flashing red liquidation screens and corrupted algorithmic server racks",
            "dollar_metric": "$440 Million",
            "category": "Algorithmic Trading & High-Frequency Collapse",
        },
    ),
    (
        ("wirecard", "marsalek", "aschheim"),
        {
            "primary_entity": "Wirecard AG & Markus Braun",
            "focal_subject": "the sleek glass facade of Wirecard headquarters in Aschheim Munich at night, casting red warning reflections onto audit ledgers and falsified Philippine bank letters",
            "dollar_metric": "€1.9 Billion",
            "category": "Corporate Accounting Fraud & Fugitive FinTech",
        },
    ),
    (
        ("bitfinex", "lichtenstein", "razzlekhan", "119,756", "120,000 bitcoin"),
        {
            "primary_entity": "Bitfinex, Ilya Lichtenstein & Heather Morgan",
            "focal_subject": "a gleaming metallic Bitcoin hardware cold wallet wired into compromised BitGo multi-sig servers and encrypted DOJ seizure ledgers",
            "dollar_metric": "$4.5 Billion",
            "category": "Cryptocurrency Exchange Breach & DOJ Seizure",
        },
    ),
    (
        ("mt. gox", "mt gox", "karpeles", "willy bot", "850,000"),
        {
            "primary_entity": "Mt. Gox & Mark Karpeles",
            "focal_subject": "a physical gold Bitcoin locked inside an abandoned Tokyo bank vault with encrypted cold wallet hard drives and glowing memory dump screens",
            "dollar_metric": "850,000 Bitcoins",
            "category": "Cryptocurrency Exchange Exploit",
        },
    ),
    (
        ("pipeline", "darkside", "colonial"),
        {
            "primary_entity": "Colonial Pipeline & DarkSide",
            "focal_subject": "massive industrial fuel pipelines cutting through dark pine forests with red scada terminal emergency shutoff overrides",
            "dollar_metric": "$5 Million Ransom",
            "category": "Critical Infrastructure Ransomware",
        },
    ),
    (
        ("ftx", "alameda", "bankman-fried"),
        {
            "primary_entity": "FTX, Alameda Research & Sam Bankman-Fried",
            "focal_subject": "a Bahamian trading desk overlooking falsified FTT balance sheets and an exposed allow_negative database flag",
            "dollar_metric": "$8 Billion",
            "category": "Crypto Exchange Collapse & Institutional Fraud",
        },
    ),
    (
        ("stuxnet", "olympic games", "natanz"),
        {
            "primary_entity": "Operation Olympic Games & Natanz Centrifuges",
            "focal_subject": "rows of metallic uranium enrichment centrifuges inside an underground bunker wired to a compromised Siemens PLC controller",
            "dollar_metric": "1,000 Centrifuges",
            "category": "Nation-State Cyber-Kinetic Sabotage",
        },
    ),
    (
        ("notpetya", "maersk", "sandworm", "eternalpetya"),
        {
            "primary_entity": "NotPetya, Maersk & Sandworm",
            "focal_subject": "stranded shipping container cranes frozen at a dark maritime port beside red boot-sector wiper ransom screens",
            "dollar_metric": "$10 Billion",
            "category": "Global Destructive Wiper Attack",
        },
    ),
    (
        ("terra", "luna", "do kwon", "anchor protocol"),
        {
            "primary_entity": "Terraform Labs, TerraUSD & Do Kwon",
            "focal_subject": "a shattered algorithmic stablecoin peg curve plummeting toward zero across glowing Seoul trading monitors",
            "dollar_metric": "$40 Billion",
            "category": "Algorithmic Stablecoin Death Spiral",
        },
    ),
    (
        ("enron", "raptor", "fastow", "skilling"),
        {
            "primary_entity": "Enron Corporation & Andrew Fastow",
            "focal_subject": "Houston energy trading floors littered with shredded Arthur Andersen audit binders and off-balance-sheet SPE ledgers",
            "dollar_metric": "$74 Billion",
            "category": "Corporate Accounting Fraud & Collapse",
        },
    ),
    (
        ("theranos", "edison", "elizabeth holmes"),
        {
            "primary_entity": "Theranos & Elizabeth Holmes",
            "focal_subject": "a sleek black Edison blood-testing box cracked open in a clinical forensic lab beside falsified proficiency reports",
            "dollar_metric": "$9 Billion",
            "category": "Biotech Valuation Fraud",
        },
    ),
    (
        ("solarwinds", "sunburst", "orion"),
        {
            "primary_entity": "SolarWinds Orion & Sunburst APT",
            "focal_subject": "a signed software update pipeline glowing with injected DLL supply-chain backdoors inside federal server racks",
            "dollar_metric": "18,000 Organizations",
            "category": "Software Supply-Chain Espionage",
        },
    ),
    (
        ("svb", "silicon valley bank"),
        {
            "primary_entity": "Silicon Valley Bank",
            "focal_subject": "a glass Silicon Valley bank headquarters at dusk beside collapsing held-to-maturity Treasury bond curves",
            "dollar_metric": "$42 Billion Run",
            "category": "Digital Bank Run & Duration Crisis",
        },
    ),
    (
        ("lehman", "repo 105"),
        {
            "primary_entity": "Lehman Brothers & Repo 105",
            "focal_subject": "a Manhattan investment bank trading floor with glowing subprime mortgage balance sheets and Repo 105 accounting slips",
            "dollar_metric": "$639 Billion",
            "category": "Systemic Banking Insolvency",
        },
    ),
]


def derive_topic_entities(topic: str, script_data: Dict[str, Any]) -> Dict[str, Any]:
    t_lower = topic.lower()
    entities = {
        "primary_entity": topic,
        "focal_subject": "forensic financial documents and glowing data terminals",
        "dollar_metric": "",
        "category": "Financial Crime / Cyber Investigation",
    }

    matched = False
    for keywords, payload in _TOPIC_ENTITY_RULES:
        if any(kw in t_lower for kw in keywords):
            entities.update(payload)
            matched = True
            break

    if not matched:
        metric_match = re.search(
            r"([$€£]\s*[\d,.]+\s*(?:billion|million|trillion|[BMK])?)",
            topic,
            re.IGNORECASE,
        )
        if metric_match:
            entities["dollar_metric"] = metric_match.group(1).strip()

    return entities


def generate_short_thumbnail_prompts(topic: str, entities: Dict[str, Any]) -> Dict[str, Dict[str, str]]:
    focal = entities.get("focal_subject", "forensic financial documents and data terminals")
    t_lower = topic.lower()

    if "bangladesh" in t_lower or "swift" in t_lower:
        short1_title = "ONE TYPO HALTED $1,000,000,000"
        short2_title = "$951,000,000 DRAIN IN PROGRESS"
        short3_title = "$81M STOLEN // $870M SAVED"
    elif "knight" in t_lower or "440" in t_lower or "smars" in t_lower:
        short1_title = "45 MINUTES ERASED $440,000,000"
        short2_title = "ROGUE ALGO TRIGGERED 4M TRADES"
        short3_title = "BANKRUPT BEFORE THE CLOSING BELL"
    elif "wirecard" in t_lower or "marsalek" in t_lower:
        short1_title = "€1.9 BILLION DISAPPEARED OVERNIGHT"
        short2_title = "FALSIFIED PHILIPPINE BANK ESCROW"
        short3_title = "CEO ARRESTED // COO ON THE RUN"
    elif "bitfinex" in t_lower or "lichtenstein" in t_lower:
        short1_title = "119,756 BITCOIN DRAINED IN HOURS"
        short2_title = "2,072 MULTI-SIG KEYS BYPASSED"
        short3_title = "$4.5B SEIZED FROM ONE CLOUD FILE"
    else:
        primary = str(entities.get("primary_entity") or topic or "THE SYSTEM").strip()
        short_entity = primary.split("&")[0].split(",")[0].strip().upper()[:24]
        metric = str(entities.get("dollar_metric") or "").strip().upper()
        if metric:
            short1_title = f"{metric} SHOCKWAVE // {short_entity}"
            short2_title = f"HOW {short_entity} CONTROLS FAILED"
            short3_title = f"{short_entity} // {metric} AUTOPSY"
        else:
            short1_title = f"THE {short_entity} COLLAPSE"
            short2_title = f"INSIDE THE {short_entity} BREACH"
            short3_title = f"{short_entity} // FORENSIC AUTOPSY"

    nanobana_shorts = {
        "short_01": {
            "title": short1_title,
            "scene": "Hook Detonation",
            "prompt": (
                f"Dramatic vertical 9:16 cinematic YouTube Shorts thumbnail for '{short1_title}'. "
                f"Extreme close-up of {focal} with high-voltage spark detonation, flashing red alarm strobe, "
                "and pristine forensic financial documents flying through air. "
                "2026 Light Editorial cinematic aesthetic, Hasselblad medium format photography, volumetric haze, "
                "hyper-detailed textures. "
                "ATTACHED CHANNEL BRANDING: Reference and integrate the attached channel branding logo into the top corner with an embossed frosted-glass badge. "
                f"ON-IMAGE TYPOGRAPHY: Render photorealistic 3D embossed headline: '{short1_title}' directly on the vertical 9:16 frame in matte porcelain white with warning amber accents. "
                "--ar 9:16 --style raw"
            ),
        },
        "short_02": {
            "title": short2_title,
            "scene": "Infiltration Breach",
            "prompt": (
                f"Dramatic vertical 9:16 cinematic YouTube Shorts thumbnail for '{short2_title}'. "
                "Glowing tactical server rack with severed optic cables, cascading malware telemetry, "
                "and crimson unauthorized transfer warning banners across surveillance screens. "
                "2026 Light Editorial cinematic aesthetic, low-key lighting, sharp rim light, hyper-detailed. "
                "ATTACHED CHANNEL BRANDING: Reference and integrate the attached channel branding logo into the top corner with an embossed frosted-glass badge. "
                f"ON-IMAGE TYPOGRAPHY: Render photorealistic 3D embossed headline: '{short2_title}' directly on the vertical 9:16 frame in matte porcelain white with warning amber accents. "
                "--ar 9:16 --style raw"
            ),
        },
        "short_03": {
            "title": short3_title,
            "scene": "Heist Ledger",
            "prompt": (
                f"Dramatic vertical 9:16 cinematic YouTube Shorts thumbnail for '{short3_title}'. "
                "Forensic accounting audit ledger split in half, glowing digital red debit balances on the left "
                "contrasting with secured green reserve vault locks on the right, high contrast forensic investigation lab. "
                "2026 Light Editorial cinematic aesthetic, 8k resolution, razor sharp macro lens detail. "
                "ATTACHED CHANNEL BRANDING: Reference and integrate the attached channel branding logo into the top corner with an embossed frosted-glass badge. "
                f"ON-IMAGE TYPOGRAPHY: Render photorealistic 3D embossed headline: '{short3_title}' directly on the vertical 9:16 frame in matte porcelain white with warning amber accents. "
                "--ar 9:16 --style raw"
            ),
        },
    }
    return nanobana_shorts


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

    clean_topic = topic.strip()
    if entities["dollar_metric"]:
        title_1 = f"The {entities['dollar_metric']} Disaster: How One Mistake Erased Everything"
        title_2 = f"{clean_topic} — The Full Forensic Investigation"
        title_3 = f"How {entities['primary_entity']} Was Infiltrated | Forensic Documentary"
    else:
        title_1 = f"The Unthinkable Collapse: Inside {clean_topic}"
        title_2 = f"{clean_topic} — Complete Forensic Dissection"
        title_3 = f"How It Happened: The Untold Story of {clean_topic}"

    chapters = []
    for s_idx, scene in enumerate(scenes):
        start_sec = float(scene.get("startTimeSec", 0.0))
        time_str = format_seconds_to_timestamp(start_sec)
        title = scene.get("chapterTitle", f"Act {scene.get('actNumber', 1)}: Forensic Evidence")
        chapters.append(f"{time_str} - {title}")

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

    hashtags = [
        "#Documentary",
        "#ForensicInvestigation",
        "#TrueCrime",
        "#FinancialFraud",
        "#TechMystery",
    ]

    pinned_comment = (
        f"Which moment of the {clean_topic} investigation shocked you the most? "
        "Let us know your theories in the comments below. We read every response.\n\n"
        "Watch our latest short-form forensic breakdowns on our channel page!"
    )

    focal = entities["focal_subject"]
    nanobana_16_9 = (
        f"Cinematic 8k documentary YouTube thumbnail for '{title_1}'. "
        f"Hyper-realistic, dramatic low-key forensic lighting, central focal subject of {focal} "
        "emerging from deep obsidian shadows (#080A0F), subtle glowing tactical cyan (#00F5D4) data pulses "
        "and warning crimson (#FF2A54) rim light, atmospheric dust particles and volumetric haze, "
        "anamorphic 35mm f/1.8 lens, high contrast, clean composition with generous negative space on the left third "
        "for bold title text overlay. "
        "ATTACHED CHANNEL BRANDING: Reference and integrate the attached channel branding logo into the top corner with an embossed frosted-glass badge. "
        f"ON-IMAGE TYPOGRAPHY: Render photorealistic bold 3D embossed typographic headline: '{title_1}' directly on the thumbnail in matte porcelain white with warning amber accents. "
        "Photorealistic, masterpiece, Unreal Engine 5 render style, Arri Alexa cinematography "
        "--ar 16:9 --style raw"
    )

    nanobana_9_16 = (
        f"Dramatic vertical 9:16 cinematic YouTube Shorts thumbnail for '{title_1}'. "
        f"Extreme close-up of {focal} surrounded by glowing data telemetry, red exclamation warning badges, "
        "and high-contrast forensic lighting, deep obsidian black background with intense atmospheric rim illumination, "
        "mobile-optimized vertical portrait composition, "
        "ATTACHED CHANNEL BRANDING: Reference and integrate the attached channel branding logo into the top corner with an embossed frosted-glass badge. "
        f"ON-IMAGE TYPOGRAPHY: Render photorealistic bold 3D embossed typographic headline: '{title_1}' directly on the vertical 9:16 frame in matte porcelain white with warning amber accents. "
        "photorealistic, 8k --ar 9:16 --style raw"
    )

    nanobana_shorts = generate_short_thumbnail_prompts(topic, entities)

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
        "nanobanaPrompts_shorts": nanobana_shorts,
    }

    json_path = output_dir / "youtube_metadata.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(metadata_pkg, f, indent=2)

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
        f.write("[16:9 Long-Form Master Thumbnail Prompt]:\n")
        f.write(nanobana_16_9 + "\n\n")
        f.write("[9:16 Master Vertical Shorts Thumbnail Prompt]:\n")
        f.write(nanobana_9_16 + "\n\n")
        f.write("-" * 70 + "\n")
        f.write("### PER-SHORT 9:16 THUMBNAIL PROMPTS (Dedicated Scene & Title Prompts)\n")
        f.write("-" * 70 + "\n\n")
        for s_id, s_info in nanobana_shorts.items():
            f.write(f"[{s_id.upper()} // {s_info['scene'].upper()}]:\n")
            f.write(f"Title: {s_info['title']}\n")
            f.write(f"Prompt:\n{s_info['prompt']}\n\n")

    return {
        "json_path": json_path,
        "txt_path": txt_path,
        "metadata": metadata_pkg,
    }
