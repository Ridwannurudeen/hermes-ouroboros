# DAY 5 — Trajectory Capture
## Goal: Every Council session automatically logged as RL training data

---

## CODEX PROMPT — Copy this exactly

> "I am building Hermes Ouroboros. Days 1-4 complete — full Council demo works via Telegram. Today I add trajectory capture so every session becomes training data for the self-improvement loop.
>
> **BACKGROUND:**
> Hermes has a built-in trajectory format for RL training (used by batch_runner.py and Atropos).
> Each trajectory is a sequence of: system_prompt → user_message → tool_calls → assistant_response
> We need to capture this format from every Council session.
>
> **STEP 1: Study Hermes trajectory format**
> Look at `~/hermes-agent/batch_runner.py` and `~/hermes-agent/datagen-config-examples/` to understand the trajectory JSONL format used by Hermes.
> Document the exact schema.
>
> **STEP 2: Create learning/trajectory_logger.py**
>
> This module must:
>
> 1. Accept a complete session result object (from master_orchestrator)
> 2. Convert it into Hermes-compatible trajectory format:
>    - One trajectory entry per agent (Advocate, Skeptic, Oracle, Contrarian, Arbiter)
>    - Each entry includes: system_prompt, user_query, full_response, confidence_score, agent_role
>    - Add metadata: session_id, timestamp, conflict_detected, final_verdict
> 3. Save to `trajectories/YYYY-MM-DD.jsonl` (append mode, one JSON object per line)
> 4. Return the number of trajectories saved
>
> The trajectory format should be:
> ```json
> {
>   'session_id': 'uuid',
>   'timestamp': 'ISO8601',
>   'agent_role': 'advocate|skeptic|oracle|contrarian|arbiter',
>   'system_prompt': 'full system prompt used',
>   'user_query': 'original user query',
>   'response': 'full agent response',
>   'metadata': {
>     'confidence_score': int,
>     'conflict_detected': bool,
>     'final_verdict': str,
>     'elapsed_seconds': float
>   }
> }
> ```
>
> **STEP 3: Create learning/quality_filter.py**
>
> Filter trajectories — only keep high-quality ones for training:
> 1. `is_high_quality(trajectory)` returns True if:
>    - confidence_score >= 60 (Arbiter was confident)
>    - response length >= 100 characters (not a one-liner)
>    - response does not contain error messages or 'I cannot' or 'I don't know'
> 2. `filter_trajectories(jsonl_path)` reads a .jsonl file and returns only high-quality entries
> 3. `get_training_batch(min_count=50)` collects trajectories from all .jsonl files until min_count high-quality entries are found
>
> **STEP 4: Update core/master_orchestrator.py**
>
> After saving session JSON, add:
> ```python
> # Capture trajectories for RL training
> from learning.trajectory_logger import TrajectoryLogger
> logger = TrajectoryLogger()
> count = logger.log_session(session_result)
> print(f'Logged {count} trajectories')
> ```
>
> **STEP 5: Create learning/trajectory_stats.py**
>
> Simple stats viewer:
> - Count total trajectories by date
> - Count high-quality trajectories
> - Show average confidence score
> - Show trajectory count per agent role
> - Print a summary table
>
> **STEP 6: Run 5 test queries through the full system**
>
> Queries to run:
> 1. 'Is DeFi safer in 2026 than it was in 2022?'
> 2. 'Will AI replace software engineers by 2030?'
> 3. 'Is the US dollar losing its reserve currency status?'
> 4. 'Are NFTs dead or evolving?'
> 5. 'Is Proof of Stake more secure than Proof of Work?'
>
> After running all 5:
> - Run `python learning/trajectory_stats.py`
> - Show how many trajectories were captured
> - Show how many passed the quality filter
> - Open one trajectory file and show a sample entry"

---

## WHAT SUCCESS LOOKS LIKE

- `trajectories/` directory contains .jsonl files after each session
- Each session produces 5 trajectory entries (one per agent)
- Quality filter correctly rejects low-confidence entries
- Stats script shows meaningful numbers
- 5 test queries produce at least 20 high-quality trajectories

---

## WHAT TO DO AFTER CODEX FINISHES

1. Run `python learning/trajectory_stats.py` — screenshot the output
2. Open one .jsonl file and verify the format looks correct
3. Check that high-quality filter is working (compare raw vs filtered count)
4. Report back — move to DAY6.md

---

## NOTE

We need at least 50 high-quality trajectories before fine-tuning.
Run more queries if needed — just keep asking the bot questions.
Each query through Telegram automatically adds 5 new trajectories.
