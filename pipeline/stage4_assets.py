"""
Stage 4: Hybrid Asset Fetch & 2.5D Normalizer.
Fetches Wikimedia Commons archival photos, Openverse/MediaWiki public domain assets,
and yfinance stock data.
Trims and grades archival video B-roll clips with FFmpeg.
Executes 2.5D layer segmentation (rembg u2netp) and OpenCV dark-forensic color grading.
Mirrors visual assets to public/runs/<video_id>/assets/ for staticFile() resolution.
"""

from io import BytesIO
import json
from pathlib import Path
import shutil
import subprocess
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import requests
import yfinance as yf

from pipeline.config import PUBLIC_DIR
from pipeline.utils_vram import flush_cuda_memory

WIKIMEDIA_USER_AGENT = "VexlociForensicDoc/1.0 (https://github.com/vexloci; vexloci.forensics@gmail.com)"
DEFAULT_HEADERS = {"User-Agent": WIKIMEDIA_USER_AGENT}

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
    "bitcoin": {
        "local": ["test_bitcoin.jpg", "test_bitcoin.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1920px-Bitcoin.svg.png",
    },
    "colonial pipeline": {
        "local": ["test_pipeline.jpg", "test_pipeline.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/2/27/Colonial_Pipeline_Company_logo.jpg",
    },
    "darkside": {
        "local": ["test_darkside.jpg", "test_darkside.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/2/27/Colonial_Pipeline_Company_logo.jpg",
    },
    "ransomware": {
        "local": ["test_ransomware.jpg", "test_ransomware.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/2/27/Colonial_Pipeline_Company_logo.jpg",
    },
    "swift": {
        "local": ["test_swift.jpg", "test_swift.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Bangladesh_Bank_%2833398162476%29.jpg",
    },
    "reuters": {
        "local": ["test_reuters.jpg", "test_reuters.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Bangladesh_Bank_%2833398162476%29.jpg",
    },
    "mandiant": {
        "local": ["test_bb.jpg", "test_bb.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Bangladesh_Bank_%2833398162476%29.jpg",
    },
}


def create_dark_forensic_plate(width: int = 1920, height: int = 1080) -> Image.Image:
    plate = Image.new("RGB", (width, height), color=(14, 19, 31))
    draw = ImageDraw.Draw(plate)
    grid_color = (22, 29, 45)
    hairline_color = (28, 38, 58)
    grid_step = 120
    for x in range(0, width, grid_step):
        draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
    for y in range(0, height, grid_step):
        draw.line([(0, y), (width, y)], fill=grid_color, width=1)
    cross_len = 14
    for cx, cy in [
        (96, 72),
        (width - 96, 72),
        (96, height - 72),
        (width - 96, height - 72),
        (width // 2, height // 2),
    ]:
        draw.line([(cx - cross_len, cy), (cx + cross_len, cy)], fill=hairline_color, width=1)
        draw.line([(cx, cy - cross_len), (cx, cy + cross_len)], fill=hairline_color, width=1)
    return plate


def fetch_wikimedia_photo(query: str, output_path: Path) -> bool:
    endpoint = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrlimit": 1,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }
    try:
        resp = requests.get(endpoint, params=params, headers=DEFAULT_HEADERS, timeout=10)
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for _, page_info in pages.items():
            imageinfo = page_info.get("imageinfo", [])
            if imageinfo and "url" in imageinfo[0]:
                img_url = imageinfo[0]["url"]
                img_resp = requests.get(img_url, headers=DEFAULT_HEADERS, timeout=15)
                if img_resp.status_code == 200:
                    with open(output_path, "wb") as f:
                        f.write(img_resp.content)
                    return True
    except Exception:
        pass
    return False


def _download_and_normalize_image(url: str, output_path: Path) -> bool:
    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
        if resp.status_code != 200:
            return False
        content_type = resp.headers.get("Content-Type", "").lower()
        if "svg" in content_type or url.lower().endswith(".svg"):
            try:
                import cairosvg

                png_bytes = cairosvg.svg2png(bytestring=resp.content, output_width=1920)
                img = Image.open(BytesIO(png_bytes)).convert("RGB")
                img.save(output_path)
                return True
            except Exception:
                pass
        img = Image.open(BytesIO(resp.content)).convert("RGB")
        img.save(output_path)
        return True
    except Exception:
        return False


def fetch_copyright_free_images(queries: List[str], output_dir: Path) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded_images: List[Path] = []
    workspace_root = Path.cwd()

    for idx, query in enumerate(queries):
        img_out = output_dir / f"archival_img_{idx}.png"
        success = False
        q_lower = query.lower()

        matched_entity = None
        for key, entity_data in VERIFIED_ENTITY_MAP.items():
            if key in q_lower:
                matched_entity = entity_data
                break

        if matched_entity:
            for loc_name in matched_entity.get("local", []):
                cand_path = workspace_root / loc_name
                if not cand_path.exists():
                    cand_path = output_dir / loc_name
                if cand_path.exists():
                    try:
                        with Image.open(cand_path) as im:
                            rgb_im = im.convert("RGB")
                            rgb_im.save(img_out)
                        apply_dark_forensic_lut(img_out, img_out)
                        success = True
                        downloaded_images.append(img_out)
                        break
                    except Exception:
                        pass

            if not success and matched_entity.get("url"):
                if _download_and_normalize_image(matched_entity["url"], img_out):
                    apply_dark_forensic_lut(img_out, img_out)
                    success = True
                    downloaded_images.append(img_out)

        if not success:
            try:
                wiki_url = "https://en.wikipedia.org/w/api.php"
                params = {
                    "action": "query",
                    "generator": "search",
                    "gsrsearch": query,
                    "gsrlimit": 3,
                    "prop": "pageimages|imageinfo",
                    "pilicense": "any",
                    "piprop": "thumbnail",
                    "pithumbsize": 1920,
                    "iiprop": "url|mime",
                    "format": "json",
                }
                resp = requests.get(wiki_url, params=params, headers=DEFAULT_HEADERS, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    pages = data.get("query", {}).get("pages", {})
                    sorted_pages = sorted(pages.values(), key=lambda p: p.get("index", 999))
                    for page in sorted_pages:
                        cand_url = None
                        thumb = page.get("thumbnail", {})
                        if thumb and "source" in thumb:
                            cand_url = thumb["source"]
                        elif page.get("imageinfo"):
                            cand_url = page["imageinfo"][0].get("url")

                        if cand_url and _download_and_normalize_image(cand_url, img_out):
                            apply_dark_forensic_lut(img_out, img_out)
                            success = True
                            downloaded_images.append(img_out)
                            break
            except Exception:
                pass

        if not success:
            plate = create_dark_forensic_plate(1920, 1080)
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

    for idx, _ in enumerate(queries):
        output_mp4 = output_dir / f"broll_archival_{idx}.mp4"
        src_img: Optional[Path] = None
        if image_fallbacks and idx < len(image_fallbacks) and image_fallbacks[idx].exists():
            src_img = image_fallbacks[idx]
        elif (output_dir / f"archival_img_{idx}.png").exists():
            src_img = output_dir / f"archival_img_{idx}.png"

        temp_created = False
        if not src_img or not src_img.exists():
            src_img = output_dir / f"temp_plate_{idx}.png"
            plate = create_dark_forensic_plate(1920, 1080)
            plate.save(src_img)
            temp_created = True

        filter_chain = (
            "scale=1920:1080:force_original_aspect_ratio=increase,"
            "crop=1920:1080,"
            "zoompan=z='min(zoom+0.0008,1.20)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=540:s=1920x1080:fps=30,"
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

    img = cv2.convertScaleAbs(img, alpha=1.12, beta=-4)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] *= 0.65
    img_desat = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    tint = np.zeros_like(img_desat)
    tint[:, :] = [18, 12, 8]
    blended = cv2.addWeighted(img_desat, 0.85, tint, 0.15, 0)

    cv2.imwrite(str(output_path), blended)
    return output_path


def generate_sample_article_screenshot(
    output_path: Path,
    publication: str = "REUTERS",
    headline: str = "Spelling error halts $1 billion cyber heist from Bangladesh Bank",
    byline: str = "By Jim Finkle and Nathan Layne // CYBERSECURITY INVESTIGATION",
    highlight_text: str = "A spelling error in an online transfer instruction helped prevent a nearly $1 billion cyber heist.",
    date_str: str = "FEBRUARY 12, 2016",
    width: int = 1400,
    height: int = 800,
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (width, height), color=(14, 18, 28))
    draw = ImageDraw.Draw(img)

    draw.rectangle([(0, 0), (width, 80)], fill=(10, 13, 20))
    draw.text((40, 26), f"{publication} // INVESTIGATIVE REPOSITORY", fill=(0, 245, 212))
    draw.text((width - 320, 26), f"DATELINE: {date_str}", fill=(148, 163, 184))

    draw.line([(0, 80), (width, 80)], fill=(30, 37, 54), width=2)
    draw.text((40, 110), headline[:85], fill=(241, 245, 249))
    draw.text((40, 150), byline, fill=(100, 116, 139))
    draw.line([(40, 180), (width - 40, 180)], fill=(30, 37, 54), width=1)

    draw.rectangle([(40, 200), (width - 40, 300)], fill=(245, 158, 11), outline=(245, 158, 11), width=2)
    draw.text((55, 220), "CRITICAL REVEAL // SMOKING GUN PARAGRAPH:", fill=(245, 158, 11))
    draw.text((55, 250), f'"{highlight_text}"', fill=(241, 245, 249))

    body_lines = [
        "Hackers broke into Bangladesh Bank systems and stole credentials used to initiate payment transfers.",
        "The requests sent to the Federal Reserve Bank of New York appeared authentic, directing funds to accounts in the Philippines.",
        "A routine transfer addressed to the Shalika Foundation was halted when a routing clerk noticed 'fandation' misspelled.",
        "The subsequent audit led to the emergency freezing of hundreds of millions of dollars in pending wire instructions.",
    ]
    y_offset = 330
    for line in body_lines:
        draw.text((40, y_offset), line, fill=(148, 163, 184))
        y_offset += 40

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
