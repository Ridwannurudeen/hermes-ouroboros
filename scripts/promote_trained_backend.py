from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.settings import load_settings
from learning.model_swapper import ModelSwapper
from providers.modal_http import ModalHTTPProvider


def main() -> int:
    try:
        version, adapter_name = _resolve_latest_adapter()
    except Exception as exc:
        print(f'Failed to resolve latest adapter: {exc}')
        return 1

    print(f'Latest version: {version}')
    print(f'Adapter name: {adapter_name}')

    deploy_result = subprocess.run(
        [sys.executable, '-X', 'utf8', 'scripts/deploy_modal_inference.py'],
        cwd=ROOT,
        text=True,
        capture_output=True,
        encoding='utf-8',
        errors='replace',
    )
    print(deploy_result.stdout)
    if deploy_result.returncode != 0:
        print(deploy_result.stderr or 'Modal deploy failed.')
        return deploy_result.returncode

    settings = load_settings(ROOT)
    endpoint_url = os.getenv('MODAL_INFERENCE_URL') or settings.provider.base_url
    if not endpoint_url:
        print('MODAL_INFERENCE_URL is not configured after deploy.')
        return 1

    provider = ModalHTTPProvider(
        endpoint_url=endpoint_url,
        base_model=settings.learning.base_model,
        adapter_name=adapter_name,
        auth_token=os.getenv('MODAL_INFERENCE_TOKEN'),
        timeout_seconds=900.0,
        temperature=settings.provider.temperature,
    )
    try:
        response = asyncio.run(
            provider.generate(
                role='arbiter',
                system_prompt='You are concise and direct.',
                query='Give a short verdict on the importance of reliable model deployment.',
            )
        )
    except Exception as exc:
        print(f'Smoke test failed: {exc}')
        return 1

    print('Smoke test response:')
    print(response[:500])
    ModelSwapper(ROOT).register_inference_target(
        version=version,
        provider_name='modal_http',
        target_model=adapter_name,
    )
    ModelSwapper(ROOT).set_active_version(version)
    print(f'Promoted {version} to live trained HTTP inference.')
    return 0


def _resolve_latest_adapter() -> tuple[str, str]:
    swapper = ModelSwapper(ROOT)
    version = swapper.get_latest_version()
    registry = swapper._read_registry()
    entry = registry.get(version, {})
    adapter_path = str(entry.get('adapter_path') or '').strip()
    if not adapter_path:
        raise RuntimeError(f'Latest version {version} has no adapter_path.')
    return version, Path(adapter_path).name


if __name__ == '__main__':
    raise SystemExit(main())
