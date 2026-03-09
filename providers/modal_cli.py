from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path


class ModalCLIProvider:
    def __init__(
        self,
        root: str | Path,
        base_model: str,
        adapter_name: str,
        timeout_seconds: float = 600.0,
        temperature: float = 0.2,
    ) -> None:
        self.root = Path(root)
        self.base_model = base_model
        self.adapter_name = adapter_name
        self.timeout_seconds = timeout_seconds
        self.temperature = temperature

    async def generate(
        self,
        role: str,
        system_prompt: str,
        query: str,
        context: dict[str, str] | None = None,
    ) -> str:
        return await asyncio.to_thread(self._run_modal_inference, system_prompt, query)

    def _run_modal_inference(self, system_prompt: str, query: str) -> str:
        command = [
            sys.executable,
            '-X',
            'utf8',
            '-m',
            'modal',
            'run',
            'deployment/modal_inference.py::run',
            '--base-model-name',
            self.base_model,
            '--adapter-name',
            self.adapter_name,
            '--system-prompt',
            system_prompt,
            '--query',
            query,
            '--max-new-tokens',
            '256',
            '--temperature',
            str(self.temperature),
        ]
        env = dict(os.environ)
        env['PYTHONIOENCODING'] = 'utf-8'
        if not env.get('MODAL_TOKEN_ID'):
            env.pop('MODAL_TOKEN_ID', None)
        if not env.get('MODAL_TOKEN_SECRET'):
            env.pop('MODAL_TOKEN_SECRET', None)
        completed = subprocess.run(
            command,
            cwd=self.root,
            text=True,
            capture_output=True,
            timeout=self.timeout_seconds,
            env=env,
            encoding='utf-8',
            errors='replace',
        )
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or 'Modal inference failed.')
        payload = self._extract_json_payload(completed.stdout)
        return str(payload.get('response', ''))

    def _extract_json_payload(self, stdout: str) -> dict[str, object]:
        decoder = json.JSONDecoder()
        parsed: dict[str, object] | None = None
        index = 0
        while True:
            start = stdout.find('{', index)
            if start == -1:
                break
            try:
                candidate, _ = decoder.raw_decode(stdout[start:])
                if isinstance(candidate, dict) and 'response' in candidate:
                    parsed = candidate
            except json.JSONDecodeError:
                pass
            index = start + 1
        if parsed is None:
            raise RuntimeError('Could not parse Modal inference payload.')
        return parsed
