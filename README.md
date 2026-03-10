# Hermes Ouroboros

**Live:** [https://hermes-ouroboros.online](https://hermes-ouroboros.online) · **Dashboard:** [/app](https://hermes-ouroboros.online/app) · **API Docs:** [/docs](https://hermes-ouroboros.online/docs)

A self-improving multi-agent council powered by [NousResearch Hermes-4](https://portal.nousresearch.com/models). Five adversarial agents debate every query in parallel. The Arbiter synthesizes a Bayesian verdict. The verdict becomes training signal. The model that generated the debate improves itself.

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

Five self-improvement loops have completed:

| Version | Training Loss | Status |
|---------|--------------|--------|
| v0 | -- (baseline) | Base Hermes-3-8B |
| v1 | 4.096 | Promoted |
| v2 | 4.093 | Promoted |
| v3 | 3.214 | Promoted |
| v4 | 3.281 | Benchmarked |
| v5 | **2.657** | Promoted |

Loss decreased **35% across 5 iterations** — the ouroboros loop is working.

## Agent Personas

Each agent embodies a distinct intellectual tradition:

| Agent | Tradition | Mandate |
|---|---|---|
| **Advocate** | Steel-manning | Build the strongest possible FOR argument, stronger than its own proponents state it |
| **Skeptic** | Popperian falsificationism | Find the single observation that would kill the claim; expose the hidden assumption |
| **Oracle** | Calibrated base-rate empiricist | Historical base rates, outside view — strip opinion, report what the evidence shows |
| **Contrarian** | Kuhnian paradigm challenger | Reject the question's framing; find the paradigm that makes the standard answer a category error |
| **Arbiter** | Bayesian reasoner | Explicit prior → evidence update → posterior; award the agent with the most falsifiable evidence |

## Features

### Web Dashboard
- Real-time SSE streaming — agents appear as they complete
- Session history with search and filtering
- Shareable session links (`/share/<id>`)
- Dark mode toggle
- Mobile responsive

### Authentication
- Email + password registration with email verification
- Password reset via email
- Session-based auth with CSRF protection
- Admin token for full access

### Developer API
- API key authentication (`X-API-Key` header)
- Per-key rate limiting (30 req/min)
- Usage tracking per key
- Full [API documentation](https://hermes-ouroboros.online/docs) with curl, Python, and JavaScript examples

### Self-Improvement Loop
- Every session generates DPO preference pairs automatically
- SFT + DPO fine-tuning on Modal A10G GPU
- Automatic benchmarking before adapter promotion
- Loop status visible at `/api/loop/status`

### Telegram Bot
- `/ask <query>` — run a council query
- `/history` — recent sessions
- Inline keyboard for detailed results

## Quick Start

```bash
git clone https://github.com/Ridwannurudeen/hermes-ouroboros.git
cd hermes-ouroboros
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Set your NousResearch API key in .env
python main.py --query "Should AI systems train on their own outputs indefinitely?"
```

## Interfaces

| Mode | Command |
|---|---|
| CLI query | `python main.py --query "..."` |
| Interactive console | `python main.py` |
| Web dashboard + API | `python main.py --api --host 127.0.0.1 --port 8000` |
| Telegram bot | `python main.py --bot` |

## API Usage

```bash
# Create an API key in the dashboard, then:
curl -X POST https://hermes-ouroboros.online/api/query \
  -H "X-API-Key: ho_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the tradeoffs of proof-of-stake vs proof-of-work?", "mode": "default"}'
```

```python
import requests

resp = requests.post("https://hermes-ouroboros.online/api/query", json={
    "query": "Should Ethereum switch to a different VM?",
    "mode": "default",
}, headers={"X-API-Key": "ho_your_key_here"})

data = resp.json()
print(f"Confidence: {data['result']['confidence_score']}")
print(f"Verdict: {data['result']['arbiter_verdict'][:200]}...")
```

## Environment Variables

Copy `.env.example` to `.env`.

| Variable | Description |
|---|---|
| `HERMES_PROVIDER` | `openai_compatible` for NousResearch API, `ollama` for local |
| `HERMES_MODEL` | `Hermes-4-70B` (or `Hermes-4-405B` for highest quality) |
| `HERMES_BASE_URL` | `https://inference-api.nousresearch.com/v1` |
| `OPENAI_API_KEY` | NousResearch API key from portal.nousresearch.com |
| `HERMES_WEB_TOKEN` | Admin bearer token for the web API |
| `HERMES_AUTH_SECRET` | 32+ byte secret for signed session cookies |
| `HERMES_PUBLIC_BASE_URL` | Public HTTPS origin for share links |
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `HERMES_FROM_EMAIL` | From address for verification/reset emails |
| `TELEGRAM_ENABLED` | `true` to run the bot |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_ALLOWED_USERS` | Comma-separated Telegram user IDs |
| `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` | Modal credentials for GPU fine-tuning |

## Docker Deployment

```bash
cd deploy
docker compose up -d --build
```

Data is persisted via bind mounts to `/opt/hermes/data/` (sessions, users, models, trajectories, skills, logs). Daily backups run at 3am with 7-day rotation.

Health check: `curl https://hermes-ouroboros.online/api/health`

## Benchmark

```bash
python -X utf8 benchmark/run_benchmark_hermes.py
```

Scores each session on confidence (0-100) and response quality (structural completeness: section headings, verdict length, dissenting views). Only adapters that beat the active benchmark score get promoted.

## Tech Stack

| Component | Tooling |
|---|---|
| Inference | NousResearch Hermes-4-70B via Nous Inference API |
| Fine-tuning base | NousResearch/Hermes-3-Llama-3.1-8B |
| SFT + DPO | LoRA via TRL/PEFT on Modal A10G |
| Language | Python 3.12 |
| Concurrency | asyncio + threaded background tasks |
| Web framework | aiohttp with SSE streaming |
| Auth | Session cookies + CSRF + API keys + email verification |
| Email | Resend transactional API |
| Deployment | Docker Compose on VPS, nginx + certbot HTTPS |
| Storage | JSON files (sessions, users, API keys, trajectories) |

## Project Structure

```
hermes-ouroboros/
  core/
    agents.py          # Agent definitions and prompts
    orchestrator.py    # Parallel agent dispatch + Arbiter synthesis
    web_app.py         # aiohttp API server, auth, SSE streaming
    user_store.py      # User management, verification, password reset
    api_key_store.py   # Developer API key CRUD
    email_service.py   # Resend transactional email
  learning/
    preference_extractor.py  # DPO pair extraction from sessions
    trainer.py               # SFT + DPO fine-tuning on Modal
    fallback_provider.py     # RAG-style guidance from prior sessions
  benchmark/
    run_benchmark_hermes.py  # Base vs guided comparison
    common.py                # Quality scoring
  web/
    index.html         # Dashboard UI (single-page app)
  landing/
    index.html         # Landing page
    docs/index.html    # API documentation
    og-image.png       # Social sharing image
  deploy/
    docker-compose.yml # Production Docker setup
    Dockerfile         # Python 3.12-slim container
  scripts/
    backup.sh          # Daily backup with rotation
    close_loop.py      # Manual training trigger
```

## License

MIT
