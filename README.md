# Hermes Ouroboros

A self-improving multi-agent council built on [NousResearch/Hermes-3](https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B). Five adversarial agents debate every query in parallel, an Arbiter synthesizes the verdict, and the full session becomes training data for the next model iteration. The loop closes automatically.

## How it works

```
USER
 │
 ▼
MASTER ORCHESTRATOR
 │  spawns simultaneously
 ├──────────────────────────────────┐
 │                                  │
 ▼             ▼          ▼         ▼
ADVOCATE    SKEPTIC    ORACLE   CONTRARIAN
builds       tears      raw      challenges
case FOR     apart      facts    consensus
 │             │          │         │
 └──────────────────────────────────┘
                   │
                   ▼
                ARBITER
          detects conflicts,
          requests extra evidence,
          renders verdict + confidence
                   │
                   ▼
         TELEGRAM / WEB / CLI
                   │
                   ▼
       TRAJECTORY CAPTURE (JSONL)
       — high-confidence sessions only —
                   │
                   ▼
     ATROPOS FINE-TUNING on Modal A10G
     NousResearch/Hermes-3-Llama-3.1-8B
     LoRA r=16, 3 epochs, 2048 seq_len
                   │
                   ▼
     PROMOTED ADAPTER → LOOP FIRES AGAIN
```

The council runs on a local Hermes-3 instance (Ollama). Sessions generate trajectories. High-quality trajectories fine-tune the next adapter on Modal GPU. The promoted adapter is benchmarked before replacing the active version. Each loop improves the model that runs the next loop.

## Benchmark

Honest comparison: base Hermes-3 (no guidance) vs Hermes-3 + learned guidance distilled from prior council sessions.

| Metric | Base Hermes-3 | + Learned Guidance | Delta |
|---|---:|---:|---:|
| Avg confidence | 84.6 | 87.6 | +3.5% |
| Avg response quality | 88.0 | 100.0 | +13.6% |
| Avg elapsed time (s) | 135.1 | 101.7 | −24.7% |

To re-run:
```bash
python -X utf8 benchmark/run_benchmark_hermes.py
```

Five LoRA adapters (v1–v5) have been trained. v1 is the production adapter; v3–v5 achieved lower training loss but did not exceed v1 on confidence scoring. Only a candidate that beats the active benchmark gets promoted.

## Prerequisites

- [Ollama](https://ollama.com) installed and running
- Hermes-3 pulled: `ollama pull hermes3:8b`
- Python 3.12+

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Ollama runs locally by default — no API key needed
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

Copy `.env.example` to `.env`. Minimum required: none (Ollama runs without an API key).

| Variable | Description |
|---|---|
| `HERMES_PROVIDER` | `ollama` (default) or `openai_compatible` |
| `HERMES_MODEL` | Model name — `hermes3:8b` for Ollama |
| `HERMES_BASE_URL` | Ollama endpoint — `http://localhost:11434/v1` |
| `HERMES_WEB_TOKEN` | Admin bearer token for production web API |
| `HERMES_AUTH_SECRET` | 32+ byte secret for signed session cookies |
| `HERMES_PUBLIC_BASE_URL` | Public HTTPS origin for share link generation |
| `TELEGRAM_ENABLED` | `true` to run the bot |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_ALLOWED_USERS` | Comma-separated Telegram user IDs |
| `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` | Modal credentials for GPU fine-tuning |
| `HERMES_AUTO_TRAIN_ENABLED` | `false` to disable background training |

## Docker deployment

```bash
cd deploy
docker compose up -d --build
```

The compose stack adds `host.docker.internal` so containers can reach the Ollama service running on the host. Ollama must be running on the host before starting the stack.

Health check: `curl http://127.0.0.1:8002/api/health`

### HTTPS with Caddy

```bash
cp deploy/Caddyfile.example deploy/Caddyfile
# Replace your-domain.example.com with your real domain
# Set HERMES_PUBLIC_BASE_URL=https://yourdomain.com in .env
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d
```

## Training loop

Sessions are written to `sessions/` and logged as JSONL in `trajectories/`. The training pipeline runs automatically when `HERMES_AUTO_TRAIN_MIN_NEW_TRAJECTORIES` new high-quality trajectories accumulate.

Modal credentials are required for live GPU fine-tuning on A10G. Training config: `NousResearch/Hermes-3-Llama-3.1-8B`, LoRA r=16, 3 epochs, seq_len 2048.

To run manually:
```bash
python scripts/close_loop.py          # filter → train → benchmark → promote
python -X utf8 scripts/show_benchmark.py      # compare versions
python -X utf8 benchmark/run_benchmark_hermes.py  # honest base vs guided comparison
```

## Tech stack

| Component | Tooling |
|---|---|
| Base model | NousResearch/Hermes-3-Llama-3.1-8B |
| Local inference | Ollama |
| Fine-tuning | LoRA via TRL/PEFT on Modal A10G |
| Language | Python 3.12 |
| Concurrency | `asyncio` + threaded background tasks |
| Interfaces | CLI, Telegram Bot API, aiohttp web server |
| Deployment | Docker Compose, Caddy reverse proxy |
| Storage | JSON session store, JSONL trajectory logs |
