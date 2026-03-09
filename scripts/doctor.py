from __future__ import annotations

import asyncio
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

import aiohttp

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.settings import load_settings
from learning.atropos_runner import get_training_status
from learning.model_swapper import ModelSwapper

CHECK_MODULES = ['aiohttp', 'dotenv', 'openai', 'yaml', 'modal']
CHECK_ENV = [
    'OPENAI_API_KEY',
    'HERMES_BASE_URL',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_ALLOWED_USERS',
    'MODAL_TOKEN_ID',
    'MODAL_TOKEN_SECRET',
    'MODAL_INFERENCE_URL',
    'MODAL_INFERENCE_TOKEN',
]


def _run_command(args: list[str]) -> dict[str, object]:
    try:
        completed = subprocess.run(args, capture_output=True, text=True, timeout=20)
        return {
            'ok': completed.returncode == 0,
            'code': completed.returncode,
            'stdout': _sanitize_cli_output(completed.stdout.strip()),
            'stderr': completed.stderr.strip(),
        }
    except Exception as exc:
        return {'ok': False, 'code': -1, 'stdout': '', 'stderr': str(exc)}


async def _probe_modal_inference(url: str | None) -> dict[str, object] | None:
    if not url:
        return None
    try:
        timeout = aiohttp.ClientTimeout(total=20)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url.rstrip('/') + '/health') as response:
                text = await response.text()
                return {
                    'ok': response.status == 200,
                    'status': response.status,
                    'body': text[:400],
                }
    except Exception as exc:
        return {
            'ok': False,
            'status': -1,
            'body': str(exc),
        }


def _benchmark_status() -> dict[str, object] | None:
    path = ROOT / 'benchmark' / 'results_v1.json'
    if not path.exists():
        return None
    payload = json.loads(path.read_text(encoding='utf-8'))
    runtime_modes = payload.get('runtime_mode_counts', {})
    if runtime_modes == {'trained_fallback': 5}:
        proof = 'fallback_only'
    elif runtime_modes == {'trained_profile': 5}:
        proof = 'learned_profile'
    elif 'trained_fallback' in runtime_modes:
        proof = 'mixed'
    elif runtime_modes:
        proof = 'trained_backend'
    else:
        proof = 'unknown'
    return {
        'label': payload.get('label'),
        'runtime_mode_counts': runtime_modes,
        'proof_status': proof,
    }


def _sanitize_cli_output(text: str) -> str:
    lines: list[str] = []
    for line in text.splitlines():
        if line.startswith('Token: '):
            lines.append('Token: [present]')
        else:
            lines.append(line)
    return '\n'.join(lines)


def main() -> None:
    settings = load_settings(ROOT)
    modules = {name: bool(importlib.util.find_spec(name)) for name in CHECK_MODULES}
    env = {name: bool(os.getenv(name)) for name in CHECK_ENV}
    modal_version = _run_command([sys.executable, '-m', 'modal', '--version']) if modules['modal'] else None
    modal_token_info = _run_command([sys.executable, '-m', 'modal', 'token', 'info']) if modules['modal'] else None
    modal_inference_probe = asyncio.run(_probe_modal_inference(os.getenv('MODAL_INFERENCE_URL')))
    training_status = get_training_status(ROOT)
    swapper = ModelSwapper(ROOT)
    try:
        latest_version = swapper.get_latest_version()
        latest_target = swapper.get_inference_target(latest_version)
    except Exception:
        latest_version = None
        latest_target = None
    report = {
        'provider': {
            'configured_name': settings.provider.name,
            'model': settings.provider.model,
            'base_url_present': bool(settings.provider.base_url or os.getenv('HERMES_BASE_URL')),
        },
        'telegram': {
            'enabled': settings.telegram.enabled,
            'bot_token_present': env['TELEGRAM_BOT_TOKEN'],
            'allowed_users_present': env['TELEGRAM_ALLOWED_USERS'],
        },
        'modal': {
            'module_installed': modules['modal'],
            'token_id_present': env['MODAL_TOKEN_ID'],
            'token_secret_present': env['MODAL_TOKEN_SECRET'],
            'inference_url_present': env['MODAL_INFERENCE_URL'],
            'inference_token_present': env['MODAL_INFERENCE_TOKEN'],
            'cli_version': modal_version,
            'token_info': modal_token_info,
            'inference_health': modal_inference_probe,
        },
        'trained_backend': {
            'latest_version': latest_version,
            'latest_target': latest_target,
            'training_status': training_status,
            'benchmark_status': _benchmark_status(),
        },
        'python_modules': modules,
        'env_vars': env,
    }
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
