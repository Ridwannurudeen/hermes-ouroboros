# DAY 3 — Orchestrator Logic
## Goal: Master agent receives query, spawns 5 agents, collects all results

---

## CODEX PROMPT — Copy this exactly

> "I am building Hermes Ouroboros. Days 1-2 complete — 5 agents defined, 4 fire in parallel. Today I build the Master Orchestrator that ties everything together.
>
> **STEP 1: Create core/master_orchestrator.py**
>
> This is the brain of the system. It must:
>
> 1. Accept a query (string) as input
> 2. Log the query with timestamp to `logs/sessions.log`
> 3. Call `agent_launcher.py` to spawn Advocate, Skeptic, Oracle, Contrarian in parallel
> 4. While waiting, print status updates: 'Agents dispatched... waiting for responses...'
> 5. Once all 4 respond, format their results into a structured prompt for the Arbiter:
>    ```
>    QUERY: {query}
>
>    ADVOCATE REPORT:
>    {advocate_response}
>
>    SKEPTIC REPORT:
>    {skeptic_response}
>
>    ORACLE REPORT:
>    {oracle_response}
>
>    CONTRARIAN REPORT:
>    {contrarian_response}
>
>    Your task: Review all four reports and render your verdict.
>    ```
> 6. Call the Arbiter agent with this compiled prompt
> 7. Receive Arbiter's verdict
> 8. Return a structured result object:
>    ```python
>    {
>        'query': str,
>        'timestamp': str,
>        'session_id': str,  # unique UUID for this session
>        'agent_responses': {
>            'advocate': str,
>            'skeptic': str,
>            'oracle': str,
>            'contrarian': str
>        },
>        'arbiter_verdict': str,
>        'confidence_score': int,  # parse from Arbiter response
>        'elapsed_seconds': float
>    }
>    ```
>
> **STEP 2: Create core/session_store.py**
>
> Simple persistent store that:
> - Saves each session result as a JSON file in `sessions/{session_id}.json`
> - Has a `get_recent_sessions(n=10)` method that returns the last n sessions
> - Has a `get_session(session_id)` method
>
> **STEP 3: Create logs/ and sessions/ directories**
>
> **STEP 4: Create test_orchestrator.py**
>
> Test script:
> - Query 1: 'Should I buy ETH at current prices?'
> - Query 2: 'Is Solana a threat to Ethereum?'
> - Run both queries through the full orchestrator
> - Print the complete session result for each
> - Verify session JSON files are saved
> - Show total time for each query
>
> **STEP 5: Run the test**
> Execute `python test_orchestrator.py` and show full output.
>
> Requirements:
> - session_id must be a UUID (use Python uuid module)
> - confidence_score must be parsed as integer from Arbiter text (look for pattern like '75/100' or 'Confidence: 75' or '75%')
> - If confidence_score cannot be parsed, default to -1 and log a warning
> - All errors must be caught and logged, never crash the orchestrator"

---

## WHAT SUCCESS LOOKS LIKE

- `master_orchestrator.py` runs both test queries end-to-end
- Each session saved as JSON in `sessions/`
- Confidence score extracted from Arbiter response
- Logs written to `logs/sessions.log`
- Full structured result printed for each query

---

## WHAT TO DO AFTER CODEX FINISHES

1. Open one of the session JSON files — check the structure is clean
2. Verify confidence_score is a number, not -1
3. Check `logs/sessions.log` has entries
4. Report back — move to DAY4.md
