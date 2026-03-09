# Hermes Ouroboros

A self-improving multi-agent council built on [NousResearch/Hermes-3](https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B). Four adversarial agents debate every query in parallel. The Arbiter synthesizes a verdict. The verdict becomes training signal. The model that ran the debate improves itself.

**The key insight: the debate IS the preference data.** When the Arbiter picks a winner, the aligned responses become `chosen` and the overruled responses become `rejected` — automatic DPO pairs from every session.

## How it works

```
USER QUERY
    │
    ▼
MASTER ORCHESTRATOR
    │  spawns simultaneously
    ├─────────────────────────────────────────┐
    │              │             │             │
    ▼              ▼             ▼             ▼
ADVOCATE      SKEPTIC        ORACLE      CONTRARIAN
Steel-mans    Popperian      Calibrated  Kuhnian paradigm
the FOR case  falsificationist base-rate  challenger —
              — what would   empiricist  what is the
              kill this?                 question wrong?
    │              │             │             │
    └──────────────┴─────────────┴─────────────┘
                          │
                          ▼
                       ARBITER
               Bayesian reasoner —
               explicit prior → update → posterior
               Final Verdict + Confidence 0-100
                          │
                ┌─────────┴──────────┐
                ▼                    ▼
         WEB / CLI / TELEGRAM    DPO PAIRS
                              chosen = aligned agents
                              rejected = overruled agents
                                    │
                                    ▼
                          TRAJECTORIES (JSONL)
                          high-confidence only
                                    │
                                    ▼
                      SFT + DPO FINE-TUNING
                      Modal A10G GPU
                      NousResearch/Hermes-3-Llama-3.1-8B
                      LoRA r=16, 3 epochs, 2048 ctx
                                    │
                                    ▼
                   BENCHMARKED ADAPTER → PROMOTED
                   only if it beats the active version
                                    │
                                    ▼
                          LOOP FIRES AGAIN ⟳
```

The council runs on a local Hermes-3 instance (Ollama). Every session generates SFT trajectories and DPO preference pairs. When enough accumulate, fine-tuning fires automatically on Modal GPU. The promoted adapter is benchmarked before replacing the active version.

## Agent Personas

Each agent embodies a distinct intellectual tradition:

| Agent | Tradition | Mandate |
|---|---|---|
| **Advocate** | Steel-manning | Build the strongest possible version of the FOR argument, stronger than its own proponents state it |
| **Skeptic** | Popperian falsificationism | Find the single observation that would kill the claim; expose the hidden assumption everything depends on |
| **Oracle** | Calibrated base-rate empiricist | Historical base rates, outside view — strip opinion, report what the evidence actually shows |
| **Contrarian** | Kuhnian paradigm challenger | Reject the question's framing; find the alternative paradigm that makes the standard answer look like a category error |
| **Arbiter** | Bayesian reasoner | Explicit prior → evidence update → posterior; award points to the agent with the most falsifiable evidence, not the loudest argument |

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
python main.py --query "Should AI systems train on their own outputs indefinitely?"
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

Sessions are written to `sessions/` and logged as JSONL in `trajectories/`. DPO preference pairs are saved per-session to `trajectories/dpo/`. The training pipeline runs automatically when `HERMES_AUTO_TRAIN_MIN_NEW_TRAJECTORIES` new high-quality trajectories accumulate.

Modal credentials are required for live GPU fine-tuning on A10G. Training config: `NousResearch/Hermes-3-Llama-3.1-8B`, LoRA r=16, 3 epochs, seq_len 2048.

To run manually:
```bash
python scripts/close_loop.py                              # filter → SFT train → benchmark → promote
python -X utf8 scripts/show_benchmark.py                  # compare versions
python -X utf8 benchmark/run_benchmark_hermes.py          # base vs guided comparison

# Inspect DPO pairs from all sessions
python -c "from learning.preference_extractor import build_dpo_dataset; import json; pairs = build_dpo_dataset(); print(f'{len(pairs)} DPO pairs'); print(json.dumps(pairs[0], indent=2) if pairs else 'No sessions yet')"
```

The loop status dashboard is available at `/api/loop/status` (no auth required).

## Tech stack

| Component | Tooling |
|---|---|
| Base model | NousResearch/Hermes-3-Llama-3.1-8B |
| Local inference | Ollama |
| SFT fine-tuning | LoRA via TRL/PEFT on Modal A10G |
| DPO fine-tuning | TRL DPOTrainer, preference pairs from debate verdicts |
| Language | Python 3.12 |
| Concurrency | `asyncio` + threaded background tasks |
| Interfaces | CLI, Telegram Bot API, aiohttp web server |
| Deployment | Docker Compose, Caddy reverse proxy |
| Storage | JSON session store, JSONL trajectory logs, per-session DPO pairs |
