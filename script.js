// Rev 13 – Clean rebuild of script.js (fixes syntax error)

window.__appLoaded = true;

// ---- DOM ----
const els = {
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
  saveBtn: document.getElementById("saveBtn"),
  clearBtn: document.getElementById("clearBtn"),
  status: document.getElementById("status"),
};

function setStatus(msg, err=false) {
  els.status.textContent = msg;
  const bar = document.getElementById("statusBar");
  if (bar) bar.dataset.error = err ? "1" : "0";
}

// ---- Helpers ----
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function digitsToTime(v) {
  const s = String(v).replace(/\D/g, "");
  if (!s) return "";
  if (s.length <= 2) return `0:${s.padStart(2,"0")}`;
  return `${s.slice(0,-2)}:${s.slice(-2)}`;
}

els.controlTime.addEventListener("input", e => {
  els.controlTime.value = digitsToTime(e.target.value);
});
els.extinguishmentTime.addEventListener("input", e => {
  els.extinguishmentTime.value = digitsToTime(e.target.value);
});

// ---- Init ----
if (!els.date.value) els.date.value = todayISO();

els.clearBtn.addEventListener("click", () => {
  els.foam.value = "";
  els.fuel.value = "";
  els.testType.value = "";
  els.airTemp.value = "";
  els.wind.value = "";
  els.fuelTemp.value = "";
  els.solutionTemp.value = "";
  els.controlTime.value = "";
  els.extinguishmentTime.value = "";
  els.date.value = todayISO();
  setStatus("Cleared.");
});

els.saveBtn.addEventListener("click", () => {
  setStatus("Save clicked (backend wiring next).");
});

setStatus("App loaded successfully.");
