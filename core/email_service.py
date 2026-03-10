from __future__ import annotations

import json
import logging
import os
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'


class EmailService:
    def __init__(self) -> None:
        self.api_key = os.getenv('RESEND_API_KEY', '').strip()
        self.from_email = os.getenv('HERMES_FROM_EMAIL', 'onboarding@resend.dev').strip()
        self.base_url = os.getenv('HERMES_PUBLIC_BASE_URL', '').strip().rstrip('/')

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def send_verification_email(self, to_email: str, token: str) -> bool:
        verify_url = f'{self.base_url}/api/verify-email?token={token}'
        html = f'''<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#1d1915">Verify your Hermes Ouroboros account</h2>
  <p style="color:#665d54;line-height:1.6">Click the button below to verify your email address and activate your account.</p>
  <a href="{verify_url}" style="display:inline-block;padding:12px 28px;background:#b34728;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0">Verify Email</a>
  <p style="color:#999;font-size:13px">If you didn't create an account, ignore this email. This link expires in 24 hours.</p>
</div>'''
        return self._send(
            to=to_email,
            subject='Verify your Hermes Ouroboros account',
            html=html,
        )

    def send_password_reset_email(self, to_email: str, token: str) -> bool:
        reset_url = f'{self.base_url}/app#reset-password={token}'
        html = f'''<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#1d1915">Reset your password</h2>
  <p style="color:#665d54;line-height:1.6">Click the button below to set a new password for your Hermes Ouroboros account.</p>
  <a href="{reset_url}" style="display:inline-block;padding:12px 28px;background:#b34728;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0">Reset Password</a>
  <p style="color:#999;font-size:13px">If you didn't request a password reset, ignore this email. This link expires in 1 hour.</p>
</div>'''
        return self._send(
            to=to_email,
            subject='Reset your Hermes Ouroboros password',
            html=html,
        )

    def _send(self, to: str, subject: str, html: str) -> bool:
        if not self.enabled:
            logger.warning('Email not sent — RESEND_API_KEY not configured')
            return False
        payload = json.dumps({
            'from': self.from_email,
            'to': [to],
            'subject': subject,
            'html': html,
        }).encode('utf-8')
        req = Request(
            RESEND_API_URL,
            data=payload,
            headers={
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
            },
            method='POST',
        )
        try:
            with urlopen(req, timeout=10) as resp:
                body = json.loads(resp.read())
                logger.info('Email sent to %s: id=%s', to, body.get('id'))
                return True
        except URLError as exc:
            logger.error('Failed to send email to %s: %s', to, exc)
            return False
        except Exception as exc:
            logger.error('Email send error: %s', exc)
            return False
