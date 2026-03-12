---
name: adversarial-intelligence
description: Adversarial fact-checking and stress-testing via HERMES — 5 AI agents debate any claim, red-team any idea, or deep-dive any topic. Returns structured verdicts with confidence scores, web evidence, and dissenting views. Uses the hosted API or self-hosted instance.
version: 1.0.0
author: Ridwannurudeen
license: MIT
metadata:
  hermes:
    tags: [fact-check, verification, red-team, research, adversarial, multi-agent, dpo]
    related_skills: [duckduckgo-search, arxiv]
---

# Adversarial Intelligence (HERMES Ouroboros)

Five AI agents argue, fact-check, and stress-test any claim — then a Bayesian Arbiter delivers a structured verdict.

**Three modes:**
- **Red Team** — stress-test ideas, find fatal flaws
- **Verify** — fact-check claims with web evidence
- **Research** — deep-dive analysis with bull/bear cases

## Setup

```bash
pip install hermes-ouroboros
```

Or use the API directly — no install needed.

## Python SDK (Primary)

```python
from hermes_ouroboros import verify, red_team, research

# Fact-check a claim
result = verify("GPT-4 can pass the bar exam with a top 10% score")
print(result.score)    # 72
print(result.label)    # "MOSTLY TRUE"
print(result.summary)  # Structured arbiter verdict

# Stress-test an idea
result = red_team("My startup relies on viral TikTok growth")
print(result.score)    # 34
print(result.label)    # "CRITICAL FLAWS DETECTED"

# Deep-dive research
result = research("Is nuclear energy the best path to net zero?")
print(result.score)    # 78
print(result.label)    # "STRONG BULL CASE"
```

### With API Key (30 queries/min)

```python
from hermes_ouroboros import HermesClient

client = HermesClient(api_key="your-key")
result = client.verify("Remote workers are 13% more productive")
print(result.label)         # "PARTIALLY TRUE"
print(result.confidence)    # 65
print(result.web_evidence)  # Sources cited
```

### Streaming (Real-time agent deliberation)

```python
client = HermesClient()
for event in client.stream("Is Solana a good long-term investment?", mode="research"):
    if event["type"] == "agent_token" and event["role"] == "arbiter":
        print(event["token"], end="", flush=True)
    elif event["type"] == "final":
        verdict = event  # Full result
```

### Async Support

```python
from hermes_ouroboros import AsyncHermesClient

async with AsyncHermesClient(api_key="key") as client:
    result = await client.verify("Claim to check")
```

## Direct API (No SDK)

### Blocking Query

```python
import requests

response = requests.post(
    "https://hermes-ouroboros.online/api/query",
    json={"query": "Your claim here", "analysis_mode": "verify"},
    headers={"X-API-Key": "your-key"},  # optional
)
data = response.json()
print(data["result"]["verdict_sections"]["verdict_label"])
print(data["result"]["hermes_score"])
```

### SSE Streaming

```python
import requests

response = requests.post(
    "https://hermes-ouroboros.online/api/query/stream",
    json={"query": "Your claim here", "analysis_mode": "red_team"},
    stream=True,
)
for line in response.iter_lines():
    if line.startswith(b"data: "):
        import json
        event = json.loads(line[6:])
        if event["type"] == "agent_token":
            print(event["token"], end="")
```

### Solo Comparison (A/B testing)

```python
# Get a solo model response for comparison
solo = requests.post(
    "https://hermes-ouroboros.online/api/query/solo",
    json={"query": "Same claim"},
).json()
print(solo["response"])

# Then run the council
council = requests.post(
    "https://hermes-ouroboros.online/api/query",
    json={"query": "Same claim", "analysis_mode": "verify"},
).json()
print(council["result"]["hermes_score"])
# Council consistently outperforms solo (70% win rate, +14.4% quality)
```

## CLI Usage

```bash
# Quick verify
python -c "from hermes_ouroboros import verify; print(verify('GPT-4 passed the bar exam').label)"

# With curl
curl -X POST https://hermes-ouroboros.online/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Remote workers are more productive", "analysis_mode": "verify"}'
```

## Verdict Object

| Field | Type | Description |
|-------|------|-------------|
| `score` | int (0-100) | HERMES adversarial confidence score |
| `label` | str | Verdict label (STRONG TRUE, FATAL FLAW, MISLEADING, etc.) |
| `summary` | str | First 500 chars of arbiter verdict |
| `full_verdict` | str | Complete arbiter reasoning |
| `confidence` | int (0-100) | Council confidence level |
| `agent_responses` | dict | Individual responses from all 5 agents |
| `web_evidence` | dict | Web sources cited during analysis |
| `session_id` | str | Unique session for full dashboard view |

## Analysis Modes

| Mode | Best For | Agents Focus On |
|------|----------|-----------------|
| `verify` | Fact-checking claims | Evidence for/against, source credibility, missing context |
| `red_team` | Stress-testing ideas | Fatal flaws, blind spots, survival probability |
| `research` | Deep-dive analysis | Bull/bear cases, data analysis, key uncertainties |

## How It Works

1. **5 agents analyze independently**: Advocate (steel-man), Skeptic (Popperian), Oracle (empiricist), Contrarian (Kuhnian), Arbiter (Bayesian)
2. **Round 2 rebuttal**: Agents read each other's work and rebut
3. **Arbiter synthesizes**: Bayesian verdict with structured sections
4. **DPO extraction**: Agent disagreements become training pairs
5. **Self-improvement**: Model fine-tunes on its own debate data

## Rate Limits

| Tier | Limit | How |
|------|-------|-----|
| Guest | 5 queries/min | No auth needed |
| API Key | 30 queries/min | `X-API-Key` header or `api_key` param |

Get an API key at [hermes-ouroboros.online/app](https://hermes-ouroboros.online/app).

## Links

- **Live App**: [hermes-ouroboros.online](https://hermes-ouroboros.online)
- **GitHub**: [github.com/Ridwannurudeen/hermes-ouroboros](https://github.com/Ridwannurudeen/hermes-ouroboros)
- **Python SDK**: [PyPI](https://pypi.org/project/hermes-ouroboros/)
- **HuggingFace Dataset**: [gudman1/hermes-adversarial-dpo](https://huggingface.co/datasets/gudman1/hermes-adversarial-dpo) (765 DPO pairs)
- **Chrome Extension**: [extension/](https://github.com/Ridwannurudeen/hermes-ouroboros/tree/master/extension)

## Limitations

- Queries are limited to 4000 characters
- Response time is 15-60 seconds (5 agents + web search)
- Web evidence comes from DuckDuckGo (no paywall access)
- Self-improvement training requires Modal GPU credits
