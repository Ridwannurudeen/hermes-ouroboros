from __future__ import annotations

import os
import re
import secrets
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from learning.model_swapper import ModelSwapper

DEPLOY_TARGET = 'deployment/modal_inference.py'
ENV_PATH = ROOT / '.env'


def main() -> int:
    version, adapter_name = _resolve_latest_adapter()
    env = dict(os.environ)
    modal_inference_token = env.get('MODAL_INFERENCE_TOKEN') or _read_env_value('MODAL_INFERENCE_TOKEN')
    if not modal_inference_token:
        modal_inference_token = secrets.token_urlsafe(32)
        _write_env_value('MODAL_INFERENCE_TOKEN', modal_inference_token)
    env['MODAL_INFERENCE_TOKEN'] = modal_inference_token
    env['PYTHONIOENCODING'] = 'utf-8'
    if not env.get('MODAL_TOKEN_ID'):
        env.pop('MODAL_TOKEN_ID', None)
    if not env.get('MODAL_TOKEN_SECRET'):
        env.pop('MODAL_TOKEN_SECRET', None)

    completed = subprocess.run(
        [sys.executable, '-X', 'utf8', '-m', 'modal', 'deploy', DEPLOY_TARGET],
        cwd=ROOT,
        text=True,
        capture_output=True,
        env=env,
        encoding='utf-8',
        errors='replace',
    )
    if completed.returncode != 0:
        sys.stderr.write(completed.stderr or completed.stdout)
        return completed.returncode

    sys.stdout.write(completed.stdout)
    match = re.search(r'(https://[^\s]+\.modal\.run)', completed.stdout)
    if not match:
        sys.stderr.write('Could not find Modal inference URL in deploy output.\n')
        return 1

    url = match.group(1)
    _write_env_value('MODAL_INFERENCE_URL', url)
    ModelSwapper(ROOT).register_inference_target(
        version=version,
        provider_name='modal_http',
        target_model=adapter_name,
    )
    print(f'Saved MODAL_INFERENCE_URL={url}')
    print(f'Promoted {version} to modal_http with adapter {adapter_name}')
    return 0


def _write_env_value(key: str, value: str) -> None:
    lines = ENV_PATH.read_text(encoding='utf-8').splitlines() if ENV_PATH.exists() else []
    updated = False
    for index, line in enumerate(lines):
        if line.startswith(f'{key}='):
            lines[index] = f'{key}={value}'
            updated = True
            break
    if not updated:
        lines.append(f'{key}={value}')
    ENV_PATH.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def _read_env_value(key: str) -> str | None:
    if not ENV_PATH.exists():
        return None
    for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
        if line.startswith(f'{key}='):
            return line.split('=', 1)[1].strip() or None
    return None


def _resolve_latest_adapter() -> tuple[str, str]:
    swapper = ModelSwapper(ROOT)
    version = swapper.get_latest_version()
    registry = swapper._read_registry()
    entry = registry.get(version, {})
    adapter_path = str(entry.get('adapter_path') or '').strip()
    if not adapter_path:
        raise RuntimeError(f'Latest model {version} does not have an adapter_path in the registry.')
    adapter_name = Path(adapter_path).name
    return version, adapter_name


if __name__ == '__main__':
    raise SystemExit(main())
