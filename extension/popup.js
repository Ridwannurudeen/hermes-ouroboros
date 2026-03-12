const STATES = {
  idle: document.getElementById("idle-state"),
  loading: document.getElementById("loading-state"),
  result: document.getElementById("result-state"),
  error: document.getElementById("error-state"),
};

function showState(name) {
  Object.entries(STATES).forEach(([key, el]) => {
    if (key === name) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

function renderLoading(data) {
  showState("loading");
  const modeLabel = document.getElementById("loading-mode-label");
  const modeMap = { verify: "VERIFY", red_team: "RED TEAM", research: "RESEARCH" };
  modeLabel.textContent = "MODE: " + (modeMap[data.mode] || data.mode.toUpperCase());
}

function renderResult(data) {
  showState("result");
  // API response is {runtime, result: {hermes_score, verdict_sections, arbiter_verdict, ...}}
  const apiResponse = data.result || {};
  const r = apiResponse.result || apiResponse;

  // Query preview
  const queryEl = document.getElementById("result-query");
  const queryText = data.query || "";
  queryEl.textContent = queryText.length > 120 ? queryText.slice(0, 120) + "..." : queryText;

  // Mode label
  const modeLabel = document.getElementById("result-mode-label");
  const modeMap = { verify: "VERIFY", red_team: "RED TEAM", research: "RESEARCH" };
  modeLabel.textContent = "MODE: " + (modeMap[data.mode] || data.mode.toUpperCase());

  // Extract score
  const score = extractScore(r);
  const scoreEl = document.getElementById("score-value");
  const ringFg = document.getElementById("score-ring-fg");

  if (score !== null) {
    scoreEl.textContent = score;
    const circumference = 213.6;
    const offset = circumference - (score / 100) * circumference;
    ringFg.style.strokeDashoffset = offset;

    ringFg.classList.remove("green", "amber", "red", "indigo");
    if (score >= 70) ringFg.classList.add("green");
    else if (score >= 40) ringFg.classList.add("amber");
    else ringFg.classList.add("red");
  } else {
    scoreEl.textContent = "--";
    ringFg.style.strokeDashoffset = 213.6;
    ringFg.classList.remove("green", "amber", "red");
    ringFg.classList.add("indigo");
  }

  // Verdict pill
  const verdictPill = document.getElementById("verdict-pill");
  const verdict = extractVerdict(r);
  verdictPill.textContent = verdict.label;
  verdictPill.className = "verdict-pill " + verdict.color;

  // Summary
  const summaryEl = document.getElementById("summary-text");
  const summary = extractSummary(r);
  summaryEl.textContent = summary.length > 300 ? summary.slice(0, 300) + "..." : summary;
}

function renderError(data) {
  showState("error");
  const msgEl = document.getElementById("error-message");
  const actionsEl = document.getElementById("error-actions");
  msgEl.textContent = data.error || "An unknown error occurred.";

  actionsEl.innerHTML = "";
  if (data.error && data.error.toLowerCase().includes("rate limit")) {
    const btn = document.createElement("a");
    btn.className = "error-btn";
    btn.textContent = "Get API Key";
    btn.href = "options.html";
    btn.target = "_blank";
    actionsEl.appendChild(btn);
  }
}

function extractScore(r) {
  if (!r) return null;
  if (typeof r.hermes_score === "number" && r.hermes_score >= 0) return r.hermes_score;
  if (r.verdict_sections && typeof r.verdict_sections.hermes_score === "number") return r.verdict_sections.hermes_score;
  if (typeof r.confidence_score === "number") return r.confidence_score;
  return null;
}

function extractVerdict(r) {
  let label = "ANALYSIS COMPLETE";

  // Primary path: verdict_sections.verdict_label
  if (r && r.verdict_sections && r.verdict_sections.verdict_label) {
    label = r.verdict_sections.verdict_label;
  }

  label = String(label).toUpperCase();

  const greenLabels = ["TRUE", "VERIFIED", "STRONG", "CONFIRMED", "SUPPORTED", "ACCURATE", "BULL"];
  const redLabels = ["FALSE", "FATAL", "DEBUNKED", "REFUTED", "MISLEADING", "INCORRECT", "FLAW", "BEAR"];

  let color = "amber";
  if (greenLabels.some((g) => label.includes(g))) color = "green";
  else if (redLabels.some((r) => label.includes(r))) color = "red";

  return { label, color };
}

function extractSummary(r) {
  // Primary path: arbiter_verdict is a string
  if (r && typeof r.arbiter_verdict === "string" && r.arbiter_verdict.length > 0)
    return r.arbiter_verdict;
  if (r && r.verdict_sections && r.verdict_sections.detailed_reasoning)
    return r.verdict_sections.detailed_reasoning;
  return "Analysis complete. Open the full dashboard for detailed results.";
}

function processState(data) {
  if (!data || !data.hermes) {
    showState("idle");
    return;
  }
  const h = data.hermes;
  switch (h.status) {
    case "loading":
      renderLoading(h);
      break;
    case "done":
      renderResult(h);
      break;
    case "error":
      renderError(h);
      break;
    default:
      showState("idle");
  }
}

// Auto-scan toggle
const autoScanToggle = document.getElementById("autoscan-toggle");
const autoScanLabel = document.getElementById("autoscan-label");

chrome.storage.sync.get(["autoScan"], (data) => {
  autoScanToggle.checked = data.autoScan === true;
  autoScanLabel.textContent = data.autoScan ? "Scanning" : "Auto";
});

autoScanToggle.addEventListener("change", () => {
  const enabled = autoScanToggle.checked;
  chrome.storage.sync.set({ autoScan: enabled });
  autoScanLabel.textContent = enabled ? "Scanning" : "Auto";
});

// Initial load
chrome.storage.local.get(["hermes"], (data) => {
  processState(data);
});

// Live updates
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.hermes) {
    processState({ hermes: changes.hermes.newValue });
  }
});
