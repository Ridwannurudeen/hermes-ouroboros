# Hermes Ouroboros — Demo Video Script
**Target: 3-5 minutes | Research narrative, NOT feature tour**

---

## HOOK (0:00 - 0:20)

**Screen:** hermes-ouroboros.online landing page

**Voiceover:**
> "What if every user query could automatically generate training data? Not with human labelers — with adversarial debate. This is Hermes Ouroboros."

---

## THE PROBLEM (0:20 - 0:50)

**Screen:** Simple slide or text overlay

**Voiceover:**
> "DPO and RLHF need preference data — humans comparing two responses and picking the better one. It's expensive, slow, and doesn't scale. We asked: can AI agents generate this data themselves?"

---

## THE SYSTEM (0:50 - 1:40)

**Screen:** Dashboard — submit a query (e.g. "Is nuclear energy the safest form of energy production?"), show SSE streaming of agents working

**Voiceover:**
> "Five agents, each with a distinct intellectual tradition, debate every claim. The Advocate builds the strongest case. The Skeptic tears it apart. The Oracle gathers real-time web evidence. The Contrarian challenges every assumption. And the Arbiter synthesizes everything into a calibrated verdict."

**Action:** Show the agents responding in real-time, the deliberation timeline progressing, the score gauge revealing

> "This works because of Hermes-3. Its uncensored reasoning means agents can genuinely challenge each other — no safety refusals diluting the adversarial pressure. Its multi-persona adherence keeps each agent in character across two full rounds of debate."

---

## THE INSIGHT (1:40 - 2:20)

**Screen:** Navigate to /paper (technical report), scroll through the DPO validation section

**Voiceover:**
> "Here's the key insight: when the Arbiter picks a winner, it creates a preference pair automatically. The winning response becomes 'chosen', the overruled response becomes 'rejected'. No human labeling needed."

**Screen:** Show DPO validation table (chosen 70.9 vs rejected 65.5, 53% win rate)

> "We validated this across 551 pairs. Arbiter-chosen responses outscore rejected ones by 5.4 points with a 53% win rate. The debate IS the training signal."

---

## THE RESULTS (2:20 - 3:10)

**Screen:** Benchmark section of landing page or paper

**Voiceover:**
> "On a benchmark of 20 verifiable claims, the 5-agent council outperformed solo Hermes-3 in 70% of cases — a 14.4% quality improvement."

**Screen:** Show per-category breakdown, confidence calibration

> "The system is well-calibrated: when it's confident, it's right. High-confidence verdicts average 80/100 quality, low-confidence only 60."

**Screen:** Training loss curve

> "We've run 5 self-improvement cycles. Training loss dropped 35%. And every user session generates more training data. The ouroboros turns."

---

## THE OPEN SOURCE (3:10 - 3:40)

**Screen:** HuggingFace dataset page, GitHub repo

**Voiceover:**
> "Everything is open. 551 DPO pairs on HuggingFace. Full source code on GitHub. The technical report with all experimental data. And a live system you can try right now."

**Screen:** Quick demo — type a query on landing page, show guest demo working

---

## CLOSE (3:40 - 4:00)

**Screen:** Landing page with "Adversarial Intelligence Engine" hero text

**Voiceover:**
> "Hermes Ouroboros. Five agents. Adversarial debate. Self-improving training data. Built on Hermes-3, because honest disagreement makes better AI."

**Screen:** URL: hermes-ouroboros.online

---

## RECORDING TIPS

1. **Record screen at 1080p or higher** — use OBS or similar
2. **Record voiceover separately** (cleaner audio) or narrate live
3. **Pace yourself** — slightly slower than natural speech
4. **Show real queries** — judges want to see it actually work
5. **Don't rush the paper section** — let them see the data tables
6. **Keep it under 5 minutes** — judges watch many videos
7. **No background music** — just your voice and the product
