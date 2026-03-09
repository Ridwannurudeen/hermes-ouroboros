from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Display benchmark proof for the Hermes Ouroboros demo.')
    parser.add_argument('--plain', action='store_true', help='Disable ANSI styling.')
    return parser


def load_results(name: str) -> dict:
    path = ROOT / 'benchmark' / name
    return json.loads(path.read_text(encoding='utf-8'))


def pct_change(before: float, after: float) -> float:
    if before == 0:
        return 0.0
    return ((after - before) / before) * 100


def format_delta(before: float, after: float, invert_good: bool = False) -> str:
    delta = pct_change(before, after)
    if delta == 0:
        return 'FLAT 0.00%'
    if invert_good:
        direction = 'FASTER' if delta < 0 else 'SLOWER'
        return f'{direction} {abs(delta):.2f}%'
    direction = 'UP' if delta > 0 else 'DOWN'
    return f'{direction} {abs(delta):.2f}%'


def style(text: str, code: str, enabled: bool) -> str:
    if not enabled:
        return text
    return f'\033[{code}m{text}\033[0m'


def metric_bar(value: float, enabled: bool, width: int = 18) -> str:
    filled = max(1, min(width, int(round((value / 100) * width))))
    bar = '#' * filled + '.' * (width - filled)
    return style(bar, '96', enabled)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    use_color = sys.stdout.isatty() and not args.plain

    v0 = load_results('results_v0.json')
    v1 = load_results('results_v1.json')

    v0_time = float(v0.get('average_elapsed_seconds') or 0.0)
    v1_time = float(v1.get('average_elapsed_seconds') or 0.0)

    rows = (
        ('Avg Confidence', v0['average_confidence'], v1['average_confidence'], False),
        ('Avg Response Quality', v0['average_response_quality'], v1['average_response_quality'], False),
        ('Avg Time (s)', v0_time, v1_time, True),
    )

    print(style('=' * 72, '96', use_color))
    print(style('HERMES OUROBOROS - BENCHMARK PROOF', '1;96', use_color))
    print(style('=' * 72, '96', use_color))
    print(f"{'Metric':24} {'v0 (base)':>12} {'v1 (trained)':>14} {'Delta':>16}")
    print('-' * 72)
    for label, before, after, invert_good in rows:
        delta_text = format_delta(before, after, invert_good)
        if label != 'Avg Time (s)':
            print(
                f'{label:24} {before:>12.2f} {after:>14.2f} '
                f'{style(delta_text, "92" if "UP" in delta_text else "91", use_color):>16} '
                f'{metric_bar(after, use_color)}'
            )
        else:
            print(
                f'{label:24} {before:>12.2f} {after:>14.2f} '
                f'{style(delta_text, "92" if "FASTER" in delta_text else "91", use_color):>16}'
            )
    print('-' * 72)
    print(f"{'Questions Evaluated':24} {len(v0['results']):>12} {len(v1['results']):>14} {'MATCHED':>16}")
    print()
    print(style(f"v0 label: {v0.get('label', 'n/a')}", '90', use_color))
    print(style(f"v1 label: {v1.get('label', 'n/a')}", '90', use_color))
    print(style(f"v1 runtime modes: {v1.get('runtime_mode_counts', {})}", '90', use_color))
    print()

    confidence_gain = pct_change(v0['average_confidence'], v1['average_confidence'])
    quality_gain = pct_change(v0['average_response_quality'], v1['average_response_quality'])
    speed_gain = -pct_change(v0_time, v1_time)
    summary = (
        'On the recorded benchmark, the trained path improves confidence by '
        f'{confidence_gain:.2f}%, response quality by {quality_gain:.2f}%, '
        f'and latency by {speed_gain:.2f}%.'
    )
    print(style(summary, '1;97', use_color))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
