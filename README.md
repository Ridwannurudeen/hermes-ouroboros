# Hermes Ouroboros

**Live demo:** http://75.119.153.252:8002 — use the admin token shown in the UI to access all sessions.

A self-improving multi-agent council powered by [NousResearch Hermes-4](https://portal.nousresearch.com/models). Four adversarial agents debate every query in parallel. The Arbiter synthesizes a verdict. The verdict becomes training signal. The model that generated the debate improves itself.

**The key insight: the debate IS the preference data.** When the Arbiter picks a winner, the aligned responses become `chosen` and the overruled responses become `rejected` — automatic DPO pairs from every session.

## How it works

```
USER QUERY
    |
    v
MASTER ORCHESTRATOR
    |  spawns simultaneously
    |---------------------------------------------|
    |              |             |                 |
    v              v             v                 v
ADVOCATE      SKEPTIC        ORACLE          CONTRARIAN
Steel-mans    Popperian      Calibrated      Kuhnian paradigm
the FOR case  falsificationist base-rate     challenger --
              -- what would  empiricist      what is the
              kill this?                     question wrong?
    |              |             |                 |
    |--------------|-------------|-----------------|
                          |
                          v
                       ARBITER
               Bayesian reasoner --
               explicit prior -> update -> posterior
               Final Verdict + Confidence 0-100
                          |
                |---------+----------|
                v                    v
         WEB / CLI / TELEGRAM    DPO PAIRS
                              chosen = aligned agents
                              rejected = overruled agents
                                    |
                                    v
                          TRAJECTORIES (JSONL)
                          high-confidence only
                                    |
                                    v
                      SFT + DPO FINE-TUNING
                      Modal A10G GPU
                      NousResearch/Hermes-3-Llama-3.1-8B
                      LoRA r=16, 3 epochs, 2048 ctx
                                    |
                                    v
                   BENCHMARKED ADAPTER -> PROMOTED
                   only if it beats the active version
                                    |
                                    v
                          LOOP FIRES AGAIN
```

The council runs on **Hermes-4-70B** via the [NousResearch Inference API](https://inference-api.nousresearch.com). Every session generates SFT trajectories and DPO preference pairs. When enough accumulate, fine-tuning fires on Modal GPU using Hermes-3-8B as the base. The promoted adapter is benchmarked before replacing the active version.

## Training History

Five self-improvement loops have completed. Training loss across iterations:

| Version | Training Loss | Status |
|---------|--------------|--------|
| v0 | -- (baseline) | Base Hermes-3-8B |
| v1 | 4.096 | Promoted |
| v2 | 4.093 | Promoted |
| v3 | 3.214 | Promoted |
| v4 | 3.281 | Benchmarked |
| v5 | **2.657** | Promoted |

Loss decreased **35% across 5 iterations** -- the ouroboros loop is working.

## Agent Personas

Each agent embodies a distinct intellectual tradition:

| Agent | Tradition | Mandate |
|---|---|---|
| **Advocate** | Steel-manning | Build the strongest possible version of the FOR argument, stronger than its own proponents state it |
| **Skeptic** | Popperian falsificationism | Find the single observation that would kill the claim; expose the hidden assumption everything depends on |
| **Oracle** | Calibrated base-rate empiricist | Historical base rates, outside view -- strip opinion, report what the evidence actually shows |
| **Contrarian** | Kuhnian paradigm challenger | Reject the question's framing; find the alternative paradigm that makes the standard answer look like a category error |
| **Arbiter** | Bayesian reasoner | Explicit prior -> evidence update -> posterior; award points to the agent with the most falsifiable evidence, not the loudest argument |

## Benchmark

Comparative benchmark: base Hermes-3 (no guidance) vs Hermes-3 + learned guidance distilled from council session history.

To run:
```bash
python -X utf8 benchmark/run_benchmark_hermes.py
```

The benchmark scores each session on confidence (0-100 from the Arbiter) and response quality (structural completeness: section headings, verdict length, dissenting views). Only a candidate adapter that beats the active benchmark score gets promoted to production.

## Prerequisites

- Python 3.12+
- NousResearch API key from [portal.nousresearch.com](https://portal.nousresearch.com)

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Set your NousResearch API key in .env:
#   OPENAI_API_KEY=sk-your-nous-key
#   HERMES_PROVIDER=openai_compatible
#   HERMES_MODEL=Hermes-4-70B
#   HERMES_BASE_URL=https://inference-api.nousresearch.com/v1
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

Copy `.env.example` to `.env`.

| Variable | Description |
|---|---|
| `HERMES_PROVIDER` | `openai_compatible` for NousResearch API, `ollama` for local |
| `HERMES_MODEL` | `Hermes-4-70B` (or `Hermes-4-405B` for highest quality) |
| `HERMES_BASE_URL` | `https://inference-api.nousresearch.com/v1` |
| `OPENAI_API_KEY` | NousResearch API key from portal.nousresearch.com |
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
cp ../.env .env   # or configure directly
docker compose up -d --build
```

Health check: `curl http://127.0.0.1:8002/api/health`

## Training loop

Sessions are written to `sessions/` and logged as JSONL in `trajectories/`. DPO preference pairs are saved per-session to `trajectories/dpo/`. The training pipeline runs automatically when enough new high-quality trajectories accumulate.

Modal credentials are required for live GPU fine-tuning on A10G. Training config: `NousResearch/Hermes-3-Llama-3.1-8B`, LoRA r=16, 3 epochs, seq_len 2048.

To run manually:
```bash
python scripts/close_loop.py                              # filter -> SFT train -> benchmark -> promote
python -X utf8 scripts/show_benchmark.py                  # compare versions
python -X utf8 benchmark/run_benchmark_hermes.py          # base vs guided comparison
```

The loop status dashboard is available at `/api/loop/status` (no auth required).

## Tech stack

| Component | Tooling |
|---|---|
| Inference model | NousResearch/Hermes-4-70B via Nous Inference API |
| Fine-tuning base | NousResearch/Hermes-3-Llama-3.1-8B |
| SFT fine-tuning | LoRA via TRL/PEFT on Modal A10G |
| DPO fine-tuning | TRL DPOTrainer, preference pairs from debate verdicts |
| Language | Python 3.12 |
| Concurrency | asyncio + threaded background tasks |
| Interfaces | CLI, Telegram Bot API, aiohttp web server |
| Deployment | Docker Compose |
| Storage | JSON session store, JSONL trajectory logs, per-session DPO pairs |
