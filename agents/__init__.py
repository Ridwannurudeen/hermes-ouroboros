from .advocate import ADVOCATE_AGENT
from .skeptic import SKEPTIC_AGENT
from .oracle import ORACLE_AGENT
from .contrarian import CONTRARIAN_AGENT
from .arbiter import ARBITER_AGENT
from .base import AgentDefinition

COUNCIL_AGENTS = (
    ADVOCATE_AGENT,
    SKEPTIC_AGENT,
    ORACLE_AGENT,
    CONTRARIAN_AGENT,
)

ALL_AGENTS = COUNCIL_AGENTS + (ARBITER_AGENT,)
