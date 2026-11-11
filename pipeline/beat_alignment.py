"""
Narration sentence segmentation, Whisper word alignment, and cut-point helpers.
"""

from difflib import SequenceMatcher
import re
from typing import Any, Dict, List, Optional, Tuple


_NON_BREAKING_ABBREVS = {
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "ft", "vs", "v",
    "inc", "corp", "ltd", "co", "llc", "no", "fig", "vol", "rev", "est",
    "approx", "jan", "feb", "mar", "apr", "aug", "sep", "sept", "oct", "nov",
    "dec", "gen", "lt", "col", "sgt", "capt", "sen", "rep", "gov", "pres",
    "al", "dept", "univ", "ave", "blvd", "rd", "cf", "viz", "ca", "pp",
    "ed", "eds", "op", "cit",
}

_CLAUSE_BREAK_WORDS = {
    "and", "but", "while", "which", "where", "when", "that", "before", "after",
    "because", "although", "though", "until", "since", "leaving", "causing",
    "triggering", "allowing", "forcing", "across", "through", "including",
    "prompting", "signaling", "exposing", "draining",
}

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "as", "is", "was", "were", "are", "be", "been",
    "being", "that", "this", "these", "those", "it", "its", "their", "his",
    "her", "they", "into", "across", "through", "under", "over", "after",
    "before", "during", "while", "when", "where", "which", "who",
}

_WORD_NUMBERS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
    "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
    "seventy": 70, "eighty": 80, "ninety": 90,
}

_NUMERIC_WORDS = set(_WORD_NUMBERS.keys()) | {
    "hundred", "thousand", "million", "billion", "trillion",
}

_UNIT_CURRENCY_TOKENS = {
    "btc", "eth", "xrp", "sol", "usd", "eur", "gbp", "bitcoin", "ethereum",
    "dollar", "dollars", "cent", "cents", "percent", "percentage", "%",
}


def compute_word_pauses(words: List[Dict[str, Any]]) -> List[float]:
    """Returns non-negative inter-word silence durations in seconds."""
    n = len(words)
    return [
        max(0.0, float(words[i + 1].get("startSec", 0.0)) - float(words[i].get("endSec", 0.0)))
        if i + 1 < n
        else 0.0
        for i in range(n)
    ]


def _split_sentences(text: str) -> List[str]:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if not cleaned:
        return []
    matches = list(re.finditer(r"\S+", cleaned))
    if not matches:
        return []

    sentences: List[str] = []
    sent_start = matches[0].start()
    tokens_in_sent = 0
    for idx, match in enumerate(matches):
        tok = match.group(0)
        tokens_in_sent += 1
        if idx == len(matches) - 1:
            part = cleaned[sent_start:match.end()].strip()
            if part:
                sentences.append(part)
            break

        stripped = tok.rstrip("\"'”’)]")
        if not stripped or stripped[-1] not in ".!?":
            continue
        if stripped[-1] in "!?":
            part = cleaned[sent_start:match.end()].strip()
            if part:
                sentences.append(part)
            sent_start = matches[idx + 1].start()
            tokens_in_sent = 0
            continue

        next_alpha = matches[idx + 1].group(0).lstrip("\"'“‘([")
        stem = stripped[:-1].lower()
        if (
            (stripped.endswith("...") and next_alpha and next_alpha[0].islower())
            or re.fullmatch(r"(?:[A-Za-z]\.){2,}|[A-Z]\.", stripped)
            or stem in _NON_BREAKING_ABBREVS
            or (stem == "etc" and next_alpha and next_alpha[0].islower())
            or (tokens_in_sent == 1 and re.fullmatch(r"\d{1,2}\.", stripped))
            or (next_alpha and next_alpha[0].islower())
        ):
            continue

        part = cleaned[sent_start:match.end()].strip()
        if part:
            sentences.append(part)
        sent_start = matches[idx + 1].start()
        tokens_in_sent = 0
    return sentences


def _is_no_space_continuation(word_str: str, prev_word_str: str = "") -> bool:
    s = str(word_str or "").strip()
    if not s or s[0] in "-.,;:!?')]}%":
        return True
    return str(prev_word_str or "").strip() in ("$", "€", "£", "(", "[")


def _is_continuation_word(word_str: str, prev_word_str: str = "") -> bool:
    """Returns True when splitting before word_str would bisect a token or multi-token value."""
    s = str(word_str or "").strip()
    if not s or s[0] in "-.,;:!?')]}%":
        return True

    prev = str(prev_word_str or "").strip()
    if not prev:
        return False
    if prev[-1] in "$€£([":
        return True
    if prev.rstrip("\"'”’)]").endswith((".", "!", "?", ";", ":")):
        return False

    s_core = re.sub(r"^[(\"'“‘]+|[.,;:!?\"'”’)]+$", "", s)
    s_lower = s_core.lower()
    curr_is_3digit = bool(re.fullmatch(r"\d{3}", s_core))
    if prev.endswith(","):
        return bool(re.search(r"\d$", prev[:-1])) and curr_is_3digit

    prev_core = re.sub(r"^[(\"'“‘]+|[.,;:!?\"'”’)]+$", "", prev)
    prev_is_numeric = prev[-1].isdigit() or prev[-1] in "$€£" or prev_core.lower() in _NUMERIC_WORDS
    if not prev_is_numeric:
        return False

    return (
        curr_is_3digit
        or bool(re.fullmatch(r"\d+(?:,\d+)*(?:\.\d+)?", s_core))
        or s_lower in _NUMERIC_WORDS
        or s_lower in _UNIT_CURRENCY_TOKENS
    )


def _subtokenize(text: str) -> List[str]:
    return re.findall(r"[a-z]+|\d+", (text or "").lower())


def _token_match_score(s_tok: str, w_raw: str, w_clean: str, is_sent_end: bool, pause_after: float) -> Tuple[float, bool]:
    matched = False
    score = -2.0
    if s_tok == w_clean and s_tok:
        score = 8.0 if len(s_tok) >= 4 else 6.0
        matched = True
    elif len(s_tok) >= 3 and len(w_clean) >= 3 and (s_tok in w_clean or w_clean in s_tok):
        score = 4.0
        matched = True
    elif (s_tok, w_clean) in {("b", "billion"), ("billion", "b"), ("m", "million"), ("million", "m"), ("k", "thousand"), ("thousand", "k")}:
        score = 3.5
        matched = True
    elif len(s_tok) >= 3 and len(w_clean) >= 3 and SequenceMatcher(None, s_tok, w_clean).ratio() >= 0.72:
        score = 3.0
        matched = True

    if is_sent_end:
        if w_raw.rstrip("\"'”’)]").endswith((".", "!", "?")):
            score += 4.5
        if pause_after >= 0.25:
            score += 2.5
    return score, matched


def _sanitize_boundaries(raw_boundaries: List[int], words: List[Dict[str, Any]], n_sents: int) -> List[int]:
    n_words = len(words)
    w_raws = [str(w.get("word", "")).strip() for w in words]

    def _next_legal(pos: int) -> int:
        p = max(0, min(n_words, pos))
        while 0 < p < n_words and _is_continuation_word(w_raws[p], w_raws[p - 1]):
            p += 1
        return p

    sanitized: List[int] = []
    prev = 0
    for b in raw_boundaries:
        legal = max(prev, _next_legal(b))
        if n_words >= n_sents and legal == prev and prev < n_words:
            cand = _next_legal(prev + 1)
            if cand <= n_words:
                legal = cand
        sanitized.append(legal)
        prev = legal
    return [min(n_words, b) for b in sanitized]


def _dp_align_sentence_boundaries(sentences: List[str], words: List[Dict[str, Any]]) -> Tuple[List[int], List[List[str]]]:
    n_words, n_sents = len(words), len(sentences)
    sent_raw_words: List[List[str]] = [s.split() for s in sentences]
    script_tokens: List[Tuple[str, int, bool, int]] = []
    sent_last_token_idx: List[int] = []

    for s_idx, raw_list in enumerate(sent_raw_words):
        sent_token_indices: List[int] = []
        for rw_idx, rw in enumerate(raw_list):
            for sub in _subtokenize(rw):
                sent_token_indices.append(len(script_tokens))
                script_tokens.append((sub, s_idx, False, rw_idx))
        if sent_token_indices:
            last_i = sent_token_indices[-1]
            tok, si, _, rwi = script_tokens[last_i]
            script_tokens[last_i] = (tok, si, True, rwi)
            sent_last_token_idx.append(last_i)
        else:
            sent_last_token_idx.append(-1)

    m_tokens = len(script_tokens)
    if m_tokens == 0 or n_words == 0:
        return [], sent_raw_words

    w_raws = [str(w.get("word", "")).strip() for w in words]
    w_cleans = [re.sub(r"[^\w]", "", wr).lower() for wr in w_raws]
    pauses = compute_word_pauses(words)

    cols = n_words + 1
    dp = [[-1e9] * cols for _ in range(m_tokens + 1)]
    bp = [[0] * cols for _ in range(m_tokens + 1)]
    dp[0][0] = 0.0
    for i in range(1, m_tokens + 1):
        dp[i][0] = dp[i - 1][0] - 1.2
        bp[i][0] = 1
    for j in range(1, cols):
        dp[0][j] = dp[0][j - 1] - 0.6
        bp[0][j] = 2

    for i in range(1, m_tokens + 1):
        s_tok, _, is_end, _ = script_tokens[i - 1]
        prev_row, curr_row, curr_bp = dp[i - 1], dp[i], bp[i]
        for j in range(1, cols):
            sc, _ = _token_match_score(s_tok, w_raws[j - 1], w_cleans[j - 1], is_end, pauses[j - 1])
            diag, up, left = prev_row[j - 1] + sc, prev_row[j] - 1.2, curr_row[j - 1] - 0.6
            if diag >= up and diag >= left:
                curr_row[j], curr_bp[j] = diag, 0
            elif up >= left:
                curr_row[j], curr_bp[j] = up, 1
            else:
                curr_row[j], curr_bp[j] = left, 2

    i, j = m_tokens, n_words
    script_to_word: Dict[int, int] = {}
    match_count = 0
    while i > 0 or j > 0:
        move = bp[i][j]
        if i > 0 and j > 0 and move == 0:
            s_tok, _, is_end, _ = script_tokens[i - 1]
            _, matched = _token_match_score(s_tok, w_raws[j - 1], w_cleans[j - 1], is_end, pauses[j - 1])
            if matched:
                match_count += 1
            script_to_word[i - 1] = j - 1
            i -= 1
            j -= 1
        elif i > 0 and (j == 0 or move == 1):
            i -= 1
        else:
            j -= 1

    if match_count < max(2, int(0.15 * min(m_tokens, n_words))):
        return [], sent_raw_words

    boundaries: List[int] = []
    for k in range(n_sents - 1):
        tok_idx = sent_last_token_idx[k]
        b_idx: Optional[int] = None
        while tok_idx >= 0 and script_tokens[tok_idx][1] == k:
            if tok_idx in script_to_word:
                b_idx = script_to_word[tok_idx] + 1
                break
            tok_idx -= 1
        if b_idx is None:
            prev_b = boundaries[-1] if boundaries else 0
            rem_chars = sum(len(s) for s in sentences[k:])
            ratio = len(sentences[k]) / max(1, rem_chars)
            b_idx = prev_b + max(1, round((n_words - prev_b) * ratio))
        boundaries.append(b_idx)

    return _sanitize_boundaries(boundaries, words, n_sents), sent_raw_words


def _proportional_word_boundaries(sentences: List[str], words: List[Dict[str, Any]]) -> List[int]:
    n_sents, n_words = len(sentences), len(words)
    if n_sents <= 1 or n_words == 0:
        return []

    weights = [max(1, len(s)) for s in sentences]
    total_weight = sum(weights)
    w_raws = [str(w.get("word", "")).strip() for w in words]
    pauses = compute_word_pauses(words)

    boundaries: List[int] = []
    cum_weight, prev_b = 0, 0
    for k in range(n_sents - 1):
        cum_weight += weights[k]
        target = round((cum_weight / total_weight) * n_words)
        search_lo = max(prev_b + (1 if n_words >= n_sents else 0), target - 3)
        search_hi = min(n_words - (n_sents - 1 - k if n_words >= n_sents else 0), target + 3)
        best_b = max(prev_b, min(n_words, target))
        best_score = -1e9
        for cand in range(max(1, search_lo), min(n_words, search_hi + 1)):
            if _is_continuation_word(w_raws[cand], w_raws[cand - 1]):
                continue
            sc = -abs(cand - target) * 1.5 + pauses[cand - 1] * 8.0
            if w_raws[cand - 1].rstrip("\"'”’)]").endswith((".", "!", "?")):
                sc += 6.0
            if sc > best_score:
                best_score, best_b = sc, cand
        boundaries.append(best_b)
        prev_b = best_b
    return _sanitize_boundaries(boundaries, words, n_sents)


def _join_word_tokens(word_dicts: List[Dict[str, Any]]) -> str:
    if not word_dicts:
        return ""
    parts: List[str] = []
    for i, w in enumerate(word_dicts):
        tok = str(w.get("word", "")).strip()
        if not tok:
            continue
        if i > 0 and parts and _is_no_space_continuation(tok, parts[-1]):
            parts[-1] += tok
        else:
            parts.append(tok)
    return " ".join(parts)


def segment_narration_into_sentences(
    narration_text: str,
    words: List[Dict[str, Any]],
    scene_duration_sec: float,
) -> List[Dict[str, Any]]:
    """Splits narration at sentence boundaries and maps monotonically to word timestamps."""
    dur = max(0.0, float(scene_duration_sec))
    clean_words = [dict(w) for w in (words or [])]
    text = (narration_text or "").strip() or _join_word_tokens(clean_words)
    sentences_text = _split_sentences(text)
    if not sentences_text:
        return []

    n_sents, n_words = len(sentences_text), len(clean_words)
    if n_words == 0:
        weights = [max(1, len(s)) for s in sentences_text]
        total_w = sum(weights)
        results: List[Dict[str, Any]] = []
        cursor = 0.0
        for idx, s_txt in enumerate(sentences_text):
            end_t = round(dur, 2) if idx == n_sents - 1 else round(min(dur, cursor + dur * (weights[idx] / total_w)), 2)
            results.append({
                "sentenceIndex": idx, "text": s_txt, "startSec": round(cursor, 2),
                "endSec": end_t, "durationSec": round(max(0.0, end_t - cursor), 2),
                "words": [], "wordStartIdx": 0, "wordEndIdx": 0,
            })
            cursor = end_t
        return results

    if n_sents == 1:
        raw_start = float(clean_words[0].get("startSec", 0.0))
        raw_end = float(clean_words[-1].get("endSec", raw_start))
        s_t = round(max(0.0, min(dur, raw_start)), 2)
        e_t = round(max(s_t, min(dur, raw_end)), 2)
        return [{
            "sentenceIndex": 0, "text": sentences_text[0], "startSec": s_t, "endSec": e_t,
            "durationSec": round(max(0.0, e_t - s_t), 2), "words": clean_words,
            "wordStartIdx": 0, "wordEndIdx": n_words,
        }]

    boundaries, _ = _dp_align_sentence_boundaries(sentences_text, clean_words)
    if not boundaries or len(boundaries) != n_sents - 1:
        boundaries = _proportional_word_boundaries(sentences_text, clean_words)

    bounds_full = [0] + boundaries + [n_words]
    results = []
    prev_end = 0.0
    for idx, s_txt in enumerate(sentences_text):
        w0, w1 = bounds_full[idx], bounds_full[idx + 1]
        s_words = clean_words[w0:w1]
        if s_words:
            raw_start = float(s_words[0].get("startSec", prev_end))
            raw_end = float(s_words[-1].get("endSec", raw_start))
            s_t = round(max(prev_end, min(dur, raw_start)), 2)
            e_t = round(max(s_t, min(dur, raw_end)), 2)
        else:
            s_t = e_t = round(prev_end, 2)
        results.append({
            "sentenceIndex": idx, "text": s_txt, "startSec": s_t, "endSec": e_t,
            "durationSec": round(max(0.0, e_t - s_t), 2), "words": s_words,
            "wordStartIdx": w0, "wordEndIdx": w1,
        })
        prev_end = e_t
    return results


def _cut_time_at_word_idx(words: List[Dict[str, Any]], word_idx: int, scene_duration_sec: float) -> float:
    if word_idx <= 0:
        return 0.0
    if word_idx >= len(words):
        return scene_duration_sec
    prev_end = max(0.0, min(scene_duration_sec, float(words[word_idx - 1].get("endSec", 0.0))))
    next_start = max(0.0, min(scene_duration_sec, float(words[word_idx].get("startSec", prev_end))))
    if next_start > prev_end:
        return next_start - min(0.25, (next_start - prev_end) * 0.5)
    return max(prev_end, next_start)


def _best_word_split_index(
    words: List[Dict[str, Any]],
    i0: int,
    i1: int,
    t_start: float,
    t_end: float,
    target_t: float,
    min_left: float,
    min_right: float,
    scene_duration_sec: float,
    sentence_boundaries: Optional[set] = None,
) -> Optional[int]:
    if i1 - i0 < 2:
        return None
    sb = sentence_boundaries or set()

    def _search(req_left: float, req_right: float) -> Optional[int]:
        best_m: Optional[int] = None
        best_score = -1e9
        for m in range(i0 + 1, i1):
            curr_w = str(words[m].get("word", "")).strip()
            prev_w = str(words[m - 1].get("word", "")).strip()
            if _is_continuation_word(curr_w, prev_w):
                continue
            t_m = max(t_start, min(t_end, _cut_time_at_word_idx(words, m, scene_duration_sec)))
            if (t_m - t_start) < req_left or (t_end - t_m) < req_right:
                continue
            gap = max(0.0, float(words[m].get("startSec", 0.0)) - float(words[m - 1].get("endSec", 0.0)))
            score = -abs(t_m - target_t) * 10.0 + gap * 80.0
            prev_core = prev_w.rstrip("\"'”’)]")
            if m in sb or prev_core.endswith((".", "!", "?")):
                score += 120.0
            elif prev_core.endswith((";", ":", "—", "--")):
                score += 90.0
            elif prev_core.endswith((",", ")")):
                score += 60.0
            if re.sub(r"[^\w]", "", curr_w).lower() in _CLAUSE_BREAK_WORDS:
                score += 28.0
            if score > best_score:
                best_score, best_m = score, m
        return best_m

    for req_l, req_r in ((min_left, min_right), (min(2.5, min_left), min(2.5, min_right)), (0.6, 0.6)):
        found = _search(req_l, req_r)
        if found is not None:
            return found
    return None


def _allocate_text_to_beats(
    sentences: List[Dict[str, Any]],
    words: List[Dict[str, Any]],
    beat_word_ranges: List[Tuple[int, int]],
) -> List[str]:
    if not beat_word_ranges:
        return []
    full_text = " ".join(s.get("text", "").strip() for s in sentences if s.get("text")).strip()
    if not full_text:
        return [_join_word_tokens(words[a:b]) for a, b in beat_word_ranges]
    if not words:
        return [full_text]

    spans = [(int(s.get("wordStartIdx", 0)), int(s.get("wordEndIdx", 0)), s["text"].strip()) for s in sentences if s.get("text")]
    snippets: List[str] = []
    for b_start, b_end in beat_word_ranges:
        parts: List[str] = []
        for s_w0, s_w1, s_txt in spans:
            if s_w1 <= b_start or s_w0 >= b_end:
                continue
            ov_lo, ov_hi = max(s_w0, b_start), min(s_w1, b_end)
            if ov_lo == s_w0 and ov_hi == s_w1:
                parts.append(s_txt)
            else:
                toks = s_txt.split()
                if len(toks) <= 1:
                    if ov_lo == s_w0:
                        parts.append(s_txt)
                else:
                    s_total = max(1, s_w1 - s_w0)
                    t_lo = max(0, min(len(toks) - 1, round(((ov_lo - s_w0) / s_total) * len(toks))))
                    t_hi = max(t_lo + 1, min(len(toks), round(((ov_hi - s_w0) / s_total) * len(toks))))
                    parts.append(" ".join(toks[t_lo:t_hi]))
        snippets.append(" ".join(p for p in parts if p).strip() or _join_word_tokens(words[b_start:b_end]) or full_text)
    return snippets


def _pick_trigger_word(b_words: List[Dict[str, Any]], snippet: str) -> str:
    for w in b_words:
        tok = re.sub(r"^[^\w$€£]+|[^\w%]+$", "", str(w.get("word", "")).strip())
        if len(tok) >= 3 and tok.lower() not in _STOPWORDS:
            return tok
    if b_words and str(b_words[0].get("word", "")).strip():
        return str(b_words[0]["word"]).strip()
    for raw in (snippet or "").split():
        tok = re.sub(r"^[^\w$€£]+|[^\w%]+$", "", raw)
        if len(tok) >= 3 and tok.lower() not in _STOPWORDS:
            return tok
    return snippet.split()[0] if snippet else "beat"


def _group_word_chunks(words: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    if not words:
        return []
    chunks: List[List[Dict[str, Any]]] = [[words[0]]]
    for i in range(1, len(words)):
        curr_w = str(words[i].get("word", "")).strip()
        prev_w = str(words[i - 1].get("word", "")).strip()
        if _is_continuation_word(curr_w, prev_w):
            chunks[-1].append(words[i])
        else:
            chunks.append([words[i]])
    return chunks
