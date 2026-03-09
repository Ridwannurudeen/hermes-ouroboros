from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from learning.atropos_runner import run_training_cycle
from learning.quality_filter import get_training_batch


def modal_token_ready() -> bool:
    completed = subprocess.run(
        [sys.executable, '-m', 'modal', 'token', 'info'],
        capture_output=True,
        text=True,
        timeout=20,
    )
    return completed.returncode == 0


def write_remote_payload(root: Path, min_count: int = 5) -> Path:
    training_batch = get_training_batch(root, min_count=min_count)
    payload_path = root / 'trajectories' / 'sample_training.json'
    payload_path.write_text(json.dumps(training_batch[:min_count], indent=2), encoding='utf-8')
    return payload_path


def main() -> None:
    root = Path(__file__).resolve().parent
    payload_path = write_remote_payload(root, min_count=5)
    if modal_token_ready():
        command = [
            sys.executable,
            '-X',
            'utf8',
            '-m',
            'modal',
            'run',
            'learning/modal_trainer.py::run',
            '--base-model-name',
            'hermes-3-llama-3.1-8b',
            '--training-data-path',
            str(payload_path),
            '--output-name',
            'adapter_v1_remote_test',
            '--dry-run',
        ]
        env = dict(os.environ)
        env['PYTHONIOENCODING'] = 'utf-8'
        completed = subprocess.run(
            command,
            cwd=root,
            text=True,
            capture_output=True,
            timeout=180,
            env=env,
            encoding='utf-8',
            errors='replace',
        )
        print(json.dumps({'command': command, 'returncode': completed.returncode, 'stdout': completed.stdout, 'stderr': completed.stderr}, indent=2))
        return

    result = run_training_cycle(root=root, min_trajectories=5, dry_run=True)
    result['note'] = 'Modal token missing, used local dry-run fallback.'
    result['remote_payload_path'] = str(payload_path)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
