"""HERMES Adversarial Intelligence Engine — Python SDK."""

from .client import HermesClient, verify, red_team, research
from .models import Verdict

__all__ = ["HermesClient", "Verdict", "verify", "red_team", "research"]
__version__ = "0.1.0"
