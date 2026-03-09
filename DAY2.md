# DAY 2 — The 5 Agents
## Goal: All 5 adversarial agents defined and firing in parallel

---

## CODEX PROMPT — Copy this exactly

> "I am building Hermes Ouroboros. Day 1 is complete — Hermes is installed and one subagent test passes. Today I need to build 5 specialized adversarial agents and launch them in parallel.
>
> **PROJECT STRUCTURE:**
> Working directory: `~/hermes-ouroboros/`
> See ARCHITECTURE.md for full file structure.
>
> **STEP 1: Create agents/ directory and agent config files**
>
> Create `agents/advocate.py` — an agent with this system prompt:
> 'You are the Advocate. Your role is to build the strongest possible case FOR the given proposition. Find supporting evidence, identify opportunities, and argue with conviction. Never hedge. Present only the most compelling arguments in favor. Keep your response structured: Key Arguments (3 bullet points), Supporting Evidence, Confidence Level.'
>
> Create `agents/skeptic.py` — an agent with this system prompt:
> 'You are the Skeptic. Your role is to find every flaw, risk, and weakness in the proposition. Question assumptions, challenge evidence, and expose vulnerabilities. Be rigorous and relentless. Keep your response structured: Key Weaknesses (3 bullet points), Risk Factors, Confidence Level.'
>
> Create `agents/oracle.py` — an agent with this system prompt:
> 'You are the Oracle. Provide ONLY verifiable facts and data about the proposition. No opinions. No predictions. No recommendations. State what is known, what is unknown, and cite sources where possible. Structure: Known Facts, Unknown/Uncertain, Data Sources.'
>
> Create `agents/contrarian.py` — an agent with this system prompt:
> 'You are the Contrarian. Your role is to challenge whatever the majority of agents believe. Find the strongest argument against the consensus view. Prevent groupthink. Expose hidden assumptions. Structure: Contrarian Position, Why the Majority May Be Wrong, Alternative Interpretation.'
>
> Create `agents/arbiter.py` — this agent receives ALL 4 other agents' responses and renders a verdict:
> 'You are the Arbiter. You receive reports from Advocate, Skeptic, Oracle, and Contrarian. You must: (1) Identify the 2-3 key disagreements between agents, (2) Weigh evidence from all sides, (3) Render a final VERDICT (one clear conclusion), (4) Assign a CONFIDENCE SCORE 0-100, (5) List DISSENTING VIEWS that remain unresolved. Be decisive. Do not sit on the fence.'
>
> **STEP 2: Create core/agent_launcher.py**
>
> This module must:
> - Accept a query string as input
> - Launch Advocate, Skeptic, Oracle, and Contrarian agents SIMULTANEOUSLY using asyncio or threading
> - Each agent gets the same query
> - Collect all 4 responses (wait for all to complete)
> - Return a dict: {'advocate': '...', 'skeptic': '...', 'oracle': '...', 'contrarian': '...'}
> - Log start time and end time for each agent
> - Handle timeouts: if any agent takes >60 seconds, return partial results with a timeout note
>
> **STEP 3: Create test_parallel.py**
>
> Test script that:
> - Takes a hardcoded query: 'Is Bitcoin a good store of value in 2026?'
> - Calls agent_launcher.py to spawn all 4 agents simultaneously
> - Prints each agent's response as it arrives (streaming if possible, else on completion)
> - Shows total elapsed time
> - Confirms all 4 agents responded
>
> **STEP 4: Run the test**
> Execute `python test_parallel.py` and show full output.
>
> Requirements:
> - Use Python asyncio for parallelism
> - Each agent must be a genuinely SEPARATE subagent call (not just different prompts to one call)
> - Show elapsed time to confirm they ran in parallel (total time ≈ longest single agent, not sum)"

---

## WHAT SUCCESS LOOKS LIKE

- 4 agent files exist in `agents/`
- `agent_launcher.py` spawns all 4 simultaneously
- Test output shows all 4 agents giving different, role-appropriate responses
- Total elapsed time is roughly equal to one agent's response time (proving parallelism)
- Advocate argues FOR, Skeptic argues AGAINST, Oracle gives only facts, Contrarian challenges consensus

---

## WHAT TO DO AFTER CODEX FINISHES

1. Read each agent's response — do they feel genuinely different?
2. Check elapsed time — if it's 4x one agent's time, parallelism isn't working
3. Screenshot terminal showing all 4 responses
4. Report back — move to DAY3.md

---

## IF SOMETHING FAILS

- Parallelism not working → ask Codex to use `concurrent.futures.ThreadPoolExecutor` instead of asyncio
- Agents giving identical responses → check system prompts are being injected correctly into each subagent call
- Import errors → ask Codex to check Hermes Python SDK import path
