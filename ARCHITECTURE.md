# ARCHITECTURE.md — Vexloci Video Engine

## 1. System Purpose & Core Domain Invariants
Vexloci is a 100% headless, local topic-to-video documentary engine generating 1080p30 investigative videos covering financial frauds, digital heists, and cyber-mysteries.

### Domain Invariants:
1. **Deterministic Motion Graphics:** The LLM does not write custom CSS or arbitrary React code per render. All visual layouts are powered by 10 deterministic Remotion Master Templates driven by a strictly typed `timeline.json` validated via Zod.
2. **Audio-First Synchronization:** All visual animations, kinetic text highlights, SVG graph morphs, and camera zooms hook into millisecond-accurate word timestamps extracted via `faster-whisper`.
3. **Hardware Isolation & VRAM Discipline:** Peak VRAM budget is constrained under 6.0 GB. Each processing step (LLM research, Kokoro ONNX vocal synthesis, Whisper alignment, Rembg segmentation, Remotion rendering) runs in sequential isolation, flushing PyTorch/ONNX memory immediately upon completion.
4. **Boundary Validation:** Every pipeline stage produces concrete disk artifacts under `runs/<video_id>/` that pass strict Pydantic/Zod schema validation before downstream stages consume them.

## 2. Directory Structure & Module Ownership
- `src/schemas/timeline.schema.ts`: Single source of truth Zod schema defining `TimelineData`, `SceneSchema`, `MicroEventSchema`, and `SfxTriggerSchema`.
- `src/components/shared/`: Reusable components including `ForensicHUD`, `KineticCaption`, and `CameraRig`.
- `src/components/templates/`: The 10 Master Scene Templates:
  1. `ForensicDocument.tsx`
  2. `TerminalReplay.tsx`
  3. `MarketCrashChart.tsx`
  4. `NetworkTopology.tsx`
  5. `ParallaxCutout25D.tsx`
  6. `CommsIntercept.tsx`
  7. `GeoIpTraceMap.tsx`
  8. `SplitAutopsy.tsx`
  9. `ChronoTickingClock.tsx`
  10. `SystemBlueprint.tsx`
- `pipeline/`: Isolated Python stage-gate modules:
  - `config.py`: Centralized configuration, tokens, and paths.
  - `utils_vram.py`: CUDA cache flushing and subprocess management.
  - `stage1_research.py`: Crawl4AI / research synthesis & 5-act script generation.
  - `stage2_audio.py`: Kokoro-82M ONNX vocal synthesis + FFmpeg vocal mastering.
  - `stage3_align.py`: Faster-Whisper int8 forced word alignment.
  - `stage4_assets.py`: Wikimedia/yfinance data fetch + rembg 2.5D separation + OpenCV LUT.
  - `stage5_compile.py`: Timeline compilation + Playwright DOM QA bounding-box check.
  - `stage6_render.py`: Remotion CLI invocation + procedural SFX stem generation + FFmpeg sidechain ducking.
- `run_engine.py`: Master CLI orchestrator executing stages 1 through 6.

## 3. Architectural Decision Records (ADR Log)
- **ADR-001 (Unified Zod Contract):** Python `stage5_compile.py` compiles JSON validated against identical contracts that Remotion loads via `@remotion/zod-types` / standard Zod. Eliminates runtime schema drift.
- **ADR-002 (Procedural Audio Synthesis Fallback):** Assets directory contains procedural sound generators (synthesizing sine sweeps, noise bursts, clicks) so the engine functions offline without external audio pack dependencies.
- **ADR-003 (Sequential Subprocess Execution):** Heavy Python AI models are invoked in separate functions/processes to guarantee complete CUDA memory reclamation before Remotion/Chromium launches.
