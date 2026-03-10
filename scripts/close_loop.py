from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from learning.atropos_runner import get_training_status, run_training_cycle
from learning.model_swapper import ModelSwapper
from benchmark.compare import compare_payloads, load_results


def main() -> int:
    print('HERMES OUROBOROS - CLOSE LOOP')
    print('=============================')

    status = get_training_status(ROOT)
    swapper = ModelSwapper(ROOT)
    previous_active_version = status['current_version']
    print(json.dumps(status, indent=2))

    if status['remaining_until_next_cycle'] > 0:
        print('Not enough new high-quality trajectories for the next cycle.')
        return 1

    print('\n[1/4] Running training cycle...')
    training_result = run_training_cycle(
        root=ROOT,
        min_trajectories=status['auto_train_threshold'],
        dry_run=False,
        allow_fallback_to_dry_run=True,
    )
    print(json.dumps(training_result, indent=2))
    if not training_result.get('success'):
        blocker = _summarize_blocker(str(training_result.get('fallback_reason') or ''))
        if blocker:
            print(f'Live training is blocked: {blocker}')
        print('Training did not complete successfully.')
        return 1

    print('\n[2/4] Promoting trained backend...')
    promote = _run_command(['scripts/promote_trained_backend.py'])
    print(promote['stdout'])
    if promote['returncode'] != 0:
        print(promote['stderr'] or 'Promotion failed.')
        return promote['returncode']

    print('\n[3/4] Running trained benchmark...')
    candidate_version = str(training_result.get('version') or 'candidate')
    candidate_results_name = f'results_{candidate_version}.json'
    benchmark = _run_command(
        [
            'benchmark/run_benchmark_v1.py',
            '--label',
            f'{candidate_version}_trained_candidate',
            '--output-name',
            candidate_results_name,
            '--note',
            f'Candidate benchmark for {candidate_version}. This file is generated before benchmark promotion.',
        ]
    )
    print(benchmark['stdout'])
    if benchmark['returncode'] != 0:
        print(benchmark['stderr'] or 'Trained benchmark failed.')
        swapper.set_active_version(previous_active_version)
        return benchmark['returncode']

    print('\n[4/4] Comparing benchmark results...')
    compare = _run_command(['benchmark/compare.py', '--after', candidate_results_name])
    print(compare['stdout'])
    if compare['returncode'] != 0:
        print(compare['stderr'] or 'Benchmark comparison failed.')
        swapper.set_active_version(previous_active_version)
        return compare['returncode']

    comparison = compare_payloads(
        load_results('results_v0.json'),
        load_results(candidate_results_name),
    )
    if not comparison['passed']:
        print(f"Benchmark gate failed. Restoring active version to {previous_active_version}.")
        swapper.set_active_version(previous_active_version)
        return 1

    shutil.copyfile(ROOT / 'benchmark' / candidate_results_name, ROOT / 'benchmark' / 'results_v1.json')

    print('Loop closure sequence complete.')
    return 0


def _run_command(parts: list[str]) -> dict[str, object]:
    command = [sys.executable, '-X', 'utf8', *parts]
    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        encoding='utf-8',
        errors='replace',
    )
    return {
        'returncode': completed.returncode,
        'stdout': completed.stdout,
        'stderr': completed.stderr,
    }


def _summarize_blocker(text: str) -> str:
    lowered = text.lower()
    if 'spend limit reached' in lowered:
        return 'Modal workspace billing cycle spend limit reached'
    if 'too many requests' in lowered or '429' in lowered:
        return 'Modal endpoint is rate-limited'
    return ''


if __name__ == '__main__':
    raise SystemExit(main())
