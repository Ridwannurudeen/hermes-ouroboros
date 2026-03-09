# DAY 6 — Atropos + Modal Setup
## Goal: Fine-tuning pipeline configured, test run completes successfully

---

## CODEX PROMPT — Copy this exactly

> "I am building Hermes Ouroboros. Days 1-5 complete — trajectory capture working. Today I set up the Atropos RL fine-tuning pipeline on Modal.
>
> **BACKGROUND:**
> - Atropos is a reinforcement learning framework built into Hermes (submodule at ~/hermes-agent/tinker-atropos)
> - Modal is a serverless GPU platform — we run fine-tuning jobs there on demand
> - We want to fine-tune Hermes-3-8B on our captured trajectories to make the agents smarter
>
> **STEP 1: Explore Atropos**
> - Navigate to `~/hermes-agent/tinker-atropos/`
> - Read README.md and understand the training config format
> - Find example training configs in the repo
> - Document: what input format does Atropos expect? What output does it produce?
>
> **STEP 2: Create learning/atropos_config.py**
>
> This generates the Atropos training config from our trajectory data:
> ```python
> def generate_config(trajectories_path: str, output_dir: str, base_model: str) -> dict:
>     # Returns Atropos-compatible training config
>     return {
>         'base_model': base_model,  # e.g. 'NousResearch/Hermes-3-Llama-3.1-8B'
>         'training_data': trajectories_path,
>         'output_dir': output_dir,
>         'num_epochs': 1,
>         'learning_rate': 2e-5,
>         'lora_r': 16,
>         'lora_alpha': 32,
>         'max_seq_length': 2048,
>         'per_device_train_batch_size': 4,
>         'gradient_accumulation_steps': 4
>     }
> ```
>
> **STEP 3: Create learning/modal_trainer.py**
>
> Modal fine-tuning job. This file runs ON Modal (serverless GPU). It must:
>
> 1. Define a Modal app called 'hermes-ouroboros-trainer'
> 2. Use a GPU-enabled image with: transformers, peft, trl, torch, datasets
> 3. Define a training function that:
>    - Accepts: base_model_name, training_data_json (list of trajectory dicts), output_name
>    - Loads base model with QLoRA (4-bit quantization to fit on A10G)
>    - Converts trajectories to conversation format (system + user + assistant)
>    - Runs SFTTrainer from trl library
>    - Saves LoRA adapter weights to Modal Volume
>    - Returns: adapter path, final training loss, number of training steps
> 4. Define a Modal Volume called 'hermes-ouroboros-models' to store trained adapters
> 5. Use A10G GPU (cheapest Modal GPU that fits 8B model with QLoRA)
>
> **STEP 4: Create learning/atropos_runner.py**
>
> Orchestrates the full fine-tuning flow:
> ```python
> def run_training_cycle(min_trajectories=50):
>     # 1. Get training batch from quality_filter.py
>     # 2. Check we have enough (>= min_trajectories)
>     # 3. Generate Atropos config
>     # 4. Submit Modal training job
>     # 5. Monitor job progress (poll every 30 seconds)
>     # 6. When complete: download adapter weights
>     # 7. Return: {'success': bool, 'adapter_path': str, 'training_loss': float, 'steps': int}
> ```
>
> **STEP 5: Create test_modal.py — dry run test**
>
> Test WITHOUT running actual training:
> 1. Check Modal authentication: `modal token list`
> 2. Build the Modal image (no GPU needed for build): `modal build learning/modal_trainer.py`
> 3. Verify Volume exists or create it
> 4. Run a DUMMY training job with 5 fake trajectories and 1 step
>    (just to confirm the pipeline works end-to-end without spending real GPU time)
> 5. Confirm the job submits, runs, and returns a result
>
> **STEP 6: Run `python test_modal.py`**
> Show the output — we want to see Modal job submitted and completed.
>
> Requirements:
> - Use QLoRA (4-bit) — this is critical to fit 8B model on A10G GPU
> - Use `trl.SFTTrainer` for fine-tuning
> - Use `peft` library for LoRA
> - Training data format: ShareGPT or ChatML conversation format
> - DO NOT start real training yet — dummy test only today"

---

## WHAT SUCCESS LOOKS LIKE

- Modal app builds without errors
- Modal Volume 'hermes-ouroboros-models' exists
- Dummy training job runs and completes
- `atropos_runner.py` can call Modal and get a result
- No import errors in any learning/ module

---

## WHAT TO DO AFTER CODEX FINISHES

1. Log into modal.com — verify the app appears in your dashboard
2. Run `python test_modal.py` — screenshot the output
3. Check Modal billing — dummy run should cost <$0.10
4. Report back — move to DAY7.md

---

## COST ESTIMATE

| Run type | GPU | Time | Cost |
|----------|-----|------|------|
| Dummy test | A10G | ~2 min | ~$0.05 |
| Real training (50 trajectories) | A10G | ~20-40 min | ~$2-5 |
| Real training (200 trajectories) | A10G | ~2 hours | ~$15-20 |

Total budget for Days 6-8: ~$30-40 maximum.
