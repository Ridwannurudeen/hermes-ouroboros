"""Deep analysis of all experimental data for the technical report."""
import json
import sys

ROOT = 'C:/Users/GUDMAN/Desktop/hermes-ouroboros'

# Load benchmark data
bench = json.load(open(f'{ROOT}/benchmark_data.json', encoding='utf-8'))
results = bench['results']

# Load DPO pairs
pairs = []
with open(f'{ROOT}/dpo_data.json', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            pairs.append(json.loads(line))

# Load loop data
loop = json.load(open(f'{ROOT}/loop_data.json', encoding='utf-8'))

print("=== BENCHMARK ANALYSIS ===")

# 1. Per-category breakdown
categories = {}
for r in results:
    cat = r['category']
    if cat not in categories:
        categories[cat] = {'solo_q': [], 'council_q': [], 'council_conf': [], 'council_wins': 0, 'solo_wins': 0, 'ties': 0}
    categories[cat]['solo_q'].append(r['solo']['quality_score'])
    categories[cat]['council_q'].append(r['council'].get('quality_score', 0))
    conf = r['council'].get('confidence_score', -1)
    if conf >= 0:
        categories[cat]['council_conf'].append(conf)
    sq = r['solo']['quality_score']
    cq = r['council'].get('quality_score', 0)
    if cq > sq:
        categories[cat]['council_wins'] += 1
    elif sq > cq:
        categories[cat]['solo_wins'] += 1
    else:
        categories[cat]['ties'] += 1

print("\n1. PER-CATEGORY BREAKDOWN:")
for cat, d in sorted(categories.items()):
    n = len(d['solo_q'])
    avg_sq = sum(d['solo_q']) / n
    avg_cq = sum(d['council_q']) / n
    avg_conf = sum(d['council_conf']) / len(d['council_conf']) if d['council_conf'] else 0
    improvement = ((avg_cq - avg_sq) / max(avg_sq, 1)) * 100
    print(f"  {cat}: n={n}, solo={avg_sq:.1f}, council={avg_cq:.1f}, improvement={improvement:+.1f}%, confidence={avg_conf:.1f}, wins={d['council_wins']}/{n}")

# 2. Web evidence effect
with_web = [r for r in results if r['council'].get('has_web_evidence')]
without_web = [r for r in results if not r['council'].get('has_web_evidence')]
print(f"\n2. WEB EVIDENCE EFFECT:")
avg_q_web = avg_c_web = avg_q_noweb = avg_c_noweb = 0
if with_web:
    avg_q_web = sum(r['council'].get('quality_score', 0) for r in with_web) / len(with_web)
    avg_c_web = sum(r['council'].get('confidence_score', 0) for r in with_web) / len(with_web)
    print(f"  With web (n={len(with_web)}): quality={avg_q_web:.1f}, confidence={avg_c_web:.1f}")
if without_web:
    avg_q_noweb = sum(r['council'].get('quality_score', 0) for r in without_web) / len(without_web)
    avg_c_noweb = sum(r['council'].get('confidence_score', 0) for r in without_web) / len(without_web)
    print(f"  Without web (n={len(without_web)}): quality={avg_q_noweb:.1f}, confidence={avg_c_noweb:.1f}")

# 3. Round 2 effect
with_r2 = [r for r in results if r['council'].get('has_round2')]
without_r2 = [r for r in results if not r['council'].get('has_round2')]
avg_q_r2 = avg_q_nor2 = 0
print(f"\n3. ROUND 2 DELIBERATION EFFECT:")
if with_r2:
    avg_q_r2 = sum(r['council'].get('quality_score', 0) for r in with_r2) / len(with_r2)
    print(f"  With round 2 (n={len(with_r2)}): quality={avg_q_r2:.1f}")
if without_r2:
    avg_q_nor2 = sum(r['council'].get('quality_score', 0) for r in without_r2) / len(without_r2)
    print(f"  Without round 2 (n={len(without_r2)}): quality={avg_q_nor2:.1f}")

# 4. Confidence calibration
print(f"\n4. CONFIDENCE CALIBRATION:")
conf_bins = {'low_0_60': [], 'mid_60_80': [], 'high_80_100': []}
for r in results:
    conf = r['council'].get('confidence_score', -1)
    q = r['council'].get('quality_score', 0)
    if conf < 0:
        continue
    if conf < 60:
        conf_bins['low_0_60'].append(q)
    elif conf < 80:
        conf_bins['mid_60_80'].append(q)
    else:
        conf_bins['high_80_100'].append(q)
for bin_name, qs in conf_bins.items():
    if qs:
        print(f"  {bin_name}: n={len(qs)}, avg_quality={sum(qs)/len(qs):.1f}")

# 5. DPO Quality Validation
print(f"\n=== DPO DATA QUALITY VALIDATION ===")
print(f"Total pairs: {len(pairs)}")


def quality_score(text):
    low = text.lower()
    score = 0
    if len(text) >= 600:
        score += 25
    elif len(text) >= 300:
        score += 15
    elif len(text) >= 100:
        score += 8
    if any(kw in low for kw in ('however', 'on the other hand', 'counter-argument', 'nuance', 'caveat', 'alternatively')):
        score += 15
    if any(kw in low for kw in ('study', 'research', 'data', 'according to', 'evidence', 'literature')):
        score += 15
    if any(kw in low for kw in ('first', 'second', 'argument for', 'argument against', 'pros', 'cons', '1.', '2.', '3.')):
        score += 15
    if any(kw in low for kw in ('uncertain', 'unclear', 'debatable', 'depends', 'complex', 'mixed', 'limitation')):
        score += 10
    if any(c.isdigit() for c in text) and '%' in text:
        score += 10
    if any(kw in low for kw in ('risk', 'trade-off', 'tradeoff', 'downside', 'weakness')):
        score += 10
    return min(score, 100)


chosen_scores = [quality_score(p['chosen']) for p in pairs]
rejected_scores = [quality_score(p['rejected']) for p in pairs]

avg_chosen = sum(chosen_scores) / len(chosen_scores)
avg_rejected = sum(rejected_scores) / len(rejected_scores)
chosen_wins = sum(1 for c, r in zip(chosen_scores, rejected_scores) if c > r)
rejected_wins = sum(1 for c, r in zip(chosen_scores, rejected_scores) if r > c)
ties = len(pairs) - chosen_wins - rejected_wins

print(f"Avg chosen quality: {avg_chosen:.1f}/100")
print(f"Avg rejected quality: {avg_rejected:.1f}/100")
print(f"Quality gap: {avg_chosen - avg_rejected:+.1f}")
print(f"Chosen wins: {chosen_wins}/{len(pairs)} ({chosen_wins/len(pairs)*100:.1f}%)")
print(f"Rejected wins: {rejected_wins}/{len(pairs)} ({rejected_wins/len(pairs)*100:.1f}%)")
print(f"Ties: {ties}/{len(pairs)}")

avg_chosen_len = sum(len(p['chosen']) for p in pairs) / len(pairs)
avg_rejected_len = sum(len(p['rejected']) for p in pairs) / len(pairs)
print(f"\nAvg chosen length: {avg_chosen_len:.0f} chars")
print(f"Avg rejected length: {avg_rejected_len:.0f} chars")

# 6. Training progression
print(f"\n=== TRAINING PROGRESSION ===")
for v in loop['model_history']:
    print(f"  {v['name']}: loss={v['loss']:.3f}, steps={v['steps']}, mode={v['mode']}")

loss_first = loop['model_history'][0]['loss']
loss_last = loop['model_history'][-1]['loss']
print(f"Total reduction: {loss_first:.3f} -> {loss_last:.3f} ({(loss_first-loss_last)/loss_first*100:.1f}%)")

# Save analysis JSON
analysis = {
    'benchmark': {
        'total_claims': len(results),
        'summary': bench['summary'],
        'per_category': {cat: {
            'n': len(d['solo_q']),
            'avg_solo_quality': round(sum(d['solo_q']) / len(d['solo_q']), 1),
            'avg_council_quality': round(sum(d['council_q']) / len(d['council_q']), 1),
            'avg_confidence': round(sum(d['council_conf']) / len(d['council_conf']), 1) if d['council_conf'] else 0,
            'council_wins': d['council_wins'],
            'solo_wins': d['solo_wins'],
        } for cat, d in categories.items()},
        'web_evidence': {
            'with_web': {'n': len(with_web), 'avg_quality': round(avg_q_web, 1), 'avg_confidence': round(avg_c_web, 1)},
            'without_web': {'n': len(without_web), 'avg_quality': round(avg_q_noweb, 1), 'avg_confidence': round(avg_c_noweb, 1)},
        },
        'round2_effect': {
            'with_round2': {'n': len(with_r2), 'avg_quality': round(avg_q_r2, 1)},
            'without_round2': {'n': len(without_r2), 'avg_quality': round(avg_q_nor2, 1)},
        },
        'confidence_calibration': {k: {'n': len(v), 'avg_quality': round(sum(v) / len(v), 1)} for k, v in conf_bins.items() if v},
    },
    'dpo_validation': {
        'total_pairs': len(pairs),
        'avg_chosen_quality': round(avg_chosen, 1),
        'avg_rejected_quality': round(avg_rejected, 1),
        'quality_gap': round(avg_chosen - avg_rejected, 1),
        'chosen_win_rate': round(chosen_wins / len(pairs) * 100, 1),
        'rejected_win_rate': round(rejected_wins / len(pairs) * 100, 1),
        'tie_rate': round(ties / len(pairs) * 100, 1),
        'avg_chosen_length': round(avg_chosen_len),
        'avg_rejected_length': round(avg_rejected_len),
    },
    'training': {
        'versions': loop['model_history'],
        'total_sessions': loop['sessions']['total'],
        'total_pairs': loop['dpo']['total_pairs'],
        'avg_confidence': round(loop['sessions']['average_confidence'], 1),
        'loss_reduction_pct': round((loss_first - loss_last) / loss_first * 100, 1),
    },
}

with open(f'{ROOT}/analysis.json', 'w', encoding='utf-8') as f:
    json.dump(analysis, f, indent=2, ensure_ascii=False)
print(f"\nAnalysis saved to analysis.json")
