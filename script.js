// Rev 15 – UI polish + input validation + workflow (no export changes)
window.__appLoaded = true;

const els = {
  projectLabel: document.getElementById("projectLabel"),
  btnSetProject: document.getElementById("btnSetProject"),
  btnExportCsv: document.getElementById("btnExportCsv"),

  date: document.getElementById("date"),
  foam: document.getElementById("foam"),
  fuel: document.getElementById("fuel"),
  testType: document.getElementById("testType"),
  airTemp: document.getElementById("airTemp"),
  wind: document.getElementById("wind"),
  fuelTemp: document.getElementById("fuelTemp"),
  solutionTemp: document.getElementById("solutionTemp"),
  controlTime: document.getElementById("controlTime"),
  extinguishmentTime: document.getElementById("extinguishmentTime"),

  btnSave: document.getElementById("btnSave"),
  btnEdit: document.getElementById("btnEdit"),
  btnDeleteTop: document.getElementById("btnDeleteTop"),
  btnClear: document.getElementById("btnClear"),

  tbody: document.getElementById("tbody"),
  status: document.getElementById("status"),
  statusBar: document.getElementById("statusBar"),

  syncDialog: document.getElementById("syncDialog"),
  syncNameInput: document.getElementById("syncNameInput"),
};

let project = localStorage.getItem("kv_project_name") || "";
let entries = [];
let selectedId = null;
let pendingAction = null; // 'save' | 'export' | 'refresh'
let pendingDelete = { id: null, expires: 0 };

function setStatus(msg, isError=false) {
  els.status.textContent = msg;
  els.statusBar.dataset.error = isError ? "1" : "0";
}

function sanitizeProjectName(s) {
  if (!s) return "";
  return String(s).trim().replace(/\s+/g, " ").slice(0, 80).replace(/[^\w .\-]/g, "");
}

function renderProject() {
  els.projectLabel.textContent = project || "Not set";
}

function openSyncDialog() {
  els.syncNameInput.value = project || "";
  els.syncDialog.showModal();
  els.syncNameInput.focus();
}

function ensureProject(promptIfMissing=true, action=null) {
  if (project) return true;
  if (!promptIfMissing) return false;
  pendingAction = action || pendingAction || "refresh";
  openSyncDialog();
  setStatus("Set Sync Name to save/sync.", true);
  return false;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...opts,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || data?.message || (typeof data?.raw === "string" ? data.raw.slice(0, 200) : "Request failed");
    throw new Error(`${msg} (HTTP ${res.status})`);
  }
  return data;
}

function selectRow(id) {
  selectedId = id;
  els.btnEdit.disabled = !selectedId;
  els.btnDeleteTop.disabled = !selectedId;
  [...els.tbody.querySelectorAll("tr")].forEach(tr => tr.classList.toggle("selected", tr.dataset.id === selectedId));
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setTodayIfEmpty() {
  if (!els.date.value) els.date.value = todayISO();
}

function digitsToTimeDigitsOnly(digits) {
  const s = String(digits).replace(/\D/g, "");
  if (!s) return "";
  if (s.length === 1) return `0:0${s}`;
  if (s.length === 2) return `0:${s}`;
  if (s.length === 3) return `${Number(s.slice(0,1))}:${s.slice(1)}`;
  const mm = Number(s.slice(0,2));
  const ss = s.slice(2,4);
  return `${mm}:${ss}`;
}

function normalizeTime(val) {
  const raw = String(val ?? "").trim();
  if (!raw) return "";
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const m = raw.match(/^(\d{1,2}):(\d{2})$/);
    const sec = Number(m[2]);
    if (sec > 59) return "";
    return `${Number(m[1])}:${m[2]}`;
  }
  const t = digitsToTimeDigitsOnly(raw);
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const sec = Number(m[2]);
  if (sec > 59) return "";
  return `${Number(m[1])}:${m[2]}`;
}

function attachTimeAssist(inputEl) {
  inputEl.addEventListener("input", () => {
    inputEl.value = inputEl.value.replace(/[^\d:]/g, "").slice(0, 5);
  });
  inputEl.addEventListener("blur", () => {
    const n = normalizeTime(inputEl.value);
    if (inputEl.value && !n) return setStatus("Time must be mm:ss (e.g., 0:33) or digits (e.g., 122).", true);
    if (n) inputEl.value = n;
  });
}
attachTimeAssist(els.controlTime);
attachTimeAssist(els.extinguishmentTime);

function sanitizeNumberInput(v) {
  // allow digits, one leading -, one decimal point
  v = String(v ?? "");
  // remove invalid chars
  v = v.replace(/[^0-9.\-]/g, "");
  // only one leading minus
  v = v.replace(/(?!^)-/g, "");
  // only one dot
  const parts = v.split(".");
  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
  return v;
}

function attachNumberAssist(inputEl) {
  inputEl.addEventListener("input", () => {
    inputEl.value = sanitizeNumberInput(inputEl.value);
  });
}

attachNumberAssist(els.airTemp);
attachNumberAssist(els.wind);
attachNumberAssist(els.fuelTemp);
attachNumberAssist(els.solutionTemp);


function getFormData() {
  return {
    date: els.date.value || "",
    foam: els.foam.value || "",
    fuel: els.fuel.value || "",
    testType: els.testType.value || "",
    airTemp: els.airTemp.value || "",
    wind: els.wind.value || "",
    fuelTemp: els.fuelTemp.value || "",
    solutionTemp: els.solutionTemp.value || "",
    controlTime: normalizeTime(els.controlTime.value || ""),
    extinguishmentTime: normalizeTime(els.extinguishmentTime.value || ""),
  };
}

function setFormData(d) {
  els.date.value = d?.date || "";
  els.foam.value = d?.foam || "";
  els.fuel.value = d?.fuel || "";
  els.testType.value = d?.testType || "";
  els.airTemp.value = d?.airTemp || "";
  els.wind.value = d?.wind || "";
  els.fuelTemp.value = d?.fuelTemp || "";
  els.solutionTemp.value = d?.solutionTemp || "";
  els.controlTime.value = d?.controlTime || "";
  els.extinguishmentTime.value = d?.extinguishmentTime || "";
}

function clearForm() {
  setFormData({});
  els.testType.value = "";
  setTodayIfEmpty();
  selectRow(null);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTable() {
  els.tbody.innerHTML = "";
  for (const e of entries) {
    const tr = document.createElement("tr");
    tr.dataset.id = e.id;
    tr.innerHTML = `
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.foam)}</td>
      <td>${escapeHtml(e.fuel)}</td>
      <td>${escapeHtml(e.testType)}</td>
      <td>${escapeHtml(e.airTemp)}</td>
      <td>${escapeHtml(e.wind)}</td>
      <td>${escapeHtml(e.fuelTemp)}</td>
      <td>${escapeHtml(e.solutionTemp)}</td>
      <td>${escapeHtml(e.controlTime)}</td>
      <td>${escapeHtml(e.extinguishmentTime)}</td>
      <td>
        <div class="rowActions">
          <button class="btn ghost" data-act="edit" type="button">Edit</button>
          <button class="btn danger ghost" data-act="delete" type="button">Delete</button>
        </div>
      </td>
    `;

    tr.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (btn) return;
      selectRow(e.id);
    });

    tr.querySelector('[data-act="edit"]').addEventListener("click", () => {
      setFormData(e);
      selectRow(e.id);
      setStatus("Loaded row for editing.");
    });

    tr.querySelector('[data-act="delete"]').addEventListener("click", async () => {
      await deleteEntry(e.id);
    });

    els.tbody.appendChild(tr);
  }
  selectRow(selectedId);
}

async function refresh() {
  if (!ensureProject(false, "refresh")) {
    entries = [];
    renderTable();
    return;
  }
  try {
    const data = await api(`/api/entries?project=${encodeURIComponent(project)}`);
    entries = Array.isArray(data.entries) ? data.entries : [];
    renderTable();
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function saveNewEntry() {
  if (!ensureProject(true, "save")) return;

  const entry = getFormData();
  if (!entry.date) return setStatus("Date is required.", true);
  if (!entry.foam) return setStatus("Foam is required.", true);
  if (!entry.fuel) return setStatus("Fuel is required.", true);
  if (!entry.testType) return setStatus("Select Test Type.", true);

  if (els.controlTime.value) els.controlTime.value = entry.controlTime || els.controlTime.value;
  if (els.extinguishmentTime.value) els.extinguishmentTime.value = entry.extinguishmentTime || els.extinguishmentTime.value;

  try {
    setStatus("Saving…");
    const resp = await api(`/api/entries?project=${encodeURIComponent(project)}`, {
      method: "POST",
      body: JSON.stringify({ entry }),
    });
    const newId = resp?.entry?.id || null;
    await refresh();
    if (newId) { selectedId = newId; selectRow(newId); }
    clearForm();
    setStatus("Saved.");
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function updateEntry() {
  if (!ensureProject(true, "save")) return;
  if (!selectedId) return;

  const entry = getFormData();
  if (!entry.date) return setStatus("Date is required.", true);
  if (!entry.foam) return setStatus("Foam is required.", true);
  if (!entry.fuel) return setStatus("Fuel is required.", true);
  if (!entry.testType) return setStatus("Select Test Type.", true);

  try {
    setStatus("Updating…");
    await api(`/api/entries?project=${encodeURIComponent(project)}&id=${encodeURIComponent(selectedId)}`, {
      method: "PUT",
      body: JSON.stringify({ entry }),
    });
    const keepId = selectedId;
    await refresh();
    if (keepId) { selectedId = keepId; selectRow(keepId); }
    clearForm();
    setStatus("Updated.");
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function deleteEntry(id) {
  if (!ensureProject(true, "save")) return;

  const entry = entries.find(x => x.id === id);
  const label = entry ? `${entry.date || "No date"} / ${entry.foam || "Foam"} / ${entry.fuel || "Fuel"}` : id;

  // Delete confirmation (toast-style): press delete twice within five seconds
  const now = Date.now();
  if (pendingDelete.id !== id || pendingDelete.expires < now) {
    pendingDelete = { id, expires: now + 5000 };
    setStatus(`Confirm delete: press Delete again within five seconds. (${label})`, true);
    return;
  }
  pendingDelete = { id: null, expires: 0 };

  try {
    setStatus("Deleting…");
    await api(`/api/entries?project=${encodeURIComponent(project)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (selectedId === id) selectedId = null;
    await refresh();
    clearForm();
    setStatus("Deleted.");
  } catch (e) {
    setStatus(e.message, true);
  }
}

function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function entriesToCsv(rows) {
  const headers = ["Date","Foam","Fuel","Test Type","Air Temp","Wind","Fuel Temp","Solution Temp","Control","Extinguishment"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [r.date,r.foam,r.fuel,r.testType,r.airTemp,r.wind,r.fuelTemp,r.solutionTemp,r.controlTime,r.extinguishmentTime].map(csvCell);
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

async function exportCsv() {
  if (!ensureProject(true, "export")) return;
  try {
    setStatus("Exporting…");
    const data = await api(`/api/entries/export?project=${encodeURIComponent(project)}`, { method: "GET" });
    const rows = Array.isArray(data.entries) ? data.entries : [];
    const csv = entriesToCsv(rows);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `entries-${project.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("Exported CSV.");
  } catch (e) {
    console.error(e);
    setStatus(e.message, true);
  }
}

function handleKeyShortcuts(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    clearForm();
    setStatus("Cleared.");
    return;
  }
  if (e.key === "Enter") {
    // allow dropdown to open/select without saving when focused on select
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if (tag === "select") return;
    e.preventDefault();
    if (selectedId) return updateEntry();
    return saveNewEntry();
  }
}

// Apply shortcuts to main inputs (not the dialog)
[els.date, els.foam, els.fuel, els.testType, els.airTemp, els.wind, els.fuelTemp, els.solutionTemp, els.controlTime, els.extinguishmentTime]
  .forEach(el => el.addEventListener("keydown", handleKeyShortcuts));

// Button wiring
els.btnSave.addEventListener("click", saveNewEntry);
els.btnEdit.addEventListener("click", updateEntry);
els.btnDeleteTop.addEventListener("click", async () => selectedId && deleteEntry(selectedId));
els.btnClear.addEventListener("click", () => { clearForm(); setStatus("Cleared."); });
els.btnExportCsv.addEventListener("click", exportCsv);
els.btnSetProject.addEventListener("click", openSyncDialog);

// Sync dialog behavior
els.syncDialog.addEventListener("close", async () => {
  if (els.syncDialog.returnValue !== "ok") { pendingAction = null; return; }
  const p = sanitizeProjectName(els.syncNameInput.value || "");
  if (!p) { pendingAction = null; return setStatus("Sync Name is required.", true); }

  project = p;
  localStorage.setItem("kv_project_name", project);
  renderProject();

  const action = pendingAction;
  pendingAction = null;

  if (action === "save") { await saveNewEntry(); return; }
  if (action === "export") { await refresh(); await exportCsv(); return; }

  clearForm();
  await refresh();
  setStatus("Sync Name set.");
});

// Startup
window.addEventListener("error", (e) => { console.error(e.error || e); setStatus(`JS error: ${e.message || "unknown"}`, true); });
window.addEventListener("unhandledrejection", (e) => { console.error(e.reason || e); setStatus(`Promise error: ${String(e.reason || "unknown")}`, true); });

(async () => {
  setStatus("Starting…");
  renderProject();
  setTodayIfEmpty();

  // API health check
  try { await api("/api/ping", { method: "GET" }); }
  catch (e) { console.error(e); setStatus(`API not reachable: ${e.message}`, true); }

  await refresh();
  setStatus("Ready.");
})();
