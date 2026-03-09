from __future__ import annotations

import json
from pathlib import Path


def generate_config(trajectories_path: str, output_dir: str, base_model: str) -> dict[str, object]:
    return {
        'base_model': base_model,
        'training_data': trajectories_path,
        'output_dir': output_dir,
        'num_epochs': 2,
        'learning_rate': 1.5e-5,
        'lora_r': 16,
        'lora_alpha': 32,
        'max_seq_length': 1024,
        'per_device_train_batch_size': 1,
        'gradient_accumulation_steps': 16,
    }


def write_config(config: dict[str, object], destination: str | Path) -> Path:
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(config, indent=2), encoding='utf-8')
    return path
