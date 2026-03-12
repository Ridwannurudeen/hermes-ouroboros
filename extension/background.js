const API_URL = "https://hermes-ouroboros.online/api/query";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "hermes-verify",
    title: "Verify with Hermes",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "hermes-red_team",
    title: "Red Team with Hermes",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "hermes-research",
    title: "Research with Hermes",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = info.selectionText;
  if (!text) return;

  const mode = info.menuItemId.replace("hermes-", "");

  chrome.storage.local.set({
    hermes: {
      query: text,
      mode: mode,
      status: "loading",
      timestamp: Date.now(),
    },
  });

  // Try to open popup (chrome.action.openPopup may not be available in all contexts)
  if (chrome.action && chrome.action.openPopup) {
    chrome.action.openPopup().catch(() => {
      // Fallback: user can click the extension icon
    });
  }

  queryHermes(text, mode);
});

async function queryHermes(text, mode) {
  try {
    const syncData = await chrome.storage.sync.get(["apiKey"]);
    const apiKey = syncData.apiKey || "";

    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query: text, analysis_mode: mode }),
    });

    if (response.status === 429) {
      chrome.storage.local.set({
        hermes: {
          query: text,
          mode: mode,
          status: "error",
          error: "Rate limit reached. Add an API key for 30 queries/min.",
          timestamp: Date.now(),
        },
      });
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
      return;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      chrome.storage.local.set({
        hermes: {
          query: text,
          mode: mode,
          status: "error",
          error: `Request failed (${response.status}): ${errText}`,
          timestamp: Date.now(),
        },
      });
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      return;
    }

    const result = await response.json();

    // Extract score for badge
    const score = extractScore(result);
    if (score !== null) {
      chrome.action.setBadgeText({ text: String(score) });
      if (score >= 70) {
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
      } else if (score >= 40) {
        chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
      } else {
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      }
    }

    chrome.storage.local.set({
      hermes: {
        query: text,
        mode: mode,
        status: "done",
        result: result,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    chrome.storage.local.set({
      hermes: {
        query: text,
        mode: mode,
        status: "error",
        error: err.message || "Network error. Check your connection.",
        timestamp: Date.now(),
      },
    });
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  }
}

function extractScore(apiResponse) {
  // API returns {runtime, result: {hermes_score, confidence_score, verdict_sections: {hermes_score}}}
  const r = apiResponse && apiResponse.result ? apiResponse.result : apiResponse;
  if (!r) return null;
  if (typeof r.hermes_score === "number" && r.hermes_score >= 0) return r.hermes_score;
  if (r.verdict_sections && typeof r.verdict_sections.hermes_score === "number") return r.verdict_sections.hermes_score;
  if (typeof r.confidence_score === "number") return r.confidence_score;
  return null;
}
