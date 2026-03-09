from __future__ import annotations

import argparse
import sys
import time


OUROBOROS = r"""
            ___====-_  _-====___
      _--^^^#####//      \\#####^^^--_
   _-^##########// (    ) \\##########^-_
  -############//  |\^^/|  \\############-
_#/############//   (@::@)   \\############\#_
/#############((     \\//     ))#############\
-###############\\    (oo)    //###############-
-#################\\  / VV \  //#################-
-###################\\/      \//###################-
_#/|##########/\######(   /\   )######/\##########|\#_
|/ |#/\#/\#/\/  \#/\##\  /  \  /##/\#/  \/\#/\#/\#| \|
`  |/  V  V      V  \#\| |  | |/#/  V      V  V  \|  '
   `   `  `         ` / |  | | \ '         '  '   '
                    (  |  | |  )
                   __\ |  | | /__
                  (vvv(VVV)(VVV)vvv)
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Display the Hermes Ouroboros title card.')
    parser.add_argument('--delay', type=float, default=0.001, help='Typing delay per character in seconds.')
    parser.add_argument('--plain', action='store_true', help='Disable ANSI styling.')
    return parser


def style(text: str, code: str, enabled: bool) -> str:
    if not enabled:
        return text
    return f'\033[{code}m{text}\033[0m'


def type_out(text: str, delay: float) -> None:
    for char in text:
        print(char, end='', flush=True)
        if char != '\n':
            time.sleep(delay)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    use_color = sys.stdout.isatty() and not args.plain

    print(style(OUROBOROS.strip('\n'), '93', use_color))
    print()
    type_out(style('HERMES OUROBOROS', '1;96', use_color), max(args.delay, 0.0))
    print()
    type_out(style('The agent that rewrites its own brain.', '97', use_color), max(args.delay, 0.0))
    print()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
