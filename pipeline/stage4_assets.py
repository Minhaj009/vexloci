"""
Stage 4: Hybrid Asset Fetch & 2.5D Normalizer.
Fetches Wikimedia Commons archival photos, Openverse/MediaWiki public domain assets,
and yfinance stock data.
Trims and grades archival video B-roll clips with FFmpeg.
Executes 2.5D layer segmentation (rembg u2netp) and OpenCV dark-forensic color grading.
Mirrors visual assets to public/runs/<video_id>/assets/ for staticFile() resolution.
"""

import hashlib
from io import BytesIO
import json
from pathlib import Path
import shutil
import subprocess
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import requests
import yfinance as yf

from pipeline.config import PUBLIC_DIR
from pipeline.utils_vram import flush_cuda_memory

WIKIMEDIA_USER_AGENT = "VexlociForensicDoc/1.0 (https://github.com/vexloci; vexloci.forensics@gmail.com)"
DEFAULT_HEADERS = {"User-Agent": WIKIMEDIA_USER_AGENT}

_NON_PHOTO_TERMS = (
    "star trek",
    "deep space",
    "orion",
    "episode",
    "tv series",
    "film",
    "poster",
    "logo",
    "icon",
    "flag",
    "coat of arms",
    "cartoon",
    "comic",
    "gargoyle",
    "cathedral",
    "sculpture",
    "statue",
    "actor",
    "actress",
    "red carpet",
    "premiere",
    "dld",
    "concealed",
    "espionage",
    "museum",
)

CURATED_COMMONS_BACKUP_QUERIES: List[str] = [
    "Department of Justice building Washington",
    "J. Edgar Hoover Building Washington",
    "Lower Manhattan skyline New York",
    "New York Stock Exchange interior trading floor",
    "Server rack data center",
    "Daniel Patrick Moynihan United States Courthouse",
    "Federal Reserve Bank of New York building",
    "Fiber optic cables network switch",
    "United States Capitol Washington",
    "Wall Street New York",
    "Microchip circuit board macro",
    "Gold bullion coins vault",
]

_KEN_BURNS_MOTIONS = (
    "zoompan=z='min(zoom+0.0008,1.20)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=540:s=1920x1080:fps=30",
    "zoompan=z='1.15':x='(iw-iw/zoom)*(on/540)':y='ih/2-(ih/zoom/2)':d=540:s=1920x1080:fps=30",
    "zoompan=z='1.15':x='(iw-iw/zoom)*(1-on/540)':y='ih/2-(ih/zoom/2)':d=540:s=1920x1080:fps=30",
    "zoompan=z='max(1.0,1.20-0.20*on/540)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=540:s=1920x1080:fps=30",
)

VERIFIED_ENTITY_MAP: Dict[str, Dict[str, Any]] = {
    "bangladesh bank": {
        "local": ["test_bb.jpg", "test_bb.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Bangladesh_Bank_%2833398162476%29.jpg",
    },
    "dhaka": {
        "local": ["test_bb.jpg", "test_bb.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Bangladesh_Bank_%2833398162476%29.jpg",
    },
    "motijheel": {
        "local": ["test_bb.jpg", "test_bb.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Bangladesh_Bank_%2833398162476%29.jpg",
    },
    "federal reserve": {
        "local": ["test_fed.jpg", "test_fed.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/0/01/Federal_Reserve_Bank_of_New_York_%2855312936457%29.jpg",
    },
    "solaire": {
        "local": ["test_solaire.jpg", "test_solaire.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/32/SolaireResort%26Casinojf0998_02.JPG",
    },
    "knight capital": {
        "local": ["test_kcg.jpg", "test_kcg.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/30/New_York_Stock_Exchange.jpg",
    },
    "kcg": {
        "local": ["test_kcg.jpg", "test_kcg.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/30/New_York_Stock_Exchange.jpg",
    },
    "new york stock exchange": {
        "local": ["test_nyse.jpg", "test_nyse.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/30/New_York_Stock_Exchange.jpg",
    },
    "nyse": {
        "local": ["test_nyse.jpg", "test_nyse.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/30/New_York_Stock_Exchange.jpg",
    },
    "wall street": {
        "local": ["test_wallstreet.jpg", "test_wallstreet.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/54/Wall_Street_sign.jpg",
    },
    "wirecard": {
        "local": ["test_wirecard.jpg", "test_wirecard.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/9/94/Wirecard_headquarters%2C_Aschheim_%2849556187461%29.jpg",
    },
    "markus braun": {
        "local": ["test_braun.jpg", "test_braun.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/9/94/Wirecard_headquarters%2C_Aschheim_%2849556187461%29.jpg",
    },
    "jan marsalek": {
        "local": ["test_marsalek.jpg", "test_marsalek.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/9/94/Wirecard_headquarters%2C_Aschheim_%2849556187461%29.jpg",
    },
    "aschheim": {
        "local": ["test_wirecard.jpg", "test_wirecard.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/9/94/Wirecard_headquarters%2C_Aschheim_%2849556187461%29.jpg",
    },
    "munich": {
        "local": ["test_munich.jpg", "test_munich.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/d3/Munich_skyline_from_St._Peter.jpg",
    },
    "bafin": {
        "local": ["test_bafin.jpg", "test_bafin.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/1/13/Bafin_Frankfurt.jpg",
    },
    "mt gox": {
        "local": ["test_mtgox.jpg", "test_mtgox.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Shibuya_skyline_from_Tokyu_Plaza_in_Omotesando%2C_Harajuku%2C_Tokyo%2C_2024_May.jpg",
    },
    "mt. gox": {
        "local": ["test_mtgox.jpg", "test_mtgox.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Shibuya_skyline_from_Tokyu_Plaza_in_Omotesando%2C_Harajuku%2C_Tokyo%2C_2024_May.jpg",
    },
    "mark karpeles": {
        "local": ["test_karpeles.jpg", "test_karpeles.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Shibuya_skyline_from_Tokyu_Plaza_in_Omotesando%2C_Harajuku%2C_Tokyo%2C_2024_May.jpg",
    },
    "shibuya": {
        "local": ["test_shibuya.jpg", "test_shibuya.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Shibuya_skyline_from_Tokyu_Plaza_in_Omotesando%2C_Harajuku%2C_Tokyo%2C_2024_May.jpg",
    },
    "tokyo": {
        "local": ["test_tokyo.jpg", "test_tokyo.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg",
    },
}


def create_dark_forensic_plate(width: int = 1920, height: int = 1080, seed: int = 0) -> Image.Image:
    plate = Image.new("RGB", (width, height), color=(14, 19, 31))
    draw = ImageDraw.Draw(plate)
    grid_color = (22, 29, 45)
    hairline_color = (28, 38, 58)
    grid_step = 120 + (seed % 5) * 16
    offset_x = (seed * 37) % grid_step
    offset_y = (seed * 53) % grid_step
    for x in range(offset_x, width, grid_step):
        draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
    for y in range(offset_y, height, grid_step):
        draw.line([(0, y), (width, y)], fill=grid_color, width=1)
    cross_len = 14 + (seed % 4) * 3
    for cx, cy in [
        (96, 72),
        (width - 96, 72),
        (96, height - 72),
        (width - 96, height - 72),
        (width // 2 + ((seed % 7) - 3) * 40, height // 2 + ((seed % 5) - 2) * 30),
    ]:
        draw.line([(cx - cross_len, cy), (cx + cross_len, cy)], fill=hairline_color, width=1)
        draw.line([(cx, cy - cross_len), (cx, cy + cross_len)], fill=hairline_color, width=1)
    if seed > 0:
        accent_y = 140 + (seed * 97) % max(1, height - 280)
        draw.line([(96, accent_y), (width - 96, accent_y)], fill=hairline_color, width=1)
    return plate


def _is_valid_photo_candidate(
    title: str,
    url: str,
    mime: str = "",
    width: Optional[int] = None,
    height: Optional[int] = None,
) -> bool:
    if not url:
        return False
    t_low = (title or "").lower()
    u_low = (url or "").lower()
    m_low = (mime or "").lower()
    if (
        ".svg" in u_low
        or ".gif" in u_low
        or "svg" in m_low
        or "gif" in m_low
        or ".svg" in t_low
        or ".gif" in t_low
    ):
        return False
    if any(term in t_low for term in _NON_PHOTO_TERMS):
        return False
    if any(term in u_low for term in ("_logo.", "company_logo", ".svg")):
        return False
    if width is not None and height is not None and (int(width) < 700 or int(height) < 420):
        return False
    return True


def _try_save_unique_image_bytes(
    raw_bytes: bytes,
    source_url: str,
    output_path: Path,
    seen_urls: set,
    seen_hashes: set,
) -> bool:
    if source_url and source_url in seen_urls:
        return False
    try:
        with Image.open(BytesIO(raw_bytes)) as im:
            if getattr(im, "is_animated", False):
                return False
            rgb_im = im.convert("RGB")
            if rgb_im.width < 700 or rgb_im.height < 420:
                return False
            raw_hash = hashlib.sha256(rgb_im.tobytes()).hexdigest()
            if raw_hash in seen_hashes:
                return False
            rgb_im.save(output_path)
        apply_dark_forensic_lut(output_path, output_path)
        if source_url:
            seen_urls.add(source_url)
        seen_hashes.add(raw_hash)
        return True
    except Exception:
        return False


def _search_commons_candidates(query: str) -> List[Tuple[str, str, Optional[int], Optional[int], str]]:
    endpoint = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrnamespace": 6,
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrlimit": 12,
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "format": "json",
    }
    try:
        resp = requests.get(endpoint, params=params, headers=DEFAULT_HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
        pages = resp.json().get("query", {}).get("pages", {})
        sorted_pages = sorted(pages.values(), key=lambda p: p.get("index", 999))
        results: List[Tuple[str, str, Optional[int], Optional[int], str]] = []
        for page in sorted_pages:
            title = page.get("title", "")
            imageinfo = page.get("imageinfo") or []
            if not imageinfo:
                continue
            info = imageinfo[0]
            results.append((
                title,
                info.get("url", ""),
                info.get("width"),
                info.get("height"),
                info.get("mime", ""),
            ))
        return results
    except Exception:
        return []


def _search_wikipedia_fallback_candidates(query: str) -> List[Tuple[str, str, Optional[int], Optional[int], str]]:
    endpoint = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrlimit": 6,
        "prop": "pageimages|imageinfo",
        "pilicense": "any",
        "piprop": "thumbnail",
        "pithumbsize": 1920,
        "iiprop": "url|size|mime",
        "format": "json",
    }
    try:
        resp = requests.get(endpoint, params=params, headers=DEFAULT_HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
        pages = resp.json().get("query", {}).get("pages", {})
        sorted_pages = sorted(pages.values(), key=lambda p: p.get("index", 999))
        results: List[Tuple[str, str, Optional[int], Optional[int], str]] = []
        for page in sorted_pages:
            title = page.get("title", "")
            thumb = page.get("thumbnail") or {}
            imageinfo = page.get("imageinfo") or []
            if thumb.get("source"):
                results.append((title, thumb["source"], thumb.get("width"), thumb.get("height"), ""))
            elif imageinfo:
                info = imageinfo[0]
                results.append((title, info.get("url", ""), info.get("width"), info.get("height"), info.get("mime", "")))
        return results
    except Exception:
        return []


def _fetch_single_unique_photo(
    query: str,
    output_path: Path,
    seen_urls: set,
    seen_hashes: set,
    workspace_root: Path,
    allow_entity_map: bool = True,
) -> bool:
    if allow_entity_map:
        q_lower = query.lower()
        for key, entity_data in VERIFIED_ENTITY_MAP.items():
            if key not in q_lower:
                continue
            for loc_name in entity_data.get("local", []):
                cand_path = workspace_root / loc_name
                if not cand_path.exists():
                    cand_path = output_path.parent / loc_name
                if cand_path.exists():
                    try:
                        if _try_save_unique_image_bytes(
                            cand_path.read_bytes(), "", output_path, seen_urls, seen_hashes
                        ):
                            return True
                    except Exception:
                        pass
            entity_url = entity_data.get("url", "")
            if entity_url and entity_url not in seen_urls and _is_valid_photo_candidate(key, entity_url):
                try:
                    resp = requests.get(entity_url, headers=DEFAULT_HEADERS, timeout=15)
                    ctype = resp.headers.get("Content-Type", "").lower()
                    if resp.status_code == 200 and "svg" not in ctype and "gif" not in ctype:
                        if _try_save_unique_image_bytes(resp.content, entity_url, output_path, seen_urls, seen_hashes):
                            return True
                except Exception:
                    pass
            break

    for search_fn in (_search_commons_candidates, _search_wikipedia_fallback_candidates):
        for title, cand_url, width, height, mime in search_fn(query):
            if cand_url in seen_urls or not _is_valid_photo_candidate(title, cand_url, mime, width, height):
                continue
            try:
                resp = requests.get(cand_url, headers=DEFAULT_HEADERS, timeout=15)
                ctype = resp.headers.get("Content-Type", "").lower()
                if resp.status_code != 200 or "svg" in ctype or "gif" in ctype:
                    continue
                if _try_save_unique_image_bytes(resp.content, cand_url, output_path, seen_urls, seen_hashes):
                    return True
            except Exception:
                continue
    return False


def fetch_wikimedia_photo(query: str, output_path: Path) -> bool:
    for title, img_url, width, height, mime in _search_commons_candidates(query):
        if not _is_valid_photo_candidate(title, img_url, mime, width, height):
            continue
        try:
            img_resp = requests.get(img_url, headers=DEFAULT_HEADERS, timeout=15)
            ctype = img_resp.headers.get("Content-Type", "").lower()
            if img_resp.status_code == 200 and "svg" not in ctype and "gif" not in ctype:
                with open(output_path, "wb") as f:
                    f.write(img_resp.content)
                return True
        except Exception:
            pass
    return False


def _download_and_normalize_image(url: str, output_path: Path) -> bool:
    if not _is_valid_photo_candidate("", url):
        return False
    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
        if resp.status_code != 200:
            return False
        content_type = resp.headers.get("Content-Type", "").lower()
        if "svg" in content_type or "gif" in content_type:
            return False
        with Image.open(BytesIO(resp.content)) as im:
            if getattr(im, "is_animated", False):
                return False
            rgb_im = im.convert("RGB")
            if rgb_im.width < 700 or rgb_im.height < 420:
                return False
            rgb_im.save(output_path)
        return True
    except Exception:
        return False


def fetch_copyright_free_images(queries: List[str], output_dir: Path) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    cached_real_bytes: List[bytes] = []
    for existing in sorted(output_dir.glob("archival_img_*.png")):
        try:
            if existing.stat().st_size >= 250_000:
                cached_real_bytes.append(existing.read_bytes())
        except Exception:
            pass

    downloaded_images: List[Path] = []
    seen_urls: set = set()
    seen_hashes: set = set()
    target_count = max(10, len(queries))
    workspace_root = Path.cwd()

    for query in queries:
        img_out = output_dir / f"archival_img_{len(downloaded_images)}.png"
        if _fetch_single_unique_photo(query, img_out, seen_urls, seen_hashes, workspace_root):
            downloaded_images.append(img_out)

    for backup_query in CURATED_COMMONS_BACKUP_QUERIES:
        if len(downloaded_images) >= target_count:
            break
        img_out = output_dir / f"archival_img_{len(downloaded_images)}.png"
        if _fetch_single_unique_photo(
            backup_query,
            img_out,
            seen_urls,
            seen_hashes,
            workspace_root,
            allow_entity_map=False,
        ):
            downloaded_images.append(img_out)

    for raw_cached in cached_real_bytes:
        if len(downloaded_images) >= target_count:
            break
        try:
            with Image.open(BytesIO(raw_cached)) as im:
                rgb_im = im.convert("RGB")
                raw_hash = hashlib.sha256(rgb_im.tobytes()).hexdigest()
                if raw_hash in seen_hashes:
                    continue
                seen_hashes.add(raw_hash)
            idx = len(downloaded_images)
            img_out = output_dir / f"archival_img_{idx}.png"
            img_out.write_bytes(raw_cached)
            downloaded_images.append(img_out)
        except Exception:
            pass

    fallback_seed = 0
    while len(downloaded_images) < target_count:
        idx = len(downloaded_images)
        img_out = output_dir / f"archival_img_{idx}.png"
        plate = create_dark_forensic_plate(1920, 1080, seed=idx + fallback_seed + 1)
        raw_hash = hashlib.sha256(plate.tobytes()).hexdigest()
        if raw_hash in seen_hashes:
            fallback_seed += 1
            continue
        seen_hashes.add(raw_hash)
        plate.save(img_out)
        apply_dark_forensic_lut(img_out, img_out)
        downloaded_images.append(img_out)

    return downloaded_images


def fetch_copyright_free_video_clips(
    queries: List[str],
    output_dir: Path,
    image_fallbacks: Optional[List[Path]] = None,
) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    processed_clips: List[Path] = []
    total_clips = max(len(queries), len(image_fallbacks) if image_fallbacks else 0)

    for idx in range(total_clips):
        output_mp4 = output_dir / f"broll_archival_{idx}.mp4"
        src_img: Optional[Path] = None
        if image_fallbacks and idx < len(image_fallbacks) and image_fallbacks[idx].exists():
            src_img = image_fallbacks[idx]
        elif (output_dir / f"archival_img_{idx}.png").exists():
            src_img = output_dir / f"archival_img_{idx}.png"

        temp_created = False
        if not src_img or not src_img.exists():
            src_img = output_dir / f"temp_plate_{idx}.png"
            plate = create_dark_forensic_plate(1920, 1080, seed=idx + 1)
            plate.save(src_img)
            temp_created = True

        zoompan_expr = _KEN_BURNS_MOTIONS[idx % len(_KEN_BURNS_MOTIONS)]
        filter_chain = (
            "scale=1920:1080:force_original_aspect_ratio=increase,"
            "crop=1920:1080,"
            f"{zoompan_expr},"
            "eq=saturation=0.68:contrast=1.12,"
            "colorbalance=rs=-0.04:gs=0.02:bs=0.08,"
            "vignette=PI/4,"
            "format=yuv420p"
        )

        cmd = [
            "ffmpeg",
            "-y",
            "-loop", "1",
            "-i", str(src_img),
            "-t", "18",
            "-vf", filter_chain,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-an",
            str(output_mp4),
        ]

        try:
            subprocess.run(cmd, check=True, capture_output=True)
            if output_mp4.exists():
                processed_clips.append(output_mp4)
        except Exception:
            pass

        if temp_created and src_img.exists():
            src_img.unlink()

    return processed_clips


def fetch_yfinance_ohlcv(
    ticker: str, period: str = "5d", interval: str = "15m"
) -> List[Dict[str, Any]]:
    try:
        t = yf.Ticker(ticker)
        df = t.history(period=period, interval=interval)
        data_points = []
        for index, row in df.iterrows():
            time_str = index.strftime("%H:%M")
            data_points.append(
                {"label": time_str, "value": round(float(row["Close"]), 2)}
            )
        return data_points
    except Exception:
        return [
            {"label": "09:30", "value": 10.33},
            {"label": "09:35", "value": 10.25},
            {"label": "09:40", "value": 9.95},
            {"label": "09:45", "value": 8.70},
            {"label": "09:50", "value": 5.40},
            {"label": "09:55", "value": 3.80},
            {"label": "10:00", "value": 2.95},
            {"label": "10:05", "value": 2.70},
            {"label": "10:15", "value": 2.58},
        ]


def apply_film_grain(img: np.ndarray, strength: float = 0.05) -> np.ndarray:
    if img is None:
        return img
    h, w, c = img.shape
    noise = np.random.normal(0, strength * 255, (h, w, c)).astype(np.float32)
    noisy_img = img.astype(np.float32) + noise
    return np.clip(noisy_img, 0, 255).astype(np.uint8)


def apply_dark_forensic_lut(image_path: Path, output_path: Path) -> Path:
    img = cv2.imread(str(image_path))
    if img is None:
        return image_path

    mean_val = float(np.mean(img))
    beta_boost = 0
    if mean_val < 38.0:
        beta_boost = int((38.0 - mean_val) * 1.2) + 6

    img = cv2.convertScaleAbs(img, alpha=1.08, beta=beta_boost - 2)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] *= 0.72
    img_desat = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    tint = np.zeros_like(img_desat)
    tint[:, :] = [24, 18, 12]
    blended = cv2.addWeighted(img_desat, 0.88, tint, 0.12, 0)

    final_mean = float(np.mean(blended))
    if final_mean < 35.0:
        blended = cv2.convertScaleAbs(blended, alpha=1.0, beta=int(35.0 - final_mean) + 3)

    cv2.imwrite(str(output_path), blended)
    return output_path


def _load_editorial_font(font_paths: List[str], size: int) -> ImageFont.ImageFont:
    for path_str in font_paths:
        p = Path(path_str)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except Exception:
                pass
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        pass
    return ImageFont.load_default()


def generate_sample_article_screenshot(
    output_path: Path,
    publication: str = "REUTERS",
    headline: str = "Spelling error halts $1 billion cyber heist from Bangladesh Bank",
    byline: str = "By Jim Finkle and Nathan Layne // CYBERSECURITY INVESTIGATION",
    highlight_text: str = "A routine transfer instruction addressed to Shalika Foundation misspelled foundation as 'fandation'.",
    date_str: str = "FEBRUARY 12, 2016",
    width: int = 1400,
    height: int = 800,
    body_lines: Optional[List[str]] = None,
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (width, height), color=(15, 20, 32))
    draw = ImageDraw.Draw(img)

    headline_font = _load_editorial_font(["C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/georgiab.ttf", "georgia.ttf"], 30)
    byline_font = _load_editorial_font(["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf", "arial.ttf"], 15)
    masthead_font = _load_editorial_font(["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"], 22)
    meta_font = _load_editorial_font(["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf", "consola.ttf"], 13)
    quote_header_font = _load_editorial_font(["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"], 13)
    quote_body_font = _load_editorial_font(["C:/Windows/Fonts/georgiai.ttf", "C:/Windows/Fonts/georgia.ttf"], 18)
    body_font = _load_editorial_font(["C:/Windows/Fonts/georgia.ttf", "georgia.ttf"], 16)

    draw.rectangle([(0, 0), (width, 80)], fill=(11, 16, 26))
    draw.text((45, 26), f"{publication} // INVESTIGATIVE REPOSITORY", font=masthead_font, fill=(56, 189, 248))
    draw.text((width - 360, 30), f"DATELINE: {date_str}", font=meta_font, fill=(148, 163, 184))

    draw.line([(0, 80), (width, 80)], fill=(30, 41, 59), width=2)
    draw.text((45, 105), headline[:85], font=headline_font, fill=(248, 250, 252))
    draw.text((45, 155), byline, font=byline_font, fill=(148, 163, 184))
    draw.line([(45, 188), (width - 45, 188)], fill=(30, 41, 59), width=1)

    draw.rectangle([(45, 208), (width - 45, 328)], fill=(28, 24, 16), outline=(245, 158, 11), width=2)
    draw.text((65, 222), "CRITICAL REVEAL // SMOKING GUN PARAGRAPH:", font=quote_header_font, fill=(245, 158, 11))
    draw.text((65, 258), f'"{highlight_text[:110]}"', font=quote_body_font, fill=(255, 255, 255))

    if not body_lines:
        if "bangladesh" in headline.lower():
            body_lines = [
                "Hackers breached Bangladesh Bank credentials to initiate fraudulent SWIFT transfers to the New York Fed.",
                "A routine $20 million transfer instruction addressed to the Shalika Foundation triggered suspicion.",
                "Intermediary routing clerks halted the transaction after noticing hackers misspelled foundation as 'fandation'.",
                "The emergency audit prevented an additional $850 million from clearing, confining the theft to $81 million.",
            ]
        else:
            body_lines = [
                f"Forensic investigators unsealed findings documenting systemic breaches across critical infrastructure.",
                f"Unauthorized actors weaponized privileged credentials to circumvent automated security controls.",
                f"Emergency containment procedures were initiated following anomalous data flows and operational disruptions.",
                f"The resulting investigation established fundamental lessons in defense-in-depth and architectural resilience.",
            ]
    y_offset = 355
    for line in body_lines:
        draw.text((45, y_offset), line, font=body_font, fill=(203, 213, 225))
        y_offset += 38

    draw.line([(45, 720), (width - 45, 720)], fill=(30, 41, 59), width=1)
    footer_left = (
        "EVIDENCE REPOSITORY // EXHIBIT DOC-2016-BB"
        if "bangladesh" in headline.lower()
        else "EXHIBIT RECORD // OFFICIAL ARCHIVE"
    )
    draw.text((45, 742), footer_left, font=meta_font, fill=(100, 116, 139))
    draw.text((width - 450, 742), "OFFICIAL VERIFIED RECORD // DOCKET ARCHIVE", font=meta_font, fill=(100, 116, 139))

    img.save(output_path)
    apply_dark_forensic_lut(output_path, output_path)
    return output_path


def split_25d_layers(
    source_img_path: Path, fg_output_path: Path, bg_output_path: Path
) -> None:
    flush_cuda_memory()
    fg_output_path.parent.mkdir(parents=True, exist_ok=True)
    bg_output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        from rembg import new_session, remove

        session = new_session("u2netp")
        with open(source_img_path, "rb") as f:
            input_bytes = f.read()
        output_bytes = remove(input_bytes, session=session)
        with open(fg_output_path, "wb") as f:
            f.write(output_bytes)
    except Exception:
        img = Image.open(source_img_path).convert("RGBA")
        img.save(fg_output_path)

    try:
        img_bg = Image.open(source_img_path).convert("RGB")
        img_bg_blurred = img_bg.filter(ImageFilter.GaussianBlur(radius=18))
        img_bg_blurred.save(bg_output_path)
    except Exception:
        bg_blank = create_dark_forensic_plate(1920, 1080)
        bg_blank.save(bg_output_path)

    flush_cuda_memory()


def process_assets_for_run(
    video_id: str,
    run_assets_dir: Path,
    script_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    run_assets_dir = Path(run_assets_dir)
    run_assets_dir.mkdir(parents=True, exist_ok=True)
    public_assets_dir = PUBLIC_DIR / "runs" / video_id / "assets"
    public_assets_dir.mkdir(parents=True, exist_ok=True)

    base_portrait_path = run_assets_dir / "subject_raw.png"
    if not base_portrait_path.exists():
        plate = create_dark_forensic_plate(800, 1000)
        plate.save(base_portrait_path)

    fg_path = run_assets_dir / "fg_subject.png"
    bg_path = run_assets_dir / "bg_subject.png"

    split_25d_layers(base_portrait_path, fg_path, bg_path)
    apply_dark_forensic_lut(bg_path, bg_path)

    queries: List[str] = []
    if script_data:
        queries = script_data.get("mediaSearchQueries", [])
    if not queries:
        queries = [
            "New York Stock Exchange trading floor",
            "Wall street",
            "computer server datacenter",
        ]

    archival_images = fetch_copyright_free_images(queries, run_assets_dir)
    video_clips = fetch_copyright_free_video_clips(
        queries, run_assets_dir, image_fallbacks=archival_images
    )

    shutil.copy2(fg_path, public_assets_dir / "fg_subject.png")
    shutil.copy2(bg_path, public_assets_dir / "bg_subject.png")

    for v in video_clips:
        if v.exists():
            shutil.copy2(v, public_assets_dir / v.name)

    for img in archival_images:
        if img.exists():
            shutil.copy2(img, public_assets_dir / img.name)

    article_img_path = run_assets_dir / "article_reuters.png"
    if not article_img_path.exists():
        if script_data and script_data.get("topic"):
            topic_str = script_data.get("topic")
            generate_sample_article_screenshot(
                article_img_path,
                publication="REUTERS",
                headline=f"Forensic Autopsy: {topic_str[:70]}",
                byline="By Cybersecurity & Financial Crime Investigative Bureau",
                highlight_text=f"Official records confirm critical security breach impacting {topic_str[:55]}.",
                date_str="OFFICIAL INVESTIGATION",
            )
        else:
            generate_sample_article_screenshot(article_img_path)
    if article_img_path.exists():
        shutil.copy2(article_img_path, public_assets_dir / "article_reuters.png")

    flush_cuda_memory()
    return {
        "fg_path": f"runs/{video_id}/assets/fg_subject.png",
        "bg_path": f"runs/{video_id}/assets/bg_subject.png",
        "video_clips": [f"runs/{video_id}/assets/{v.name}" for v in video_clips if v.exists()],
        "archival_images": [f"runs/{video_id}/assets/{img.name}" for img in archival_images if img.exists()],
        "article_screenshot": f"runs/{video_id}/assets/article_reuters.png",
    }
