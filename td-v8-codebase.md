# TD v8 Codebase Reference

## Version
v8

## What changed in v8
- **MIL Timer popup** (`⏱ Timer` button in form): 4-phase sequence:
  1. Pre-burn: 10s countdown → auto-advance
  2. Control: 90s count-UP → Extinguishment button logs split time and hides itself, timer keeps counting to 1:30 → auto-advances to drain
  3. Place Burnback Pot: 45s countdown → auto-advance
  4. Burnback: count-up → 25% Burnback button logs time → complete
  "Log to Entry" writes Extinguishment and Burnback times into form fields.
- **MIL fuel buttons**: when Test Type = MIL, the Fuel text input (`#fuel`, still the stored value) is hidden and replaced by `#fuelBtns` (Unld 1, Unld 2, Jet 1, Jet 2). Driven by `syncFuelUI()` (called from `setFormData()`, `copyEntry()`, and the `testType` change listener). Switching to MIL clears any fuel not matching `^(Unld|Jet) [12]$`. No backend/CSV changes — value is still `fuel`.
- **Weather fetch fix**: switched from MAC-specific `/devices/{MAC}?limit=12` to `/devices` (all devices on account), reads `lastData` from matching MAC or first device. Better error messages for 429, 401/403.

## Four versioning touchpoints (update all simultaneously on version bump)
1. `td-vN.zip` filename
2. `script.js` header comment (line 1)
3. Version pill in `index.html` (`<span class="pill">vN</span>`)
4. Cache-buster in `index.html` (`script.js?v=vN`)

## Field propagation checklist (for any new field addition)
- [ ] `index.html` — form input element
- [ ] `script.js` `els` object
- [ ] `getFormData()`
- [ ] `setFormData()`
- [ ] `renderTable()` — table cell
- [ ] `index.html` — `<th>` table header
- [ ] `entriesToCsv()` — headers array + values array
- [ ] `functions/api/entries.js` — `normalizeEntry()`
- [ ] `functions/api/entries/export.js` — if it has its own normalize

## Critical rules
- `btnSave` MUST remain in `els` — removing it breaks all button wiring including the sync dialog
- Backend `normalizeEntry()` must be updated for every new field or it will silently strip data

## Files

### index.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Test Entry Log</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="wrap">
    <header class="header">
      <div class="headerLeft">
        <h1>Test Entry Log</h1>
        <div class="meta">
          <span>Sync Name:</span>
          <span id="projectLabel" class="pill">Not set</span>
          <button id="btnSetProject" class="linkbtn" type="button">Change</button>
        </div>
      </div>

      <div class="headerRight">
        <button id="btnExportCsv" class="btn ghost" type="button">Export to CSV</button>
      </div>
    </header>

    <section class="card">
      <div class="entryGrid">
        <div class="field">
          <div class="lbl">Date</div>
          <input id="date" type="date" />
        </div>

        <div class="field">
          <div class="lbl">Foam</div>
          <input id="foam" type="text" />
        </div>

        <div class="field">
          <div class="lbl">Fuel</div>
          <input id="fuel" type="text" />
          <div id="fuelBtns" class="fuelBtns" hidden>
            <button type="button" class="btn ghost fuelBtn" data-fuel="Unld 1">Unld 1</button>
            <button type="button" class="btn ghost fuelBtn" data-fuel="Unld 2">Unld 2</button>
            <button type="button" class="btn ghost fuelBtn" data-fuel="Jet 1">Jet 1</button>
            <button type="button" class="btn ghost fuelBtn" data-fuel="Jet 2">Jet 2</button>
          </div>
        </div>

        <div class="field">
          <div class="lbl">Test Type</div>
          <select id="testType">
            <option value="" selected disabled>Test Type</option>
            <option value="Sprinkler">Sprinkler</option>
            <option value="Type II">Type II</option>
            <option value="Type III">Type III</option>
            <option value="MIL">MIL</option>
          </select>
        </div>

        <div class="field">
          <div class="lbl">Air Temp</div>
          <div class="airTempRow">
            <input id="airTemp" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
            <button id="btnFetchTemp" class="btn ghost tempBtn" type="button" title="Fetch air temp, wind, humidity, pressure &amp; dew point from last 10 min">🌡️</button>
          </div>
        </div>

        <div class="field">
          <div class="lbl">Wind</div>
          <input id="wind" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
        </div>

        <div class="field">
          <div class="lbl">Humidity</div>
          <input id="humidity" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
        </div>

        <div class="field">
          <div class="lbl">Pressure</div>
          <input id="pressure" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
        </div>

        <div class="field">
          <div class="lbl">Dew Point</div>
          <input id="dewPoint" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
        </div>

        <div class="field">
          <div class="lbl">Fuel Temp</div>
          <input id="fuelTemp" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
        </div>

        <div class="field">
          <div class="lbl">Solution Temp</div>
          <input id="solutionTemp" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
        </div>

        <div class="field">
          <div class="lbl">Expansion</div>
          <input id="expansion" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" />
        </div>

        <div class="field">
          <div class="lbl">Drain Time</div>
          <input id="drainTime" type="text" inputmode="numeric" />
        </div>

        <div class="field">
          <div class="lbl">Control</div>
          <input id="controlTime" type="text" inputmode="numeric" />
        </div>

        <div class="field">
          <div class="lbl">Extinguishment</div>
          <input id="extinguishmentTime" type="text" inputmode="numeric" />
        </div>

        <div class="field">
          <div class="lbl">Burnback</div>
          <input id="burnbackTime" type="text" inputmode="numeric" />
        </div>

        <div class="field">
          <div class="lbl">Burnback Result</div>
          <div class="passFailRow">
            <label class="passFailOpt">
              <input type="radio" name="burnbackResult" id="burnbackPass" value="pass" />
              <span class="passFailLbl pass">Pass</span>
            </label>
            <label class="passFailOpt">
              <input type="radio" name="burnbackResult" id="burnbackFail" value="fail" />
              <span class="passFailLbl fail">Fail</span>
            </label>
            <button id="btnClearResult" class="linkbtn" type="button" title="Clear pass/fail">×</button>
          </div>
        </div>

        <div class="field">
          <div class="lbl">Notes</div>
          <button id="btnNotes" class="btn ghost notesBtn" type="button">
            <span id="notesIndicator" class="notesIndicator" aria-hidden="true"></span>
            <span id="notesBtnLabel">Add notes</span>
          </button>
        </div>

        <div class="buttons">
          <button id="btnSave" class="btn primary" type="button">Save</button>
          <button id="btnEdit" class="btn ghost" type="button" disabled>Update</button>
          <button id="btnDeleteTop" class="btn danger ghost" type="button" disabled>Delete</button>
          <button id="btnClear" class="btn ghost" type="button">Clear</button>
          <button id="btnTimer" class="btn ghost timerBtn" type="button">⏱ Timer</button>
        </div>
      </div>

      <div id="statusBar" class="statusBar" data-error="0">
        <div class="statusBarInner">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="statusDot" aria-hidden="true"></span>
            <span id="status" class="statusText">Loading…</span>
          </div>
          <span class="pill">v8</span>
        </div>
      </div>

      <div class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Foam</th>
              <th>Fuel</th>
              <th>Test Type</th>
              <th>Air Temp</th>
              <th>Wind</th>
              <th>Humidity</th>
              <th>Pressure</th>
              <th>Dew Point</th>
              <th>Fuel Temp</th>
              <th>Solution Temp</th>
              <th>Expansion</th>
              <th>Drain Time</th>
              <th>Control</th>
              <th>Extinguishment</th>
              <th>Burnback</th>
              <th>Result</th>
              <th>Notes</th>
              <th class="actionsCol">Actions</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <div id="pagination" class="pagination"></div>
    </section>
  </main>

  <dialog id="syncDialog" class="dialog">
    <form method="dialog" class="dialogCard">
      <h2>Set Sync Name</h2>
      <p>This name is used to sync entries across devices.</p>
      <input id="syncNameInput" type="text" placeholder="e.g., JLC219AN Jan 21" autocomplete="off" />
      <div class="dialogBtns">
        <button class="btn ghost" value="cancel" type="submit">Cancel</button>
        <button class="btn primary" value="ok" type="submit">Save</button>
      </div>
    </form>
  </dialog>

  <dialog id="notesDialog" class="dialog">
    <form method="dialog" class="dialogCard">
      <h2 id="notesDialogTitle">Notes</h2>
      <p id="notesDialogHint">Add any observations or comments for this test.</p>
      <textarea id="notesInput" rows="6" placeholder="e.g., Slight breeze mid-test, ignition delayed…"></textarea>
      <div class="dialogBtns">
        <button class="btn ghost" value="cancel" type="submit">Cancel</button>
        <button class="btn primary" value="ok" type="submit">Save</button>
      </div>
    </form>
  </dialog>

  <dialog id="notesViewDialog" class="dialog">
    <form method="dialog" class="dialogCard">
      <h2>Notes</h2>
      <pre id="notesViewBody" class="notesView"></pre>
      <div class="dialogBtns">
        <button class="btn primary" value="ok" type="submit">Close</button>
      </div>
    </form>
  </dialog>

  <dialog id="timerDialog" class="dialog timerDialogWide">
    <div class="dialogCard timerDialogCard">
      <div class="timerDialogHeader">
        <h2>MIL Timer</h2>
        <button id="btnTimerClose" class="linkbtn timerCloseBtn" type="button" aria-label="Close">✕</button>
      </div>

      <div class="timerPhaseDots" id="timerPhaseDots"></div>
      <p class="timerPhaseLabel" id="timerPhaseLabel">Ready</p>

      <div class="timerMainRow">
        <div class="timerBigTime" id="timerBigTime">0:10</div>
        <div class="timerTotalBlock">
          <div class="timerTotalLabel">Total</div>
          <div class="timerTotalTime" id="timerTotalTime">0:00</div>
        </div>
      </div>

      <p class="timerSubLabel" id="timerSubLabel">Press Start to begin pre-burn</p>
      <div class="timerProgressBar"><div class="timerProgressFill" id="timerProgressFill" style="width:100%"></div></div>

      <div id="timerResults" style="display:none">
        <hr class="timerDivider">
        <div id="timerResultRows"></div>
        <hr class="timerDivider">
      </div>

      <button class="btn primary timerActionBtn" id="timerMainBtn" type="button">Start</button>
      <button class="btn ghost timerActionBtn timerAuxBtn" id="timerAuxBtn" type="button" style="display:none"></button>

      <div class="timerDialogBtns">
        <button class="btn ghost" id="btnTimerReset" type="button">Reset</button>
        <button class="btn primary" id="btnTimerLog" type="button" disabled>Log to Entry</button>
      </div>
    </div>
  </dialog>

  <script defer src="script.js?v=v8"></script>
</body>
</html>
```
-e 
### script.js

```js
// v8 – MIL Timer popup: 10s pre-burn → 90s extinguishment countdown → 45s place burnback pot → burnback count-up.
//      Extinguishment and burnback times logged into form fields on "Log to Entry".
//      v7: Added Dew Point field: pulled from Ambient Weather API (dewPoint), included in form/table/CSV export.
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
  dewPoint: document.getElementById("dewPoint"),
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

  btnTimer: document.getElementById("btnTimer"),
  timerDialog: document.getElementById("timerDialog"),
  btnTimerClose: document.getElementById("btnTimerClose"),
  timerPhaseDots: document.getElementById("timerPhaseDots"),
  timerPhaseLabel: document.getElementById("timerPhaseLabel"),
  timerBigTime: document.getElementById("timerBigTime"),
  timerTotalTime: document.getElementById("timerTotalTime"),
  timerSubLabel: document.getElementById("timerSubLabel"),
  timerProgressFill: document.getElementById("timerProgressFill"),
  timerResults: document.getElementById("timerResults"),
  timerResultRows: document.getElementById("timerResultRows"),
  timerMainBtn: document.getElementById("timerMainBtn"),
  timerAuxBtn: document.getElementById("timerAuxBtn"),
  btnTimerReset: document.getElementById("btnTimerReset"),
  btnTimerLog: document.getElementById("btnTimerLog"),

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
    dewPoint: els.dewPoint.value || "",
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
  els.dewPoint.value = d?.dewPoint || "";
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
  syncFuelUI();
}

// MIL tests: replace the free-text Fuel input with Unld 1/2, Jet 1/2 buttons
function syncFuelUI() {
  const mil = els.testType.value === "MIL";
  const btns = document.getElementById("fuelBtns");
  els.fuel.hidden = mil;
  btns.hidden = !mil;
  btns.querySelectorAll(".fuelBtn").forEach(b =>
    b.classList.toggle("active", b.dataset.fuel === els.fuel.value));
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
  syncFuelUI();
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
      <td>${escapeHtml(e.dewPoint)}</td>
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
    "Air Temp","Wind","Humidity","Pressure","Dew Point",
    "Fuel Temp","Solution Temp","Expansion",
    "Drain Time","Control","Extinguishment","Burnback","Result","Notes"
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [
      r.date, r.savedTime||"", r.foam, r.fuel, r.testType,
      r.airTemp, r.wind, r.humidity||"", r.pressure||"", r.dewPoint||"",
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
    // Fetch all devices on the account — more reliable than hitting the MAC-specific endpoint
    const url = `https://rt.ambientweather.net/v1/devices` +
      `?apiKey=${AW_API_KEY}&applicationKey=${AW_APP_KEY}`;
    const res = await fetch(url);
    if (res.status === 429) throw new Error("Rate limited by Ambient Weather — wait 1 min and try again.");
    if (res.status === 401 || res.status === 403) throw new Error("Ambient Weather API key rejected (401/403). Re-generate keys at ambientweather.net.");
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Ambient Weather API error ${res.status}: ${txt.slice(0, 120)}`);
    }
    const devices = await res.json();
    if (!Array.isArray(devices) || devices.length === 0) throw new Error("No devices found on this Ambient Weather account.");

    // Prefer the device matching our MAC, fall back to first device
    const macNorm = AW_MAC.toUpperCase();
    const device = devices.find(d => (d.macAddress || "").toUpperCase() === macNorm) || devices[0];
    const d = device.lastData;
    if (!d) throw new Error("Device found but has no lastData. Station may be offline.");

    // Temperature
    if (typeof d.tempf === "number") els.airTemp.value = d.tempf.toFixed(1);

    // Wind — use windspeedmph (current), gust if available
    if (typeof d.windspeedmph === "number") els.wind.value = d.windspeedmph.toFixed(1);

    // Humidity
    if (typeof d.humidity === "number") els.humidity.value = d.humidity.toFixed(0);

    // Barometric pressure — relative preferred, fallback absolute
    const pressure = typeof d.baromrelin === "number" ? d.baromrelin
                   : typeof d.baromabsin === "number" ? d.baromabsin : null;
    if (pressure !== null) els.pressure.value = pressure.toFixed(2);

    // Dew Point
    if (typeof d.dewPoint === "number") els.dewPoint.value = d.dewPoint.toFixed(1);

    const stationName = device.info?.name || device.macAddress || "station";
    setStatus(`Weather set from ${stationName} (most recent reading).`);
  } catch (e) {
    console.error(e);
    setStatus(`Weather fetch failed: ${e.message}`, true);
  } finally {
    els.btnFetchTemp.disabled = false;
  }
}

els.btnFetchTemp.addEventListener("click", fetchAmbientTemp);
els.testType.addEventListener("change", () => {
  // Drop a free-text fuel that isn't one of the MIL buttons
  if (els.testType.value === "MIL" && !/^(Unld|Jet) [12]$/.test(els.fuel.value)) els.fuel.value = "";
  syncFuelUI();
});
document.getElementById("fuelBtns").addEventListener("click", (ev) => {
  const b = ev.target.closest(".fuelBtn");
  if (!b) return;
  els.fuel.value = b.dataset.fuel;
  syncFuelUI();
});

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

// ── MIL Timer ────────────────────────────────────────────────────────────────
// Sequence:
//   Phase 0 – preBurn  : 10s countdown → auto-advance
//   Phase 1 – control  : 90s COUNT-UP → Extinguishment button logs time, auto-advance to drain
//   Phase 2 – drain    : 45s countdown → auto-advance
//   Phase 3 – burnback : count up → 25% Burnback button logs time, complete
//
// The 90s control window keeps counting after Extinguishment is pressed;
// it just logs the split and immediately chains to drain automatically.

const TIMER_PHASES = [
  { id: "preBurn",  label: "Pre-burn",          sub: "Pre-burn countdown"                       },
  { id: "control",  label: "Control",            sub: "Press Extinguishment when fire is out — counts to 1:30 then continues"    },
  { id: "drain",    label: "Place Burnback Pot", sub: "45 seconds to place burnback pot"         },
  { id: "burnback", label: "Burnback",           sub: "Press 25% Burnback when reached"          },
];

let timerPhase = 0;
let timerPhaseInterval = null;
let timerTotalInterval = null;
let timerElapsed = 0;       // seconds in current phase
let timerTotalElapsed = 0;  // total test seconds
let timerExtTime = 0;       // logged extinguishment time
let timerBurnbackTime = 0;  // logged burnback time
let timerStarted = false;

function timerFmt(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function timerSetFill(pct, cls) {
  const fill = els.timerProgressFill;
  fill.style.width = Math.max(0, Math.min(100, pct)) + "%";
  fill.className = "timerProgressFill" + (cls ? " " + cls : "");
}

function timerUpdateDots() {
  els.timerPhaseDots.innerHTML = TIMER_PHASES.map((p, i) => {
    const cls = "timerDot" + (i < timerPhase ? " done" : i === timerPhase ? " active" : "");
    return `<div class="${cls}" title="${p.label}"></div>`;
  }).join("");
}

function timerRenderPhase() {
  const p = TIMER_PHASES[timerPhase];
  els.timerPhaseLabel.textContent = p.label;
  els.timerSubLabel.textContent = p.sub;
  els.timerMainBtn.style.display = "none";
  els.timerAuxBtn.style.display = "none";

  if (p.id === "preBurn") {
    els.timerBigTime.textContent = "0:10";
    timerSetFill(100, "");
    els.timerMainBtn.style.display = "block";
    els.timerMainBtn.disabled = false;
    els.timerMainBtn.textContent = "Start";
  } else if (p.id === "control") {
    els.timerBigTime.textContent = "0:00";
    timerSetFill(0, "");
    els.timerAuxBtn.style.display = "block";
    els.timerAuxBtn.textContent = "Extinguishment";
    els.timerAuxBtn.className = "btn timerActionBtn timerAuxBtn timerAuxSuccess";
    els.timerAuxBtn.disabled = false;
  } else if (p.id === "drain") {
    els.timerBigTime.textContent = "0:45";
    timerSetFill(100, "");
  } else if (p.id === "burnback") {
    els.timerBigTime.textContent = "0:00";
    timerSetFill(0, "");
    els.timerAuxBtn.style.display = "block";
    els.timerAuxBtn.textContent = "25% Burnback";
    els.timerAuxBtn.className = "btn ghost timerActionBtn timerAuxBtn";
  }
  timerUpdateDots();
}

function timerStartTotal() {
  clearInterval(timerTotalInterval);
  timerTotalInterval = setInterval(() => {
    timerTotalElapsed += 0.1;
    els.timerTotalTime.textContent = timerFmt(timerTotalElapsed);
  }, 100);
}

function timerRunPhase() {
  const p = TIMER_PHASES[timerPhase];
  timerElapsed = 0;
  clearInterval(timerPhaseInterval);

  timerPhaseInterval = setInterval(() => {
    timerElapsed += 0.1;

    if (p.id === "preBurn") {
      const rem = 10 - timerElapsed;
      els.timerBigTime.textContent = timerFmt(rem);
      timerSetFill(rem / 10 * 100, rem <= 3 ? "danger" : rem <= 5 ? "warn" : "");
      if (rem <= 0) { clearInterval(timerPhaseInterval); timerPhaseInterval = null; timerAdvance(); }

    } else if (p.id === "control") {
      // Count UP to 90s — auto-advance at 90
      els.timerBigTime.textContent = timerFmt(timerElapsed);
      timerSetFill(Math.min(timerElapsed / 90 * 100, 100),
        timerElapsed >= 75 ? "danger" : timerElapsed >= 60 ? "warn" : "");
      if (timerElapsed >= 90) { clearInterval(timerPhaseInterval); timerPhaseInterval = null; timerAdvance(); }

    } else if (p.id === "drain") {
      const rem = 45 - timerElapsed;
      els.timerBigTime.textContent = timerFmt(Math.max(0, rem));
      timerSetFill(rem / 45 * 100, rem <= 10 ? "danger" : rem <= 15 ? "warn" : "");
      if (rem <= 0) { clearInterval(timerPhaseInterval); timerPhaseInterval = null; timerAdvance(); }

    } else if (p.id === "burnback") {
      // count UP — user presses 25% Burnback
      els.timerBigTime.textContent = timerFmt(timerElapsed);
      timerSetFill(Math.min(timerElapsed / 240 * 100, 99), "");
    }
  }, 100);
}

function timerAdvance() {
  timerPhase++;
  if (timerPhase >= TIMER_PHASES.length) { timerShowComplete(); return; }
  timerRenderPhase();
  timerRunPhase();
}

function timerLogResult(label, val) {
  els.timerResults.style.display = "block";
  const row = document.createElement("div");
  row.className = "timerResultRow";
  row.innerHTML = `<span>${label}</span><span>${timerFmt(val)}</span>`;
  els.timerResultRows.appendChild(row);
}

function timerShowComplete() {
  clearInterval(timerTotalInterval);
  els.timerPhaseLabel.textContent = "Test complete";
  els.timerBigTime.textContent = "✓";
  els.timerBigTime.style.fontSize = "48px";
  els.timerSubLabel.textContent = "All phases finished";
  timerSetFill(100, "");
  els.timerMainBtn.style.display = "none";
  els.timerAuxBtn.style.display = "none";
  els.btnTimerLog.disabled = false;
  timerUpdateDots();
}

function timerReset() {
  clearInterval(timerPhaseInterval); timerPhaseInterval = null;
  clearInterval(timerTotalInterval); timerTotalInterval = null;
  timerPhase = 0; timerElapsed = 0; timerTotalElapsed = 0;
  timerStarted = false; timerExtTime = 0; timerBurnbackTime = 0;
  els.timerBigTime.style.fontSize = "";
  els.timerTotalTime.textContent = "0:00";
  els.timerResults.style.display = "none";
  els.timerResultRows.innerHTML = "";
  els.btnTimerLog.disabled = true;
  timerRenderPhase();
}

// Timer button wiring
els.btnTimer.addEventListener("click", () => els.timerDialog.showModal());
els.btnTimerClose.addEventListener("click", () => els.timerDialog.close());

els.timerMainBtn.addEventListener("click", () => {
  timerStarted = true;
  els.timerMainBtn.disabled = true;
  els.timerMainBtn.textContent = "Running…";
  timerStartTotal();
  timerRunPhase();
});

els.timerAuxBtn.addEventListener("click", () => {
  const p = TIMER_PHASES[timerPhase];
  if (p.id === "control") {
    // Log the split time, hide the button — timer keeps counting to 90s then auto-advances
    timerExtTime = timerElapsed;
    timerLogResult("Extinguishment", timerExtTime);
    els.timerAuxBtn.style.display = "none";
    els.timerSubLabel.textContent = "Extinguishment logged — continuing to 1:30…";
  } else if (p.id === "burnback") {
    timerBurnbackTime = timerElapsed;
    clearInterval(timerPhaseInterval); timerPhaseInterval = null;
    timerLogResult("25% Burnback", timerBurnbackTime);
    timerAdvance();
  }
});

els.btnTimerReset.addEventListener("click", timerReset);

els.btnTimerLog.addEventListener("click", () => {
  if (timerExtTime > 0)      els.extinguishmentTime.value = timerFmt(timerExtTime);
  if (timerBurnbackTime > 0) els.burnbackTime.value       = timerFmt(timerBurnbackTime);
  els.timerDialog.close();
  setStatus("Extinguishment and Burnback times logged to entry.");
});

// Initialize timer UI
timerRenderPhase();
// ── End MIL Timer ─────────────────────────────────────────────────────────────

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
```
-e 
### styles.css

```css
:root{
  --bg:#f7f9fc;
  --card:#ffffff;
  --border:#d9e2ef;
  --text:#111827;
  --muted:#4b5563;
  --accent:#1a73e8;
  --accent2:#1558b0;
  --danger:#d93025;
  --success:#137333;
  --shadow: 0 10px 28px rgba(17,24,39,.10);
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}
*{ box-sizing:border-box; }
body{ margin:0; background:var(--bg); color:var(--text); }
.wrap{ width:min(1600px, calc(100vw - 24px)); margin:12px auto; }

.header{ display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px; }
.headerLeft{ display:grid; gap:4px; }
.header h1{ margin:0; font-size:20px; letter-spacing:.2px; }
.meta{ display:flex; align-items:center; gap:6px; font-size:12px; color:var(--muted); }

.pill{ display:inline-block; padding:3px 8px; border:1px solid var(--border); border-radius:999px; background:var(--card); font-size:11px; }
.linkbtn{ border:none; background:transparent; color:var(--accent); cursor:pointer; padding:0; font-size:12px; }

.card{ background:var(--card); border:1px solid var(--border); border-radius:12px; padding:10px; box-shadow:var(--shadow); }

.entryGrid{
  display:grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap:8px;
  align-items:end;
}

.field{ display:grid; gap:4px; min-width:0; }
.lbl{ font-size:11px; color:var(--muted); font-weight:500; }

input, select, textarea{
  width:100%;
  font-size:15px;
  padding:8px 10px;
  border:1px solid #c9d6ea;
  border-radius:8px;
  outline:none;
  background:#fff;
  min-width:0;
  -webkit-appearance:none;
  appearance:none;
  font-family: inherit;
}
input:focus, select:focus, textarea:focus{ border-color: rgba(26,115,232,.55); box-shadow: 0 0 0 3px rgba(26,115,232,.12); }

.buttons{ display:grid; grid-template-columns: 1fr 1fr; gap:6px; align-self:end; }

.btn{
  padding:8px 10px;
  border-radius:8px;
  border:1px solid #c9d6ea;
  background:#fff;
  color:var(--text);
  cursor:pointer;
  font-size:13px;
  line-height:1;
  user-select:none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.btn.primary{ background:var(--accent); border-color:var(--accent); color:#fff; }
.btn.primary:hover{ background:var(--accent2); border-color:var(--accent2); }
.btn.ghost{ background:#fff; }
.fuelBtns[hidden], #fuel[hidden]{ display:none; }
.fuelBtns{ display:grid; grid-template-columns:1fr 1fr; gap:4px; }
.fuelBtn{ padding:6px 4px; }
.fuelBtn.active{ background:var(--accent); border-color:var(--accent); color:#fff; }
.btn.danger{ border-color: rgba(217,48,37,.25); color: var(--danger); }
.btn:disabled{ opacity:.45; cursor:not-allowed; }

/* Pass/Fail radio row */
.passFailRow{
  display:flex;
  align-items:center;
  gap:6px;
  height: 38px;
  padding: 0 2px;
}
.passFailOpt{
  display:flex;
  align-items:center;
  gap:4px;
  cursor:pointer;
  font-size:13px;
}
.passFailOpt input[type="radio"]{
  width:auto;
  margin:0;
  padding:0;
  accent-color: var(--accent);
}
.passFailLbl{ font-weight:500; }
.passFailLbl.pass{ color: var(--success); }
.passFailLbl.fail{ color: var(--danger); }
#btnClearResult{ margin-left:auto; font-size:16px; line-height:1; color:var(--muted); padding:2px 6px; }

/* Notes button with indicator dot */
.notesBtn{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  width:100%;
  height: 38px;
}
.notesIndicator{
  width:8px; height:8px; border-radius:999px;
  background: transparent;
  flex-shrink:0;
  transition: background .15s;
}
.notesBtn.hasNotes .notesIndicator{ background: var(--accent); }
.notesBtn.hasNotes{ border-color: var(--accent); }

textarea{
  min-height: 120px;
  resize: vertical;
  font-size:14px;
  line-height:1.4;
}

.tableWrap{ margin-top:10px; overflow-x:auto; border-radius:10px; border:1px solid var(--border); -webkit-overflow-scrolling:touch; }
.table{ width:100%; border-collapse:collapse; min-width: 1500px; }
.table th,.table td{ border-bottom:1px solid #edf1f7; padding:7px 8px; font-size:12px; white-space:nowrap; }
.table th{ text-align:left; color:var(--muted); background:#f8fafc; position:sticky; top:0; z-index:1; font-size:11px; text-transform:uppercase; letter-spacing:.4px; }
.actionsCol{ width: 170px; }
.rowActions{ display:flex; gap:4px; }
.rowActions .btn{ padding:5px 7px; font-size:11px; border-radius:6px; }
.table tbody tr:nth-child(even) td{ background: #f3f6fb; }
tr.selected td{ background: rgba(26,115,232,.12) !important; }

/* Result cell icons */
.resultIcon{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:22px; height:22px;
  border-radius:999px;
  font-weight:700;
  font-size:14px;
  line-height:1;
}
.resultIcon.pass{
  background: rgba(19,115,51,.12);
  color: var(--success);
}
.resultIcon.fail{
  background: rgba(217,48,37,.12);
  color: var(--danger);
}

/* Notes cell button */
.notesCellBtn{
  padding:4px 8px;
  font-size:11px;
  border-radius:6px;
  border:1px solid var(--border);
  background:#fff;
  cursor:pointer;
}
.notesCellBtn.hasNotes{
  border-color: var(--accent);
  color: var(--accent);
  font-weight:500;
}
.notesCellEmpty{
  color: #9aa4b2;
  font-size:11px;
}

.notesView{
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 8px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 50vh;
  overflow: auto;
}

/* Pagination */
.pagination{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  padding:8px 4px 4px;
}
.pagInfo{ font-size:12px; color:var(--muted); }
.pagBtn{ padding:6px 14px; font-size:13px; }

/* Always-visible status */
.statusBar{
  position: sticky;
  bottom: 0;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
}
.statusBarInner{ display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; color:var(--muted); }
.statusDot{ width:8px; height:8px; border-radius:999px; background: rgba(26,115,232,.55); flex-shrink:0; }
.statusBar[data-error="1"] .statusDot{ background: rgba(217,48,37,.75); }
.statusBar[data-error="1"] .statusText{ color: var(--danger); }

/* Ambient Weather temp fetch */
.airTempRow{ display:flex; gap:4px; align-items:center; }
.airTempRow input{ flex:1; min-width:0; }
.tempBtn{ padding:8px 9px; font-size:14px; flex-shrink:0; border-radius:8px; }
.dialog{ border:none; padding:0; background:transparent; }
.dialog::backdrop{ background: rgba(17,24,39,.45); }
.dialogCard{
  width:min(520px, calc(100vw - 24px));
  border-radius:14px;
  border:1px solid var(--border);
  background: var(--card);
  box-shadow: var(--shadow);
  padding:14px;
}
.dialogCard h2{ margin:0 0 6px; font-size:17px; }
.dialogCard p{ margin:0 0 10px; color:var(--muted); font-size:12px; }
.dialogBtns{ display:flex; gap:10px; justify-content:flex-end; margin-top:10px; }

@media (max-width: 1100px){
  .entryGrid{ grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .buttons{ grid-column: 1 / -1; grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 700px){
  .entryGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wrap{ width:calc(100vw - 16px); margin:8px auto; }
  .header{ flex-direction:column; align-items:flex-start; gap:6px; }
  .header h1{ font-size:18px; }
  .buttons{ grid-template-columns: 1fr 1fr; }
  .table{ min-width: 1300px; }
  input, select, textarea{ font-size:16px; padding:9px 10px; }
  .btn{ font-size:14px; padding:10px 10px; }
  .card{ padding:8px; border-radius:10px; }
}

/* ── MIL Timer Dialog ───────────────────────────────────────────────────── */
.timerDialogWide{ max-width:440px; width:calc(100vw - 32px); border-radius:14px; border:none; padding:0; box-shadow:0 8px 40px rgba(0,0,0,.18); }
.timerDialogCard{ padding:20px 20px 16px; display:flex; flex-direction:column; gap:0; }
.timerDialogHeader{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
.timerDialogHeader h2{ margin:0; font-size:17px; }
.timerCloseBtn{ font-size:16px; color:var(--muted); padding:2px 6px; }

.timerPhaseDots{ display:flex; gap:8px; margin-bottom:12px; }
.timerDot{ width:10px; height:10px; border-radius:50%; background:#d0d0d0; }
.timerDot.done{ background:#22a06b; }
.timerDot.active{ background:#0969da; }

.timerPhaseLabel{ font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }

.timerMainRow{ display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2px; }
.timerBigTime{ font-size:60px; font-weight:500; letter-spacing:-2px; line-height:1; font-variant-numeric:tabular-nums; }
.timerTotalBlock{ text-align:right; }
.timerTotalLabel{ font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-bottom:2px; }
.timerTotalTime{ font-size:26px; font-weight:400; color:var(--muted); font-variant-numeric:tabular-nums; line-height:1; }

.timerSubLabel{ font-size:12px; color:var(--muted); margin:4px 0 12px; min-height:16px; }

.timerProgressBar{ width:100%; height:6px; background:#e0e0e0; border-radius:3px; margin-bottom:14px; overflow:hidden; }
.timerProgressFill{ height:100%; border-radius:3px; background:#0969da; transition:width .1s linear; }
.timerProgressFill.warn{ background:#ef9f27; }
.timerProgressFill.danger{ background:#e24b4a; }

.timerActionBtn{ width:100%; padding:14px; font-size:15px; font-weight:500; margin-bottom:8px; border-radius:8px; }
.timerAuxSuccess{ background:#d4f7e7 !important; border-color:#22a06b !important; color:#1a6b47 !important; font-size:17px !important; padding:18px !important; }

.timerResultRow{ display:flex; justify-content:space-between; font-size:13px; color:var(--muted); padding:3px 0; }
.timerResultRow span:last-child{ font-weight:600; color:var(--fg); font-variant-numeric:tabular-nums; }
.timerDivider{ border:none; border-top:1px solid #eee; margin:8px 0; }

.timerDialogBtns{ display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }

.timerBtn{ display:flex; align-items:center; gap:4px; }
```
-e 
### functions/api/entries.js

```js
// v7 – Add dewPoint to persisted fields
// v5 – Add humidity, pressure, burnbackResult, notes to persisted fields
export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.APP_KV;
  if (!kv) return json({ error: "Missing KV binding APP_KV" }, 500);

  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // /api/entries  (CRUD)
  const projectRaw = url.searchParams.get("project");
  const project = sanitizeProject(projectRaw);
  if (!project) return json({ error: "Missing or invalid project" }, 400);

  const key = `entries:${project}`;

  if (method === "GET") {
    const data = await readProject(kv, key);
    data.entries.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return json({ project, entries: data.entries });
  }

  if (method === "POST") {
    const body = await request.json().catch(() => null);
    const entry = body?.entry;
    if (!entry) return json({ error: "Missing entry" }, 400);

    const data = await readProject(kv, key);
    const now = new Date().toISOString();

    const newEntry = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...normalizeEntry(entry),
    };

    data.entries.push(newEntry);
    await kv.put(key, JSON.stringify(data));
    return json({ ok: true, entry: newEntry });
  }

  if (method === "PUT") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing id" }, 400);

    const body = await request.json().catch(() => null);
    const entry = body?.entry;
    if (!entry) return json({ error: "Missing entry" }, 400);

    const data = await readProject(kv, key);
    const idx = data.entries.findIndex(e => e.id === id);
    if (idx < 0) return json({ error: "Not found" }, 404);

    data.entries[idx] = {
      ...data.entries[idx],
      ...normalizeEntry(entry),
      updatedAt: new Date().toISOString(),
    };

    await kv.put(key, JSON.stringify(data));
    return json({ ok: true, entry: data.entries[idx] });
  }

  if (method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing id" }, 400);

    const data = await readProject(kv, key);
    const before = data.entries.length;
    data.entries = data.entries.filter(e => e.id !== id);

    if (data.entries.length === before) return json({ error: "Not found" }, 404);

    await kv.put(key, JSON.stringify(data));
    return json({ ok: true, id });
  }

  return json({ error: "Method not allowed" }, 405);
}

async function readProject(kv, key) {
  const raw = await kv.get(key, { type: "json" });
  if (raw && typeof raw === "object" && Array.isArray(raw.entries)) return raw;
  return { entries: [] };
}

function normalizeEntry(e) {
  return {
    date: safeStr(e.date),
    foam: safeStr(e.foam),
    fuel: safeStr(e.fuel),
    testType: safeStr(e.testType),
    airTemp: safeStr(e.airTemp),
    wind: safeStr(e.wind),
    humidity: safeStr(e.humidity),
    pressure: safeStr(e.pressure),
    dewPoint: safeStr(e.dewPoint),
    fuelTemp: safeStr(e.fuelTemp),
    solutionTemp: safeStr(e.solutionTemp),
    expansion: safeStr(e.expansion),
    drainTime: safeTime(e.drainTime),
    controlTime: safeTime(e.controlTime),
    extinguishmentTime: safeTime(e.extinguishmentTime),
    burnbackTime: safeTime(e.burnbackTime),
    burnbackResult: safeResult(e.burnbackResult),
    notes: safeNotes(e.notes),
    savedTime: safeStr(e.savedTime),
  };
}

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function safeTime(v) {
  const s = safeStr(v);
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? `${Number(m[1])}:${m[2]}` : "";
}

function safeResult(v) {
  const s = safeStr(v).toLowerCase();
  return (s === "pass" || s === "fail") ? s : "";
}

function safeNotes(v) {
  if (v === null || v === undefined) return "";
  // Allow multi-line text; cap at 5000 chars to keep KV value reasonable
  return String(v).slice(0, 5000);
}

function sanitizeProject(s) {
  if (!s) return "";
  const out = String(s).trim().replace(/\s+/g, " ").slice(0, 80);
  if (!out || out.length < 2) return "";
  return out.replace(/[^\w .\-]/g, "");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
```
-e 
### functions/api/entries/export.js

```js
// Rev 7 – Dedicated export route: /api/entries/export
export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.APP_KV;
  if (!kv) return json({ error: "Missing KV binding APP_KV" }, 500);

  if (request.method.toUpperCase() !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const projectRaw = url.searchParams.get("project");
  const project = sanitizeProject(projectRaw);
  if (!project) return json({ error: "Missing or invalid project" }, 400);

  const key = `entries:${project}`;
  const raw = await kv.get(key, { type: "json" });
  const data = (raw && typeof raw === "object" && Array.isArray(raw.entries)) ? raw : { entries: [] };

  data.entries.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return json({ project, exportedAt: new Date().toISOString(), entries: data.entries });
}

function sanitizeProject(s) {
  if (!s) return "";
  const out = String(s).trim().replace(/\s+/g, " ").slice(0, 80);
  if (!out || out.length < 2) return "";
  return out.replace(/[^\w .\-]/g, "");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
```
-e 
### functions/api/ping.js

```js
export async function onRequest() {
  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
```
