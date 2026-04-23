// v6 – Zebra-stripe table rows (every other row grey) for readability; selected-row highlight strengthened.
//      v5: Edit/Copy/Del row actions (edit preserves scroll), Humidity & Pressure fields pulled from Ambient Weather,
//      Burnback pass/fail with check/X in table, Notes dialog w/ in-table view button.
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
  humidity: document.getElementById("humidity"),
  pressure: document.getElementById("pressure"),
  fuelTemp: document.getElementById("fuelTemp"),
  solutionTemp: document.getElementById("solutionTemp"),
  expansion: document.getElementById("expansion"),
  drainTime: document.getElementById("drainTime"),
  controlTime: document.getElementById("controlTime"),
  extinguishmentTime: document.getElementById("extinguishmentTime"),
  burnbackTime: document.getElementById("burnbackTime"),
  burnbackPass: document.getElementById("burnbackPass"),
  burnbackFail: document.getElementById("burnbackFail"),
  btnClearResult: document.getElementById("btnClearResult"),

  btnNotes: document.getElementById("btnNotes"),
  notesBtnLabel: document.getElementById("notesBtnLabel"),

  btnFetchTemp: document.getElementById("btnFetchTemp"),
  btnSave: document.getElementById("btnSave"),
  btnEdit: document.getElementById("btnEdit"),
  btnDeleteTop: document.getElementById("btnDeleteTop"),
  btnClear: document.getElementById("btnClear"),

  tbody: document.getElementById("tbody"),
  pagination: document.getElementById("pagination"),
  status: document.getElementById("status"),
  statusBar: document.getElementById("statusBar"),

  syncDialog: document.getElementById("syncDialog"),
  syncNameInput: document.getElementById("syncNameInput"),

  notesDialog: document.getElementById("notesDialog"),
  notesInput: document.getElementById("notesInput"),
  notesViewDialog: document.getElementById("notesViewDialog"),
  notesViewBody: document.getElementById("notesViewBody"),
};

const PAGE_SIZE = 25;
let currentPage = 1;

let project = localStorage.getItem("kv_project_name") || "";
let entries = [];
let selectedId = null;
let pendingAction = null; // 'save' | 'export' | 'refresh'

// Pending notes for the current form (string, persisted on save/update)
let pendingNotes = "";

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

function nowMilitary() {
  const d = new Date();
  return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
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
attachTimeAssist(els.drainTime);
attachTimeAssist(els.controlTime);
attachTimeAssist(els.extinguishmentTime);
attachTimeAssist(els.burnbackTime);

function getBurnbackResult() {
  if (els.burnbackPass.checked) return "pass";
  if (els.burnbackFail.checked) return "fail";
  return "";
}
function setBurnbackResult(v) {
  els.burnbackPass.checked = v === "pass";
  els.burnbackFail.checked = v === "fail";
}

function updateNotesButton() {
  const hasNotes = !!(pendingNotes && pendingNotes.trim());
  els.btnNotes.classList.toggle("hasNotes", hasNotes);
  els.notesBtnLabel.textContent = hasNotes ? "Edit notes" : "Add notes";
}

function getFormData(includeTime = false) {
  const d = {
    date: els.date.value || "",
    foam: els.foam.value || "",
    fuel: els.fuel.value || "",
    testType: els.testType.value || "",
    airTemp: els.airTemp.value || "",
    wind: els.wind.value || "",
    humidity: els.humidity.value || "",
    pressure: els.pressure.value || "",
    fuelTemp: els.fuelTemp.value || "",
    solutionTemp: els.solutionTemp.value || "",
    expansion: els.expansion.value || "",
    drainTime: normalizeTime(els.drainTime.value || ""),
    controlTime: normalizeTime(els.controlTime.value || ""),
    extinguishmentTime: normalizeTime(els.extinguishmentTime.value || ""),
    burnbackTime: normalizeTime(els.burnbackTime.value || ""),
    burnbackResult: getBurnbackResult(),
    notes: pendingNotes || "",
  };
  if (includeTime) d.savedTime = nowMilitary();
  return d;
}

function setFormData(d) {
  els.date.value = d?.date || "";
  els.foam.value = d?.foam || "";
  els.fuel.value = d?.fuel || "";
  els.testType.value = d?.testType || "";
  els.airTemp.value = d?.airTemp || "";
  els.wind.value = d?.wind || "";
  els.humidity.value = d?.humidity || "";
  els.pressure.value = d?.pressure || "";
  els.fuelTemp.value = d?.fuelTemp || "";
  els.solutionTemp.value = d?.solutionTemp || "";
  els.expansion.value = d?.expansion || "";
  els.drainTime.value = d?.drainTime || "";
  els.controlTime.value = d?.controlTime || "";
  els.extinguishmentTime.value = d?.extinguishmentTime || "";
  els.burnbackTime.value = d?.burnbackTime || "";
  setBurnbackResult(d?.burnbackResult || "");
  pendingNotes = d?.notes || "";
  updateNotesButton();
}

function clearForm() {
  setFormData({});
  els.testType.value = "";
  setTodayIfEmpty();
  selectRow(null);
}

// Copy entry → new blank form with foam, test type, solution temp pre-filled
function copyEntry(sourceEntry) {
  clearForm();
  els.foam.value = sourceEntry?.foam || "";
  els.testType.value = sourceEntry?.testType || "";
  els.solutionTemp.value = sourceEntry?.solutionTemp || "";
  // Ensure we're creating a new entry, not editing
  selectRow(null);
  setStatus("Copied Foam, Test Type, and Solution Temp. Ready for new entry.");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPagination() {
  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const pag = els.pagination;
  if (!pag) return;
  pag.innerHTML = "";
  if (totalPages <= 1) return;

  const info = document.createElement("span");
  info.className = "pagInfo";
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);
  info.textContent = `${start}–${end} of ${total}`;

  const prev = document.createElement("button");
  prev.className = "btn ghost pagBtn";
  prev.type = "button";
  prev.textContent = "← Prev";
  prev.disabled = currentPage === 1;
  prev.addEventListener("click", () => { currentPage--; renderTable(); });

  const next = document.createElement("button");
  next.className = "btn ghost pagBtn";
  next.type = "button";
  next.textContent = "Next →";
  next.disabled = currentPage === totalPages;
  next.addEventListener("click", () => { currentPage++; renderTable(); });

  pag.appendChild(prev);
  pag.appendChild(info);
  pag.appendChild(next);
}

function resultCell(r) {
  if (r === "pass") return `<span class="resultIcon pass" title="Pass">✓</span>`;
  if (r === "fail") return `<span class="resultIcon fail" title="Fail">✕</span>`;
  return `<span class="notesCellEmpty">—</span>`;
}

function notesCell(e) {
  const has = !!(e.notes && e.notes.trim());
  if (has) {
    return `<button class="notesCellBtn hasNotes" data-act="viewNotes" type="button" title="View notes">📝 View</button>`;
  }
  return `<span class="notesCellEmpty">—</span>`;
}

function renderTable(preserveScroll = false) {
  const tableWrap = document.querySelector(".tableWrap");
  const scrollX = tableWrap ? tableWrap.scrollLeft : 0;
  const scrollY = window.scrollY;

  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageEntries = entries.slice(start, start + PAGE_SIZE);

  els.tbody.innerHTML = "";
  for (const e of pageEntries) {
    const tr = document.createElement("tr");
    tr.dataset.id = e.id;
    tr.innerHTML = `
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.savedTime || "")}</td>
      <td>${escapeHtml(e.foam)}</td>
      <td>${escapeHtml(e.fuel)}</td>
      <td>${escapeHtml(e.testType)}</td>
      <td>${escapeHtml(e.airTemp)}</td>
      <td>${escapeHtml(e.wind)}</td>
      <td>${escapeHtml(e.humidity)}</td>
      <td>${escapeHtml(e.pressure)}</td>
      <td>${escapeHtml(e.fuelTemp)}</td>
      <td>${escapeHtml(e.solutionTemp)}</td>
      <td>${escapeHtml(e.expansion)}</td>
      <td>${escapeHtml(e.drainTime)}</td>
      <td>${escapeHtml(e.controlTime)}</td>
      <td>${escapeHtml(e.extinguishmentTime)}</td>
      <td>${escapeHtml(e.burnbackTime)}</td>
      <td>${resultCell(e.burnbackResult || "")}</td>
      <td>${notesCell(e)}</td>
      <td>
        <div class="rowActions">
          <button class="btn ghost" data-act="edit" type="button">Edit</button>
          <button class="btn ghost" data-act="copy" type="button">Copy</button>
          <button class="btn danger ghost" data-act="delete" type="button">Del</button>
        </div>
      </td>
    `;

    tr.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (btn) return;
      selectRow(e.id);
    });

    tr.querySelector('[data-act="edit"]').addEventListener("click", (ev) => {
      ev.stopPropagation();
      // Preserve scroll position when loading row into form
      const savedScrollY = window.scrollY;
      const savedScrollX = tableWrap ? tableWrap.scrollLeft : 0;
      setFormData(e);
      selectRow(e.id);
      // Restore scroll on next frame (after any focus/reflow). Two-arg scrollTo is always instant.
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
        if (tableWrap) tableWrap.scrollLeft = savedScrollX;
      });
      setStatus("Loaded row for editing.");
    });

    tr.querySelector('[data-act="copy"]').addEventListener("click", (ev) => {
      ev.stopPropagation();
      const savedScrollY = window.scrollY;
      const savedScrollX = tableWrap ? tableWrap.scrollLeft : 0;
      copyEntry(e);
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
        if (tableWrap) tableWrap.scrollLeft = savedScrollX;
      });
    });

    tr.querySelector('[data-act="delete"]').addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await deleteEntry(e.id);
    });

    const viewNotesBtn = tr.querySelector('[data-act="viewNotes"]');
    if (viewNotesBtn) {
      viewNotesBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openNotesViewer(e);
      });
    }

    els.tbody.appendChild(tr);
  }
  selectRow(selectedId);
  renderPagination();

  if (preserveScroll) {
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
      if (tableWrap) tableWrap.scrollLeft = scrollX;
    });
  }
}

async function refresh(preserveScroll = false) {
  if (!ensureProject(false, "refresh")) {
    entries = [];
    renderTable(preserveScroll);
    return;
  }
  try {
    const data = await api(`/api/entries?project=${encodeURIComponent(project)}`);
    entries = Array.isArray(data.entries) ? data.entries : [];
    renderTable(preserveScroll);
  } catch (e) {
    setStatus(e.message, true);
    throw e;
  }
}

async function saveNewEntry() {
  if (!ensureProject(true, "save")) return;

  const entry = getFormData(true);
  if (!entry.testType) return setStatus("Select Test Type.", true);

  if (els.drainTime.value) els.drainTime.value = entry.drainTime || els.drainTime.value;
  if (els.controlTime.value) els.controlTime.value = entry.controlTime || els.controlTime.value;
  if (els.extinguishmentTime.value) els.extinguishmentTime.value = entry.extinguishmentTime || els.extinguishmentTime.value;
  if (els.burnbackTime.value) els.burnbackTime.value = entry.burnbackTime || els.burnbackTime.value;

  try {
    setStatus("Saving…");
    await api(`/api/entries?project=${encodeURIComponent(project)}`, {
      method: "POST",
      body: JSON.stringify({ entry }),
    });
    await refresh();
    clearForm();
    setStatus("Saved.");
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function updateEntry() {
  if (!ensureProject(true, "save")) return;
  if (!selectedId) return;

  const entry = getFormData(false);
  if (!entry.testType) return setStatus("Select Test Type.", true);

  const orig = entries.find(x => x.id === selectedId);
  if (orig?.savedTime) entry.savedTime = orig.savedTime;

  try {
    setStatus("Updating…");
    await api(`/api/entries?project=${encodeURIComponent(project)}&id=${encodeURIComponent(selectedId)}`, {
      method: "PUT",
      body: JSON.stringify({ entry }),
    });
    // preserve scroll so the user doesn't lose their place in the table
    await refresh(true);
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

  const ok = confirm(`Delete this row?\n${label}`);
  if (!ok) return;

  try {
    setStatus("Deleting…");
    await api(`/api/entries?project=${encodeURIComponent(project)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (selectedId === id) selectedId = null;
    await refresh(true);
    if (selectedId === null) clearForm();
    setStatus("Deleted.");
  } catch (e) {
    setStatus(e.message, true);
  }
}

// Notes dialogs
function openNotesEditor() {
  els.notesInput.value = pendingNotes || "";
  els.notesDialog.showModal();
  // Move cursor to end
  const val = els.notesInput.value;
  els.notesInput.focus();
  els.notesInput.setSelectionRange(val.length, val.length);
}

function openNotesViewer(entry) {
  els.notesViewBody.textContent = entry.notes || "";
  els.notesViewDialog.showModal();
}

// CSV Export
function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function entriesToCsv(rows) {
  const headers = [
    "Date","Time","Foam","Fuel","Test Type",
    "Air Temp","Wind","Humidity","Pressure",
    "Fuel Temp","Solution Temp","Expansion",
    "Drain Time","Control","Extinguishment","Burnback","Result","Notes"
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [
      r.date, r.savedTime||"", r.foam, r.fuel, r.testType,
      r.airTemp, r.wind, r.humidity||"", r.pressure||"",
      r.fuelTemp, r.solutionTemp, r.expansion||"",
      r.drainTime||"", r.controlTime, r.extinguishmentTime, r.burnbackTime||"",
      r.burnbackResult||"", r.notes||""
    ].map(csvCell);
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

// Ambient Weather – fetch avg air temp, max wind, avg humidity & pressure over past 10 minutes
const AW_API_KEY = "dc0e8073e5c54e27bb919e6d37435e3e0cab0f73e98d41bd815b879bf551d5ff";
const AW_APP_KEY = "0b623f64f3954e4db7f3cb9a5d5ce4f1bac3e8652d2347f5bc2caac1cbf61938";
const AW_MAC = "24:D7:EB:EB:99:5F";

async function fetchAmbientTemp() {
  els.btnFetchTemp.disabled = true;
  setStatus("Fetching weather station data…");
  try {
    const url = `https://rt.ambientweather.net/v1/devices/${encodeURIComponent(AW_MAC)}` +
      `?apiKey=${AW_API_KEY}&applicationKey=${AW_APP_KEY}&limit=12`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Ambient Weather API error ${res.status}: ${txt.slice(0, 120)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("No data returned from station.");

    const cutoff = Date.now() - 10 * 60 * 1000;
    const recent = data.filter(d => {
      const ts = d.dateutc ?? d.date;
      return ts && new Date(ts).getTime() >= cutoff;
    });

    const pool = recent.length > 0 ? recent : [data[0]];

    // Temperature — avg
    const temps = pool.map(d => d.tempf).filter(t => typeof t === "number");
    if (temps.length === 0) throw new Error("No temperature readings found.");
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    els.airTemp.value = avgTemp.toFixed(1);

    // Wind — max
    const winds = pool.map(d => d.windspeedmph).filter(w => typeof w === "number");
    if (winds.length > 0) {
      const maxWind = Math.max(...winds);
      els.wind.value = maxWind.toFixed(1);
    }

    // Humidity — avg (outdoor humidity)
    const hums = pool.map(d => d.humidity).filter(h => typeof h === "number");
    if (hums.length > 0) {
      const avgHum = hums.reduce((a, b) => a + b, 0) / hums.length;
      els.humidity.value = avgHum.toFixed(0);
    }

    // Barometric pressure — avg (relative/sea-level, inHg). Fallback to absolute.
    const pressures = pool
      .map(d => (typeof d.baromrelin === "number" ? d.baromrelin : (typeof d.baromabsin === "number" ? d.baromabsin : null)))
      .filter(p => typeof p === "number");
    if (pressures.length > 0) {
      const avgPressure = pressures.reduce((a, b) => a + b, 0) / pressures.length;
      els.pressure.value = avgPressure.toFixed(2);
    }

    const label = recent.length > 0
      ? `Weather set: avg temp, max wind, avg humidity & pressure over last 10 min.`
      : `Weather set from most recent reading (no data in last 10 min).`;
    setStatus(label);
  } catch (e) {
    console.error(e);
    setStatus(`Weather fetch failed: ${e.message}`, true);
  } finally {
    els.btnFetchTemp.disabled = false;
  }
}

els.btnFetchTemp.addEventListener("click", fetchAmbientTemp);

// Notes button (entry form)
els.btnNotes.addEventListener("click", openNotesEditor);

// Notes dialog close
els.notesDialog.addEventListener("close", () => {
  if (els.notesDialog.returnValue === "ok") {
    pendingNotes = els.notesInput.value || "";
    updateNotesButton();
    const hasNotes = !!(pendingNotes && pendingNotes.trim());
    setStatus(hasNotes ? "Notes saved to entry." : "Notes cleared.");
  }
});

// Pass/Fail clear button
els.btnClearResult.addEventListener("click", () => {
  setBurnbackResult("");
});

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
  updateNotesButton();

  let apiOk = true;
  try { await api("/api/ping", { method: "GET" }); }
  catch (e) { console.error(e); apiOk = false; setStatus(`API not reachable: ${e.message}`, true); }

  if (apiOk) {
    try {
      await refresh();
      if (els.statusBar.dataset.error !== "1") setStatus("Ready.");
    } catch (e) {
      // error already shown by refresh()
    }
  }
})();
