# DAY 8 — Benchmark + Proof
## Goal: Measurable before/after improvement. The evidence that wins.

---

## CODEX PROMPT — Copy this exactly

> "I am building Hermes Ouroboros. Days 1-7 complete — first training loop closed, adapter_v1 saved. Today I run the benchmark to prove the model improved, then add skill creation and polish.
>
> **STEP 1: Deploy fine-tuned model for inference**
>
> Option A (if running local inference on VPS with GPU):
> - Merge LoRA adapter with base model using peft.merge_and_unload()
> - Save merged model to `models/hermes_ouroboros_v1/`
> - Update Hermes config to point to local model
> - Restart agent processes
>
> Option B (if using API — no local GPU):
> - Upload adapter to HuggingFace Hub (private repo)
> - Document that adapter is available for deployment on GPU inference providers
> - For demo purposes: run benchmark comparison using the trajectory quality improvement as proxy
>
> Ask Codex to implement whichever option is feasible given VPS specs.
>
> **STEP 2: Run benchmark with v1 model**
>
> Use the same 5 questions from Day 7 benchmark:
> 1. 'What are the top 3 risks of investing in DeFi protocols?'
> 2. 'Explain the difference between L1 and L2 blockchains'
> 3. 'What makes a smart contract audit reliable?'
> 4. 'Is dollar-cost averaging a good strategy for crypto?'
> 5. 'What is the biggest threat to Ethereum dominance?'
>
> Record for v1:
> - Confidence scores for each
> - Response quality scores
> - Time taken
>
> Save to `benchmark/results_v1.json`
>
> **STEP 3: Create benchmark/compare.py**
>
> Comparison report:
> ```
> ╔═══════════════════════════════════════════════════╗
> ║         HERMES OUROBOROS — BENCHMARK RESULTS       ║
> ╠═══════════════════════════════════════════════════╣
> ║ Model Version    │  v0 (base)  │  v1 (trained)    ║
> ╠═══════════════════════════════════════════════════╣
> ║ Avg Confidence   │    [X]/100  │    [Y]/100  +Z%  ║
> ║ Avg Response Len │    [X] chars│    [Y] chars      ║
> ║ Avg Time         │    [X]s     │    [Y]s           ║
> ║ Trajectories     │    0        │    [X]            ║
> ╚═══════════════════════════════════════════════════╝
>
> VERDICT: v1 shows [X]% improvement in confidence scores
>          after [Y] training trajectories on [Z] GPU-minutes
> ```
>
> **STEP 4: Add skill creation to the loop**
>
> After every Arbiter verdict, auto-create a Hermes skill:
>
> Create `core/skill_creator.py`:
> - If confidence_score >= 75 AND conflict_detected == True:
>   - Generate a skill document: 'How to reason about [topic_category]'
>   - Extract: the key argument that resolved the conflict
>   - Save to `skills/auto_{session_id[:8]}.md` in Hermes skill format
> - Skill format:
>   ```markdown
>   # Skill: Reasoning about [TOPIC]
>   ## When to use this skill
>   When asked about [topic keywords]
>   ## Key reasoning pattern
>   [The argument that won the debate]
>   ## Evidence that matters
>   [Key data points that resolved the conflict]
>   ## Pitfalls to avoid
>   [The losing argument and why it failed]
>   ```
>
> **STEP 5: Add auto-trigger for next training cycle**
>
> Update `learning/atropos_runner.py`:
> - After every 50 new high-quality trajectories, automatically trigger a new training cycle
> - This is the continuous loop: more usage → more trajectories → better model → better usage
> - Add to main.py: check trajectory count on startup, if >50 new ones since last training, trigger cycle
>
> **STEP 6: Create dashboard/stats.py**
>
> Simple terminal dashboard showing:
> - Total sessions run
> - Total trajectories captured
> - Current model version (v0, v1, v2...)
> - Skills created
> - Average confidence score (all time)
> - Average confidence score (last 10 sessions)
> - Next training cycle triggers at: [X] more trajectories
>
> Format as a clean table. Run it and show the output."

---

## WHAT SUCCESS LOOKS LIKE

- Benchmark shows improvement from v0 to v1 (even 5-10% is meaningful)
- Skill files being auto-created in `skills/`
- Auto-trigger logic in place for next training cycle
- Dashboard shows meaningful stats
- The full Ouroboros loop runs automatically: use → learn → improve → use

---

## WHAT TO DO AFTER CODEX FINISHES

1. Run `python benchmark/compare.py` — screenshot the comparison table
2. Check `skills/` directory for auto-created skills
3. Run `python dashboard/stats.py` — screenshot
4. Report back — move to DAY9.md (demo day)

---

## THE NARRATIVE FOR YOUR SUBMISSION

"I gave Hermes a council of adversarial agents. They argued about hard questions. Their reasoning became training data. The training data fine-tuned their own model. The fine-tuned model made them argue better. The loop fires again. This is not an agent that does tasks. This is an agent that becomes."
