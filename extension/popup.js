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
  const result = data.result || {};

  // Query preview
  const queryEl = document.getElementById("result-query");
  const queryText = data.query || "";
  queryEl.textContent = queryText.length > 120 ? queryText.slice(0, 120) + "..." : queryText;

  // Mode label
  const modeLabel = document.getElementById("result-mode-label");
  const modeMap = { verify: "VERIFY", red_team: "RED TEAM", research: "RESEARCH" };
  modeLabel.textContent = "MODE: " + (modeMap[data.mode] || data.mode.toUpperCase());

  // Extract score
  const score = extractScore(result);
  const scoreEl = document.getElementById("score-value");
  const ringFg = document.getElementById("score-ring-fg");

  if (score !== null) {
    scoreEl.textContent = score;
    // Animate ring: circumference = 2 * PI * 34 = ~213.6
    const circumference = 213.6;
    const offset = circumference - (score / 100) * circumference;
    ringFg.style.strokeDashoffset = offset;

    // Color
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
  const verdict = extractVerdict(result);
  verdictPill.textContent = verdict.label;
  verdictPill.className = "verdict-pill " + verdict.color;

  // Summary
  const summaryEl = document.getElementById("summary-text");
  const summary = extractSummary(result);
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

function extractScore(result) {
  if (result && typeof result.score === "number") return result.score;
  if (result && result.final_verdict && typeof result.final_verdict.score === "number")
    return result.final_verdict.score;
  if (result && result.arbiter_verdict && typeof result.arbiter_verdict.confidence_score === "number")
    return result.arbiter_verdict.confidence_score;
  if (result && typeof result.confidence_score === "number")
    return result.confidence_score;
  if (result && result.final_verdict && typeof result.final_verdict === "string") {
    const match = result.final_verdict.match(/(\d+)\s*\/\s*100/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function extractVerdict(result) {
  // Try to get a verdict label from the result
  let label = "UNKNOWN";
  if (result && result.final_verdict && typeof result.final_verdict === "object" && result.final_verdict.verdict) {
    label = result.final_verdict.verdict;
  } else if (result && result.verdict) {
    label = result.verdict;
  } else if (result && result.arbiter_verdict && result.arbiter_verdict.verdict) {
    label = result.arbiter_verdict.verdict;
  }

  label = String(label).toUpperCase();

  // Determine color
  const greenLabels = ["TRUE", "VERIFIED", "STRONG", "CONFIRMED", "SUPPORTED", "ACCURATE"];
  const redLabels = ["FALSE", "FATAL", "DEBUNKED", "REFUTED", "MISLEADING", "INCORRECT", "UNVERIFIED"];

  let color = "amber";
  if (greenLabels.some((g) => label.includes(g))) color = "green";
  else if (redLabels.some((r) => label.includes(r))) color = "red";

  return { label, color };
}

function extractSummary(result) {
  // Try various paths
  if (result && result.arbiter_verdict && typeof result.arbiter_verdict === "string")
    return result.arbiter_verdict;
  if (result && result.arbiter_verdict && result.arbiter_verdict.reasoning)
    return result.arbiter_verdict.reasoning;
  if (result && result.arbiter_verdict && result.arbiter_verdict.summary)
    return result.arbiter_verdict.summary;
  if (result && result.final_verdict && typeof result.final_verdict === "string")
    return result.final_verdict;
  if (result && result.final_verdict && result.final_verdict.reasoning)
    return result.final_verdict.reasoning;
  if (result && result.summary) return result.summary;
  if (result && result.reasoning) return result.reasoning;
  // Fallback: stringify keys we find
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
