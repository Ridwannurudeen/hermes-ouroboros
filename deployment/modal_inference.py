from __future__ import annotations

import json
import os
from typing import Any

try:
    import modal
except ImportError:
    modal = None


APP_NAME = 'hermes-ouroboros-inference'
VOLUME_NAME = 'hermes-ouroboros-models'
MOUNT_PATH = '/models'


if modal is not None:
    image = (
        modal.Image.debian_slim()
        .pip_install('accelerate', 'bitsandbytes', 'fastapi', 'peft', 'torch', 'transformers')
    )
    app = modal.App(APP_NAME)
    volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)
    modal_inference_token = os.getenv('MODAL_INFERENCE_TOKEN', '').strip()
    modal_secrets = [modal.Secret.from_dict({'MODAL_INFERENCE_TOKEN': modal_inference_token})] if modal_inference_token else []

    def _load_pipeline(base_model_name: str, adapter_name: str) -> tuple[object, object]:
        import torch
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        tokenizer = AutoTokenizer.from_pretrained(base_model_name, use_fast=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type='nf4',
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            quantization_config=quantization_config,
            device_map='auto',
        )
        model = PeftModel.from_pretrained(model, f'{MOUNT_PATH}/{adapter_name}')
        model.eval()
        return tokenizer, model

    def _generate_response(
        tokenizer: object,
        model: object,
        system_prompt: str,
        query: str,
        max_new_tokens: int = 256,
        temperature: float = 0.2,
    ) -> str:
        import torch

        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': query},
        ]
        if hasattr(tokenizer, 'apply_chat_template'):
            prompt_text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        else:
            prompt_text = '\n'.join(f"{m['role']}: {m['content']}" for m in messages) + '\nassistant:'

        inputs = tokenizer(prompt_text, return_tensors='pt').to(model.device)
        generation_kwargs: dict[str, Any] = {
            'max_new_tokens': max_new_tokens,
            'do_sample': temperature > 0,
            'pad_token_id': tokenizer.eos_token_id,
        }
        if temperature > 0:
            generation_kwargs['temperature'] = temperature

        with torch.no_grad():
            output = model.generate(**inputs, **generation_kwargs)
        return tokenizer.decode(output[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True).strip()

    @app.function(image=image, gpu='A10G', timeout=3600, volumes={MOUNT_PATH: volume}, secrets=modal_secrets)
    def generate_remote(
        base_model_name: str,
        adapter_name: str,
        system_prompt: str,
        query: str,
        max_new_tokens: int = 256,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        tokenizer, model = _load_pipeline(base_model_name, adapter_name)
        generated = _generate_response(
            tokenizer=tokenizer,
            model=model,
            system_prompt=system_prompt,
            query=query,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
        )
        return {
            'adapter_name': adapter_name,
            'base_model': base_model_name,
            'response': generated,
        }

    @app.function(
        image=image,
        gpu='A10G',
        timeout=3600,
        volumes={MOUNT_PATH: volume},
        min_containers=0,
        max_containers=1,
        scaledown_window=300,
        secrets=modal_secrets,
    )
    @modal.asgi_app(label='generate')
    def serve_inference():
        from fastapi import FastAPI, Header, HTTPException, Request

        tokenizer_cache: dict[str, object] = {}
        model_cache: dict[str, object] = {}
        api = FastAPI()
        required_token = os.getenv('MODAL_INFERENCE_TOKEN', '').strip()

        def _authorize(authorization: str | None, x_hermes_token: str | None) -> None:
            if not required_token:
                raise HTTPException(status_code=503, detail='Inference token is not configured')
            bearer = ''
            if authorization and authorization.startswith('Bearer '):
                bearer = authorization[len('Bearer '):].strip()
            candidate = bearer or (x_hermes_token or '').strip()
            if candidate != required_token:
                raise HTTPException(status_code=401, detail='Unauthorized')

        async def generate(
            request: Request,
            authorization: str | None = Header(default=None),
            x_hermes_token: str | None = Header(default=None),
        ) -> dict[str, Any]:
            _authorize(authorization, x_hermes_token)
            payload = await request.json()
            base_model_name = str(payload.get('base_model_name') or 'NousResearch/Hermes-3-Llama-3.1-8B')
            adapter_name = str(payload.get('adapter_name') or 'adapter_v1')
            query = str(payload.get('query') or '').strip()
            if not query:
                raise HTTPException(status_code=400, detail='query is required')
            system_prompt = str(payload.get('system_prompt') or 'You are concise and direct.')
            max_new_tokens = int(payload.get('max_new_tokens') or 256)
            temperature = float(payload.get('temperature') or 0.2)

            cache_key = f'{base_model_name}::{adapter_name}'
            tokenizer = tokenizer_cache.get(cache_key)
            model = model_cache.get(cache_key)
            if tokenizer is None or model is None:
                tokenizer, model = _load_pipeline(base_model_name, adapter_name)
                tokenizer_cache[cache_key] = tokenizer
                model_cache[cache_key] = model

            response = _generate_response(
                tokenizer=tokenizer,
                model=model,
                system_prompt=system_prompt,
                query=query,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
            )
            return {
                'adapter_name': adapter_name,
                'base_model': base_model_name,
                'response': response,
            }

        generate.__annotations__ = {'request': Request, 'return': dict[str, Any]}
        api.post('/generate')(generate)

        @api.get('/health')
        def health() -> dict[str, str]:
            return {'status': 'ok'}

        return api

    @app.local_entrypoint()
    def run(
        base_model_name: str = 'NousResearch/Hermes-3-Llama-3.1-8B',
        adapter_name: str = 'adapter_v1',
        system_prompt: str = 'You are concise and direct.',
        query: str = 'Give a concise assessment of Arbitrum risk in 2026.',
        max_new_tokens: int = 256,
        temperature: float = 0.2,
    ) -> None:
        result = generate_remote.remote(
            base_model_name,
            adapter_name,
            system_prompt,
            query,
            max_new_tokens,
            temperature,
        )
        print(json.dumps(result, indent=2))
else:
    app = None
    volume = None
    generate_remote = None
    serve_inference = None
