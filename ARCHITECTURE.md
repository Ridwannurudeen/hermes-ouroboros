# HERMES OUROBOROS — ARCHITECTURE

---

## SYSTEM DIAGRAM

```
USER (Telegram)
      │
      ▼
┌─────────────────────────────────────┐
│         MASTER ORCHESTRATOR         │
│   master_orchestrator.py            │
│   - Receives query from Telegram    │
│   - Spawns 5 subagents in parallel  │
│   - Collects results                │
│   - Triggers Arbiter                │
│   - Triggers trajectory capture     │
└────────────────┬────────────────────┘
                 │ spawns simultaneously
    ┌────────────┼─────────────────┐
    │            │                 │
    ▼            ▼                 ▼
┌────────┐  ┌─────────┐  ┌──────────────┐
│ADVOCATE│  │ SKEPTIC │  │    ORACLE    │
│        │  │         │  │  (data only) │
│Builds  │  │Tears    │  │  No opinions │
│strongest│ │every    │  │  raw facts   │
│case FOR│  │argument │  │  only        │
│        │  │apart    │  │              │
└────────┘  └─────────┘  └──────────────┘
    │            │                 │
    └────────────┼─────────────────┘
                 │ all 5 results passed to Arbiter
    ┌────────────┘
    │
    ▼
┌──────────────────┐     ┌────────────────┐
│  CONTRARIAN      │────▶│    ARBITER     │
│                  │     │                │
│ Challenges       │     │ - Detects      │
│ whatever the     │     │   conflicts    │
│ majority thinks  │     │ - Requests     │
│                  │     │   more evidence│
└──────────────────┘     │ - Renders      │
                         │   verdict +    │
                         │   confidence   │
                         └───────┬────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │     TELEGRAM DELIVERY      │
                    │  - Verdict                 │
                    │  - Confidence score (0-100)│
                    │  - Dissenting views        │
                    │  - Evidence used           │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │    TRAJECTORY CAPTURE      │
                    │  trajectory_logger.py      │
                    │  - Logs full reasoning     │
                    │  - Saves to .jsonl         │
                    │  - Quality filter applied  │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │     ATROPOS RL LOOP        │
                    │  atropos_runner.py         │
                    │  - Reads trajectories      │
                    │  - Launches Modal fine-tune│
                    │  - Monitors job            │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │    MODEL DEPLOYMENT        │
                    │  model_swapper.py          │
                    │  - Downloads fine-tuned    │
                    │    model from Modal        │
                    │  - Updates Hermes config   │
                    │  - Restarts agents         │
                    └────────────┬──────────────┘
                                 │
                                 ▼
                         LOOP FIRES AGAIN
```

---

## FILE STRUCTURE (what we will build)

```
hermes-ouroboros/
├── agents/
│   ├── advocate.py          ← System prompt + config for Advocate agent
│   ├── skeptic.py           ← System prompt + config for Skeptic agent
│   ├── oracle.py            ← System prompt + config for Oracle agent
│   ├── contrarian.py        ← System prompt + config for Contrarian agent
│   └── arbiter.py           ← Conflict resolution + verdict logic
│
├── core/
│   ├── master_orchestrator.py   ← Main controller
│   ├── agent_launcher.py        ← Parallel subagent spawner
│   ├── conflict_resolver.py     ← Detects + resolves agent disagreements
│   └── telegram_delivery.py    ← Formats + sends verdict to Telegram
│
├── learning/
│   ├── trajectory_logger.py     ← Captures reasoning chains as JSONL
│   ├── quality_filter.py        ← Keeps only high-confidence sessions
│   ├── atropos_runner.py        ← Launches fine-tuning job on Modal
│   └── model_swapper.py         ← Deploys improved model back into agents
│
├── benchmark/
│   ├── questions.json           ← 10 standardized test questions
│   └── run_benchmark.py         ← Scores model before and after fine-tuning
│
├── skills/                      ← Auto-generated skills from sessions
├── trajectories/                ← JSONL files of agent reasoning
├── .env                         ← API keys (never commit)
├── config.yaml                  ← Hermes + model config
├── main.py                      ← Entry point
└── requirements.txt
```

---

## TECH STACK

| Component | Tool | Purpose |
|-----------|------|---------|
| Agent framework | Hermes Agent | Core agent runtime |
| Base model | Hermes-3-8B (Nous Portal) | Agent intelligence |
| VPS | Linux server | Always-on execution |
| Messaging | Telegram Bot API | User interface |
| GPU / Fine-tuning | Modal (serverless) | RL training |
| RL Training | Atropos (Hermes submodule) | Fine-tuning pipeline |
| Language | Python 3.10+ | Everything |
| Parallelism | asyncio + threading | Simultaneous agents |

---

## AGENT ROLES & SYSTEM PROMPTS

### ADVOCATE
> "You are the Advocate. Your role is to build the strongest possible case FOR the given proposition. Find supporting evidence, identify opportunities, and argue with conviction. Never hedge. Present only the most compelling arguments in favor."

### SKEPTIC
> "You are the Skeptic. Your role is to find every flaw, risk, and weakness in the proposition. Question assumptions, challenge evidence, and expose vulnerabilities. Be rigorous and relentless. Never be satisfied with surface-level analysis."

### ORACLE
> "You are the Oracle. Your role is to provide ONLY verifiable facts and data. No opinions. No predictions. No recommendations. State what is known, cite sources, and flag what is unknown. You are a data source, not an analyst."

### CONTRARIAN
> "You are the Contrarian. Your role is to challenge whatever the majority of agents believe. If most agents agree on something, find the strongest argument against it. Your job is to prevent groupthink and surface hidden assumptions."

### ARBITER
> "You are the Arbiter. You receive reports from four agents: Advocate, Skeptic, Oracle, and Contrarian. Your job is to: (1) Identify the key points of disagreement, (2) Weigh the evidence from all sides, (3) Render a final verdict with a confidence score from 0-100, (4) State clearly what drove your decision and what remains uncertain."
