from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def load_results(name: str) -> dict:
    path = ROOT / 'benchmark' / name
    return json.loads(path.read_text(encoding='utf-8'))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Compare two benchmark result payloads.')
    parser.add_argument('--before', default='results_v0.json', help='Baseline benchmark filename inside benchmark/.')
    parser.add_argument('--after', default='results_v1.json', help='Candidate benchmark filename inside benchmark/.')
    return parser


def pct_change(before: float, after: float) -> float:
    if before == 0:
        return 0.0
    return round(((after - before) / before) * 100, 2)


def compare_payloads(v0: dict, v1: dict) -> dict[str, object]:
    confidence_delta = pct_change(v0['average_confidence'], v1['average_confidence'])
    quality_delta = pct_change(v0['average_response_quality'], v1['average_response_quality'])
    v0_time = round(v0.get('average_elapsed_seconds') or sum(item['elapsed_seconds'] for item in v0['results']) / max(1, len(v0['results'])), 2)
    v1_time = round(v1.get('average_elapsed_seconds') or sum(item['elapsed_seconds'] for item in v1['results']) / max(1, len(v1['results'])), 2)
    time_delta = pct_change(v0_time, v1_time)
    if confidence_delta > 0 and quality_delta >= 0:
        verdict = 'v1 currently outperforms the base benchmark on the recorded metrics.'
        passed = True
    elif confidence_delta < 0 or quality_delta < 0:
        verdict = 'v1 currently regresses on the recorded benchmark and needs another training/deployment pass.'
        passed = False
    else:
        verdict = 'v1 is effectively flat versus v0 on the recorded benchmark.'
        passed = False
    return {
        'confidence_delta': confidence_delta,
        'quality_delta': quality_delta,
        'v0_time': v0_time,
        'v1_time': v1_time,
        'time_delta': time_delta,
        'verdict': verdict,
        'passed': passed,
    }


def main() -> None:
    args = build_parser().parse_args()
    v0 = load_results(args.before)
    v1 = load_results(args.after)
    comparison = compare_payloads(v0, v1)

    print('+' + '-' * 61 + '+')
    print('| HERMES OUROBOROS - BENCHMARK RESULTS'.ljust(62) + '|')
    print('+' + '-' * 61 + '+')
    print('| Metric               | v0 (base)   | v1 (trained) | Delta      |')
    print('+' + '-' * 61 + '+')
    print(
        f"| Avg Confidence       | {v0['average_confidence']:>10} | {v1['average_confidence']:>12} | {comparison['confidence_delta']:>+9}% |"
    )
    print(
        f"| Avg Response Quality | {v0['average_response_quality']:>10} | {v1['average_response_quality']:>12} | {comparison['quality_delta']:>+9}% |"
    )
    print(f"| Avg Time (s)         | {comparison['v0_time']:>10} | {comparison['v1_time']:>12} | {comparison['time_delta']:>+9}% |")
    print(f"| Questions Evaluated  | {len(v0['results']):>10} | {len(v1['results']):>12} | {'n/a':>10} |")
    print('+' + '-' * 61 + '+')
    print(f"v0 label: {v0.get('label', 'n/a')}")
    print(f"v1 label: {v1.get('label', 'n/a')}")
    print(f"v0 provider: {v0.get('metadata', {}).get('provider_class') or v0.get('metadata', {}).get('provider_name') or 'n/a'}")
    print(f"v1 runtime modes: {v1.get('runtime_mode_counts', {})}")
    if 'trained_fallback' in v1.get('runtime_mode_counts', {}):
        print('Warning: v1 benchmark used the fallback trained profile rather than a true Modal adapter for at least part of the run.')
    elif 'trained_profile' in v1.get('runtime_mode_counts', {}):
        print('Note: v1 benchmark used the promoted learned profile, not a true Modal adapter.')

    print(f"Verdict: {comparison['verdict']}")


if __name__ == '__main__':
    main()
