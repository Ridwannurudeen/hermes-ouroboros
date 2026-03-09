from __future__ import annotations

import argparse
import asyncio
import sys
import textwrap
import time
from dataclasses import replace
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.conflict_resolver import ConflictResolver
from core.settings import load_settings
from core.telegram_delivery import TelegramDelivery
from providers.factory import build_provider
from providers.mock_provider import MockCouncilProvider
from core.agent_launcher import AgentLauncher

DEFAULT_QUERIES = (
    'Is DeFi the future of finance?',
    'Will AI replace human intelligence?',
    'Is Bitcoin digital gold or outdated technology?',
)

ROLE_STYLES = {
    'advocate': ('ADVOCATE', '+'),
    'skeptic': ('SKEPTIC', '!'),
    'oracle': ('ORACLE', '='),
    'contrarian': ('CONTRARIAN', '~'),
}

DEMO_LOG_NAMES = ('master', 'advocate', 'skeptic', 'oracle', 'contrarian', 'arbiter', 'telegram')


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Run a Hermes Ouroboros demo rehearsal.')
    parser.add_argument(
        '--query',
        action='append',
        dest='queries',
        help='Custom query to run. Repeat to provide multiple queries.',
    )
    parser.add_argument(
        '--pause-seconds',
        type=int,
        default=10,
        help='Pause between queries to match the recording cadence.',
    )
    parser.add_argument(
        '--provider',
        help='Override the configured provider for the demo run.',
    )
    parser.add_argument(
        '--model',
        help='Override the configured model for the demo run.',
    )
    parser.add_argument(
        '--demo-log-dir',
        default='logs/demo',
        help='Relative directory where pane-friendly demo logs will be written.',
    )
    return parser


def build_runtime(
    provider_override: str | None = None,
    model_override: str | None = None,
) -> tuple[object, str]:
    settings = load_settings(ROOT)
    if provider_override or model_override:
        settings = replace(
            settings,
            provider=replace(
                settings.provider,
                name=provider_override or settings.provider.name,
                model=model_override or settings.provider.model,
            ),
        )
    try:
        provider = build_provider(settings)
        return provider, settings.provider.name
    except Exception as exc:
        print(f'[demo] provider init failed, using mock provider: {exc}')
        return MockCouncilProvider(), 'mock'


def wrap_block(text: str, width: int = 78, indent: str = '    ') -> str:
    chunks: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            chunks.append('')
            continue
        wrapped = textwrap.wrap(stripped, width=width) or ['']
        chunks.extend(indent + item for item in wrapped)
    return '\n'.join(chunks).rstrip()


class DemoLogWriter:
    def __init__(self, root: Path, relative_dir: str) -> None:
        self.log_dir = root / relative_dir
        self.paths = {name: self.log_dir / f'{name}.log' for name in DEMO_LOG_NAMES}

    def reset(self) -> None:
        self.log_dir.mkdir(parents=True, exist_ok=True)
        for path in self.paths.values():
            path.write_text('', encoding='utf-8')

    def write(self, name: str, text: str) -> None:
        path = self.paths.get(name)
        if path is None:
            return
        with path.open('a', encoding='utf-8') as handle:
            handle.write(text)
            if not text.endswith('\n'):
                handle.write('\n')


async def run_demo_query(
    query: str,
    launcher: AgentLauncher,
    resolver: ConflictResolver,
    provider: object,
    delivery: TelegramDelivery,
    log_writer: DemoLogWriter,
    sequence_number: int,
    total_queries: int,
) -> None:
    started_at = time.perf_counter()
    log_writer.write('master', '')
    log_writer.write('master', '=' * 88)
    log_writer.write('master', f'QUERY {sequence_number}/{total_queries}: {query}')
    log_writer.write('master', '=' * 88)
    print()
    print('=' * 88)
    print(f'QUERY {sequence_number}/{total_queries}: {query}')
    print('=' * 88)
    print('[telegram] Council convened. 5 agents dispatched...')
    print('[orchestrator] fanout -> advocate, skeptic, oracle, contrarian')
    log_writer.write('telegram', f'[{sequence_number}] outbound query -> {query}')
    log_writer.write('master', '[telegram] Council convened. 5 agents dispatched...')
    log_writer.write('master', '[orchestrator] fanout -> advocate, skeptic, oracle, contrarian')

    async def stream_callback(role: str, response: str, meta: dict[str, object]) -> None:
        label, border = ROLE_STYLES.get(role, (role.upper(), '-'))
        duration = meta.get('duration_seconds', 0.0)
        status = meta.get('status', 'ok')
        header = f'[{label}] status={status} duration={duration}s'
        print(header.ljust(88, border))
        preview = wrap_block(response.split('\n\n', 1)[0], width=70)
        if preview:
            print(preview)
        print()
        log_writer.write('master', header)
        log_writer.write(role, '=' * 88)
        log_writer.write(role, f'QUERY {sequence_number}/{total_queries}: {query}')
        log_writer.write(role, header)
        log_writer.write(role, response)
        log_writer.write(role, '')

    agent_responses, agent_timings = await launcher.launch_agents(query, stream_callback=stream_callback)
    print('[orchestrator] all council responses received')
    log_writer.write('master', '[orchestrator] all council responses received')

    conflict = await resolver.resolve(query, agent_responses)
    if conflict.conflict_detected:
        print('[arbiter] conflict detected -> additional research triggered')
        if conflict.additional_research:
            print(wrap_block(conflict.additional_research, width=74))
        log_writer.write('master', '[arbiter] conflict detected -> additional research triggered')
        log_writer.write('arbiter', '=' * 88)
        log_writer.write('arbiter', f'QUERY {sequence_number}/{total_queries}: {query}')
        log_writer.write('arbiter', 'CONFLICT DETECTED')
        log_writer.write('arbiter', conflict.conflict_summary)
        if conflict.additional_research:
            log_writer.write('arbiter', '')
            log_writer.write('arbiter', 'ADDITIONAL RESEARCH')
            log_writer.write('arbiter', conflict.additional_research)
    else:
        print('[arbiter] no critical conflict detected')
        log_writer.write('master', '[arbiter] no critical conflict detected')
        log_writer.write('arbiter', '=' * 88)
        log_writer.write('arbiter', f'QUERY {sequence_number}/{total_queries}: {query}')
        log_writer.write('arbiter', 'NO CRITICAL CONFLICT')
        log_writer.write('arbiter', conflict.conflict_summary)

    arbiter_prompt = (
        f'QUERY: {query}\n\n'
        f"ADVOCATE REPORT:\n{agent_responses.get('advocate', '')}\n\n"
        f"SKEPTIC REPORT:\n{agent_responses.get('skeptic', '')}\n\n"
        f"ORACLE REPORT:\n{agent_responses.get('oracle', '')}\n\n"
        f"CONTRARIAN REPORT:\n{agent_responses.get('contrarian', '')}\n\n"
        'Your task: Review all four reports and render your verdict.'
    )
    verdict = await provider.generate(
        'arbiter',
        'You are the final arbiter.',
        arbiter_prompt,
        context={
            'conflict_summary': conflict.conflict_summary,
            'additional_research': conflict.additional_research or '',
        },
    )

    confidence = extract_confidence(verdict)
    total_time = round(time.perf_counter() - started_at, 1)

    session_result = {
        'query': query,
        'session_id': f'demo-{sequence_number:02d}',
        'elapsed_seconds': total_time,
        'confidence_score': confidence,
        'arbiter_verdict': verdict,
        'agent_responses': agent_responses,
        'conflict_summary': conflict.conflict_summary,
    }

    print('[telegram] formatted verdict')
    print('-' * 88)
    primary_message = delivery.format_primary_message(session_result)
    print(primary_message)
    print('-' * 88)
    log_writer.write('arbiter', '')
    log_writer.write('arbiter', 'FINAL VERDICT')
    log_writer.write('arbiter', verdict)
    log_writer.write('telegram', '=' * 88)
    log_writer.write('telegram', f'QUERY {sequence_number}/{total_queries}: {query}')
    log_writer.write('telegram', primary_message)


def extract_confidence(verdict: str) -> int:
    import re

    patterns = (
        r'confidence(?:\s+score)?\s*[:=]\s*(\d{1,3})',
        r'(\d{1,3})\s*/\s*100',
        r'(\d{1,3})%',
    )
    for pattern in patterns:
        match = re.search(pattern, verdict, flags=re.IGNORECASE)
        if match:
            return int(match.group(1))
    return -1


async def run_queries(
    queries: Iterable[str],
    pause_seconds: int,
    provider_override: str | None,
    model_override: str | None,
    demo_log_dir: str,
) -> None:
    provider, provider_name = build_runtime(provider_override, model_override)
    launcher = AgentLauncher(provider=provider)
    resolver = ConflictResolver(provider=provider)
    delivery = TelegramDelivery()
    log_writer = DemoLogWriter(ROOT, demo_log_dir)
    log_writer.reset()
    query_list = list(queries)

    print('HERMES OUROBOROS DEMO REHEARSAL')
    print(f'Provider: {provider_name}')
    print(f'Pause between queries: {pause_seconds}s')
    print(f'Total demo queries: {len(query_list)}')
    print(f'Demo logs: {log_writer.log_dir}')
    log_writer.write('master', 'HERMES OUROBOROS DEMO REHEARSAL')
    log_writer.write('master', f'Provider: {provider_name}')
    log_writer.write('master', f'Pause between queries: {pause_seconds}s')
    log_writer.write('master', f'Total demo queries: {len(query_list)}')

    for index, query in enumerate(query_list, start=1):
        await run_demo_query(
            query=query,
            launcher=launcher,
            resolver=resolver,
            provider=provider,
            delivery=delivery,
            log_writer=log_writer,
            sequence_number=index,
            total_queries=len(query_list),
        )
        if index < len(query_list) and pause_seconds > 0:
            print(f'[stage] Hold for {pause_seconds}s before the next question...')
            log_writer.write('master', f'[stage] Hold for {pause_seconds}s before the next question...')
            await asyncio.sleep(pause_seconds)

    print()
    print('DEMO REHEARSAL COMPLETE')
    print('Next recording move: show Telegram -> tmux -> benchmark -> loop summary.')
    log_writer.write('master', 'DEMO REHEARSAL COMPLETE')
    log_writer.write('master', 'Next recording move: show Telegram -> tmux -> benchmark -> loop summary.')


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    queries = args.queries or list(DEFAULT_QUERIES)
    asyncio.run(
        run_queries(
            queries=queries,
            pause_seconds=args.pause_seconds,
            provider_override=args.provider,
            model_override=args.model,
            demo_log_dir=args.demo_log_dir,
        )
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
