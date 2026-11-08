# SPEC.md — Vexloci Video Engine

## 1. System Objective & Core Philosophy
Build a **100% headless, local Topic-to-Video Engine** that accepts a single CLI topic string (focused on **Cyber-Mysteries, Digital Heists, Corporate Collapses, and Financial Frauds**) and outputs a broadcast-ready, 10-to-18-minute 1080p60/30p MP4 documentary.

### Core Engineering Rules (Non-Negotiable)
1. **Zero Visual Discrepancy:** The LLM never writes arbitrary, unvalidated CSS per run. Instead, the Python pipeline compiles a strictly validated `timeline.json` that populates **10 deterministic Remotion (React + TypeScript + Tailwind + Zod) Master Scene Templates**.
2. **Audio-First Forced Alignment:** Visual transitions, text highlights, terminal keystrokes, and chart crashes never rely on estimated timing. They are locked to **exact millisecond word-level timestamps** extracted via `faster-whisper` from the mastered voiceover.
3. **6-Second Retention Rule:** No visual frame may remain static for more than 6.0 seconds. Every scene template must execute `microEvents` (camera zooms, highlighter sweeps, modal popups, node pulses) triggered by spoken keywords every 3 to 5 seconds.
4. **Sequential Hardware-Safe Execution (VRAM Budget Under 6 GB):** Never load LLM, TTS, Whisper, `rembg`, and Headless Chromium into GPU memory simultaneously. Each stage executes in its own isolated Python process/step, writes its artifacts to `/runs/<video_id>/`, explicitly flushes CUDA memory (`torch.cuda.empty_cache()` + `gc.collect()`), and exits before the next stage begins.

---

## 2. Target Repository Structure

```text
forensic-video-engine/
├── SPEC.md
├── package.json                  # Remotion v4.0.536+, React, Three.js, D3, Zod, Tailwind
├── tsconfig.json
├── remotion.config.ts
├── pyproject.toml                # Managed via uv (Python 3.11+)
├── run_engine.py                 # Master CLI Orchestrator (Stages 1 -> 6)
├── assets/
│   ├── sfx/                      # UI ticks, keystrokes, whooshes, sub-drops, paper slides
│   ├── music/                    # Dark investigative synth stems (tension, buildup, aftermath)
│   ├── luts/                     # OpenCV dark-forensic color grading matrices
│   └── textures/                 # Subtle film grain, CRT scanlines, grid overlays, paper textures
├── runs/                         # Ephemeral per-video artifact directories
│   └── <video_id>/
│       ├── 01_script.json
│       ├── 02_voice_mastered.wav
│       ├── 03_words.json
│       ├── 04_assets/
│       ├── 05_timeline.json
│       ├── 05_qa_snapshots/
│       └── 06_final_video.mp4
├── pipeline/                     # Python Sequential Stage-Gate Modules
│   ├── __init__.py
│   ├── config.py
│   ├── utils_vram.py             # GPU memory cleanup & subprocess isolation helpers
│   ├── stage1_research.py        # Crawl4AI scraper + 5-Act LLM Script Compiler
│   ├── stage2_audio.py           # Kokoro-82M ONNX voice blend + FFmpeg broadcast mastering
│   ├── stage3_align.py           # Faster-Whisper (int8) word-level timestamp extractor
│   ├── stage4_assets.py          # Wikimedia/yfinance fetcher + rembg 2.5D + OpenCV LUT
│   ├── stage5_compile.py         # Timeline compiler + Playwright DOM bounding-box QA gate
│   └── stage6_render.py          # Remotion CLI renderer + FFmpeg SFX & sidechain audio mixer
└── src/                          # Remotion Application
    ├── index.ts
    ├── Root.tsx                  # Registers MainForensicComposition
    ├── MainComposition.tsx       # Sequencer mapping timeline.json scenes to Series
    ├── schemas/
    │   └── timeline.schema.ts    # Strict Zod contract shared across Python & Remotion
    ├── components/
    │   ├── shared/
    │   │   ├── ForensicHUD.tsx   # Persistent subtle corner metadata, vignette, scanline overlay
    │   │   ├── KineticCaption.tsx# Word-synced investigative lower-third subtitles
    │   │   └── CameraRig.tsx     # Smooth spring-driven pan/zoom wrapper
    │   └── templates/            # The 10 Master Scene Templates
    │       ├── ForensicDocument.tsx
    │       ├── TerminalReplay.tsx
    │       ├── MarketCrashChart.tsx
    │       ├── NetworkTopology.tsx
    │       ├── ParallaxCutout25D.tsx
    │       ├── CommsIntercept.tsx
    │       ├── GeoIpTraceMap.tsx
    │       ├── SplitAutopsy.tsx
    │       ├── ChronoTickingClock.tsx
    │       └── SystemBlueprint.tsx
    └── styles/
        └── global.css            # Tailwind directives + locked design tokens
```

---

## 3. Global Design Tokens (Dark Forensic Aesthetic)

All Remotion templates must strictly inherit these tokens—no arbitrary hex values allowed:
- **Canvas Resolution:** `1920x1080` at `30 FPS` (Safe zone padding: `96px` horizontal, `72px` vertical).
- **Color Palette:**
  - `bg-canvas`: `#080A0F` (Deep obsidian slate)
  - `bg-surface`: `#11151F` (Elevated card/panel surface)
  - `border-grid`: `#1E2536` (1px subtle blueprint/HUD hairlines)
  - `text-primary`: `#F1F5F9` (Crisp off-white)
  - `text-muted`: `#94A3B8` (Secondary telemetry/metadata)
  - `accent-cyan`: `#00F5D4` (Primary investigative focus / valid node)
  - `accent-amber`: `#F59E0B` (Warning / highlighted evidence / financial anomaly)
  - `accent-crimson`: `#FF2A54` (Crash / exploit / compromised node / fatal error)
- **Typography (`@remotion/google-fonts`):**
  - Headings & Callouts: `Space Grotesk` (Bold / SemiBold, tight tracking)
  - Code, Timestamps, Tickers & Telemetry: `JetBrains Mono`
  - Archival Documents & Indictments: `Newsreader` or `IBM Plex Serif`

---

## 4. The Master Data Contract (`src/schemas/timeline.schema.ts`)

Both the Python compiler (`stage5_compile.py`) and Remotion (`Root.tsx`) must validate against this exact Zod schema before rendering:

```typescript
import { z } from "zod";

export const MicroEventSchema = z.object({
  id: z.string(),
  triggerWord: z.string(),
  triggerOffsetSec: z.number().min(0), // Relative to scene start
  action: z.enum([
    "HIGHLIGHT_TEXT",
    "ZOOM_IN",
    "PAN_TO_NODE",
    "TYPE_COMMAND",
    "TRIGGER_CRASH_DROP",
    "REVEAL_CALLOUT",
    "PULSE_FAULT",
    "STAMP_VERDICT"
  ]),
  targetId: z.string().optional(),
  payloadText: z.string().optional(),
  accentColor: z.enum(["cyan", "amber", "crimson"]).default("cyan"),
});

export const SfxTriggerSchema = z.object({
  offsetSec: z.number().min(0),
  soundFile: z.enum([
    "ui_tick.wav",
    "keystroke_burst.wav",
    "soft_whoosh.wav",
    "sub_bass_drop.wav",
    "paper_slide.wav",
    "highlighter_sweep.wav",
    "radar_ping.wav",
    "stamp_slam.wav"
  ]),
  volume: z.number().min(0).max(1).default(0.5),
});

export const SceneTemplateEnum = z.enum([
  "ForensicDocument",
  "TerminalReplay",
  "MarketCrashChart",
  "NetworkTopology",
  "ParallaxCutout25D",
  "CommsIntercept",
  "GeoIpTraceMap",
  "SplitAutopsy",
  "ChronoTickingClock",
  "SystemBlueprint",
]);

export const SceneSchema = z.object({
  sceneId: z.string(),
  actNumber: z.number().int().min(1).max(5),
  template: SceneTemplateEnum,
  startTimeSec: z.number().min(0),
  durationSec: z.number().gt(1.5),
  chapterTitle: z.string(),
  narrationText: z.string(),
  words: z.array(
    z.object({
      word: z.string(),
      startSec: z.number(),
      endSec: z.number(),
    })
  ),
  sfxTriggers: z.array(SfxTriggerSchema),
  microEvents: z.array(MicroEventSchema).min(1), // Enforces visual change every 3-5s
  props: z.record(z.string(), z.any()), // Validated per-template via discriminatedUnion
});

export const TimelineSchema = z.object({
  videoId: z.string(),
  topicTitle: z.string(),
  fps: z.literal(30),
  width: z.literal(1920),
  height: z.literal(1080),
  totalDurationSec: z.number().gt(0),
  audioTrackPath: z.string(),
  scenes: z.array(SceneSchema).min(1),
});

export type TimelineData = z.infer<typeof TimelineSchema>;
```

---

## 5. Specification of the 10 Master Remotion Templates

Each template component in `src/components/templates/` receives `{ scene: SceneData }` and uses `useCurrentFrame()`, `useVideoConfig()`, `spring()`, and `interpolate()`:

1. **`ForensicDocument.tsx`**
   - **Visual:** 3D-tilted (`perspective(1200px) rotateX(4deg)`) dark-mode archival document/PDF card with subtle paper grain.
   - **Props:** `documentTitle`, `dateStamp`, `sourceAgency`, `paragraphs: string[]`, `highlightPhrases: string[]`.
   - **Micro-Events:** Camera smoothly pans to target paragraph; an animated SVG highlighter bar sweeps across `highlightPhrases` on the exact frame the narrator speaks those words; optional crimson/amber stamp slams down with spring physics.
2. **`TerminalReplay.tsx`**
   - **Visual:** macOS/Linux dark terminal window or split code diff viewer with line numbers and status bar.
   - **Props:** `hostname`, `filePath`, `lines: { text: string; type: 'cmd' | 'output' | 'error' | 'diff_add' | 'diff_del' }[]`.
   - **Micro-Events:** Character-by-character typing synced to `TYPE_COMMAND` timestamps; red pulsing alert banner on `PULSE_FAULT`.
3. **`MarketCrashChart.tsx`**
   - **Visual:** High-contrast D3 SVG area/line or candlestick chart with animated gridlines and live price ticker readout.
   - **Props:** `tickerSymbol`, `metricName`, `unit`, `dataPoints: { label: string; value: number }[]`, `crashIndex: number`.
   - **Micro-Events:** SVG stroke-dashoffset draws the curve progressively; at `TRIGGER_CRASH_DROP`, color shifts from `#00F5D4` to `#FF2A54`, camera shakes subtly, and a loss callout badge animates in.
4. **`NetworkTopology.tsx`**
   - **Visual:** Node-and-edge graph representing shell companies, money laundering hops, or server infrastructure.
   - **Props:** `nodes: { id: string; label: string; type: 'bank' | 'server' | 'person' | 'shell'; status: 'normal' | 'compromised' }[]`, `edges: { from: string; to: string; label?: string }[]`.
   - **Micro-Events:** Camera pans from node to node (`PAN_TO_NODE`) as glowing data packets travel along SVG paths.
5. **`ParallaxCutout25D.tsx`**
   - **Visual:** Documentary 2.5D composite using `fgPath` (subject with background stripped via `rembg`) and `bgPath` (blurred, dark-LUT-graded environment plate), plus a side evidence card.
   - **Props:** `fgImagePath`, `bgImagePath`, `subjectName`, `subjectRole`, `quoteOrFact`.
   - **Micro-Events:** Background scales from `1.0` to `1.06` while foreground cutout scales from `1.0` to `1.14` (true parallax separation); `REVEAL_CALLOUT` slides in the side metadata panel.
6. **`CommsIntercept.tsx`**
   - **Visual:** Recreated encrypted chat log, Slack channel, email thread, or GitHub PR comment stream.
   - **Props:** `platformName`, `channelOrSubject`, `messages: { sender: string; role: string; time: string; body: string; highlight?: string }[]`.
   - **Micro-Events:** Messages spring into view sequentially on timestamp triggers; camera zooms into the incriminating message and highlights the key phrase.
7. **`GeoIpTraceMap.tsx`**
   - **Visual:** Vector GeoJSON world/region map (`d3-geo`) rendered in dark slate with glowing coordinate grids.
   - **Props:** `waypoints: { city: string; country: string; lat: number; lon: number; detail: string }[]`.
   - **Micro-Events:** Smooth camera interpolation between lat/lon coordinates while a dashed quadratic bezier arc connects origin to destination with a radar ping ring.
8. **`SplitAutopsy.tsx`**
   - **Visual:** 50/50 split comparison ("Public Valuation vs. Hidden Debt" or "Expected Execution vs. Exploit Payload").
   - **Props:** `leftTitle`, `rightTitle`, `leftMetrics: string[]`, `rightMetrics: string[]`.
   - **Micro-Events:** Left panel animates in first in cyan; on the narrator's pivot word, the right panel slices in with a crimson border and animated counter comparison.
9. **`ChronoTickingClock.tsx`**
   - **Visual:** Large center-top digital forensic mission clock (`YYYY-MM-DD // HH:MM:SS.ms UTC`) with a horizontal timeline scrubber and evidence cards below.
   - **Props:** `startIsoTime`, `endIsoTime`, `milestones: { timeLabel: string; eventTitle: string; detail: string }[]`.
   - **Micro-Events:** Clock digits rapidly roll forward between milestones and freeze with a tick SFX as each milestone card expands.
10. **`SystemBlueprint.tsx`**
    - **Visual:** Clean isometric or 2D architectural schematic showing how a financial mechanism, server cluster, or protocol works.
    - **Props:** `systemTitle`, `blocks: { id: string; title: string; subtitle: string; isFaultPoint?: boolean }[]`, `flows: { from: string; to: string; label: string }[]`.
    - **Micro-Events:** Sequential illumination of blocks; when `PULSE_FAULT` fires, the fault block turns crimson and downstream arrows fracture.

---

## 6. Specification of the 6 Sequential Python Stages

### Stage 1: Research & 5-Act Script Compiler (`pipeline/stage1_research.py`)
- **Action:** Uses `Crawl4AI` to gather factual sources, timelines, figures, ticker symbols, and technical post-mortems on the input topic.
- **Retention Structure Enforcement:** Prompts the LLM to output `01_script.json` strictly divided into the **5-Act Forensic Structure**:
  1. *Act I (0:00–1:15):* The Anomaly Hook (starts in media res at the exact moment of failure/heist).
  2. *Act II (1:15–4:30):* The Architecture of the Machine.
  3. *Act III (4:30–9:00):* The Hidden Flaw / Infiltration.
  4. *Act IV (9:00–13:00):* The Cascade Collapse (ticking-clock sequence).
  5. *Act V (13:00–End):* Forensic Aftermath & Fatal Mistake.
- **Constraint:** Every scene beat must be `6.0` to `12.0` seconds long (15 to 32 words), assigned one of the 10 `SceneTemplateEnum` types, and include explicit `triggerWord` hooks for `microEvents`.

### Stage 2: Human-Grade Local Voiceover (`pipeline/stage2_audio.py`)
- **Engine:** `kokoro-onnx` / `pykokoro` (Kokoro-82M) running in ONNX runtime (<1 GB VRAM).
- **Voice Blending:** Use a custom investigative documentary blend: `am_michael:65,bm_george:35` (or configurable in `config.py`).
- **Prosody Humanization:**
  - Render sentence-by-sentence.
  - Apply dynamic speed multipliers: `1.04x` in Act I hooks, `0.98x` in technical explanations, `0.94x` on major dramatic reveals.
  - Insert organic silence buffers: `280ms` between sentences, `650ms` between scenes, `900ms` between Acts.
- **FFmpeg Broadcast Vocal Mastering:** Pass raw concatenated WAV through:
  ```bash
  ffmpeg -y -i raw_voice.wav -af "highpass=f=80,equalizer=f=145:width_type=q:w=1.2:g=2.5,equalizer=f=3500:width_type=q:w=1.5:g=2.0,acompressor=threshold=-18dB:ratio=3:attack=15:release=180,loudnorm=I=-14:TP=-1.5:LRA=11" 02_voice_mastered.wav
  ```

### Stage 3: Forced Word-Level Alignment (`pipeline/stage3_align.py`)
- **Engine:** `faster-whisper` (`model_size="small.en"`, `device="cuda"`, `compute_type="int8"`).
- **Action:** Transcribes `02_voice_mastered.wav` with `word_timestamps=True`, outputs `03_words.json` containing `{ word, startSec, endSec }` for every spoken word, and immediately deletes the model object and flushes CUDA cache.

### Stage 4: Hybrid Asset Fetch & 2.5D Normalizer (`pipeline/stage4_assets.py`)
- **Sources:**
  - Wikimedia Commons API / Openverse (for archival photos of founders, hackers, buildings, hardware).
  - `yfinance` (automatically fetches real historical daily/intraday OHLCV stock data when a public company ticker is referenced in `MarketCrashChart`).
- **Automated Visual Normalization:**
  1. **2.5D Segmentation (`rembg`):** Runs `u2netp` or `birefnet-general-lite` on portrait/object photos to output `fg_<id>.png` (alpha cutout) and `bg_<id>.png` (inpainted/gaussian-blurred background plate).
  2. **Dark Forensic Color Grading (OpenCV):** Applies a unified contrast curve, desaturates raw colors by 35%, and applies a subtle slate-cyan split-tone LUT so all external media matches the `#080A0F` Remotion canvas.
  3. **Saliency Crop Check:** Uses OpenCV cascade/saliency detection to ensure subjects are centered before saving to `04_assets/`.
  4. **VRAM Cleanup:** Unloads `rembg` ONNX session immediately after asset batch completion.

### Stage 5: Timeline Compiler & Automated Visual QA Gate (`pipeline/stage5_compile.py`)
- **Compilation:** Merges `01_script.json`, `03_words.json`, and `04_assets/` into `05_timeline.json`. Matches each scene's `triggerWord` to the exact `startSec` from `03_words.json` to populate `microEvents[].triggerOffsetSec`.
- **Retention Density Check:** If any scene is longer than `6.5s` and has fewer than 2 `microEvents`, automatically injects a secondary `ZOOM_IN` or `HIGHLIGHT_TEXT` micro-event at the midpoint word.
- **Headless DOM & Visual QA Gate (Playwright + Remotion Still):**
  - Renders/mounts the midpoint frame of every scene in headless Chromium.
  - Asserts `img.complete && img.naturalWidth > 0` for all external assets.
  - Queries DOM bounding boxes (`getBoundingClientRect()`) for all text nodes to verify zero text overflow beyond container boundaries and zero overlap between callouts and lower-third captions. If overflow is detected, automatically steps down the scene's font-scale prop and re-verifies.

### Stage 6: Headless Remotion Render & FFmpeg Sidechain Mix (`pipeline/stage6_render.py`)
1. **Video Render:** Executes `npx remotion render MainForensicComposition video_silent.mp4 --props=./runs/<video_id>/05_timeline.json --codec=h264 --crf=18`.
2. **Programmatic SFX Track Assembly:** Reads `sfxTriggers[]` across all scenes and uses `pydub` / `ffmpeg` `adelay` to place each SFX (`keystroke_burst.wav`, `sub_bass_drop.wav`, `highlighter_sweep.wav`, etc.) at the exact global millisecond timestamp.
3. **Sidechain Audio Ducking & Final Mux:** Mixes `02_voice_mastered.wav`, the assembled SFX stem, and the looped background music stem using FFmpeg `sidechaincompress` so the music automatically ducks by `-10dB` whenever the narrator speaks and swells cleanly during pauses:
   ```bash
   ffmpeg -y -i video_silent.mp4 -i 02_voice_mastered.wav -i sfx_stem.wav -i bg_music_loop.wav \
   -filter_complex "\
     [3:a]volume=0.22[music_low]; \
     [music_low][1:a]sidechaincompress=threshold=0.015:ratio=6:attack=40:release=450[music_ducked]; \
     [1:a][2:a][music_ducked]amix=inputs=3:duration=first:dropout_transition=2,loudnorm=I=-14:TP=-1.5:LRA=11[final_audio]" \
   -map 0:v -map "[final_audio]" -c:v copy -c:a aac -b:a 256k 06_final_video.mp4
   ```
