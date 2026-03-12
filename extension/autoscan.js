(() => {
  "use strict";

  const API_URL = "https://hermes-ouroboros.online/api/query";
  const MAX_SCANS_PER_PAGE = 5;
  const MIN_CLAIM_LENGTH = 40;
  const MAX_CLAIM_LENGTH = 500;
  const SCAN_DELAY_MS = 2000; // wait for page to settle
  const BADGE_CLASS = "hermes-autoscan-badge";
  const PROCESSED_ATTR = "data-hermes-scanned";

  // Claim detection patterns
  const CLAIM_PATTERNS = [
    /\b\d{1,3}(?:\.\d+)?%\s/,                          // percentages: "45% of..."
    /\bstud(?:y|ies)\s+(?:show|found|reveal|suggest)/i, // "study shows..."
    /\baccording\s+to\b/i,                              // "according to..."
    /\bresearch(?:ers?)?\s+(?:show|found|suggest|indicate)/i,
    /\bscientists?\s+(?:say|found|discovered|believe)/i,
    /\bexperts?\s+(?:say|agree|warn|predict|believe)/i,
    /\b(?:always|never|every|no one|everyone|nobody)\b/i,  // absolutes
    /\b(?:proven|debunked|confirmed|disproven)\b/i,
    /\b(?:million|billion|trillion)\s+(?:people|users|dollars)/i,
    /\b(?:causes?|prevents?|cures?|eliminates?)\s+\w+/i,
    /\b(?:is|are)\s+(?:the\s+)?(?:best|worst|most|least|fastest|biggest|smallest)/i, // superlatives
    /\b(?:will|going to)\s+(?:replace|eliminate|destroy|transform|revolutionize)/i,
    /\b(?:GDP|inflation|unemployment)\s+(?:is|was|rose|fell|grew)/i,
    /\bmore\s+(?:than|effective|efficient|productive|dangerous)\b/i,
  ];

  let scannedUrls = new Set();
  let scanning = false;
  let enabled = false;

  // Check if auto-scan is enabled
  function checkEnabled() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["autoScan"], (data) => {
        enabled = data.autoScan === true;
        resolve(enabled);
      });
    });
  }

  // Listen for toggle changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.autoScan) {
      enabled = changes.autoScan.newValue === true;
      if (enabled && !scannedUrls.has(location.href)) {
        scanPage();
      }
      if (!enabled) {
        removeAllBadges();
      }
    }
  });

  function removeAllBadges() {
    document.querySelectorAll("." + BADGE_CLASS).forEach((el) => el.remove());
    document.querySelectorAll("[" + PROCESSED_ATTR + "]").forEach((el) => {
      el.removeAttribute(PROCESSED_ATTR);
    });
  }

  // Extract visible text nodes from the page
  function getTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "INPUT"].includes(tag))
            return NodeFilter.FILTER_REJECT;
          if (parent.closest("." + BADGE_CLASS)) return NodeFilter.FILTER_REJECT;
          if (parent.hasAttribute(PROCESSED_ATTR)) return NodeFilter.FILTER_REJECT;
          if (node.textContent.trim().length < MIN_CLAIM_LENGTH) return NodeFilter.FILTER_REJECT;

          // Must be visible
          const rect = parent.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  // Score a sentence as a "claim" (higher = more likely a claim)
  function scoreClaim(text) {
    let score = 0;
    for (const pattern of CLAIM_PATTERNS) {
      if (pattern.test(text)) score += 2;
    }
    // Bonus for numbers
    const numMatches = text.match(/\d+/g);
    if (numMatches) score += Math.min(numMatches.length, 3);
    // Penalty for questions
    if (text.trim().endsWith("?")) score -= 3;
    // Penalty for too short
    if (text.length < 60) score -= 1;
    // Bonus for declarative sentences
    if (/^[A-Z]/.test(text.trim()) && text.trim().endsWith(".")) score += 1;
    return score;
  }

  // Extract claim-like sentences from text nodes
  function extractClaims(textNodes) {
    const claims = [];

    for (const node of textNodes) {
      const text = node.textContent.trim();
      // Split into sentences
      const sentences = text.split(/(?<=[.!])\s+/).filter((s) => s.length >= MIN_CLAIM_LENGTH && s.length <= MAX_CLAIM_LENGTH);

      for (const sentence of sentences) {
        const score = scoreClaim(sentence);
        if (score >= 3) {
          claims.push({
            text: sentence.trim(),
            score,
            node,
            element: node.parentElement,
          });
        }
      }
    }

    // Sort by score descending, take top N
    claims.sort((a, b) => b.score - a.score);
    return claims.slice(0, MAX_SCANS_PER_PAGE);
  }

  // Query API for a claim
  async function verifyClaim(text) {
    const syncData = await chrome.storage.sync.get(["apiKey"]);
    const apiKey = syncData.apiKey || "";

    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: text, analysis_mode: "verify" }),
    });

    if (response.status === 429) {
      throw new Error("rate_limit");
    }

    if (!response.ok) {
      throw new Error("api_error");
    }

    return response.json();
  }

  // Extract score from API response
  function extractScore(apiResponse) {
    const r = apiResponse && apiResponse.result ? apiResponse.result : apiResponse;
    if (!r) return null;
    if (typeof r.hermes_score === "number" && r.hermes_score >= 0) return r.hermes_score;
    if (r.verdict_sections && typeof r.verdict_sections.hermes_score === "number")
      return r.verdict_sections.hermes_score;
    if (typeof r.confidence_score === "number") return r.confidence_score;
    return null;
  }

  // Extract verdict label
  function extractLabel(apiResponse) {
    const r = apiResponse && apiResponse.result ? apiResponse.result : apiResponse;
    if (r && r.verdict_sections && r.verdict_sections.verdict_label)
      return r.verdict_sections.verdict_label;
    return "ANALYZED";
  }

  // Extract summary
  function extractSummary(apiResponse) {
    const r = apiResponse && apiResponse.result ? apiResponse.result : apiResponse;
    if (r && typeof r.arbiter_verdict === "string" && r.arbiter_verdict.length > 0)
      return r.arbiter_verdict;
    if (r && r.verdict_sections && r.verdict_sections.detailed_reasoning)
      return r.verdict_sections.detailed_reasoning;
    return "Analysis complete.";
  }

  // Create inline badge
  function createBadge(claim, status, result) {
    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;

    if (status === "loading") {
      badge.classList.add("hermes-loading");
      badge.innerHTML = `<span class="hermes-badge-dot"></span>`;
      badge.title = "HERMES analyzing...";
    } else if (status === "done") {
      const score = extractScore(result);
      const label = extractLabel(result);
      const summary = extractSummary(result);

      let colorClass = "hermes-amber";
      if (score >= 70) colorClass = "hermes-green";
      else if (score !== null && score < 40) colorClass = "hermes-red";

      badge.classList.add(colorClass);
      badge.innerHTML = `<span class="hermes-badge-score">${score !== null ? score : "?"}</span>`;
      badge.title = label;

      // Add tooltip on hover
      badge.addEventListener("mouseenter", (e) => {
        showTooltip(e.target, score, label, summary, claim.text);
      });
      badge.addEventListener("mouseleave", () => {
        hideTooltip();
      });
    } else if (status === "error") {
      badge.classList.add("hermes-gray");
      badge.innerHTML = `<span class="hermes-badge-score">!</span>`;
      badge.title = "Analysis failed";
    }

    return badge;
  }

  // Tooltip
  let tooltipEl = null;

  function showTooltip(anchor, score, label, summary, claimText) {
    hideTooltip();
    tooltipEl = document.createElement("div");
    tooltipEl.className = "hermes-autoscan-tooltip";

    let colorClass = "hermes-amber";
    if (score >= 70) colorClass = "hermes-green";
    else if (score !== null && score < 40) colorClass = "hermes-red";

    const shortSummary = summary.length > 200 ? summary.slice(0, 200) + "..." : summary;

    tooltipEl.innerHTML = `
      <div class="hermes-tooltip-header">
        <div class="hermes-tooltip-score ${colorClass}">${score !== null ? score : "?"}</div>
        <div class="hermes-tooltip-label ${colorClass}">${label}</div>
      </div>
      <div class="hermes-tooltip-claim">${claimText.length > 100 ? claimText.slice(0, 100) + "..." : claimText}</div>
      <div class="hermes-tooltip-summary">${shortSummary}</div>
      <div class="hermes-tooltip-footer">Powered by HERMES Adversarial Intelligence</div>
    `;

    document.body.appendChild(tooltipEl);

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    const tipW = 320;
    let left = rect.left + rect.width / 2 - tipW / 2;
    let top = rect.bottom + 8;

    // Keep on screen
    if (left < 8) left = 8;
    if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8;
    if (top + 200 > window.innerHeight) top = rect.top - 208;

    tooltipEl.style.left = left + window.scrollX + "px";
    tooltipEl.style.top = top + window.scrollY + "px";
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  // Inject badge next to the claim's element
  function injectBadge(claim, badge) {
    const el = claim.element;
    if (!el || el.hasAttribute(PROCESSED_ATTR)) return;
    el.setAttribute(PROCESSED_ATTR, "true");

    // Insert badge right after the element's content
    if (el.tagName === "P" || el.tagName === "LI" || el.tagName === "SPAN" || el.tagName === "DIV" || el.tagName === "TD" || el.tagName === "H1" || el.tagName === "H2" || el.tagName === "H3" || el.tagName === "H4") {
      el.appendChild(document.createTextNode(" "));
      el.appendChild(badge);
    } else {
      // Fallback: insert after element
      el.parentNode && el.parentNode.insertBefore(badge, el.nextSibling);
    }
  }

  // Main scan function
  async function scanPage() {
    if (scanning || !enabled) return;
    scanning = true;

    const url = location.href;
    if (scannedUrls.has(url)) {
      scanning = false;
      return;
    }
    scannedUrls.add(url);

    try {
      const textNodes = getTextNodes();
      const claims = extractClaims(textNodes);

      if (claims.length === 0) {
        scanning = false;
        return;
      }

      // Inject loading badges
      const badges = [];
      for (const claim of claims) {
        const badge = createBadge(claim, "loading");
        injectBadge(claim, badge);
        badges.push({ claim, badge });
      }

      // Query API for each claim (sequentially to be respectful of rate limits)
      for (const { claim, badge } of badges) {
        try {
          const result = await verifyClaim(claim.text);
          const newBadge = createBadge(claim, "done", result);
          badge.replaceWith(newBadge);
        } catch (err) {
          if (err.message === "rate_limit") {
            // Stop scanning on rate limit
            const errBadge = createBadge(claim, "error");
            errBadge.title = "Rate limit reached";
            badge.replaceWith(errBadge);
            break;
          }
          const errBadge = createBadge(claim, "error");
          badge.replaceWith(errBadge);
        }
      }
    } finally {
      scanning = false;
    }
  }

  // Initialize
  async function init() {
    const isEnabled = await checkEnabled();
    if (!isEnabled) return;

    // Skip non-content pages
    if (location.protocol !== "http:" && location.protocol !== "https:") return;

    // Wait for page to settle
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(scanPage, SCAN_DELAY_MS);
      });
    } else {
      setTimeout(scanPage, SCAN_DELAY_MS);
    }

    // Re-scan on SPA navigation (URL changes)
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        scannedUrls.delete(lastUrl);
        setTimeout(scanPage, SCAN_DELAY_MS);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
