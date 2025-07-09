const COOKIE_NAME = "reddit_session";
const REDDIT_URL  = "https://www.reddit.com";

let currentEdit = null;
const modal      = document.getElementById("editModal");
const editInput  = document.getElementById("editInput");
const confirmBtn = document.getElementById("confirmEdit");
const cancelBtn  = document.getElementById("cancelEdit");

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveBtn").onclick = saveAccount;
  confirmBtn.onclick = applyEdit;
  cancelBtn .onclick = () => modal.classList.add("hidden");
  loadAccounts();
});

async function saveAccount() {
  const name = document.getElementById("accountName").value.trim();
  if (!name) return;
  const cookie = await chrome.cookies.get({ url: REDDIT_URL, name: COOKIE_NAME });
  if (!cookie) return alert("no reddit_session cookie");
  const { sessions = {} } = await chrome.storage.local.get("sessions");
  sessions[name] = cookie.value;
  await chrome.storage.local.set({ sessions });
  loadAccounts();
}

async function switchAccount(name) {
  const { sessions = {} } = await chrome.storage.local.get("sessions");
  const val = sessions[name];
  if (!val) return alert("no session");
  await chrome.cookies.remove({ url: REDDIT_URL, name: COOKIE_NAME });
  await chrome.cookies.set({
    url: REDDIT_URL,
    name: COOKIE_NAME,
    value: val,
    domain: ".reddit.com",
    path: "/",
    secure: true,
    httpOnly: true
  });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.reload(tab.id);
}

async function deleteAccount(name) {
  const { sessions = {}, hiddenStates = {} } = await chrome.storage.local.get(["sessions","hiddenStates"]);
  delete sessions[name];
  delete hiddenStates[name];
  await chrome.storage.local.set({ sessions, hiddenStates });
  loadAccounts();
}

function startEdit(name) {
  currentEdit = name;
  editInput.value = name;
  modal.classList.remove("hidden");
  editInput.focus();
}

async function applyEdit() {
  const newName = editInput.value.trim();
  if (!newName || newName === currentEdit) {
    modal.classList.add("hidden");
    return;
  }
  const { sessions = {}, hiddenStates = {} } = await chrome.storage.local.get(["sessions","hiddenStates"]);
  sessions[newName] = sessions[currentEdit];
  delete sessions[currentEdit];
  hiddenStates[newName] = hiddenStates[currentEdit]||false;
  delete hiddenStates[currentEdit];
  await chrome.storage.local.set({ sessions, hiddenStates });
  currentEdit = null;
  modal.classList.add("hidden");
  loadAccounts();
}

async function toggleVisibility(li, span, btn) {
  const name = li.dataset.name;
  const nowHidden = li.dataset.hidden !== "true";
  li.dataset.hidden = nowHidden;
  if (nowHidden) {
    span.textContent = "•".repeat(name.length);
    btn.textContent     = "𓂋";
  } else {
    span.textContent = name;
    btn.textContent  = "👁";
  }
  const { hiddenStates = {} } = await chrome.storage.local.get("hiddenStates");
  hiddenStates[name] = nowHidden;
  await chrome.storage.local.set({ hiddenStates });
}

async function loadAccounts() {
  const { sessions = {}, hiddenStates = {} } = await chrome.storage.local.get(["sessions","hiddenStates"]);
  const ul = document.getElementById("accountsList");
  ul.innerHTML = "";
  Object.keys(sessions).forEach(name => {
    const li = document.createElement("li");
    li.dataset.name   = name;
    const hiddenFlag  = hiddenStates[name] === true;
    li.dataset.hidden = hiddenFlag;

    const eyeBtn = document.createElement("button");
    eyeBtn.textContent = hiddenFlag ? "𓂋" : "👁";
    eyeBtn.onclick     = () => toggleVisibility(li, span, eyeBtn);

    const span = document.createElement("span");
    span.className   = "account-name";
    span.textContent = hiddenFlag ? "•".repeat(name.length) : name;

    const editBtn = document.createElement("button");
    editBtn.textContent = "🖊";
    editBtn.onclick     = () => startEdit(name);

    const swBtn = document.createElement("button");
    swBtn.textContent = "Switch";
    swBtn.onclick     = () => switchAccount(name);

    const dlBtn = document.createElement("button");
    dlBtn.textContent = "Delete";
    dlBtn.onclick     = () => deleteAccount(name);

    li.append(eyeBtn, span, editBtn, swBtn, dlBtn);
    ul.append(li);
  });
}
