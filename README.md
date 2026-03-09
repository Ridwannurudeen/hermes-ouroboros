# Hermes Ouroboros

A self-improving multi-agent council. Five adversarial agents debate every query in parallel, an Arbiter synthesizes the verdict, and the full session becomes training data for the next model iteration. The loop closes automatically.

## How it works

```
USER
 │
 ▼
MASTER ORCHESTRATOR
 │  spawns simultaneously
 ├──────────────────────────────────┐
 │                                  │
 ▼                    ▼             ▼             ▼
ADVOCATE          SKEPTIC         ORACLE      CONTRARIAN
builds the        tears it        raw facts   challenges
case FOR          apart           only        consensus
 │                    │             │             │
 └──────────────────────────────────┘
                       │
                       ▼
                    ARBITER
              detects conflicts,
              requests evidence,
              renders verdict + confidence
                       │
                       ▼
              TELEGRAM / WEB / CLI
                       │
                       ▼
           TRAJECTORY CAPTURE (JSONL)
                       │
                       ▼
           ATROPOS FINE-TUNING (Modal)
                       │
                       ▼
           PROMOTED ADAPTER → LOOP FIRES AGAIN
```

Each council run produces a session. High-quality sessions become training trajectories. Trajectories feed fine-tuning. The fine-tuned model runs the next council. The loop is continuous.

## Benchmark

| Metric | v0 baseline | v1 trained | Change |
|---|---:|---:|---:|
| Avg confidence | 84.6 | 87.6 | +3.5% |
| Avg response quality | 88.0 | 100.0 | +13.6% |
| Avg elapsed time (s) | 135.1 | 101.7 | −24.7% |

Five trained adapters (v1–v5) were produced. v1 holds the production benchmark; v3–v5 achieved lower training loss but did not exceed v1 on confidence scoring. Only a candidate that beats the active benchmark gets promoted.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in OPENAI_API_KEY at minimum
python main.py --query "Is DeFi the future of finance?"
```

## Interfaces

| Mode | Command |
|---|---|
| CLI query | `python main.py --query "..."` |
| Interactive console | `python main.py` |
| Web dashboard + API | `python main.py --api --host 127.0.0.1 --port 8000` |
| Telegram bot | `python main.py --bot` |

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `HERMES_MODEL` | Yes | Model name (default: `gpt-4o-mini`) |
| `HERMES_BASE_URL` | No | Override API base URL for any OpenAI-compatible endpoint |
| `HERMES_WEB_TOKEN` | Production | Admin bearer token for the web API |
| `HERMES_AUTH_SECRET` | Production | 32+ byte secret for signed session cookies |
| `HERMES_PUBLIC_BASE_URL` | Production | Public HTTPS origin for share link generation |
| `TELEGRAM_ENABLED` | No | Set `true` to enable the bot |
| `TELEGRAM_BOT_TOKEN` | Bot only | Token from @BotFather |
| `TELEGRAM_ALLOWED_USERS` | Bot only | Comma-separated Telegram user IDs |
| `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` | Training | Modal credentials for fine-tuning |
| `HERMES_AUTO_TRAIN_ENABLED` | No | Set `false` to disable background training (default: `true`) |

## Docker deployment

```bash
cd deploy
docker compose up -d --build
```

Health check: `curl http://127.0.0.1:8000/api/health`

### HTTPS with Caddy

```bash
cp deploy/Caddyfile.example deploy/Caddyfile
# edit Caddyfile — replace your-domain.example.com with your real domain
# set HERMES_PUBLIC_BASE_URL=https://yourdomain.com in .env
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d
```

## Training loop

Sessions are written to `sessions/` and logged as JSONL in `trajectories/`. The training pipeline runs automatically when enough high-quality trajectories accumulate.

To run manually:

```bash
python scripts/close_loop.py          # filter + train + benchmark + promote
python scripts/show_benchmark.py      # compare versions
```

Modal credentials are required for live GPU fine-tuning. Without them, the system uses the learned profile fallback route.

## Tech stack

| Component | Tooling |
|---|---|
| Language | Python 3.12 |
| Concurrency | `asyncio` + threaded background tasks |
| Interfaces | CLI, Telegram Bot API, aiohttp web server |
| Providers | OpenAI-compatible HTTP, trained fallback, mock |
| Training | Atropos + Modal GPU fine-tuning |
| Deployment | Docker Compose, Caddy reverse proxy |
| Storage | JSON session store, JSONL trajectory logs |
