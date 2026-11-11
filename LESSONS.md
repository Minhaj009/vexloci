# LESSONS.md — Project Memory & Rule Distillation

## Format
- **Trigger**: The context or request type where an issue occurred.
- **Anti-Pattern**: What was done wrong or caused degradation.
- **Strict Invariant**: What must always be done instead.

## Rules
- **Windows Command Chaining**: Use PowerShell-safe command chaining or separate calls, never bash-specific constructs like `&&` if unsupported in certain subshells.
- **VRAM Cleanup**: Always call `gc.collect()` and `torch.cuda.empty_cache()` inside `pipeline/utils_vram.py` immediately after exiting any GPU-intensive phase.
- **Deterministic Asset Fallbacks**: When fetching live assets from Wikimedia or yfinance, always have procedural/synthetic fallbacks to ensure rendering never fails offline.
- **No Decorative Jargon or Filler Badges**:
  - **Trigger**: Designing visual UI templates, comparison matrices, or dashboard cards (`SplitAutopsy`, `ForensicDocument`, HUDs).
  - **Anti-Pattern**: Injecting gratuitous pseudo-technical jargon or meaningless decorative pill badges (such as hardcoded `"DELTA // EXPOSURE"`) that add cognitive clutter without communicating real forensic facts.
  - **Strict Invariant**: Every label, badge, and metric rendered on screen must carry real, topic-specific evidentiary value derived from the data model, or be omitted completely. Never display hardcoded decorative filler badges.
- **Topic-Specific Script & Props Generation (Zero Unrelated Stubs)**:
  - **Trigger**: Compiling scripts and props across the 24 scenes in `stage1_research.py`, `universal_script_compiler.py`, and `stage5_compile.py`.
  - **Anti-Pattern**: Using 1-sentence generic placeholder text, defaulting props to hardcoded fallback stubs from another topic (e.g., KCG Knight Capital props in Bangladesh Bank), or repeating identical props across multiple scenes.
  - **Strict Invariant**: Every scene must have bespoke, topic-specific props, terminals, diagrams, and telemetry extracted directly from the research dossier or primary sources. Never allow hardcoded fallback constants from unrelated cases to bleed into scene props.
- **Documentary Target Duration & Word Count Budget (8–12 Minutes)**:
  - **Trigger**: Compiling 24 scenes for `broadcast_long_form_8_12m`.
  - **Anti-Pattern**: Generating 1-2 sentence scene stubs (~30-35 words per scene, totaling < 800 words), producing video lengths under 8 minutes (~6m 30s).
  - **Strict Invariant**: The script must deliver at least 1,300 to 1,500 total spoken words across the 24 scenes (~55 to 65 words per scene across 3-4 detailed investigative sentences), ensuring a final narrated runtime between 480s and 720s (8 to 12 minutes).
- **Real Archival Media & Image Ingestion (Zero Pitch-Black B-Roll)**:
  - **Trigger**: Ingesting Wikimedia images and rendering B-roll video clips in Stage 4 and Stage 5.
  - **Anti-Pattern**: Hardcoding a single B-roll clip (`broll_archival_0.mp4`) across all archival scenes, or applying extreme darkening/vignette to an empty plate, resulting in pitch-black blank screens during video playback.
  - **Strict Invariant**: Archival scenes must rotate across distinct, verified, topic-specific copyright-free media with visible luminance (mean pixel > 30), and each scene's headline/caption must accurately describe that specific exhibit.
- **Article Screenshots Rendering in ForensicDocument**:
  - **Trigger**: Displaying investigative news reports, SEC filings, or DOJ releases in `ForensicDocument`.
  - **Anti-Pattern**: Generating article screenshots in Stage 4 but ignoring `articleImagePath` in the React template, rendering only plain text or mock HTML headers.
  - **Strict Invariant**: `ForensicDocument` must render the actual article/document screenshot image when `articleImagePath` is present, alongside illuminated headline callouts and forensic annotations.
- **Dynamic Blueprint Connector Sizing**:
  - **Trigger**: Rendering dynamic badges and connector text between system blueprint blocks.
  - **Anti-Pattern**: Hardcoding fixed badge width (`width="100"`), causing long labels like `"No VLAN Isolation"` to clip outside borders.
  - **Strict Invariant**: Dynamically compute pill width using `Math.max(minWidth, text.length * charWidth + padding)` and expand block sizing to prevent text overflow.
- **Geographic Quadrant Slot Routing in Trace Maps**:
  - **Trigger**: Placing geospatial waypoints and HUD callout cards in `GeoIpTraceMap`.
  - **Anti-Pattern**: Assigning HUD corner slots round-robin by list index (`idx % 4`), putting Asian locations on the Western US edge and New York on the Eastern Asian edge with criss-crossing lines.
  - **Strict Invariant**: Map waypoints to screen quadrants based strictly on projected `(x, y)` coordinates (West/East hemisphere -> Left/Right HUD columns), keeping leader lines local and geographically coherent.
- **Natural Spoken English & Whisper Alignment Quality**:
  - **Trigger**: Synthesizing TTS voiceovers and generating forced-alignment subtitles in Stages 2 and 3.
  - **Anti-Pattern**: Sending raw digits (`35`, `81M`) and unspaced acronyms (`RCBC`) to TTS, resulting in robotic speech and unprompted Whisper mistranscriptions (`"Daca"`, `"Our CBC"`).
  - **Strict Invariant**: Pre-normalize all numbers, currencies, dates, and acronyms into natural spoken words before TTS, pass domain-specific proper nouns to Whisper's `initial_prompt`, and apply a post-processing subtitle glossary.
- **Cinematic Camera Momentum (Zero Frozen Scenes)**:
  - **Trigger**: Scene rendering across long documentary shots (> 8 seconds).
  - **Anti-Pattern**: Clamping camera scale and pan to the first 1 second (frames 0..30), leaving the camera static for 30+ seconds and inducing viewer drop-off.
  - **Strict Invariant**: Apply continuous subtle Ken Burns drift across 100% of scene duration, combined with 3-beat staged reframing (Establishing -> Punch-In -> Resolution) to maintain visual momentum.
- **High-Legibility Document & Article Presentation**:
  - **Trigger**: Rendering primary evidence documents and investigative articles.
  - **Anti-Pattern**: Using default low-resolution raster fonts or blurry downscaled snapshots.
  - **Strict Invariant**: Use crisp high-resolution typography with TrueType fonts, full-width editorial clipping layouts, and animated highlight sweeps over smoking-gun evidence.
- **Unified Channel Branding in Outro**:
  - **Trigger**: Rendering `EndScreenOutro` and recommended video cards.
  - **Anti-Pattern**: Displaying generic disc placeholders without official channel identity.
  - **Strict Invariant**: Feature official VEXLOCI monogram, typography, and channel dossier badge styled in the clean editorial color scheme of the documentary.
- **Pronounce Acronyms By Standard Linguistic Convention (SWIFT as Word, Not Letters)**:
  - **Trigger**: Normalizing text for TTS in `stage2_audio.py`.
  - **Anti-Pattern**: Spacing acronyms that are conventionally spoken as full words (e.g. expanding `"SWIFT"` into `"S. W. I. F. T."`).
  - **Strict Invariant**: Only space out true initialisms where each letter is pronounced individually (e.g. `"RCBC"`, `"OFAC"`). Acronyms pronounced as regular English words (e.g. `"SWIFT"`, `"NASDAQ"`, `"FINCEN"`, `"INTERPOL"`) must remain natural words.
- **Camera Safety & Zero-Crop Invariant for Data Screens**:
  - **Trigger**: Camera scaling and panning in `CameraRig.tsx` and scene templates.
  - **Anti-Pattern**: Punching in beyond 1.05 (e.g. `scale: 1.14` with heavy panning), cropping out headers, cards, badges, and peripheral diagram data.
  - **Strict Invariant**: Camera zoom on diagrammatic, blueprint, HUD, and data screens must be strictly constrained to `1.0` to `1.02` max (at most 2% subtle drift, zero data cutoff). All visual momentum must come from internal component animations without cropping the canvas.
- **Clean Light Editorial Aesthetic (Minimalist White Background)**:
  - **Trigger**: Global theme, visual templates, and canvas backgrounds.
  - **Anti-Pattern**: Defaulting to harsh dark cyberpunk neon (`#080A0F` with `#00F5D4` glows and scanlines).
  - **Strict Invariant**: Enforce a clean, elegant light editorial palette (white `#FFFFFF` / off-white `#F8FAFC` background, deep charcoal `#0F172A` typography, soft slate `#E2E8F0` borders, surgical cobalt `#2563EB`, and warm amber `#D97706` accents, inspired by Vox, Bloomberg, and Financial Times graphics).
- **Auto-Wrapped Connector Badges (Zero Clipping Invariant)**:
  - **Trigger**: Rendering dynamic badges and connector text between system blueprint blocks.
  - **Anti-Pattern**: Clamping pill width to a narrow gap between cards (`Math.min(gap - 8, ...)`), forcing long labels into a single line that overflows the pill.
  - **Strict Invariant**: Use auto-wrapped two-line SVG text or increase inter-block spacing so connector badges never clip or overflow borders.
- **No Burned-In Subtitles for Long-Form 16:9 Broadcast**:
  - **Trigger**: Rendering long-form broadcast video in `MainComposition.tsx`.
  - **Anti-Pattern**: Burning hardcoded subtitle badges/captions onto the bottom of 16:9 video when native YouTube CC (`subtitles.srt`) is provided, cluttering the lower viewport and colliding with diagrams/HUDs.
  - **Strict Invariant**: Long-form 16:9 video must remain completely clean of burned-in subtitles, letting YouTube handle native Closed Captions via `subtitles.srt`. (Burned captions remain strictly reserved for vertical 9:16 Shorts where native CC is absent).
- **Full Canvas Expansion & Modern Bento Component Architecture (No Clunky Wireframes)**:
  - **Trigger**: Redesigning UI components for 2026 modern minimalist aesthetic (Aceternity UI, 21st.dev, useplanes).
  - **Anti-Pattern**: Retaining clunky 2018 box geometry, squished `w-[1540px]` widths, and `mb-12` margins (leaving giant empty margins on screen), merely swapping hex colors without redesigning component anatomy, anchor sockets, and canvas space.
  - **Strict Invariant**: Always expand the scene container to `1800x960px` with 60px viewport margins. Rebuild cards as rich Bento components with anchor socket ports on card borders, embedded squircle icons, radial-masked dot grids, and 100% geometric alignment where connectors dock directly into ports and badge centers.
- **Zero Corner Debug HUD Text, Beat Counters, or Scene Timers**:
  - **Trigger**: Rendering global overlays (`KineticHUDOverlay.tsx`, `ForensicHUD.tsx`) on broadcast video frames.
  - **Anti-Pattern**: Displaying corner developer telemetry (`ACT 1 // ...`, `BEAT 01/05 // ESTABLISH | SCENE_01 :: TEMPLATE_STATE`), bottom-center beat dot bars, or bottom-right scene timers (`00:01.8 / 00:31.0`) in video corners.
  - **Strict Invariant**: Keep video corners completely clean of time counters, scene/template IDs, act banners, and beat indicator dots. Only subtle architectural corner registration brackets (`┌ ┐ └ ┘`) are permitted on outer margins.
- **Unique, Verified Archival Media Ingestion (Zero Duplicates or Fictional Hits)**:
  - **Trigger**: Fetching copyright-free archival images and building B-roll clips in `stage4_assets.py` and `universal_script_compiler.py`.
  - **Anti-Pattern**: Using only 4 generic queries (`"<victim> building"`, `"<victim> headquarters"`, `"Adversary Syndicate"`), searching article text on `en.wikipedia.org` (which pulls TV screenshots or identical article thumbnails), and skipping URL/hash deduplication, resulting in the exact same 2–3 images repeating endlessly across the entire video.
  - **Strict Invariant**: Every episode must harvest 10–12+ unique, high-resolution Wikimedia Commons photographs (`commons.wikimedia.org`, `gsrnamespace=6`, `filetype:bitmap`, excluding `.svg` logos and fictional media), enforced with strict URL + SHA-256 content-hash deduplication and minimum pixel dimensions (`>= 800px` wide) so no two `archival_img_*.png` or `broll_archival_*.mp4` assets are ever identical.





