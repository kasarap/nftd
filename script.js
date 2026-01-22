// Rev 5 – Mobile-safe date entry (text-based), auto-format + default today.
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

  syncDialog: document.getElementById("syncDialog"),
  syncNameInput: document.getElementById("syncNameInput"),
  syncCancel: document.getElementById("syncCancel"),
  syncSave: document.getElementById("syncSave"),
};

let project = localStorage.getItem("kv_project_name") || "";
let entries = [];
let selectedId = null;

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.dataset.error = isError ? "1" : "0";
}

function sanitizeProjectName(s) {
  if (!s) return "";
  return String(s).trim().replace(/\s+/g, " ").slice(0, 80).replace(/[^\w .\-]/g, "");
}

function renderProject() {
  els.projectLabel.textContent = project || "Not set";
}

function openSyncDialog(prefill = "") {
  try {
    els.syncNameInput.value = prefill || project || "";
    els.syncDialog.showModal();
    els.syncNameInput.focus();
  } catch {
    // Fallback if dialog not supported
    const p = sanitizeProjectName(prompt("Sync Name (shared name used across devices):", project) || "");
    if (p) {
      project = p;
      localStorage.setItem("kv_project_name", project);
      renderProject();
      refresh();
    }
  }
}

function ensureProject(promptIfMissing = true) {
  if (project) return true;
  if (!promptIfMissing) return false;

  openSyncDialog("");
  setStatus("Set Sync Name to save/sync.", true);
  return false;
}

function digitsToTime(digits) {
  const s = String(digits).replace(/\D/g, "");
  if (!s) return "";
  if (s.length === 1) return `0:0${s}`;
  if (s.length === 2) return `0:${s}`;
  if (s.length === 3) return `${Number(s.slice(0, 1))}:${s.slice(1)}`;
  // 4+ digits -> take first 2 as minutes, last 2 as seconds
  const mm = Number(s.slice(0, 2));
  const ss = s.slice(2, 4);
  return `${mm}:${ss}`;
}

function normalizeTime(val) {
  const raw = String(val ?? "").trim();
  if (!raw) return "";
  if (/^\d{1,2}:\d{2}$/.test(raw)) return raw.replace(/^0+(\d)/, "$1");
  const t = digitsToTime(raw);
  if (!t) return "";
  // validate seconds 00-59
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const sec = Number(m[2]);
  if (sec > 59) return "";
  return `${Number(m[1])}:${m[2]}`;
}

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

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

function selectRow(id) {
  selectedId = id;
  els.btnEdit.disabled = !selectedId;
  els.btnDeleteTop.disabled = !selectedId;

  [...els.tbody.querySelectorAll("tr")].forEach(tr => {
    tr.classList.toggle("selected", tr.dataset.id === selectedId);
  });
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
  if (!ensureProject(false)) {
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
  if (!ensureProject(true)) return;

  const entry = getFormData();
  if (!entry.testType) return setStatus("Select Test Type.", true);

  // If user typed digits, normalize into mm:ss in the UI
  if (els.controlTime.value) els.controlTime.value = entry.controlTime || els.controlTime.value;
  if (els.extinguishmentTime.value) els.extinguishmentTime.value = entry.extinguishmentTime || els.extinguishmentTime.value;

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
  if (!ensureProject(true)) return;
  if (!selectedId) return;

  const entry = getFormData();
  if (!entry.testType) return setStatus("Select Test Type.", true);

  try {
    setStatus("Updating…");
    await api(`/api/entries?project=${encodeURIComponent(project)}&id=${encodeURIComponent(selectedId)}`, {
      method: "PUT",
      body: JSON.stringify({ entry }),
    });
    await refresh();
    clearForm();
    setStatus("Updated.");
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function deleteEntry(id) {
  if (!ensureProject(true)) return;

  const entry = entries.find(x => x.id === id);
  const label = entry ? `${entry.date || "No date"} / ${entry.foam || "Foam"} / ${entry.fuel || "Fuel"}` : id;

  const ok = confirm(`Delete this row?\n${label}`);
  if (!ok) return;

  try {
    setStatus("Deleting…");
    await api(`/api/entries?project=${encodeURIComponent(project)}&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
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
  const headers = [
    "Date","Foam","Fuel","Test Type","Air Temp","Wind","Fuel Temp","Solution Temp","Control Time","Extinguishment Time"
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [
      r.date, r.foam, r.fuel, r.testType, r.airTemp, r.wind, r.fuelTemp, r.solutionTemp, r.controlTime, r.extinguishmentTime
    ].map(csvCell);
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

async function exportCsv() {
  if (!ensureProject(true)) return;

  try {
    setStatus("Exporting…");
    const data = await api(`/api/entries/export?project=${encodeURIComponent(project)}`);
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
    setStatus(e.message, true);
  }
}

// Button wiring
els.btnSave.addEventListener("click", saveNewEntry);
els.btnEdit.addEventListener("click", updateEntry);
els.btnDeleteTop.addEventListener("click", async () => selectedId && deleteEntry(selectedId));
els.btnClear.addEventListener("click", () => { clearForm(); setStatus("Cleared."); });
els.btnExportCsv.addEventListener("click", exportCsv);
els.btnSetProject.addEventListener("click", () => openSyncDialog(project));

// Sync dialog behavior
els.syncDialog.addEventListener("close", async () => {
  if (els.syncDialog.returnValue !== "ok") return;
  const p = sanitizeProjectName(els.syncNameInput.value || "");
  if (!p) return setStatus("Sync Name is required.", true);

  project = p;
  localStorage.setItem("kv_project_name", project);
  renderProject();
  clearForm();
  await refresh();
  setStatus("Sync Name set.");
});

function setTodayIfEmpty() {
  if (!els.date.value) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    els.date.value = `${yyyy}-${mm}-${dd}`;
  }
}-${mm}-${dd}`;
  }
}

// Time auto-format: if you type 122 -> 1:22; 33 -> 0:33; 5 -> 0:05; 1234 -> 12:34
function attachTimeAssist(inputEl) {
  inputEl.addEventListener("input", () => {
    // keep digits and colon while typing
    inputEl.value = inputEl.value.replace(/[^\d:]/g, "").slice(0, 5);
  });
  inputEl.addEventListener("blur", () => {
    const n = normalizeTime(inputEl.value);
    if (inputEl.value && !n) {
      setStatus("Time must be mm:ss (e.g., 0:33) or digits (e.g., 122).", true);
      return;
    }
    if (n) inputEl.value = n;
  });
}

attachTimeAssist(els.controlTime);
attachTimeAssist(els.extinguishmentTime);

function attachDateAssist(inputEl) {
  inputEl.addEventListener("input", () => {
    let v = inputEl.value.replace(/[^\d]/g, "");
    if (v.length > 8) v = v.slice(0, 8);

    if (v.length >= 5 && v.length <= 6) {
      v = v.slice(0,4) + "-" + v.slice(4);
    } else if (v.length >= 7) {
      v = v.slice(0,4) + "-" + v.slice(4,6) + "-" + v.slice(6);
    }
    inputEl.value = v;
  });

  inputEl.addEventListener("blur", () => {
    const m = inputEl.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      setStatus("Date must be YYYY-MM-DD.", true);
    }
  });
}

attachDateAssist(els.date);


(async () => {
  renderProject();
  setTodayIfEmpty();
  await refresh();
  setStatus("Ready.");
})();
