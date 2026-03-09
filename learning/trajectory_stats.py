from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from learning.quality_filter import is_high_quality


def build_stats(root: str | Path = ROOT) -> dict[str, object]:
    trajectories_dir = Path(root) / 'trajectories'
    total = 0
    high_quality = 0
    confidence_scores: list[int] = []
    by_date: Counter[str] = Counter()
    by_role: Counter[str] = Counter()

    for path in sorted(trajectories_dir.glob('*.jsonl')):
        for line in path.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            total += 1
            by_date[path.stem] += 1
            by_role[record.get('agent_role', 'unknown')] += 1
            confidence = int(record.get('metadata', {}).get('confidence_score', -1))
            if confidence >= 0:
                confidence_scores.append(confidence)
            if is_high_quality(record):
                high_quality += 1

    average_confidence = round(sum(confidence_scores) / len(confidence_scores), 2) if confidence_scores else 0.0
    return {
        'total': total,
        'high_quality': high_quality,
        'average_confidence': average_confidence,
        'by_date': dict(by_date),
        'by_role': dict(by_role),
    }


def main() -> None:
    stats = build_stats(ROOT)
    print('Trajectory Summary')
    print('==================')
    print(f"Total trajectories: {stats['total']}")
    print(f"High-quality trajectories: {stats['high_quality']}")
    print(f"Average confidence: {stats['average_confidence']}")
    print('Trajectories by date:')
    for date, count in stats['by_date'].items():
        print(f'  {date}: {count}')
    print('Trajectories by role:')
    for role, count in stats['by_role'].items():
        print(f'  {role}: {count}')


if __name__ == '__main__':
    main()
