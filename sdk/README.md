# hermes-ouroboros

Python SDK for the [HERMES Adversarial Intelligence Engine](https://hermes-ouroboros.online).

HERMES pits five AI agents against each other (Advocate, Skeptic, Oracle, Contrarian, Arbiter) to stress-test claims, ideas, and research questions. The result is a scored verdict with structured analysis.

## Install

```bash
pip install hermes-ouroboros
```

## Quick Start

```python
from hermes_ouroboros import verify

result = verify("GPT-4 can pass the bar exam with a top 10% score")
print(result.score)    # 72
print(result.label)    # "MOSTLY TRUE"
print(result.summary)  # "While GPT-4 did pass..."
```

## With API Key

An API key gives you 30 requests/minute (vs 5 rpm for guest access).

```python
from hermes_ouroboros import HermesClient

client = HermesClient(api_key="your-key")
result = client.red_team("My startup plans to disrupt healthcare with AI")
print(result.label)    # "FATAL FLAW"
print(result.score)    # 28
```

## Modes

| Function | Mode | Use case |
|----------|------|----------|
| `verify(text)` | verify | Fact-check claims against evidence |
| `red_team(text)` | red_team | Stress-test ideas, plans, strategies |
| `research(text)` | research | Deep multi-perspective analysis |

## Verdict Object

Every query returns a `Verdict` with these fields:

```python
result = client.verify("Some claim")

result.score            # int: HERMES score 0-100
result.label            # str: "STRONG TRUE", "MOSTLY TRUE", "FATAL FLAW", etc.
result.summary          # str: first 500 chars of arbiter verdict
result.full_verdict     # str: complete arbiter verdict text
result.confidence       # int: confidence score 0-100
result.agent_responses  # dict: {"advocate": "...", "skeptic": "...", ...}
result.web_evidence     # dict or None: web sources gathered
result.session_id       # str: unique session ID
result.verdict_sections # dict: parsed sections (fatal_flaws, thinking_traps, etc.)
result.raw              # dict: complete raw API response
```

## Streaming

Stream agent events as the council deliberates:

```python
client = HermesClient(api_key="your-key")

for event in client.stream("Is quantum computing a threat to Bitcoin?"):
    if event["type"] == "agent_complete":
        print(f"{event['role']} finished ({event['duration_seconds']}s)")
    elif event["type"] == "final":
        from hermes_ouroboros import Verdict
        verdict = Verdict.from_api_response(event["result"])
        print(f"Final: {verdict.label} ({verdict.score})")
```

Or use `stream_verdict()` to get the final Verdict directly:

```python
result = client.stream_verdict("Is quantum computing a threat to Bitcoin?")
print(result.score)
```

## Async Support

```python
import asyncio
from hermes_ouroboros.client import AsyncHermesClient

async def main():
    async with AsyncHermesClient(api_key="your-key") as client:
        result = await client.verify("The Earth is flat")
        print(result.label)  # "STRONG FALSE"

asyncio.run(main())
```

## Error Handling

```python
from hermes_ouroboros import HermesClient
from hermes_ouroboros.client import HermesError, RateLimitError

client = HermesClient()

try:
    result = client.verify("Some claim")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except HermesError as e:
    print(f"API error {e.status_code}: {e}")
```

## License

MIT
