"""
Dynamic Scene Beat Director.
Clusters narration sentences and Whisper word timestamps into bounded (0.4s-8.5s)
visual beats and emits VisualBeatSchema payloads with verified forensic metrics.
"""

import math
import re
from typing import Any, Dict, List, Optional, Tuple

from pipeline.beat_alignment import (
    _CLAUSE_BREAK_WORDS,
    _WORD_NUMBERS,
    _allocate_text_to_beats,
    _best_word_split_index,
    _cut_time_at_word_idx,
    _group_word_chunks,
    _is_continuation_word,
    _join_word_tokens,
    _pick_trigger_word,
    compute_word_pauses,
    segment_narration_into_sentences,
)

__all__ = [
    "CAMERA_MOTIONS",
    "HIGHLIGHT_MODES",
    "VALID_ACCENTS",
    "compute_word_pauses",
    "segment_narration_into_sentences",
    "cluster_into_visual_beats",
    "compile_scene_visual_beats",
]

CAMERA_MOTIONS: Tuple[str, ...] = (
    "PUSH_IN", "DRIFT_LEFT", "FOCUS_PUNCH", "DRIFT_RIGHT", "PULL_OUT", "IMPACT_SHAKE",
)
HIGHLIGHT_MODES: Tuple[str, ...] = ("reveal_step", "spotlight", "glow", "pulse_fault")
VALID_ACCENTS = {"cyan", "amber", "crimson"}

_POSITIVE_DELTA_KEYWORDS = (
    "seize", "seized", "recover", "recovered", "halt", "halted", "freeze",
    "froze", "frozen", "prevent", "prevented", "block", "blocked", "save",
    "saved", "arrest", "arrested", "convict", "convicted", "restored",
    "compliant", "intercept", "intercepted", "stopped",
)
_NEGATIVE_DELTA_KEYWORDS = (
    "drain", "drained", "loss", "lost", "stolen", "steal", "breach",
    "breached", "crash", "crashed", "wipeout", "wiped", "fraud",
    "fraudulent", "compromise", "compromised", "liability", "liabilities",
    "damage", "plummet", "plummeted", "erased", "siphoned", "vanish",
    "vanished", "collapse", "collapsed", "defunct", "bankrupt",
)
_MONTH_NAMES = (
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
)


def _cluster_without_words(
    sentences: List[Dict[str, Any]],
    scene_duration_sec: float,
    max_beat_sec: float,
) -> List[Dict[str, Any]]:
    dur = max(0.5, float(scene_duration_sec))
    full_text = " ".join(s.get("text", "").strip() for s in sentences if s.get("text")).strip()
    k = 1 if dur <= 8.5 else max(2, math.ceil(dur / max_beat_sec))
    tokens = full_text.split()
    beats: List[Dict[str, Any]] = []
    curr_start = 0.0
    for idx in range(k):
        beat_dur = round(dur / k, 2) if idx < k - 1 else round(dur - curr_start, 2)
        if tokens:
            t0 = round((idx / k) * len(tokens))
            t1 = len(tokens) if idx == k - 1 else round(((idx + 1) / k) * len(tokens))
            snippet = " ".join(tokens[t0:t1]).strip() or full_text
        else:
            snippet = full_text
        first_tok = re.sub(r"[^\w$€£%.-]", "", (snippet.split()[0] if snippet else "")) or "beat"
        beats.append({
            "beatIndex": idx, "startSec": curr_start, "durationSec": beat_dur,
            "narrationSnippet": snippet, "triggerWord": first_tok, "words": [],
        })
        curr_start = round(sum(b["durationSec"] for b in beats), 2)
    return beats


def _dp_partition_boundaries(
    words: List[Dict[str, Any]],
    scene_duration_sec: float,
    min_beat_sec: float,
    max_beat_sec: float,
    sentence_boundary_set: set,
) -> List[int]:
    n_words = len(words)
    legal_indices = [0] + [
        m for m in range(1, n_words)
        if not _is_continuation_word(str(words[m].get("word", "")).strip(), str(words[m - 1].get("word", "")).strip())
    ] + [n_words]

    cut_times: Dict[int, float] = {}
    prev_t = 0.0
    for idx in legal_indices:
        mono_t = max(prev_t, min(scene_duration_sec, _cut_time_at_word_idx(words, idx, scene_duration_sec)))
        cut_times[idx] = mono_t
        prev_t = mono_t
    cut_times[n_words] = scene_duration_sec

    node_bonus: Dict[int, float] = {0: 0.0, n_words: 0.0}
    for m in legal_indices[1:-1]:
        prev_w = str(words[m - 1].get("word", "")).strip()
        curr_w = str(words[m].get("word", "")).strip()
        prev_core = prev_w.rstrip("\"'”’)]")
        gap = max(0.0, float(words[m].get("startSec", 0.0)) - float(words[m - 1].get("endSec", 0.0)))
        bonus = gap * 60.0
        if m in sentence_boundary_set or prev_core.endswith((".", "!", "?")):
            bonus += 120.0
        elif prev_core.endswith((";", ":", "—", "--")):
            bonus += 85.0
        elif prev_core.endswith((",", ")")):
            bonus += 55.0
        if re.sub(r"[^\w]", "", curr_w).lower() in _CLAUSE_BREAK_WORDS:
            bonus += 25.0
        node_bonus[m] = bonus

    ideal_dur = 0.5 * (min_beat_sec + max_beat_sec)
    k_nodes = len(legal_indices)
    dp, parent = [-1e15] * k_nodes, [-1] * k_nodes
    dp[0] = 0.0

    for j_pos in range(1, k_nodes):
        j_idx = legal_indices[j_pos]
        t_j, j_bonus = cut_times[j_idx], node_bonus[j_idx]
        for i_pos in range(j_pos - 1, -1, -1):
            b_dur = t_j - cut_times[legal_indices[i_pos]]
            if b_dur < 0.5:
                continue
            if b_dur > 18.0 and dp[j_pos] > -1e12:
                break
            if min_beat_sec <= b_dur <= max_beat_sec:
                dur_score = -0.6 * ((b_dur - ideal_dur) ** 2)
            elif 4.5 <= b_dur <= 8.5:
                dur_score = -80.0 - 40.0 * max(0.0, b_dur - max_beat_sec, min_beat_sec - b_dur)
            else:
                dur_score = -5000.0 - 1200.0 * max(0.0, b_dur - 8.5, 4.5 - b_dur)
            cand = dp[i_pos] + dur_score + j_bonus
            if cand > dp[j_pos]:
                dp[j_pos], parent[j_pos] = cand, i_pos

    path: List[int] = []
    cur = k_nodes - 1
    while cur > 0:
        path.append(legal_indices[cur])
        cur = parent[cur]
        if cur < 0:
            break
    path.reverse()
    return [idx for idx in path[:-1] if 0 < idx < n_words]


def _merge_sliver_entries(entries: List[Dict[str, Any]], min_dur: float = 0.45, max_dur: float = 8.5) -> List[Dict[str, Any]]:
    while len(entries) > 1:
        sliver_idx = next((i for i, e in enumerate(entries) if (e["end"] - e["start"]) < min_dur), None)
        if sliver_idx is None:
            break
        left_ok, right_ok = sliver_idx > 0, sliver_idx < len(entries) - 1
        if left_ok and right_ok:
            ld = entries[sliver_idx - 1]["end"] - entries[sliver_idx - 1]["start"]
            rd = entries[sliver_idx + 1]["end"] - entries[sliver_idx + 1]["start"]
            sd = entries[sliver_idx]["end"] - entries[sliver_idx]["start"]
            if ld + sd <= max_dur and (rd + sd > max_dur or ld <= rd):
                target = sliver_idx - 1
            elif rd + sd <= max_dur:
                target = sliver_idx + 1
            else:
                target = sliver_idx - 1 if ld <= rd else sliver_idx + 1
        else:
            target = sliver_idx - 1 if left_ok else sliver_idx + 1

        lo, hi = min(sliver_idx, target), max(sliver_idx, target)
        a, b = entries[lo], entries[hi]
        merged_words = a["words"] + b["words"]
        s_a, s_b = a["snippet"].strip(), b["snippet"].strip()
        merged_snip = s_a if s_a == s_b else f"{s_a} {s_b}".strip()
        entries[lo:hi + 1] = [{
            "start": a["start"], "end": b["end"], "words": merged_words,
            "snippet": merged_snip or _join_word_tokens(merged_words),
        }]
    return entries


def _split_oversized_entry(entry: Dict[str, Any], scene_dur: float) -> List[Dict[str, Any]]:
    start, end = entry["start"], entry["end"]
    dur, b_words, snippet = end - start, entry["words"], entry["snippet"]
    k = max(2, math.ceil(dur / 8.2))

    if k == 2 and len(b_words) >= 2:
        mid_t, best_m, best_dist, best_t = 0.5 * (start + end), None, 1e9, 0.5 * (start + end)
        for m in range(1, len(b_words)):
            if _is_continuation_word(str(b_words[m].get("word", "")).strip(), str(b_words[m - 1].get("word", "")).strip()):
                continue
            t_m = max(start, min(end, _cut_time_at_word_idx(b_words, m, scene_dur)))
            if 0.45 <= (t_m - start) <= 8.5 and 0.45 <= (end - t_m) <= 8.5 and abs(t_m - mid_t) < best_dist:
                best_dist, best_m, best_t = abs(t_m - mid_t), m, t_m
        if best_m is not None:
            toks = snippet.split()
            sp = max(1, min(len(toks) - 1, round((best_m / len(b_words)) * len(toks)))) if len(toks) > 1 else len(toks)
            return [
                {"start": start, "end": best_t, "words": b_words[:best_m], "snippet": " ".join(toks[:sp]).strip() or snippet},
                {"start": best_t, "end": end, "words": b_words[best_m:], "snippet": " ".join(toks[sp:]).strip() or snippet},
            ]

    chunks = _group_word_chunks(b_words)
    slice_words: List[List[Dict[str, Any]]] = [[] for _ in range(k)]
    slice_dur, prev_slice = dur / k, 0
    for ch in chunks:
        ch_mid = 0.5 * (float(ch[0].get("startSec", start)) + float(ch[-1].get("endSec", start)))
        s_idx = min(k - 1, max(prev_slice, int((ch_mid - start) / max(0.01, slice_dur))))
        slice_words[s_idx].extend(ch)
        prev_slice = s_idx

    toks = snippet.split()
    out: List[Dict[str, Any]] = []
    for idx in range(k):
        s_t = start + idx * slice_dur
        e_t = end if idx == k - 1 else start + (idx + 1) * slice_dur
        if toks:
            t0 = round((idx / k) * len(toks))
            t1 = len(toks) if idx == k - 1 else round(((idx + 1) / k) * len(toks))
            sub_snip = " ".join(toks[t0:t1]).strip() or snippet
        else:
            sub_snip = snippet
        out.append({"start": s_t, "end": e_t, "words": slice_words[idx], "snippet": sub_snip})
    return out


def _finalize_beat_entries(entries: List[Dict[str, Any]], dur: float) -> List[Dict[str, Any]]:
    entries = _merge_sliver_entries(entries)
    for _ in range(6):
        oversized = next((i for i, e in enumerate(entries) if (e["end"] - e["start"]) > 8.5), None)
        if oversized is None:
            break
        entries[oversized:oversized + 1] = _split_oversized_entry(entries[oversized], dur)
        entries = _merge_sliver_entries(entries)

    beats: List[Dict[str, Any]] = []
    curr_start = 0.0
    for idx, entry in enumerate(entries):
        beat_dur = round(max(0.45, entry["end"] - curr_start), 2) if idx < len(entries) - 1 else round(dur - curr_start, 2)
        b_words = entry["words"]
        snippet = entry["snippet"].strip() or _join_word_tokens(b_words) or "Forensic exhibit."
        beats.append({
            "beatIndex": idx, "startSec": curr_start, "durationSec": beat_dur,
            "narrationSnippet": snippet, "triggerWord": _pick_trigger_word(b_words, snippet), "words": b_words,
        })
        curr_start = round(sum(b["durationSec"] for b in beats), 2)

    if len(beats) >= 2 and beats[-1]["durationSec"] > 8.5:
        excess = round(beats[-1]["durationSec"] - 8.5, 2)
        if beats[-2]["durationSec"] + excess <= 8.5:
            beats[-2]["durationSec"] = round(beats[-2]["durationSec"] + excess, 2)
            beats[-1]["startSec"] = round(beats[-1]["startSec"] + excess, 2)
            beats[-1]["durationSec"] = round(dur - beats[-1]["startSec"], 2)

    if len(beats) >= 2 and beats[-1]["durationSec"] <= 0.4:
        deficit = round(0.45 - beats[-1]["durationSec"], 2)
        if beats[-2]["durationSec"] - deficit >= 0.45:
            beats[-2]["durationSec"] = round(beats[-2]["durationSec"] - deficit, 2)
            beats[-1]["startSec"] = round(beats[-1]["startSec"] - deficit, 2)
            beats[-1]["durationSec"] = round(dur - beats[-1]["startSec"], 2)

    return beats


def cluster_into_visual_beats(
    sentences: List[Dict[str, Any]],
    words: List[Dict[str, Any]],
    scene_duration_sec: float,
    min_beat_sec: float = 4.8,
    max_beat_sec: float = 8.2,
) -> List[Dict[str, Any]]:
    """Partitions a scene into contiguous 0.4s-8.5s visual beats aligned to word boundaries."""
    dur = max(0.5, float(scene_duration_sec))
    clean_words = [dict(w) for w in (words or [])]
    if not clean_words:
        return _cluster_without_words(sentences, dur, max_beat_sec)

    n_words = len(clean_words)
    sent_bounds = [int(s["wordEndIdx"]) for s in (sentences or [])[:-1] if 0 < int(s.get("wordEndIdx", 0)) < n_words]
    sb_set = set(sent_bounds)

    if dur <= 10.0:
        if dur <= 8.5 and len(sentences or []) <= 1:
            boundaries: List[int] = []
        elif dur <= 8.5:
            mid_cand, best_dist = None, 1e9
            for sb in sent_bounds:
                t_sb = _cut_time_at_word_idx(clean_words, sb, dur)
                if t_sb >= 3.2 and (dur - t_sb) >= 3.2 and abs(t_sb - dur * 0.5) < best_dist:
                    best_dist, mid_cand = abs(t_sb - dur * 0.5), sb
            boundaries = [mid_cand] if mid_cand is not None else []
        else:
            split_idx = _best_word_split_index(clean_words, 0, n_words, 0.0, dur, dur * 0.5, 3.0, 3.0, dur, sb_set)
            boundaries = [split_idx] if split_idx is not None else []
    else:
        boundaries = _dp_partition_boundaries(clean_words, dur, min_beat_sec, max_beat_sec, sb_set)

    pts = [0] + boundaries + [n_words]
    word_ranges = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    prev_ct = 0.0
    cut_times: List[float] = []
    for b in boundaries:
        ct = max(prev_ct, min(dur, _cut_time_at_word_idx(clean_words, b, dur)))
        cut_times.append(ct)
        prev_ct = ct

    snippets = _allocate_text_to_beats(sentences or [], clean_words, word_ranges)
    entries: List[Dict[str, Any]] = []
    prev_end = 0.0
    for idx, (w0, w1) in enumerate(word_ranges):
        end_t = cut_times[idx] if idx < len(cut_times) else dur
        b_words = clean_words[w0:w1]
        entries.append({"start": prev_end, "end": end_t, "words": b_words, "snippet": snippets[idx] if idx < len(snippets) else _join_word_tokens(b_words)})
        prev_end = end_t
    return _finalize_beat_entries(entries, dur)


def _parse_worded_currency(text: str) -> Optional[Tuple[str, str]]:
    num_alt = "|".join(_WORD_NUMBERS.keys())
    pattern = re.compile(rf"\b((?:(?:{num_alt}|hundred|and)[\s-]+)*(?:{num_alt}))\s+(billion|million|thousand)\s+dollars?\b", re.IGNORECASE)
    m = pattern.search(text or "")
    if not m:
        return None
    current = 0
    for w in re.split(r"[\s-]+", m.group(1).strip().lower()):
        if w == "hundred":
            current = max(1, current) * 100
        elif w in _WORD_NUMBERS:
            current += _WORD_NUMBERS[w]
    if current <= 0:
        return None
    suffix = {"billion": "B", "million": "M", "thousand": "K"}[m.group(2).lower()]
    return f"${current}{suffix}", m.group(0).strip()


def _extract_stat_candidates(text: str) -> List[Tuple[int, str, str]]:
    if not text:
        return []
    norm = re.sub(r"([$€£])\s*(\d+)\s+\.(\d+)\s*(billion|million|thousand|trillion)?\b", lambda m: f"{m.group(1)}{m.group(2)}.{m.group(3)}{' ' + m.group(4) if m.group(4) else ''}", text, flags=re.IGNORECASE)
    norm = re.sub(r"\b(\d{1,3})\s+(?:zero|-0)\s+(BTC|Bitcoin|ETH|Ethereum)\b", r"\1,000 \2", norm, flags=re.IGNORECASE)
    norm = re.sub(r"\b(\d{1,3})\s+(\d{3})\s+(BTC|Bitcoin|ETH|Ethereum)\b", r"\1,\2 \3", norm, flags=re.IGNORECASE)

    candidates: List[Tuple[int, str, str]] = []
    seen_spans: List[Tuple[int, int]] = []

    def _add(priority: int, val: str, label: str, s: int, e: int) -> bool:
        if any(not (e <= a or s >= b) for a, b in seen_spans):
            return False
        candidates.append((priority, val, label))
        seen_spans.append((s, e))
        return True

    for m in re.finditer(r"([$€£]\s*\d[\d,]*(?:\.\d+)?\s*(?:billion|million|thousand|trillion|[BMKTbmkt])?)\b", norm, re.IGNORECASE):
        raw = re.sub(r"\s+", "", m.group(1))
        for ws, sh in (("billion", "B"), ("million", "M"), ("thousand", "K"), ("trillion", "T")):
            raw = re.sub(ws, sh, raw, flags=re.IGNORECASE)
        has_scale = bool(re.search(r"[BMKT]$", raw, re.IGNORECASE))
        if has_scale:
            raw = raw[:-1] + raw[-1].upper()
        _add(100 if has_scale else 82, raw, "CAPITAL VALUE", m.start(), m.end())

    for m in re.finditer(r"\b(\d[\d,]*(?:\.\d+)?\s*(?:BTC|Bitcoin|ETH|Ethereum|XRP|SOL|USD|EUR))\b", norm, re.IGNORECASE):
        val = re.sub(r"\s+", " ", m.group(1).strip())
        if val.lower().endswith("btc"):
            val = val[:-3].strip() + " BTC"
        _add(95, val, "ASSET VOLUME", m.start(), m.end())

    for m in re.finditer(r"(\d+(?:\.\d+)?%)", norm):
        _add(92, m.group(1), "PERCENTAGE METRIC", m.start(), m.end())

    for m in re.finditer(r"\b(\d[\d,]*(?:\.\d+)?)\s*(transactions|orders|transfers|accounts|servers|nodes|blocks|messages|req/s|ms|hours|minutes|months|years|days|weeks)\b", norm, re.IGNORECASE):
        _add(75, m.group(1), f"{m.group(1)} {m.group(2).upper()}", m.start(), m.end())

    for m in re.finditer(r"\b(\d{1,3}(?:,\d{3})+)\b", norm):
        _add(70, m.group(1), "RECORDED COUNT", m.start(), m.end())

    for m in re.finditer(rf"\b(?:{_MONTH_NAMES})\s+\d{{1,2}},?\s+(?:19\d{{2}}|20\d{{2}})\b", norm, re.IGNORECASE):
        _add(62, re.sub(r"\s+", " ", m.group(0).strip()), "RECORDED DATE", m.start(), m.end())

    for m in re.finditer(r"\b((?:19|20)\d{2})\b", norm):
        _add(55, m.group(1), "TIMELINE YEAR", m.start(), m.end())

    worded = _parse_worded_currency(norm)
    if worded and not candidates:
        candidates.append((85, worded[0], worded[1].upper()[:28]))

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates


def _pick_unused_candidate(candidates: List[Tuple[int, str, str]], used_keys: set) -> Optional[Tuple[int, str, str]]:
    for cand in candidates:
        if re.sub(r"\s+", " ", cand[1].strip().lower()) not in used_keys:
            return cand
    return None


def _derive_headline(snippet: str, chapter_title: str, victim: str, positive: bool) -> str:
    lower = (snippet or "").lower()
    tag = next(
        (lbl for kws, lbl in (
            (("seize", "recover"), "ASSET SEIZURE"), (("drain", "siphon"), "CAPITAL DRAIN"),
            (("transaction", "order"), "TRANSACTION VOLUME"), (("traced", "trace"), "EVIDENCE TRACE"),
            (("loss", "damage", "collapse"), "IMPACT EXPOSURE"),
        ) if any(k in lower for k in kws)),
        None,
    )
    if not tag:
        if chapter_title:
            up = re.sub(r"\s+", " ", chapter_title.upper()).strip()
            tag = up if len(up) <= 26 else (up[:26].rsplit(" ", 1)[0].rstrip("/-:,") or up[:26])
        else:
            tag = "RECOVERY RECORD" if positive else "FORENSIC METRIC"
    return f"{victim.upper()[:18]} // {tag}" if victim else tag


def _clean_subtext(text: str, max_len: int = 115) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if len(cleaned) <= max_len:
        return cleaned
    return f"{cleaned[:max_len - 3].rsplit(' ', 1)[0].rstrip(',;:') }..."


def _build_stat_card_payload(
    primary: Tuple[int, str, str],
    secondary: Optional[Tuple[int, str, str]],
    snippet: str,
    evidence_metadata: Dict[str, Any],
    chapter_title: str,
    accent: str,
) -> Dict[str, Any]:
    lower_snip = (snippet or "").lower()
    delta_positive = sum(1 for kw in _POSITIVE_DELTA_KEYWORDS if kw in lower_snip) > sum(1 for kw in _NEGATIVE_DELTA_KEYWORDS if kw in lower_snip)
    delta_label = (secondary[2] if secondary[1] in secondary[2] else secondary[1]) if secondary is not None else primary[2]
    victim = str(evidence_metadata.get("victim") or evidence_metadata.get("target_victim") or "").strip()
    stat_accent = accent if accent in VALID_ACCENTS else "cyan"
    if not delta_positive and any(k in lower_snip for k in ("drain", "crash", "collapse", "erased", "stolen")):
        stat_accent = "crimson"
    return {
        "headline": _derive_headline(snippet, chapter_title, victim, delta_positive),
        "statValue": primary[1],
        "deltaLabel": delta_label or ("RECOVERY METRIC" if delta_positive else "RISK TELEMETRY"),
        "deltaPositive": bool(delta_positive),
        "subtext": _clean_subtext(snippet or chapter_title or "Verified forensic record."),
        "accentColor": stat_accent,
    }


def _build_broll_payload(
    media_type: str,
    media_path: str,
    beat_index: int,
    beat_duration: float,
    snippet: str,
    chapter_title: str,
    evidence_metadata: Dict[str, Any],
    media_duration_sec: float = 18.0,
) -> Dict[str, Any]:
    victim = str(evidence_metadata.get("victim") or evidence_metadata.get("target_victim") or "").strip()
    doc_title = str(evidence_metadata.get("documentTitle") or "").strip()
    headline = f"{victim.upper()[:20]} // {chapter_title.upper()[:26]}" if victim and chapter_title else (chapter_title.upper()[:42] or doc_title[:42] or "PRIMARY FORENSIC ARCHIVE")
    provenance = str(evidence_metadata.get("sourceAgency") or "EXHIBIT ARCHIVE // VERIFIED PUBLIC RECORD [WIKIMEDIA COMMONS]")
    clip_dur = max(1.0, float(media_duration_sec or 18.0))
    max_offset = max(0.0, clip_dur - max(1.0, beat_duration))
    offset = round((beat_index * 3.0) % max(0.1, max_offset), 2) if max_offset > 0.0 else 0.0
    return {
        "mediaPath": media_path, "mediaType": media_type, "headline": headline,
        "caption": _clean_subtext(snippet or chapter_title or "Archival record aligned to scene narration.", 135),
        "provenanceSource": provenance, "videoDurationSec": round(clip_dur, 2), "videoStartOffsetSec": offset,
    }


def _collect_media_pool(available_assets: Optional[Dict[str, Any]], props: Dict[str, Any]) -> List[Tuple[str, str]]:
    if not available_assets:
        return []
    videos = [str(v) for v in (available_assets.get("videos") or []) if v]
    images = [str(im) for im in (available_assets.get("images") or []) if im]
    covered = {m.group(1) for v in videos for m in [re.search(r"broll_archival_(\d+)\.", v)] if m}
    pool: List[Tuple[str, str]] = [("video", v) for v in videos]
    for im in images:
        m = re.search(r"archival_img_(\d+)\.", im)
        if not (m and m.group(1) in covered):
            pool.append(("image", im))
    primary_media = props.get("mediaPath")
    if primary_media and len(pool) > 1:
        return [item for item in pool if item[1] != primary_media] + [item for item in pool if item[1] == primary_media]
    return pool


def _template_item_capacity(template: str, props: Dict[str, Any]) -> int:
    if template == "ArchivalFootage" and isinstance(props.get("secondaryMediaPaths"), list):
        return max(2, 1 + len(props["secondaryMediaPaths"]))
    key = {
        "SystemBlueprint": "blocks", "TerminalReplay": "lines", "ForensicDocument": "paragraphs",
        "NetworkTopology": "nodes", "CommsIntercept": "messages", "GeoIpTraceMap": "waypoints",
        "ChronoTickingClock": "milestones", "MarketCrashChart": "dataPoints", "SplitAutopsy": "leftMetrics",
    }.get(template)
    return len(props[key]) if key and isinstance(props.get(key), list) and props[key] else 4


def _plan_beat_types(
    beats: List[Dict[str, Any]],
    template: str,
    has_media: bool,
    beat_stat_candidates: List[List[Tuple[int, str, str]]],
    scene_stat_candidates: List[Tuple[int, str, str]],
    fallback_stat_candidate: Optional[Tuple[int, str, str]] = None,
) -> List[str]:
    """Declaratively schedules non-adjacent cutaways with verified non-duplicate stats."""
    n = len(beats)
    if n <= 1:
        return ["TEMPLATE_STATE"] * n

    scene_pool = list(scene_stat_candidates) or ([fallback_stat_candidate] if fallback_stat_candidate else [])
    types = ["TEMPLATE_STATE"] * n
    is_archival = template == "ArchivalFootage"

    if n == 2:
        if beat_stat_candidates[1] or scene_pool:
            types[1] = "CUTAWAY_STATCARD"
        elif has_media and not is_archival:
            types[1] = "CUTAWAY_BROLL"
        return types

    if is_archival:
        stat_idx = next((i for i in range(1, n - 1) if beat_stat_candidates[i]), None)
        if stat_idx is None and scene_pool and n >= 4:
            stat_idx = n // 2
        if stat_idx is not None:
            types[stat_idx] = "CUTAWAY_STATCARD"
        return types

    if n == 3:
        slots = [1]
    elif n == 4:
        slots = [1] if (beat_stat_candidates[1] and not beat_stat_candidates[2]) else [2]
    else:
        odd_slots, even_slots = list(range(1, n - 1, 2)), list(range(2, n - 1, 2))
        odd_score = (sum(1 for i in odd_slots if beat_stat_candidates[i]), len(odd_slots))
        even_score = (sum(1 for i in even_slots if beat_stat_candidates[i]), len(even_slots))
        slots = odd_slots if odd_score >= even_score else even_slots

    used_keys: set = set()
    stat_cutaways = 0
    broll_cutaways = 0
    for idx in slots:
        cand = _pick_unused_candidate(beat_stat_candidates[idx], used_keys) or _pick_unused_candidate(scene_pool, used_keys)
        if cand is not None:
            used_keys.add(re.sub(r"\s+", " ", cand[1].strip().lower()))
            types[idx] = "CUTAWAY_SPLIT" if (has_media and stat_cutaways >= 1) else "CUTAWAY_STATCARD"
            stat_cutaways += 1
        elif has_media and broll_cutaways < 1:
            types[idx] = "CUTAWAY_BROLL"
            broll_cutaways += 1
    return types


def _resolve_global_damage_candidate(
    evidence_metadata: Dict[str, Any],
    props: Dict[str, Any],
    allow_global: bool,
) -> Optional[Tuple[int, str, str]]:
    if not allow_global:
        return None
    meta_damage = str(evidence_metadata.get("financialDamage") or evidence_metadata.get("financial_damage") or "").strip()
    if meta_damage:
        cands = _extract_stat_candidates(meta_damage)
        if cands:
            return cands[0]
    if props.get("totalLossAmount"):
        amt = float(props["totalLossAmount"])
        val = f"${round(amt / 1e9, 2)}B" if amt >= 1e9 else (f"${round(amt / 1e6, 1)}M" if amt >= 1e6 else f"${int(amt):,}")
        return (80, val, str(props.get("lossLabel") or "CAPITAL IMPACT")[:28])
    return None


def compile_scene_visual_beats(
    scene_id: str,
    template: str,
    narration_text: str,
    words: List[Dict[str, Any]],
    scene_duration_sec: float,
    evidence_metadata: Optional[Dict[str, Any]] = None,
    available_assets: Optional[Dict[str, Any]] = None,
    assigned_accent: str = "cyan",
    props: Optional[Dict[str, Any]] = None,
    chapter_title: str = "",
    allow_global_damage: Optional[bool] = None,
    broll_offset: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Compiles a scene into VisualBeatSchema-compliant visual beats."""
    if template == "EndScreenOutro":
        return []

    dur = max(0.5, float(scene_duration_sec))
    meta, scene_props = evidence_metadata or {}, props or {}
    accent = assigned_accent if assigned_accent in VALID_ACCENTS else "cyan"

    sentences = segment_narration_into_sentences(narration_text, words or [], dur)
    raw_beats = cluster_into_visual_beats(sentences, words or [], dur)
    if not raw_beats:
        return []

    media_pool = _collect_media_pool(available_assets, scene_props)
    durations_map = (available_assets or {}).get("durations") or {}
    has_media = len(media_pool) > 0
    beat_stat_cands = [_extract_stat_candidates(b.get("narrationSnippet", "")) for b in raw_beats]
    scene_stat_cands = _extract_stat_candidates(narration_text)

    if allow_global_damage is None:
        allow_fallback = bool((scene_id in ("scene_01", "scene_24") or meta.get("act") in (1, 6)) and not scene_stat_cands)
    else:
        allow_fallback = bool(allow_global_damage and not scene_stat_cands)

    fallback_cand = _resolve_global_damage_candidate(meta, scene_props, allow_fallback)
    beat_types = _plan_beat_types(raw_beats, template, has_media, beat_stat_cands, scene_stat_cands, fallback_cand)

    n_beats = len(raw_beats)
    max_items = max(2, _template_item_capacity(template, scene_props))
    offset_seed = broll_offset if broll_offset is not None else sum(ord(ch) for ch in scene_id)
    media_cursor = offset_seed % len(media_pool) if media_pool else 0
    scene_pool = list(scene_stat_cands) or ([fallback_cand] if fallback_cand else [])

    used_stat_keys: set = set()
    assigned_stats: Dict[int, Tuple[Tuple[int, str, str], Optional[Tuple[int, str, str]]]] = {}
    broll_count = sum(1 for bt in beat_types if bt == "CUTAWAY_BROLL")
    for idx, b_type in enumerate(beat_types):
        if b_type in ("CUTAWAY_STATCARD", "CUTAWAY_SPLIT"):
            primary = _pick_unused_candidate(beat_stat_cands[idx], used_stat_keys) or _pick_unused_candidate(scene_pool, used_stat_keys)
            if primary is None:
                if has_media and template != "ArchivalFootage" and broll_count < 1:
                    beat_types[idx] = "CUTAWAY_BROLL"
                    broll_count += 1
                else:
                    beat_types[idx] = "TEMPLATE_STATE"
                continue
            used_stat_keys.add(re.sub(r"\s+", " ", primary[1].strip().lower()))
            assigned_stats[idx] = (primary, _pick_unused_candidate(beat_stat_cands[idx], used_stat_keys))

    compiled_beats: List[Dict[str, Any]] = []
    prev_target_idx: Optional[int] = None
    transitions = {"CUTAWAY_BROLL": "WHIP_PAN", "CUTAWAY_STATCARD": "SCANLINE_GLITCH", "CUTAWAY_SPLIT": "DISSOLVE", "TEMPLATE_STATE": "DISSOLVE"}

    for idx, rb in enumerate(raw_beats):
        b_type, snippet, b_dur = beat_types[idx], rb.get("narrationSnippet", ""), float(rb["durationSec"])
        phase = {"TEMPLATE_STATE": "ESTABLISH" if idx == 0 else ("VERDICT" if idx == n_beats - 1 else "EVIDENCE"), "CUTAWAY_BROLL": "ARCHIVE", "CUTAWAY_STATCARD": "METRIC", "CUTAWAY_SPLIT": "SPLIT"}[b_type]
        hud_overlay: Dict[str, Any] = {"phaseBadge": f"BEAT {idx + 1:02d}/{n_beats:02d} // {phase}", "telemetryTag": f"{scene_id.upper()} :: {b_type}"}

        if b_type == "TEMPLATE_STATE":
            local_cand = _pick_unused_candidate(beat_stat_cands[idx], used_stat_keys)
            if local_cand is not None:
                hud_overlay["statCallout"] = local_cand[1]
                used_stat_keys.add(re.sub(r"\s+", " ", local_cand[1].strip().lower()))

        beat_dict: Dict[str, Any] = {
            "beatId": f"{scene_id}_beat_{idx + 1:02d}", "beatIndex": idx, "startSec": float(rb["startSec"]),
            "durationSec": b_dur, "beatType": b_type, "triggerWord": rb.get("triggerWord") or "beat",
            "narrationSnippet": snippet, "cameraMotion": CAMERA_MOTIONS[idx % len(CAMERA_MOTIONS)],
            "transitionIn": "CUT" if idx == 0 else transitions[b_type], "hudOverlay": hud_overlay,
        }

        if b_type == "TEMPLATE_STATE":
            target_idx = min(max_items - 1, int((idx / max(1, n_beats - 1)) * max_items))
            if compiled_beats and compiled_beats[-1]["beatType"] == "TEMPLATE_STATE" and target_idx == prev_target_idx:
                target_idx = target_idx + 1 if target_idx + 1 < max_items else max(0, target_idx - 1)
            prev_target_idx = target_idx
            hl_mode = "reveal_step" if idx == 0 else ("pulse_fault" if idx == n_beats - 1 else HIGHLIGHT_MODES[1 + (idx % 2)])
            beat_dict["templateFocus"] = {"targetIndex": target_idx, "highlightMode": hl_mode, "spotlightIntensity": 0.9}
        elif b_type == "CUTAWAY_BROLL":
            m_type, m_path = media_pool[media_cursor % len(media_pool)]
            media_cursor += 1
            beat_dict["cutawayBroll"] = _build_broll_payload(m_type, m_path, idx, b_dur, snippet, chapter_title, meta, float(durations_map.get(m_path, 18.0)))
        elif b_type == "CUTAWAY_STATCARD":
            primary, secondary = assigned_stats[idx]
            beat_dict["cutawayStat"] = _build_stat_card_payload(primary, secondary, snippet, meta, chapter_title, accent)
        elif b_type == "CUTAWAY_SPLIT":
            m_type, m_path = media_pool[media_cursor % len(media_pool)]
            media_cursor += 1
            primary, secondary = assigned_stats[idx]
            beat_dict["cutawaySplit"] = {
                "splitRatio": 0.5,
                "brollMedia": _build_broll_payload(m_type, m_path, idx, b_dur, snippet, chapter_title, meta, float(durations_map.get(m_path, 18.0))),
                "statCard": _build_stat_card_payload(primary, secondary, snippet, meta, chapter_title, accent),
            }
        compiled_beats.append(beat_dict)

    return compiled_beats
