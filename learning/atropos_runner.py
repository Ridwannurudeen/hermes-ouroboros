from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from core.settings import load_settings
from learning.atropos_config import generate_config
from learning.quality_filter import get_training_batch, is_high_quality
from learning.model_swapper import ModelSwapper
from learning.trajectory_stats import build_stats


SUMMARY_TEMPLATE = '''
========================================
HERMES OUROBOROS - LOOP {loop_number} COMPLETE
========================================
Trajectories generated:  {total}
High-quality kept:       {high_quality}
Training examples:       {training_examples}
Training steps:          {steps}
Final training loss:     {training_loss}
Model version:           {version}
Training base model:     {base_model}
Adapter saved to:        {adapter_path}
Loop mode:               {mode}
========================================
'''.strip()

AUTO_TRAIN_STATE_FILE = '.auto_train_state.json'
DEFAULT_AUTO_TRAIN_BLOCK_COOLDOWN_SECONDS = 6 * 60 * 60


def run_training_cycle(
    root: str | Path = '.',
    min_trajectories: int = 50,
    dry_run: bool | None = None,
    allow_fallback_to_dry_run: bool = True,
) -> dict[str, Any]:
    root_path = Path(root).resolve()
    settings = load_settings(root_path)
    trajectories = get_training_batch(root_path, min_count=min_trajectories)
    if len(trajectories) < min_trajectories:
        return {
            'success': False,
            'reason': f'Need at least {min_trajectories} high-quality trajectories, found {len(trajectories)}.',
        }

    modal, train_local_stub = _load_training_backend()
    requested_dry_run = modal is None if dry_run is None else dry_run
    models_dir = root_path / settings.learning.models_dir
    models_dir.mkdir(parents=True, exist_ok=True)
    version = get_next_model_version(root_path)
    output_name = f'{"adapter_" + version}_dry_run' if requested_dry_run else f'{"adapter_" + version}'
    output_dir = models_dir / output_name
    output_dir.mkdir(parents=True, exist_ok=True)
    training_base_model = settings.learning.base_model

    config = generate_config(
        trajectories_path=str(output_dir / 'training_payload.json'),
        output_dir=str(output_dir),
        base_model=training_base_model,
    )
    (output_dir / 'training_config.json').write_text(json.dumps(config, indent=2), encoding='utf-8')

    fallback_reason = None
    remote_payload_path = output_dir / 'training_payload.json'
    remote_payload_path.write_text(json.dumps(trajectories, indent=2), encoding='utf-8')

    if modal is not None and not requested_dry_run:
        try:
            result = _run_modal_training(root_path, training_base_model, remote_payload_path, output_name, dry_run=False)
        except Exception as exc:
            fallback_reason = str(exc)
            if not allow_fallback_to_dry_run:
                shutil.rmtree(output_dir, ignore_errors=True)
                return {
                    'success': False,
                    'reason': 'Live training failed and dry-run fallback is disabled.',
                    'fallback_reason': fallback_reason,
                    'version': version,
                    'adapter_path': str(output_dir),
                    'training_base_model': training_base_model,
                    'remote_payload_path': str(remote_payload_path),
                }
            shutil.rmtree(output_dir, ignore_errors=True)
            result = train_local_stub(training_base_model, trajectories, f'{"adapter_" + version}_dry_run', dry_run=True)
            output_name = f'{"adapter_" + version}_dry_run'
            output_dir = models_dir / output_name
            output_dir.mkdir(parents=True, exist_ok=True)
    elif modal is not None and requested_dry_run:
        try:
            result = _run_modal_training(root_path, training_base_model, remote_payload_path, output_name, dry_run=True)
        except Exception as exc:
            fallback_reason = str(exc)
            result = train_local_stub(training_base_model, trajectories, output_name, dry_run=True)
    else:
        if not requested_dry_run and not allow_fallback_to_dry_run:
            shutil.rmtree(output_dir, ignore_errors=True)
            return {
                'success': False,
                'reason': 'Live training requested but Modal is unavailable and dry-run fallback is disabled.',
                'version': version,
                'adapter_path': str(output_dir),
                'training_base_model': training_base_model,
                'remote_payload_path': str(remote_payload_path),
            }
        result = train_local_stub(training_base_model, trajectories, output_name, dry_run=True)

    (output_dir / 'training_result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    registry_entry = None
    if not result.get('dry_run', requested_dry_run):
        registry_entry = ModelSwapper(root_path).register_model(
            version=version,
            model_name=f'hermes_ouroboros_{version}',
            adapter_path=str(output_dir),
            training_loss=result.get('final_training_loss'),
        )

    stats = build_stats(root_path)
    summary_text = SUMMARY_TEMPLATE.format(
        loop_number=version[1:],
        total=stats['total'],
        high_quality=stats['high_quality'],
        training_examples=len(trajectories),
        steps=result.get('steps'),
        training_loss=result.get('final_training_loss'),
        version=version,
        base_model=training_base_model,
        adapter_path=str(output_dir),
        mode='dry-run' if result.get('dry_run', requested_dry_run) else 'live',
    )
    summary_path = models_dir / f'loop{version[1:]}_summary.txt'
    summary_path.write_text(summary_text + '\n', encoding='utf-8')

    payload = {
        'success': True,
        'version': version,
        'adapter_path': str(output_dir),
        'training_loss': result.get('final_training_loss'),
        'steps': result.get('steps'),
        'training_examples': len(trajectories),
        'dry_run': result.get('dry_run', requested_dry_run),
        'training_base_model': training_base_model,
        'registry': registry_entry,
        'summary_path': str(summary_path),
        'total_trajectories': stats['total'],
        'high_quality_trajectories': stats['high_quality'],
        'remote_payload_path': str(remote_payload_path),
    }
    if fallback_reason:
        payload['fallback_reason'] = fallback_reason
    return payload


def get_next_model_version(root: str | Path = '.') -> str:
    swapper = ModelSwapper(root)
    try:
        latest = swapper.get_latest_version()
    except KeyError:
        return 'v1'
    if latest == 'v0':
        return 'v1'
    try:
        return f"v{int(latest[1:]) + 1}"
    except ValueError:
        return 'v1'


def get_training_status(root: str | Path = '.') -> dict[str, Any]:
    root_path = Path(root).resolve()
    settings = load_settings(root_path)
    swapper = ModelSwapper(root_path)
    try:
        current_version = swapper.get_active_version()
    except KeyError:
        current_version = 'v0'
    try:
        latest_version = swapper.get_latest_version()
    except KeyError:
        latest_version = current_version
    registry = swapper._read_registry()
    latest_entry = registry.get(current_version, {})
    deployed_at_raw = latest_entry.get('deployed_at')
    meta = registry.get('_meta') if isinstance(registry.get('_meta'), dict) else {}
    if meta.get('active_version') == current_version and meta.get('updated_at'):
        deployed_at_raw = meta.get('updated_at')
    deployed_at = _parse_timestamp(deployed_at_raw)

    high_quality_total = 0
    new_high_quality = 0
    for record in _iter_high_quality_trajectories(root_path):
        high_quality_total += 1
        if deployed_at is None:
            continue
        record_timestamp = _parse_timestamp(record.get('timestamp'))
        if record_timestamp and record_timestamp > deployed_at:
            new_high_quality += 1

    if deployed_at is None:
        new_high_quality = high_quality_total

    threshold = settings.learning.auto_train_min_new_trajectories
    models_dir = root_path / settings.learning.models_dir
    cooldown_seconds = _auto_train_block_cooldown_seconds()
    auto_train_state = _active_auto_train_block_state(models_dir, cooldown_seconds)
    if auto_train_state is None:
        auto_train_state = _read_auto_train_state(models_dir)
    return {
        'current_version': current_version,
        'latest_version': latest_version,
        'latest_deployed_at': deployed_at_raw,
        'high_quality_total': high_quality_total,
        'new_high_quality_since_latest': new_high_quality,
        'auto_train_enabled': settings.learning.auto_train_enabled,
        'auto_train_threshold': threshold,
        'remaining_until_next_cycle': max(0, threshold - new_high_quality),
        'next_version': get_next_model_version(root_path),
        'auto_train_state': auto_train_state,
    }


def maybe_run_auto_training(root: str | Path = '.') -> dict[str, Any]:
    root_path = Path(root).resolve()
    settings = load_settings(root_path)
    status = get_training_status(root_path)
    models_dir = root_path / settings.learning.models_dir
    cooldown_seconds = _auto_train_block_cooldown_seconds()
    if not settings.learning.auto_train_enabled:
        return {'triggered': False, 'reason': 'auto_train_disabled', 'status': status}
    if status['new_high_quality_since_latest'] < settings.learning.auto_train_min_new_trajectories:
        return {'triggered': False, 'reason': 'threshold_not_met', 'status': status}
    cooldown_state = _active_auto_train_block_state(models_dir, cooldown_seconds)
    if cooldown_state is not None:
        return {
            'triggered': False,
            'reason': 'blocked_cooldown_active',
            'status': status,
            'block_state': cooldown_state,
        }

    lock_path = models_dir / '.auto_train.lock'
    if lock_path.exists():
        return {'triggered': False, 'reason': 'training_already_running', 'status': status}

    lock_path.write_text(datetime.utcnow().isoformat(), encoding='utf-8')
    try:
        result = run_training_cycle(
            root=root_path,
            min_trajectories=settings.learning.auto_train_min_new_trajectories,
            dry_run=False,
            allow_fallback_to_dry_run=False,
        )
        if not result.get('success'):
            _write_auto_train_state(
                models_dir,
                {
                    'status': 'blocked',
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                    'reason': str(result.get('reason') or ''),
                    'blocker': _summarize_blocker_text(str(result.get('fallback_reason') or '')),
                    'fallback_reason': str(result.get('fallback_reason') or ''),
                },
            )
            return {'triggered': False, 'reason': 'training_failed', 'status': status, 'result': result}
        _clear_auto_train_state(models_dir)
        return {'triggered': True, 'status': status, 'result': result}
    finally:
        lock_path.unlink(missing_ok=True)



def _run_modal_training(
    root_path: Path,
    training_base_model: str,
    payload_path: Path,
    output_name: str,
    dry_run: bool,
) -> dict[str, Any]:
    command = [
        sys.executable,
        '-X',
        'utf8',
        '-m',
        'modal',
        'run',
        'learning/modal_trainer.py::run',
        '--base-model-name',
        training_base_model,
        '--training-data-path',
        str(payload_path),
        '--output-name',
        output_name,
        '--dry-run' if dry_run else '--no-dry-run',
    ]
    env = dict(os.environ)
    env['PYTHONIOENCODING'] = 'utf-8'
    if not env.get('MODAL_TOKEN_ID'):
        env.pop('MODAL_TOKEN_ID', None)
    if not env.get('MODAL_TOKEN_SECRET'):
        env.pop('MODAL_TOKEN_SECRET', None)
    completed = subprocess.run(
        command,
        cwd=root_path,
        text=True,
        capture_output=True,
        timeout=7200,
        env=env,
        encoding='utf-8',
        errors='replace',
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or 'Modal run failed.')
    return _extract_json_payload(completed.stdout)


def _extract_json_payload(stdout: str) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    parsed: dict[str, Any] | None = None
    index = 0
    while True:
        start = stdout.find('{', index)
        if start == -1:
            break
        try:
            candidate, end = decoder.raw_decode(stdout[start:])
            if isinstance(candidate, dict) and 'adapter_path' in candidate:
                parsed = candidate
        except json.JSONDecodeError:
            pass
        index = start + 1
    if parsed is None:
        raise RuntimeError('Could not parse Modal JSON payload from output.')
    return parsed


def _load_training_backend():
    from learning.modal_trainer import modal, train_local_stub

    return modal, train_local_stub


def _iter_high_quality_trajectories(root_path: Path):
    trajectories_dir = root_path / 'trajectories'
    for path in sorted(trajectories_dir.glob('*.jsonl')):
        for line in path.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            if is_high_quality(record):
                yield record


def _parse_timestamp(raw: Any) -> datetime | None:
    if not raw or not isinstance(raw, str):
        return None
    try:
        return datetime.fromisoformat(raw.replace('Z', '+00:00'))
    except ValueError:
        return None


def _auto_train_block_cooldown_seconds() -> int:
    raw = os.getenv('HERMES_AUTO_TRAIN_BLOCK_COOLDOWN_SECONDS', str(DEFAULT_AUTO_TRAIN_BLOCK_COOLDOWN_SECONDS))
    try:
        return max(60, int(raw))
    except ValueError:
        return DEFAULT_AUTO_TRAIN_BLOCK_COOLDOWN_SECONDS


def _auto_train_state_path(models_dir: Path) -> Path:
    return models_dir / AUTO_TRAIN_STATE_FILE


def _read_auto_train_state(models_dir: Path) -> dict[str, Any] | None:
    path = _auto_train_state_path(models_dir)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get('status') == 'blocked' and not payload.get('blocker'):
        payload['blocker'] = _summarize_blocker_text(str(payload.get('fallback_reason') or ''))
    return payload


def _write_auto_train_state(models_dir: Path, payload: dict[str, Any]) -> None:
    models_dir.mkdir(parents=True, exist_ok=True)
    _auto_train_state_path(models_dir).write_text(json.dumps(payload, indent=2), encoding='utf-8')


def _clear_auto_train_state(models_dir: Path) -> None:
    _auto_train_state_path(models_dir).unlink(missing_ok=True)


def _active_auto_train_block_state(models_dir: Path, cooldown_seconds: int) -> dict[str, Any] | None:
    payload = _read_auto_train_state(models_dir)
    if payload is None:
        return None
    if payload.get('status') != 'blocked':
        return None
    updated_at = _parse_timestamp(payload.get('updated_at'))
    if updated_at is None:
        return payload
    expires_at = updated_at + timedelta(seconds=cooldown_seconds)
    now = datetime.now(timezone.utc)
    if expires_at <= now:
        _clear_auto_train_state(models_dir)
        return None
    enriched = dict(payload)
    enriched['cooldown_seconds'] = cooldown_seconds
    enriched['retry_after_seconds'] = max(1, int((expires_at - now).total_seconds()))
    enriched['expires_at'] = expires_at.isoformat()
    return enriched


def _summarize_blocker_text(text: str) -> str:
    lowered = text.lower()
    if 'spend limit reached' in lowered:
        return 'Modal workspace billing cycle spend limit reached'
    if 'too many requests' in lowered or '429' in lowered:
        return 'Modal endpoint is rate-limited'
    if not text.strip():
        return 'Live training backend unavailable'
    first_line = text.strip().splitlines()[0].strip()
    return first_line[:200]
