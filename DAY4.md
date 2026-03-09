# DAY 4 — Conflict Resolution + Telegram Delivery
## Goal: Full Council demo working — query via Telegram, verdict delivered back ★ MILESTONE

---

## CODEX PROMPT — Copy this exactly

> "I am building Hermes Ouroboros. Days 1-3 complete — orchestrator runs full pipeline, sessions saved. Today I build conflict resolution logic and wire everything to Telegram.
>
> **STEP 1: Create core/conflict_resolver.py**
>
> This module adds a conflict detection layer BEFORE the Arbiter is called.
> It must:
>
> 1. Accept the 4 agent responses as input
> 2. Detect conflicts: compare Advocate vs Skeptic positions and extract the single most important disagreement
> 3. If conflict score is HIGH (agents are >70% opposed): spawn ONE additional research subagent with this prompt:
>    'The following agents disagree: [summary of disagreement]. Find 3 additional pieces of evidence that could resolve this dispute. Be factual and cite sources.'
> 4. Inject the additional research into the Arbiter prompt
> 5. If conflict score is LOW (agents mostly agree): skip extra research, go straight to Arbiter
> 6. Return: {'conflict_detected': bool, 'conflict_summary': str, 'additional_research': str or None}
>
> Conflict detection logic (simple version):
> - Check if Advocate says positive keywords (good, strong, bullish, safe) while Skeptic says negative keywords (bad, weak, bearish, risky)
> - If both present with opposite sentiments → HIGH conflict
> - Otherwise → LOW conflict
>
> **STEP 2: Update core/master_orchestrator.py**
>
> Insert conflict resolution step:
> 1. Spawn 4 agents (existing)
> 2. Run conflict_resolver on the 4 responses (NEW)
> 3. If high conflict: inject additional research into Arbiter prompt (NEW)
> 4. Call Arbiter (existing, updated prompt)
> 5. Save session (existing)
>
> Update the session result object to include:
> - 'conflict_detected': bool
> - 'conflict_summary': str
>
> **STEP 3: Create core/telegram_delivery.py**
>
> This module sends the final verdict to Telegram. It must:
>
> 1. Accept the full session result object
> 2. Format a clean Telegram message:
>    ```
>    🔍 HERMES COUNCIL VERDICT
>
>    Query: {query}
>
>    ━━━━━━━━━━━━━━━━━━━━
>    VERDICT: {first_sentence_of_arbiter_verdict}
>
>    Confidence: {confidence_score}/100
>
>    Key Conflict: {conflict_summary if conflict_detected else 'Agents largely aligned'}
>
>    ━━━━━━━━━━━━━━━━━━━━
>    Advocate: {first_50_chars_of_advocate}...
>    Skeptic: {first_50_chars_of_skeptic}...
>
>    Session: {session_id[:8]}
>    Time: {elapsed_seconds:.1f}s
>    ```
> 3. Send via Telegram Bot API using python-telegram-bot library
> 4. Also send the FULL Arbiter verdict as a follow-up message (in case it's long)
>
> **STEP 4: Create main.py — the entry point**
>
> This is the main application. It must:
> 1. Start a Telegram bot listener
> 2. When a message arrives from an allowed user:
>    - Reply immediately: 'Council convened. 5 agents dispatched...'
>    - Run the full pipeline: master_orchestrator → conflict_resolver → arbiter
>    - Send formatted verdict back via telegram_delivery.py
> 3. Handle /status command: show last 3 session IDs and their confidence scores
> 4. Handle /help command: explain what the bot does
> 5. Run forever (asyncio event loop)
>
> **STEP 5: Create requirements.txt**
> Include all dependencies:
> - python-telegram-bot>=20.0
> - python-dotenv
> - aiohttp
> - uuid (stdlib)
> - Any Hermes SDK dependencies
>
> **STEP 6: Test end-to-end**
> 1. Start `python main.py` on the VPS
> 2. Send this message to the Telegram bot: 'Is Arbitrum the best Ethereum L2?'
> 3. Confirm:
>    - Bot replies 'Council convened...' immediately
>    - 5 agents fire in parallel (check logs)
>    - Conflict resolution runs
>    - Verdict arrives in Telegram within 3 minutes
>    - Session JSON saved
>
> Show the full Telegram conversation screenshot equivalent (print the messages)."

---

## WHAT SUCCESS LOOKS LIKE ★ MILESTONE

- Send any query via Telegram
- Bot acknowledges immediately
- Full pipeline runs (visible in server logs)
- Structured verdict arrives in Telegram with confidence score
- Session saved to disk
- THIS IS YOUR FALLBACK DEMO — if nothing else works, this alone competes

---

## WHAT TO DO AFTER CODEX FINISHES

1. Test with 3 different queries
2. Screenshot the terminal (server logs) and Telegram conversation
3. Save a few session JSON files as examples
4. Report back — move to DAY5.md

---

## DEMO CHECKPOINT

At this point you have a working demo. Record a short test video of:
- Sending a message to Telegram
- Watching the 5 terminals fire
- Seeing the verdict arrive

Keep this video. Even if Days 5-9 go wrong, you have something to submit.
