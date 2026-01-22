// Rev 1 – Fix: Save working (KV API included), center layout, placeholders updated.
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

function ensureProject(promptIfMissing = true) {
  if (project) return true;
  if (!promptIfMissing) return false;

  const p = sanitizeProjectName(prompt("Sync Name (this is the shared name used across devices):") || "");
  if (!p) {
    setStatus("Sync Name is required to save/sync.", true);
    return false;
  }
  project = p;
  localStorage.setItem("kv_project_name", project);
  renderProject();
  return true;
}

function renderProject() {
  els.projectLabel.textContent = project || "Not set";
}

function normalizeTime(s) {
  const t = String(s).trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? `${Number(m[1])}:${m[2]}` : "";
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
  // reset dropdown placeholder
  els.testType.value = "";
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
          <button class="ghost" data-act="edit" type="button">Edit</button>
          <button class="danger ghost" data-act="delete" type="button">Delete</button>
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
  if (!entry.testType) {
    setStatus("Select Test Type.", true);
    return;
  }

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
  if (!entry.testType) {
    setStatus("Select Test Type.", true);
    return;
  }

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

els.btnSave.addEventListener("click", saveNewEntry);
els.btnEdit.addEventListener("click", updateEntry);
els.btnDeleteTop.addEventListener("click", async () => {
  if (!selectedId) return;
  await deleteEntry(selectedId);
});
els.btnClear.addEventListener("click", () => {
  clearForm();
  setStatus("Cleared.");
});

els.btnSetProject.addEventListener("click", async () => {
  const p = sanitizeProjectName(prompt("Sync Name (shared name used across devices):", project) || "");
  if (!p) return;
  project = p;
  localStorage.setItem("kv_project_name", project);
  renderProject();
  clearForm();
  await refresh();
  setStatus("Sync Name updated.");
});

els.btnExportCsv.addEventListener("click", exportCsv);

function setTodayIfEmpty() {
  if (!els.date.value) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    els.date.value = `${yyyy}-${mm}-${dd}`;
  }
}

function attachTimeAssist(inputEl) {
  inputEl.addEventListener("input", () => {
    inputEl.value = inputEl.value.replace(/[^\d:]/g, "").slice(0, 5);
  });
  inputEl.addEventListener("blur", () => {
    const n = normalizeTime(inputEl.value);
    if (inputEl.value && !n) {
      setStatus("Time must be mm:ss (e.g., 0:33).", true);
    } else if (n) {
      inputEl.value = n;
    }
  });
}

attachTimeAssist(els.controlTime);
attachTimeAssist(els.extinguishmentTime);

(async () => {
  renderProject();
  setTodayIfEmpty();
  await refresh();
  setStatus("Ready.");
})();
