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

