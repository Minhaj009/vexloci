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
