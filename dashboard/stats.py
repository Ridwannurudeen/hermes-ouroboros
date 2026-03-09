from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from learning.atropos_runner import get_training_status
from learning.trajectory_stats import build_stats
from core.session_store import SessionStore


def average_confidence(sessions: list[dict]) -> float:
    scores = [int(session.get('confidence_score', -1)) for session in sessions if int(session.get('confidence_score', -1)) >= 0]
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 2)


def count_skills(root: Path) -> int:
    skills_dir = root / 'skills'
    if not skills_dir.exists():
        return 0
    return len(list(skills_dir.glob('auto_*.md')))


def main() -> None:
    store = SessionStore(ROOT)
    all_sessions = store.get_recent_sessions(n=1000)
    last_ten = store.get_recent_sessions(n=10)
    trajectory_stats = build_stats(ROOT)
    training_status = get_training_status(ROOT)

    print('+' + '-' * 68 + '+')
    print('| HERMES OUROBOROS - OPERATOR DASHBOARD'.ljust(69) + '|')
    print('+' + '-' * 68 + '+')
    print(f"| Total sessions run              | {len(all_sessions):>36} |")
    print(f"| Total trajectories captured     | {trajectory_stats['total']:>36} |")
    print(f"| High-quality trajectories       | {trajectory_stats['high_quality']:>36} |")
    print(f"| Current model version           | {training_status['current_version']:>36} |")
    print(f"| Latest trained version          | {training_status.get('latest_version', training_status['current_version']):>36} |")
    print(f"| Next model version              | {training_status['next_version']:>36} |")
    print(f"| Skills created                  | {count_skills(ROOT):>36} |")
    print(f"| Avg confidence (all time)       | {average_confidence(all_sessions):>36} |")
    print(f"| Avg confidence (last 10)        | {average_confidence(last_ten):>36} |")
    print(
        f"| New HQ trajectories since train | {training_status['new_high_quality_since_latest']:>36} |"
    )
    print(f"| Next cycle triggers in          | {training_status['remaining_until_next_cycle']:>36} |")
    print(f"| Auto-train enabled              | {str(training_status['auto_train_enabled']).lower():>36} |")
    auto_train_state = training_status.get('auto_train_state') or {}
    if auto_train_state.get('status') == 'blocked':
        blocker = str(auto_train_state.get('blocker') or 'live backend unavailable')
        print(f"| Auto-train blocker              | {blocker[:36]:>36} |")
        retry_after = auto_train_state.get('retry_after_seconds')
        if retry_after is not None:
            print(f"| Auto-train retry after (s)      | {retry_after:>36} |")
    print('+' + '-' * 68 + '+')

    benchmark_v1_path = ROOT / 'benchmark' / 'results_v1.json'
    if benchmark_v1_path.exists():
        payload = json.loads(benchmark_v1_path.read_text(encoding='utf-8'))
        runtime_modes = payload.get('runtime_mode_counts', {})
        print(f"Benchmark label: {payload.get('label', 'n/a')}")
        print(f'Benchmark runtime modes: {runtime_modes}')
        if 'trained_fallback' in runtime_modes:
            print('Benchmark status: fallback-only. Current benchmark does not prove the Modal adapter improved the system.')

    by_role = trajectory_stats.get('by_role', {})
    if by_role:
        print('Trajectories by role:')
        for role, count in sorted(by_role.items()):
            print(f'  {role}: {count}')


if __name__ == '__main__':
    main()
