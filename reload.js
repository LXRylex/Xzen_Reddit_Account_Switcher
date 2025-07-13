// reload.js — runs on reddit.com pages
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lastSwitched) {
    window.location.reload();
  }
});
