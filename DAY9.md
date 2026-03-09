# DAY 9 — Demo Video + Submission
## Goal: Record the demo, write the tweet, submit. WIN.

---

## DEMO VIDEO STRUCTURE (90 seconds)

Record in this exact sequence:

### SCENE 1: Hook (0:00 - 0:10)
**Screen**: Black screen with text
**Narration/Text**: "What if an AI agent could rewrite its own brain?"
**Then**: Show the Ouroboros symbol (snake eating tail) — use a simple ASCII version or image

---

### SCENE 2: The Council Fires (0:10 - 0:40)
**Screen**: Terminal split into 5 panels side-by-side (use tmux)
- Panel 1: Master Orchestrator logs
- Panels 2-5: Each of the 4 agents streaming output simultaneously

**What to show**:
1. Send query via Telegram: "Is DeFi the future of finance?"
2. Watch ALL 5 panels spring to life simultaneously
3. Show responses streaming in — different views, visibly disagreeing
4. Arbiter panel shows conflict detected → additional research triggered
5. Final verdict: CONFIDENCE: 82/100

**Narration/Text overlay**: "5 adversarial agents. Arguing simultaneously. Finding truth."

---

### SCENE 3: Telegram Verdict (0:40 - 0:50)
**Screen**: Telegram on phone or Telegram Desktop
**What to show**:
- The formatted verdict arriving
- Confidence score visible
- Dissenting views visible
**Narration/Text overlay**: "Delivered to your Telegram. In under 3 minutes."

---

### SCENE 4: The Learning Loop (0:50 - 1:15)
**Screen**: Split — left: trajectory files growing, right: Modal dashboard
**What to show**:
1. Show `trajectories/` folder — files accumulating
2. Show Modal dashboard — training job running, GPU active
3. Show training loss curve going down
4. Show model registry: v0 → v1 appearing
5. Show benchmark comparison table: v0: 71/100 avg confidence → v1: 79/100 avg confidence

**Narration/Text overlay**: "Every argument becomes training data. Every session trains the next model. The loop never stops."

---

### SCENE 5: The Close (1:15 - 1:30)
**Screen**: The Ouroboros symbol again, then terminal showing:
```
HERMES OUROBOROS — LOOP 2 TRIGGERED
New trajectories: 52
Training job submitted...
Model v2 incoming.
```
**Narration/Text overlay**: "Hermes Ouroboros. The agent that becomes."

---

## CODEX PROMPT FOR DEMO PREP

> "Help me set up the demo recording environment:
>
> 1. Install tmux on the VPS and create a layout with 5 panes:
>    - Top-left: master orchestrator logs (tail -f logs/sessions.log)
>    - Top-right: trajectory counter (watch -n1 'wc -l trajectories/*.jsonl')
>    - Middle-left: advocate agent output
>    - Middle-right: skeptic agent output
>    - Bottom: arbiter verdict output
>
> 2. Create `scripts/demo_run.py`:
>    - Runs 3 impressive demo queries in sequence with 10-second pauses between:
>      1. 'Is DeFi the future of finance?'
>      2. 'Will AI replace human intelligence?'
>      3. 'Is Bitcoin digital gold or outdated technology?'
>    - Streams all agent activity to the terminal in real-time
>    - Makes it look impressive for recording
>
> 3. Create a simple `scripts/show_benchmark.py` that prints the before/after comparison table cleanly formatted for video
>
> 4. Create `scripts/show_loop_complete.py` that prints the Ouroboros loop summary with a slight typing animation effect
>
> Run everything once as a rehearsal before recording."

---

## TWEET TEMPLATE

```
Just shipped Hermes Ouroboros for the @NousResearch hackathon.

5 adversarial agents argue over every question simultaneously.
Their reasoning becomes training data.
The data fine-tunes their own model.
The model makes them argue better.
The loop fires again.

This is not an agent that does tasks.
This is an agent that becomes.

[ATTACH VIDEO]

Built with @NousResearch Hermes Agent
```

---

## SUBMISSION CHECKLIST

- [ ] Demo video recorded (90 seconds, shows all 5 features)
- [ ] Tweet drafted and ready
- [ ] Video uploaded to Twitter/X
- [ ] Tweet posted tagging @NousResearch
- [ ] Tweet link submitted to Nous Discord #submissions channel
- [ ] GitHub repo made public (hermes-ouroboros)
- [ ] README.md in repo explains the project clearly

---

## GITHUB README MUST INCLUDE

1. What it is (2 sentences)
2. Architecture diagram (copy from ARCHITECTURE.md)
3. Demo video embed
4. Installation instructions
5. How the Ouroboros loop works
6. Benchmark results (before/after table)
7. Tech stack

---

## DEADLINE

**EOD Sunday March 16, 2026**
Submit early — don't wait until the last hour.
