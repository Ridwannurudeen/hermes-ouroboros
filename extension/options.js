const apiKeyInput = document.getElementById("api-key");
const toggleVisBtn = document.getElementById("toggle-vis");
const saveBtn = document.getElementById("btn-save");
const statusMsg = document.getElementById("status-msg");

let visTimeout = null;

// Load existing key
chrome.storage.sync.get(["apiKey"], (data) => {
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
  }
});

// Toggle visibility
toggleVisBtn.addEventListener("click", () => {
  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text";
    toggleVisBtn.textContent = "\u25C9"; // filled circle
  } else {
    apiKeyInput.type = "password";
    toggleVisBtn.textContent = "\u25CB"; // empty circle
  }
});

// Save
saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  chrome.storage.sync.set({ apiKey: key }, () => {
    statusMsg.textContent = key ? "Saved!" : "API key cleared.";
    statusMsg.classList.add("visible");

    if (visTimeout) clearTimeout(visTimeout);
    visTimeout = setTimeout(() => {
      statusMsg.classList.remove("visible");
    }, 2500);
  });
});

// Allow Enter key to save
apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    saveBtn.click();
  }
});
