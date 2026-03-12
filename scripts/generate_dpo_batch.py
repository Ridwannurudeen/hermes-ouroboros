"""
Batch-generate DPO pairs by running diverse queries through the full council pipeline.
Each session naturally produces 1-3 preference pairs.

Usage:
    python -X utf8 scripts/generate_dpo_batch.py [--workers 3] [--limit 100]
"""
from __future__ import annotations
import asyncio
import sys
import time
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.master_orchestrator import MasterOrchestrator
from core.settings import load_settings
from providers.factory import build_provider

QUERIES = [
    # VERIFY mode — factual claims to fact-check
    ("Is it true that humans only use 10% of their brain?", "verify"),
    ("Does drinking 8 glasses of water a day have scientific backing?", "verify"),
    ("Is the Great Wall of China visible from space?", "verify"),
    ("Did Einstein fail math in school?", "verify"),
    ("Is organic food more nutritious than conventional food?", "verify"),
    ("Do vaccines cause autism?", "verify"),
    ("Is the stock market a zero-sum game?", "verify"),
    ("Does cracking your knuckles cause arthritis?", "verify"),
    ("Is breakfast the most important meal of the day?", "verify"),
    ("Can you catch a cold from being cold?", "verify"),
    ("Is glass a slow-moving liquid?", "verify"),
    ("Does sugar make children hyperactive?", "verify"),
    ("Is the tongue divided into taste zones?", "verify"),
    ("Do goldfish have a 3-second memory?", "verify"),
    ("Is it dangerous to wake a sleepwalker?", "verify"),
    ("Does reading in dim light damage your eyes?", "verify"),
    ("Is the Sahara the largest desert on Earth?", "verify"),
    ("Do lightning strikes never hit the same place twice?", "verify"),
    ("Is blood blue inside the body?", "verify"),
    ("Does hair and nails grow after death?", "verify"),
    ("Is Pluto a planet?", "verify"),
    ("Does alcohol kill brain cells?", "verify"),
    ("Is the Earth's core hotter than the Sun's surface?", "verify"),
    ("Did Napoleon Bonaparte actually lose because of his height?", "verify"),
    ("Is dark matter proven to exist?", "verify"),
    ("Does the full moon affect human behavior?", "verify"),
    ("Is fluoride in water supply dangerous?", "verify"),
    ("Are left-handed people more creative?", "verify"),
    ("Does muscle weigh more than fat?", "verify"),
    ("Is the Bermuda Triangle genuinely anomalous?", "verify"),

    # RED_TEAM mode — adversarial risk analysis
    ("What could go wrong if we deploy AI judges in criminal courts?", "red_team"),
    ("What are the failure modes of self-driving cars in edge cases?", "red_team"),
    ("How could a bad actor exploit large language models for disinformation?", "red_team"),
    ("What are the risks of replacing human teachers with AI tutors?", "red_team"),
    ("How could facial recognition technology be misused by governments?", "red_team"),
    ("What happens when algorithmic trading systems all use the same strategy?", "red_team"),
    ("What are the security risks of brain-computer interfaces?", "red_team"),
    ("How could deepfakes destabilize democratic elections?", "red_team"),
    ("What could go wrong with CRISPR gene editing in humans?", "red_team"),
    ("What are the risks of AI-generated code in critical infrastructure?", "red_team"),
    ("How could smart home devices be weaponized?", "red_team"),
    ("What are the failure modes of AI-based medical diagnosis?", "red_team"),
    ("How could quantum computing break existing encryption?", "red_team"),
    ("What are the risks of autonomous weapons systems?", "red_team"),
    ("How could social media algorithms radicalize vulnerable people?", "red_team"),
    ("What happens if AI alignment research fails?", "red_team"),
    ("What are the risks of relying on a single cloud provider?", "red_team"),
    ("How could AI hiring tools perpetuate discrimination?", "red_team"),
    ("What are the failure modes of AI content moderation?", "red_team"),
    ("How could synthetic biology be misused?", "red_team"),

    # RESEARCH mode — open-ended deep analysis
    ("What is the current state of nuclear fusion research?", "research"),
    ("How does the gut microbiome affect mental health?", "research"),
    ("What are the strongest arguments for and against universal basic income?", "research"),
    ("How does sleep deprivation affect cognitive performance?", "research"),
    ("What is the evidence for the simulation hypothesis?", "research"),
    ("How effective is cognitive behavioral therapy compared to medication for depression?", "research"),
    ("What is the relationship between social media use and teen mental health?", "research"),
    ("How do different economic systems handle innovation?", "research"),
    ("What are the most promising approaches to carbon capture?", "research"),
    ("How does bilingualism affect cognitive development?", "research"),
    ("What is the current understanding of consciousness in neuroscience?", "research"),
    ("How effective are sanctions as a foreign policy tool?", "research"),
    ("What is the evidence for the multiverse theory?", "research"),
    ("How does exercise affect brain neuroplasticity?", "research"),
    ("What are the long-term effects of remote work on productivity?", "research"),
    ("How do different cultures approach end-of-life care?", "research"),
    ("What is the current evidence on intermittent fasting?", "research"),
    ("How effective is prison rehabilitation vs punishment?", "research"),
    ("What are the implications of declining birth rates globally?", "research"),
    ("How does childhood trauma affect adult health outcomes?", "research"),
    ("What is the state of longevity research?", "research"),
    ("How do different electoral systems affect representation?", "research"),
    ("What are the cognitive effects of meditation according to neuroscience?", "research"),
    ("How does income inequality affect social cohesion?", "research"),
    ("What is the evidence for different theories of intelligence?", "research"),
    ("How effective are carbon taxes vs cap-and-trade systems?", "research"),
    ("What are the implications of artificial general intelligence?", "research"),
    ("How does urban design affect mental health?", "research"),
    ("What is the relationship between gut health and autoimmune diseases?", "research"),
    ("How effective is the war on drugs as public health policy?", "research"),
]


async def run_query(orchestrator: MasterOrchestrator, query: str, mode: str, idx: int, total: int) -> dict:
    t0 = time.monotonic()
    try:
        result = await orchestrator.run_query(query, analysis_mode=mode)
        elapsed = round(time.monotonic() - t0, 1)
        conf = result.get('confidence_score', -1)
        print(f'  [{idx}/{total}] OK ({elapsed}s, conf={conf}) {query[:50]}...')
        return {'ok': True, 'elapsed': elapsed, 'confidence': conf}
    except Exception as exc:
        elapsed = round(time.monotonic() - t0, 1)
        print(f'  [{idx}/{total}] ERROR ({elapsed}s) {query[:50]}... — {exc}')
        return {'ok': False, 'elapsed': elapsed, 'error': str(exc)}


async def worker(orchestrator, queue, results, total):
    while True:
        try:
            idx, query, mode = queue.get_nowait()
        except asyncio.QueueEmpty:
            break
        r = await run_query(orchestrator, query, mode, idx, total)
        results.append(r)
        queue.task_done()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=2, help='Concurrent workers')
    parser.add_argument('--limit', type=int, default=0, help='Limit queries (0=all)')
    args = parser.parse_args()

    settings = load_settings(ROOT)
    provider = build_provider(settings)
    orchestrator = MasterOrchestrator(root=ROOT, provider=provider)

    queries = QUERIES[:args.limit] if args.limit > 0 else QUERIES
    total = len(queries)
    print(f'Starting batch DPO generation: {total} queries, {args.workers} workers')

    queue = asyncio.Queue()
    for i, (q, m) in enumerate(queries, 1):
        queue.put_nowait((i, q, m))

    results = []
    workers = [asyncio.create_task(worker(orchestrator, queue, results, total)) for _ in range(args.workers)]
    await asyncio.gather(*workers)

    ok = sum(1 for r in results if r['ok'])
    print(f'\nDone: {ok}/{total} succeeded')
    print(f'Avg time: {sum(r["elapsed"] for r in results)/len(results):.1f}s')
    avg_conf = [r['confidence'] for r in results if r.get('confidence', -1) >= 0]
    if avg_conf:
        print(f'Avg confidence: {sum(avg_conf)/len(avg_conf):.1f}')


if __name__ == '__main__':
    asyncio.run(main())
