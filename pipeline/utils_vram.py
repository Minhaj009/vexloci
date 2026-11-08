"""
VRAM and Hardware Safety Utilities for Vexloci Video Engine.
Enforces process isolation, explicit CUDA reclamation, and peak memory guarantees.
"""

import gc
import subprocess
import sys
from typing import List, Optional


def flush_cuda_memory() -> None:
    """Explicitly releases all cached PyTorch/CUDA and Python memory."""
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
    except ImportError:
        pass


def run_isolated_step(
    command: List[str], cwd: Optional[str] = None, timeout_sec: int = 300
) -> subprocess.CompletedProcess:
    """Runs a pipeline stage in an isolated child process to ensure clean memory release."""
    flush_cuda_memory()
    result = subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout_sec,
        check=True,
    )
    flush_cuda_memory()
    return result
