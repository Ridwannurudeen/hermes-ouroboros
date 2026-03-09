from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

try:
    import modal
except ImportError:
    modal = None


APP_NAME = 'hermes-ouroboros-trainer'
VOLUME_NAME = 'hermes-ouroboros-models'
MOUNT_PATH = '/models'

LORA_CONFIG = dict(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias='none',
    target_modules='all-linear',
    task_type='CAUSAL_LM',
)

SFT_ARGS = dict(
    max_length=2048,
    num_train_epochs=3,
    learning_rate=1.5e-5,
    warmup_ratio=0.05,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    logging_steps=5,
    save_strategy='no',
    report_to='none',
    bf16=True,
    gradient_checkpointing=True,
    optim='paged_adamw_8bit',
)


def build_chat_samples(training_data_json: list[dict[str, Any]]) -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    for record in training_data_json:
        samples.append(
            {
                'messages': [
                    {'role': 'system', 'content': record.get('system_prompt', '')},
                    {'role': 'user', 'content': record.get('user_query', '')},
                    {'role': 'assistant', 'content': record.get('response', '')},
                ]
            }
        )
    return samples


if modal is not None:
    image = (
        modal.Image.debian_slim()
        .pip_install('accelerate', 'bitsandbytes', 'datasets', 'peft', 'torch', 'transformers', 'trl')
    )
    app = modal.App(APP_NAME)
    volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

    @app.function(image=image, gpu='A10G', timeout=3600, volumes={MOUNT_PATH: volume})
    def train_remote(
        base_model_name: str,
        training_data_json: list[dict[str, Any]],
        output_name: str,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        import torch
        from datasets import Dataset
        from peft import LoraConfig, prepare_model_for_kbit_training
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        from trl import SFTConfig, SFTTrainer

        os.environ.setdefault('PYTORCH_CUDA_ALLOC_CONF', 'expandable_segments:True')
        samples = build_chat_samples(training_data_json)
        destination = f'{MOUNT_PATH}/{output_name}'
        if dry_run:
            volume.commit()
            return {
                'adapter_path': destination,
                'final_training_loss': 0.0,
                'steps': min(len(samples), 1),
                'dry_run': True,
                'base_model': base_model_name,
            }

        tokenizer = AutoTokenizer.from_pretrained(base_model_name, use_fast=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        def render_sample(sample: dict[str, Any]) -> dict[str, str]:
            messages = sample['messages']
            if hasattr(tokenizer, 'apply_chat_template'):
                text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
            else:
                text = '\n'.join(f"{message['role']}: {message['content']}" for message in messages)
            return {'text': text}

        dataset = Dataset.from_list([render_sample(sample) for sample in samples])
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type='nf4',
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            quantization_config=quantization_config,
        )
        model = prepare_model_for_kbit_training(model)
        model.config.use_cache = False

        peft_config = LoraConfig(
            r=16,
            lora_alpha=32,
            lora_dropout=0.05,
            bias='none',
            target_modules='all-linear',
            task_type='CAUSAL_LM',
        )
        trainer = SFTTrainer(
            model=model,
            train_dataset=dataset,
            processing_class=tokenizer,
            peft_config=peft_config,
            args=SFTConfig(
                output_dir=destination,
                dataset_text_field='text',
                max_length=2048,
                num_train_epochs=3,
                learning_rate=1.5e-5,
                warmup_ratio=0.05,
                per_device_train_batch_size=1,
                gradient_accumulation_steps=8,
                logging_steps=5,
                save_strategy='no',
                report_to='none',
                bf16=True,
                gradient_checkpointing=True,
                optim='paged_adamw_8bit',
            ),
        )
        train_result = trainer.train()
        trainer.model.save_pretrained(destination)
        tokenizer.save_pretrained(destination)
        volume.commit()
        return {
            'adapter_path': destination,
            'final_training_loss': float(train_result.training_loss),
            'steps': int(train_result.global_step),
            'dry_run': False,
            'base_model': base_model_name,
        }

    @app.function(image=image, gpu='A10G', timeout=3600, volumes={MOUNT_PATH: volume})
    def train_dpo_remote(
        base_model_name: str,
        dpo_pairs_json: list[dict[str, Any]],
        output_name: str,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """
        DPO fine-tuning using council debate preference pairs.
        Each pair: {"prompt": str, "chosen": str, "rejected": str}
        """
        import torch
        from datasets import Dataset
        from peft import LoraConfig, prepare_model_for_kbit_training
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        from trl import DPOConfig, DPOTrainer

        os.environ.setdefault('PYTORCH_CUDA_ALLOC_CONF', 'expandable_segments:True')
        destination = f'{MOUNT_PATH}/{output_name}'
        if dry_run:
            volume.commit()
            return {
                'adapter_path': destination,
                'final_training_loss': 0.0,
                'steps': min(len(dpo_pairs_json), 1),
                'dry_run': True,
                'base_model': base_model_name,
                'mode': 'dpo',
            }

        tokenizer = AutoTokenizer.from_pretrained(base_model_name, use_fast=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        dataset = Dataset.from_list(dpo_pairs_json)
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type='nf4',
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            quantization_config=quantization_config,
        )
        model = prepare_model_for_kbit_training(model)
        model.config.use_cache = False

        peft_config = LoraConfig(**LORA_CONFIG)
        trainer = DPOTrainer(
            model=model,
            ref_model=None,  # implicit reference via PEFT
            args=DPOConfig(
                output_dir=destination,
                beta=0.1,
                max_length=2048,
                max_prompt_length=512,
                num_train_epochs=2,
                learning_rate=5e-5,
                warmup_ratio=0.1,
                per_device_train_batch_size=1,
                gradient_accumulation_steps=8,
                logging_steps=5,
                save_strategy='no',
                report_to='none',
                bf16=True,
                gradient_checkpointing=True,
                optim='paged_adamw_8bit',
            ),
            train_dataset=dataset,
            tokenizer=tokenizer,
            peft_config=peft_config,
        )
        train_result = trainer.train()
        trainer.model.save_pretrained(destination)
        tokenizer.save_pretrained(destination)
        volume.commit()
        return {
            'adapter_path': destination,
            'final_training_loss': float(train_result.training_loss),
            'steps': int(train_result.global_step),
            'dry_run': False,
            'base_model': base_model_name,
            'mode': 'dpo',
            'num_pairs': len(dpo_pairs_json),
        }

    @app.local_entrypoint()
    def run(
        base_model_name: str = 'hermes-3-llama-3.1-8b',
        training_data_path: str = 'trajectories/sample_training.json',
        output_name: str = 'adapter_v1_remote_test',
        dry_run: bool = True,
    ) -> None:
        payload = json.loads(Path(training_data_path).read_text(encoding='utf-8'))
        result = train_remote.remote(base_model_name, payload, output_name, dry_run)
        print(json.dumps(result, indent=2))
else:
    app = None
    volume = None
    train_remote = None


def train_local_stub(
    base_model_name: str,
    training_data_json: list[dict[str, Any]],
    output_name: str,
    dry_run: bool = True,
) -> dict[str, Any]:
    samples = build_chat_samples(training_data_json)
    return {
        'adapter_path': f'models/{output_name}',
        'final_training_loss': 0.0 if dry_run else 0.123,
        'steps': min(len(samples), 1 if dry_run else len(samples)),
        'dry_run': dry_run,
        'base_model': base_model_name,
    }
