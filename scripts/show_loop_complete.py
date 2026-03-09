from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Display the Hermes Ouroboros loop completion summary.')
    parser.add_argument(
        '--delay',
        type=float,
        default=0.015,
        help='Typing delay per character in seconds.',
    )
    parser.add_argument(
        '--summary-file',
        default='models/loop2_summary.txt',
        help='Relative path to the loop summary file.',
    )
    parser.add_argument('--plain', action='store_true', help='Disable ANSI styling.')
    return parser


def load_summary(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding='utf-8')

    registry_path = ROOT / 'models' / 'registry.json'
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding='utf-8'))
        versions = [name for name in registry.keys() if name.startswith('v')]
        latest = versions[-1] if versions else 'v?'
        return (
            '========================================\n'
            f'HERMES OUROBOROS - {latest.upper()} READY\n'
            '========================================\n'
            'Summary file missing.\n'
            f'Latest registry entry: {latest}\n'
            '========================================\n'
        )
    return 'HERMES OUROBOROS - no loop summary available.\n'


def type_out(text: str, delay: float) -> None:
    for char in text:
        print(char, end='', flush=True)
        if char != '\n':
            time.sleep(delay)


def style(text: str, code: str, enabled: bool) -> str:
    if not enabled:
        return text
    return f'\033[{code}m{text}\033[0m'


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    use_color = sys.stdout.isatty() and not args.plain

    summary_path = ROOT / args.summary_file
    summary = load_summary(summary_path)
    intro = style('LOOP STATUS STREAM', '1;96', use_color)
    divider = style('=' * 40, '96', use_color)
    print(divider)
    print(intro)
    print(divider)
    type_out(style(summary, '97', use_color), max(args.delay, 0.0))
    if not summary.endswith('\n'):
        print()
    print(style('Model v2 incoming.', '1;92', use_color))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
