from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    command = [
        sys.executable,
        '-X',
        'utf8',
        '-m',
        'modal',
        'run',
        'deployment/modal_inference.py::run',
        '--base-model-name',
        'NousResearch/Hermes-3-Llama-3.1-8B',
        '--adapter-name',
        'adapter_v1',
        '--system-prompt',
        'You are concise and direct.',
        '--query',
        'Give a concise risk assessment of Arbitrum in 2026.',
        '--max-new-tokens',
        '128',
        '--temperature',
        '0.2',
    ]
    env = dict(os.environ)
    env['PYTHONIOENCODING'] = 'utf-8'
    if not env.get('MODAL_TOKEN_ID'):
        env.pop('MODAL_TOKEN_ID', None)
    if not env.get('MODAL_TOKEN_SECRET'):
        env.pop('MODAL_TOKEN_SECRET', None)
    completed = subprocess.run(
        command,
        cwd=root,
        text=True,
        capture_output=True,
        timeout=1800,
        env=env,
        encoding='utf-8',
        errors='replace',
    )
    print(json.dumps({'returncode': completed.returncode, 'stdout': completed.stdout, 'stderr': completed.stderr}, indent=2))


if __name__ == '__main__':
    main()
