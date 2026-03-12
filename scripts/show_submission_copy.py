from __future__ import annotations

import argparse
import sys

TWEET_PRIMARY = """Built Hermes Ouroboros for the @NousResearch hackathon.

4 adversarial agents and an arbiter debate every query.
Each session becomes training data.
That data trains the next council.
The loop closes.

Not an agent that does tasks.
An agent that becomes.

[ATTACH VIDEO]"""

TWEET_BACKUP = """Hermes Ouroboros: an adversarial AI council built for the @NousResearch hackathon.

Multiple agents argue in parallel.
Their sessions become training data.
The next model comes back stronger.

[ATTACH VIDEO]"""

DISCORD_POST = """Submitting Hermes Ouroboros for the Nous Research hackathon.

Hermes Ouroboros is an adversarial council: Advocate, Skeptic, Oracle, and Contrarian debate each query, an Arbiter resolves the conflict, and the full session becomes DPO training data for the next model iteration.

Tweet: <tweet-url>
Repo: <github-repo-url>
Demo: <public-demo-url>"""

GITHUB_DESCRIPTION = (
    'Adversarial multi-agent council that debates, learns from trajectories, '
    'and trains on its own debate data.'
)

VIDEO_TITLE = 'Hermes Ouroboros | Adversarial Multi-Agent Council'

VIDEO_DESCRIPTION = """Hermes Ouroboros is a multi-agent council built for the Nous Research hackathon.

Advocate, Skeptic, Oracle, and Contrarian debate each query in parallel.
An Arbiter resolves the conflict and delivers the final verdict.
Every session is captured as training data, which feeds the next model iteration.

Repo: <github-repo-url>
Tweet: <tweet-url>"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Print submission-ready copy blocks for Hermes Ouroboros.')
    parser.add_argument('--plain', action='store_true', help='Disable ANSI styling.')
    return parser


def style(text: str, code: str, enabled: bool) -> str:
    if not enabled:
        return text
    return f'\033[{code}m{text}\033[0m'


def print_block(title: str, body: str, use_color: bool, limit: int | None = None) -> None:
    print(style('=' * 72, '96', use_color))
    print(style(title, '1;96', use_color))
    print(style('=' * 72, '96', use_color))
    print(body)
    if limit is not None:
        count = len(body)
        if count <= limit:
            status = f'{count}/{limit} chars'
            print(style(status, '92', use_color))
        else:
            status = f'{count}/{limit} chars - OVER LIMIT'
            print(style(status, '91', use_color))
    else:
        print(style(f'{len(body)} chars', '90', use_color))
    print()


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    use_color = sys.stdout.isatty() and not args.plain

    print_block('Tweet Draft A', TWEET_PRIMARY, use_color, limit=280)
    print_block('Tweet Draft B', TWEET_BACKUP, use_color, limit=280)
    print_block('Discord Submission', DISCORD_POST, use_color)
    print_block('GitHub Repo Description', GITHUB_DESCRIPTION, use_color, limit=100)
    print_block('Video Title', VIDEO_TITLE, use_color, limit=100)
    print_block('Video Description', VIDEO_DESCRIPTION, use_color)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
