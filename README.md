# HERMES OUROBOROS

Hermes Ouroboros is a multi-agent council that debates every user query before returning a verdict. Its own sessions become training data, which feeds a fine-tuning loop that improves the next version of the council.

## Demo video

Use the local recording workflow below until the public demo upload is available.

## Architecture

```text
USER (Telegram)
      |
      v
+-------------------------------------+
|         MASTER ORCHESTRATOR         |
|   master_orchestrator.py            |
|   - Receives query from Telegram    |
|   - Spawns 5 subagents in parallel  |
|   - Collects results                |
|   - Triggers Arbiter                |
|   - Triggers trajectory capture     |
+----------------+--------------------+
                 | spawns simultaneously
    +------------+-----------------+
    |            |                 |
    v            v                 v
+--------+  +---------+  +--------------+
|ADVOCATE|  | SKEPTIC |  |    ORACLE    |
|        |  |         |  |  (data only) |
|Builds  |  |Tears    |  |  raw facts   |
|case FOR|  |case down|  |  only        |
+--------+  +---------+  +--------------+
    |            |                 |
    +------------+-----------------+
                 | all results passed to Arbiter
    +------------+
    |
    v
+------------------+     +----------------+
|   CONTRARIAN     |---->|    ARBITER     |
| Challenges       |     | - Detects      |
| majority views   |     |   conflicts    |
+------------------+     | - Requests     |
                         |   more evidence|
                         | - Renders      |
                         |   verdict      |
                         +--------+-------+
                                  |
                    +-------------v--------------+
                    |      TELEGRAM DELIVERY     |
                    |  - Verdict                 |
                    |  - Confidence              |
                    |  - Dissenting views        |
                    +-------------+--------------+
                                  |
                    +-------------v--------------+
                    |     TRAJECTORY CAPTURE     |
                    |  - Logs full sessions      |
                    |  - Saves JSONL             |
                    |  - Filters quality         |
                    +-------------+--------------+
                                  |
                    +-------------v--------------+
                    |      ATROPOS RL LOOP       |
                    |  - Reads trajectories      |
                    |  - Fine-tunes on Modal     |
                    |  - Promotes new backend    |
                    +-------------+--------------+
                                  |
                                  v
                          LOOP FIRES AGAIN
```

## Installation

### Local quick start

Unix/macOS:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python test_parallel.py
python test_orchestrator.py
python main.py --query "Is DeFi the future of finance?"
```

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
pip install -r requirements.txt
python test_parallel.py
python test_orchestrator.py
python main.py --query "Is DeFi the future of finance?"
```

### Web dashboard

```bash
python main.py --api --host 127.0.0.1 --port 8000
```

### Telegram bot

Set the Telegram variables in `.env`, then run:

```bash
python main.py --bot
```

### Container deployment

```bash
cd deploy
docker compose up -d --build
```

For HTTPS, copy [Caddyfile.example](/C:/Users/GUDMAN/Desktop/HERMES_OUROBOROS/deploy/Caddyfile.example) to `deploy/Caddyfile` and run:

```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d
```

Full deployment notes live in [DEPLOYMENT.md](/C:/Users/GUDMAN/Desktop/HERMES_OUROBOROS/deploy/DEPLOYMENT.md).

## How the Ouroboros loop works

1. A user submits a question through Telegram, the CLI, or the web app.
2. The master orchestrator launches Advocate, Skeptic, Oracle, and Contrarian in parallel.
3. The Arbiter detects disagreement, optionally requests extra research, and produces the final verdict with confidence.
4. The full session is saved to `sessions/` and logged as trajectories in `trajectories/*.jsonl`.
5. High-quality trajectories are filtered for training.
6. The Atropos/Modal training flow produces a new adapter or learned profile.
7. The trained route is promoted and benchmarked against the previous baseline.
8. The next council run uses the improved profile, generating better future training data.

## Benchmark results

Current recorded benchmark from `benchmark/results_v0.json` and the active trained-path benchmark in `benchmark/results_v1.json`:

| Metric | v0 base | current trained path | Change |
|---|---:|---:|---:|
| Average confidence | 84.60 | 87.60 | +3.55% |
| Average response quality | 88.00 | 100.00 | +13.64% |
| Average elapsed time (s) | 135.07 | 101.69 | -24.71% |
| Questions evaluated | 5 | 5 | matched |

The active trained path is currently the `v1` learned profile. Newer Modal candidates are benchmarked as separate candidate artifacts first; only a passing candidate replaces the active benchmark record and live path. Modal candidates through `v5` were trained successfully, but they remained below the `v1` confidence benchmark and were kept out of production.

For the video/demo proof:

```bash
python -X utf8 scripts/show_benchmark.py
python -X utf8 scripts/show_loop_complete.py --delay 0.01
```

## Demo recording

Hermes includes a tmux-based recording workflow for the hackathon demo:

```bash
chmod +x scripts/setup_demo_tmux.sh scripts/record_demo.sh
./scripts/record_demo.sh
tmux attach -t hermes-demo
```

For the live provider take:

```bash
HERMES_DEMO_PROVIDER=openai_compatible HERMES_DEMO_PAUSE_SECONDS=10 ./scripts/record_demo.sh
```

Optional scene helpers:

```bash
python -X utf8 scripts/show_title_card.py --delay 0.002
python -X utf8 scripts/show_benchmark.py
python -X utf8 scripts/show_loop_complete.py --delay 0.01
```

Submission copy and final posting templates live in [SUBMISSION.md](/C:/Users/GUDMAN/Desktop/HERMES_OUROBOROS/SUBMISSION.md).

## Tech stack

| Component | Tooling |
|---|---|
| Agent runtime | Hermes-style multi-agent council |
| Language | Python 3 |
| Concurrency | `asyncio` + threaded background tasks |
| Interfaces | CLI, Telegram Bot API, local web dashboard |
| Providers | Mock provider, OpenAI-compatible HTTP backend, trained fallback route |
| Storage | Local JSON session store, trajectory JSONL logs |
| Training loop | Atropos runner + Modal-backed fine-tuning flow |
| Deployment | Docker Compose, optional Caddy reverse proxy |

## Current capabilities

- Parallel council execution with four adversarial specialist agents and an arbiter.
- Conflict detection with optional extra research before synthesis.
- Session persistence, public share links, and operator/admin access paths.
- Automatic trajectory capture and high-confidence skill generation.
- Benchmark scripts, health checks, training promotion utilities, and close-loop scaffolding.
- Demo helpers for tmux recording, title card, benchmark proof, and loop-complete reveal.

## Notes

- Default local mode is still the offline mock implementation.
- Default live-provider target is `gpt-5-mini` on `https://api.openai.com/v1`.
- Supply a real `OPENAI_API_KEY`. If `HERMES_BASE_URL` is set in `.env`, it overrides `config.yaml`.
- The default provider timeout is `120` seconds because live council fanout can exceed a 60-second budget.
- Set `HERMES_MODEL=gpt-5-mini` and `HERMES_BASE_URL=https://api.openai.com/v1` in `.env` to use the official OpenAI endpoint.
- Set `HERMES_AUTH_SECRET` to a random 32+ byte secret before enabling local email/password accounts with signed cookie sessions.
- Set `HERMES_WEB_TOKEN` to a long random value before public deployment to keep an admin bearer-token override for operator access.
- Set `HERMES_PUBLIC_BASE_URL` in production so generated share links use your real domain.
- Web passwords must be at least 10 characters and include both letters and numbers.
- The dashboard stores the admin token only for the current browser session, not across browser restarts.
- `scripts/deploy_modal_inference.py` now provisions a `MODAL_INFERENCE_TOKEN` automatically if one is missing, and the Modal `/generate` endpoint requires that token.
- Set `TELEGRAM_ENABLED=true` and the Telegram env vars to run `python main.py --bot`.
- Auto-train is enabled by default. Set `HERMES_AUTO_TRAIN_ENABLED=false` if you need to suppress automatic live training attempts.
- Use `HERMES_AUTO_TRAIN_BLOCK_COOLDOWN_SECONDS` to control how long Hermes waits before retrying a previously blocked live training attempt.
- The Modal inference app now scales to zero when idle; expect cold starts, but ongoing GPU cost is much lower than a permanently warm container.
