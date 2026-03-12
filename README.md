# HERMES OUROBOROS — Adversarial Intelligence Engine

**Live:** [hermes-ouroboros.online](https://hermes-ouroboros.online) · **Dashboard:** [/app](https://hermes-ouroboros.online/app) · **API Docs:** [/docs](https://hermes-ouroboros.online/docs)

> Five adversarial AI agents debate every query. The Arbiter delivers a verdict. The debate becomes training data. The model improves itself. The ouroboros turns.

## Why Hermes-3

This project exists because of three capabilities unique to NousResearch Hermes:

1. **Uncensored Reasoning** — Red-teaming requires brutal honesty. When the Skeptic agent needs to find the fatal flaw in your startup idea, it can't self-censor. Hermes-3 is the only open-weight model that reliably maintains adversarial personas without safety-refusal interference.

2. **Multi-Persona System Prompt Adherence** — Five distinct intellectual traditions (Popperian falsificationism, Bayesian reasoning, Kuhnian paradigm challenging) running simultaneously in one model. Hermes-3's system prompt following is what makes this work — each agent stays in character across multi-turn debates.

3. **Native Function Calling** — The Oracle agent gathers real-time web evidence using Hermes's native tool-use format. Structured evidence flows directly into the Arbiter's synthesis, not as an afterthought but as a first-class input to the verdict.

No other open model can do all three simultaneously. We tried.

## How It Works

```
USER QUERY
    │
    ▼
┌─────────────────────────────────────────────┐
│           MASTER ORCHESTRATOR               │
│  spawns 4 agents in parallel + web search   │
└──┬──────────┬──────────┬──────────┬─────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
ADVOCATE   SKEPTIC    ORACLE   CONTRARIAN
Steel-man  Find the   Base     Challenge
the case   fatal flaw rates    the frame
   │          │          │          │
   └──────────┴──────────┴──────────┘
              │
              ▼  (Round 2: Rebuttals)
        All agents see each other's
        arguments and respond
              │
              ▼
          ARBITER
    Bayesian synthesis of all
    perspectives → HERMES Score
    + structured verdict sections
              │
    ┌─────────┴─────────┐
    ▼                   ▼
 VERDICT            DPO PAIRS
 Web / CLI /        chosen = aligned agents
 Telegram /         rejected = overruled agents
 API                    │
                        ▼
               SELF-IMPROVEMENT LOOP
               SFT + DPO fine-tuning
               on Hermes-3-8B (LoRA)
               Benchmark → Promote → Loop
```

## Agent Personas

| Agent | Intellectual Tradition | Mandate |
|---|---|---|
| **Advocate** | Steel-manning | Build the strongest possible FOR argument, stronger than its own proponents state it |
| **Skeptic** | Popperian falsificationism | Find the single observation that would kill the claim; expose the hidden assumption |
| **Oracle** | Calibrated base-rate empiricist | Historical base rates, outside view — strip opinion, report what the evidence shows |
| **Contrarian** | Kuhnian paradigm challenger | Reject the question's framing; find the paradigm that makes the standard answer a category error |
| **Arbiter** | Bayesian reasoner | Explicit prior → evidence update → posterior; award the agent with the most falsifiable evidence |

## Three Analysis Modes

| Mode | What It Does | Best For |
|---|---|---|
| **Red Team** | Stress-tests ideas, plans, strategies | Startup ideas, business plans, investment theses |
| **Verify** | Fact-checks claims against evidence | Statistics, news claims, viral statements |
| **Research** | Deep bull/bear analysis | Investment decisions, technology bets, career choices |

## The Self-Improvement Loop

The key insight: **the debate IS the preference data.**

When the Arbiter picks a winner, aligned agent responses become `chosen` and overruled responses become `rejected` — automatic DPO pairs from every session. No human labeling needed.

Five self-improvement loops have completed:

| Version | Training Loss | Status |
|---------|--------------|--------|
| v0 | — (baseline) | Base Hermes-3-8B |
| v1 | 4.096 | Promoted |
| v2 | 4.093 | Promoted |
| v3 | 3.214 | Promoted |
| v4 | 3.281 | Benchmarked |
| v5 | **2.657** | Promoted |

Loss decreased **35% across 5 iterations**. The ouroboros loop is working.

## Features

**Dashboard (30+ features)**
- Real-time SSE streaming — agents appear as they complete
- Cinematic score reveal with count-up animation and verdict glow
- Council Ring visualization showing agent completion
- Deliberation Timeline tracking each phase
- Head-to-head Compare Mode (Solo vs Council side-by-side)
- Web Sources with favicon cards and evidence categorization
- Copy verdict, Share link, Share on X
- HTML report export (self-contained dark-theme branded report)
- Command palette (Ctrl+K / ⌘K)
- Follow-up questions (mode-aware "Dig Deeper" suggestions)
- Session history with search
- DPO Loop dashboard with model version timeline
- API Playground with live request builder
- API key management
- Email auth with verification and password reset

**Landing Page**
- Zero-friction guest demo (no signup, 5 free queries)
- Real verdict gallery with browsable examples
- Live stats counter (sessions, DPO pairs, model versions)
- "Why Hermes-3" section
- Benchmark showcase (Council vs Solo comparison)
- Agent architecture explainer
- Learning Loop visualization

**Backend**
- aiohttp async server with SSE streaming
- DPO preference extraction from every session
- SFT + DPO fine-tuning on Modal A10G GPU (LoRA r=16)
- Automated benchmarking before adapter promotion
- API key auth with per-key rate limiting
- Telegram bot integration
- Web search evidence gathering

## Quick Start

```bash
git clone https://github.com/Ridwannurudeen/hermes-ouroboros.git
cd hermes-ouroboros
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Set OPENAI_API_KEY to your NousResearch API key
python main.py --api --host 127.0.0.1 --port 8000
# Open http://localhost:8000/app
```

## API Usage

```bash
curl -X POST https://hermes-ouroboros.online/api/query \
  -H "X-API-Key: ho_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"query": "Is proof-of-stake more secure than proof-of-work?", "analysis_mode": "research"}'
```

## Tech Stack

| Component | Tooling |
|---|---|
| Inference | NousResearch Hermes-4-70B via Nous Inference API |
| Fine-tuning base | NousResearch/Hermes-3-Llama-3.1-8B |
| Training | LoRA via TRL/PEFT on Modal A10G GPU |
| Language | Python 3.12 |
| Frontend | React + TypeScript + Vite + Tailwind + Framer Motion |
| Web framework | aiohttp with SSE streaming |
| Deployment | Docker Compose on VPS, nginx + certbot HTTPS |

## License

MIT
