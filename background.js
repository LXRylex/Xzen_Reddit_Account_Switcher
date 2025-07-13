const COOKIE_NAME    = "reddit_session";
const REDDIT_DOMAINS = ["https://www.reddit.com/", "https://reddit.com/"];
let cryptoKey = null;

chrome.runtime.onInstalled.addListener(init);
chrome.storage.onChanged.addListener((c, area) => {
  if (area === "local" && c.sessions) buildContextMenu();
});

async function init() {
  const { rawKey } = await chrome.storage.local.get("rawKey");
  if (rawKey) {
    const bytes = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
    cryptoKey = await crypto.subtle.importKey(
      "raw", bytes, { name: "AES-GCM" }, false, ["decrypt"]
    );
  }
  buildContextMenu();
}

async function decryptText(data) {
  const raw = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const iv  = raw.slice(0,12), ct = raw.slice(12);
  const pt  = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, cryptoKey, ct);
  return new TextDecoder().decode(pt);
}

function buildContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "root",
      title: "Switch Reddit Account",
      contexts: ["page"]
    });
    chrome.storage.local.get("sessions", d => {
      for (let name in (d.sessions||{})) {
        chrome.contextMenus.create({
          id: `switch-${name}`,
          parentId: "root",
          title: name,
          contexts: ["page"]
        });
      }
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith("switch-")) return;
  const name = info.menuItemId.replace("switch-","");
  const { sessions={} } = await chrome.storage.local.get("sessions");
  const entry = sessions[name];
  if (!entry) return;

  // decrypt and set cookie
  const val = await decryptText(entry.enc);
  for (let url of REDDIT_DOMAINS) {
    await chrome.cookies.remove({ url, name:COOKIE_NAME });
    await chrome.cookies.set({
      url, name:COOKIE_NAME, value:val,
      domain:".reddit.com", path:"/",
      secure:true, httpOnly:true
    });
  }

  // signal content scripts to reload
  await chrome.storage.local.set({ lastSwitched: Date.now() });
});
