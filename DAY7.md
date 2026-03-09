# DAY 7 — Full Ouroboros Loop
## Goal: Hermes trains itself, improved model deployed back — loop closes ★ MILESTONE

---

## CODEX PROMPT — Copy this exactly

> "I am building Hermes Ouroboros. Days 1-6 complete — Modal training pipeline tested. Today I run the full loop: Council generates trajectories → fine-tunes model → improved model deployed back.
>
> **STEP 1: Generate training data**
>
> Run 20 Council investigations to accumulate trajectories.
> Create `scripts/generate_training_data.py`:
> - A list of 20 diverse, high-quality queries covering: crypto/DeFi, technology, science, economics, geopolitics
> - Run each query through master_orchestrator.py automatically (no Telegram needed, direct call)
> - Wait 5 seconds between queries to avoid rate limits
> - Print progress: 'Query 5/20 complete — 25 trajectories captured'
> - At the end: print trajectory stats (total, high-quality, by agent)
>
> Queries to use:
> 1. Is Ethereum undervalued at current prices?
> 2. Will quantum computing break blockchain encryption?
> 3. Is the Fed raising or cutting rates in 2026?
> 4. Are AI agents replacing traditional software engineers?
> 5. Is Solana more decentralized than Ethereum?
> 6. Will Bitcoin reach $200k in 2026?
> 7. Is DePIN the next big crypto narrative?
> 8. Are stablecoins a systemic risk to the global financial system?
> 9. Is Web3 gaming finally achieving mainstream adoption?
> 10. Will the US create a strategic Bitcoin reserve?
> 11. Is Rust the future of systems programming?
> 12. Are ZK rollups more secure than optimistic rollups?
> 13. Is AI training becoming too expensive for startups?
> 14. Will decentralized identity replace passwords by 2030?
> 15. Is climate change making certain regions uninvestable?
> 16. Are prediction markets more accurate than polling?
> 17. Is the dollar losing dominance faster than expected?
> 18. Will AI-generated content destroy the creative industry?
> 19. Is MEV extraction ethical in DeFi?
> 20. Are hardware wallets still necessary in 2026?
>
> Run this script and confirm 80+ trajectories captured (20 queries × 5 agents, minus low-quality).
>
> **STEP 2: Run the fine-tuning job**
>
> Update `learning/atropos_runner.py` to run REAL training (not dummy):
> - Collect all high-quality trajectories (should be 60-100+)
> - Submit to Modal A10G GPU
> - Monitor with progress updates every 30 seconds
> - When complete: save adapter to `models/adapter_v1/`
> - Log: training loss, number of steps, time taken
>
> Run `python -c 'from learning.atropos_runner import run_training_cycle; run_training_cycle()'`
>
> This will take 30-90 minutes. Monitor it.
>
> **STEP 3: Create learning/model_swapper.py**
>
> After fine-tuning completes:
> 1. Download the LoRA adapter from Modal Volume to local `models/adapter_v1/`
> 2. Update Hermes config to use the fine-tuned model:
>    - If using local inference: merge adapter with base model, save as new model
>    - If using API: log that adapter is ready for deployment (API providers don't support adapters directly)
> 3. Create a MODEL REGISTRY file: `models/registry.json`
>    ```json
>    {
>        'v0': {'model': 'base_hermes_3_8b', 'training_loss': null, 'deployed_at': null},
>        'v1': {'model': 'hermes_ouroboros_v1', 'adapter_path': 'models/adapter_v1/', 'training_loss': 0.85, 'deployed_at': 'ISO8601'}
>    }
>    ```
>
> **STEP 4: Create benchmark/run_benchmark.py (preliminary)**
>
> We need BEFORE scores now (using base model).
> Run 5 benchmark questions through the Council and record:
> - Confidence scores for each
> - Response quality (length, coherence — simple heuristic)
> - Time taken
>
> Save results to `benchmark/results_v0.json`
>
> Benchmark questions:
> 1. 'What are the top 3 risks of investing in DeFi protocols?'
> 2. 'Explain the difference between L1 and L2 blockchains'
> 3. 'What makes a smart contract audit reliable?'
> 4. 'Is dollar-cost averaging a good strategy for crypto?'
> 5. 'What is the biggest threat to Ethereum dominance?'
>
> **STEP 5: Verify loop closed**
>
> Print a summary:
> ```
> ══════════════════════════════════
> HERMES OUROBOROS — LOOP 1 COMPLETE
> ══════════════════════════════════
> Trajectories generated:  [X]
> High-quality kept:        [X]
> Training steps:           [X]
> Final training loss:      [X]
> Model version:            v1
> Adapter saved to:         models/adapter_v1/
> Loop fires again at:      [next scheduled time or manual trigger]
> ══════════════════════════════════
> ```"

---

## WHAT SUCCESS LOOKS LIKE ★ MILESTONE

- 20 queries run through Council automatically
- Training job completes on Modal (no errors)
- Adapter saved to `models/adapter_v1/`
- Model registry updated
- Benchmark v0 scores recorded
- The loop has closed once

---

## WHAT TO DO AFTER CODEX FINISHES

1. Screenshot the training completion output (loss curve, steps, time)
2. Screenshot the loop summary
3. Check `models/registry.json` is populated
4. Check `benchmark/results_v0.json` exists
5. Report back — move to DAY8.md

---

## IF MODAL TRAINING FAILS

Common issues:
- Out of memory → reduce `per_device_train_batch_size` to 2
- Model too large → ensure QLoRA 4-bit is enabled (load_in_4bit=True)
- Timeout → Modal default timeout may need increasing: `@app.function(timeout=3600)`
- Import error → ensure Modal image has all packages: transformers>=4.40, peft>=0.10, trl>=0.8

Ask Codex to debug with the specific error message.
