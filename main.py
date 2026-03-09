from __future__ import annotations

import argparse
import asyncio
import threading
from dataclasses import replace
from pathlib import Path

from core.master_orchestrator import MasterOrchestrator
from core.settings import load_settings
from core.session_store import SessionStore
from core.telegram_bot import TelegramBotRunner
from core.telegram_delivery import TelegramDelivery
from core.web_app import run_api_server
from learning.atropos_runner import maybe_run_auto_training
from providers.factory import build_provider
from providers.mock_provider import MockCouncilProvider


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Run the Hermes Ouroboros council locally.')
    parser.add_argument('--query', help='Single query to run through the council.')
    parser.add_argument('--status', action='store_true', help='Show the last three sessions.')
    parser.add_argument('--bot', action='store_true', help='Run the Telegram polling bot.')
    parser.add_argument('--api', action='store_true', help='Run the Hermes HTTP API and dashboard.')
    parser.add_argument('--host', default='127.0.0.1', help='Host for the HTTP API server.')
    parser.add_argument('--port', type=int, default=8000, help='Port for the HTTP API server.')
    parser.add_argument('--provider', help='Override the configured provider for this run.')
    parser.add_argument('--model', help='Override the configured model for this run.')
    return parser


async def run_query(query: str, orchestrator: MasterOrchestrator) -> None:
    result = await orchestrator.run_query(query)
    delivery = TelegramDelivery()
    print()
    print(delivery.format_primary_message(result))
    print()
    print(delivery.format_follow_up_message(result))


async def interactive_loop(orchestrator: MasterOrchestrator) -> None:
    print('Council console ready. Type a query or exit to quit.')
    while True:
        query = input('> ').strip()
        if query.lower() in {'exit', 'quit'}:
            break
        if not query:
            continue
        await run_query(query, orchestrator)


def show_status(root: Path) -> None:
    store = SessionStore(root)
    sessions = store.get_recent_sessions(n=3)
    if not sessions:
        print('No sessions recorded yet.')
        return
    for session in sessions:
        print(f"{session['session_id'][:8]} | confidence={session['confidence_score']} | query={session['query']}")


def build_runtime_orchestrator(
    root: Path,
    provider_override: str | None = None,
    model_override: str | None = None,
) -> tuple[MasterOrchestrator, str]:
    settings = load_settings(root)
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
        return MasterOrchestrator(root=root, provider=provider), settings.provider.name
    except Exception as exc:
        print(f'Provider initialization failed, falling back to mock: {exc}')
        return MasterOrchestrator(root=root, provider=MockCouncilProvider()), 'mock'


def start_auto_training_if_needed(root: Path) -> None:
    def runner() -> None:
        status = maybe_run_auto_training(root)
        if status.get('triggered'):
            result = status.get('result', {})
            print(
                f"Auto-training completed: version={result.get('version')} "
                f"dry_run={result.get('dry_run')} adapter={result.get('adapter_path')}"
            )
            return
        reason = status.get('reason')
        if reason not in {'auto_train_disabled', 'threshold_not_met'}:
            if reason == 'blocked_cooldown_active':
                block_state = status.get('block_state', {})
                print(
                    'Auto-training skipped: blocked_cooldown_active '
                    f"(retry_after_seconds={block_state.get('retry_after_seconds', 'n/a')})"
                )
                return
            print(f'Auto-training skipped: {reason}')

    thread = threading.Thread(target=runner, name='hermes-auto-train', daemon=True)
    thread.start()


def main() -> None:
    root = Path(__file__).resolve().parent
    settings = load_settings(root)
    parser = build_parser()
    args = parser.parse_args()

    if args.status:
        show_status(root)
        return

    orchestrator, provider_name = build_runtime_orchestrator(
        root,
        provider_override=args.provider,
        model_override=args.model,
    )

    if args.query:
        asyncio.run(run_query(args.query, orchestrator))
        return

    if args.api:
        start_auto_training_if_needed(root)
        print(f'Starting Hermes web app with provider: {provider_name} on http://{args.host}:{args.port}')
        asyncio.run(run_api_server(settings, orchestrator, host=args.host, port=args.port))
        return

    if args.bot or settings.telegram.enabled:
        start_auto_training_if_needed(root)
        print(f'Starting Telegram bot with provider: {provider_name}')
        asyncio.run(TelegramBotRunner(settings, orchestrator).run_forever())
        return

    print(f'Using provider: {provider_name}')
    asyncio.run(interactive_loop(orchestrator))


if __name__ == '__main__':
    main()
