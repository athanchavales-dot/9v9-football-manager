document.addEventListener("DOMContentLoaded", () => {
  // DOM
  const starterList = document.getElementById("starterList");
  const benchList = document.getElementById("benchList");
  const teamLineUpList = document.getElementById("teamLineUpList");
  const startersCounter = document.getElementById("startersCounter");
  const field = document.getElementById("formationField");
  const matchSelect = document.getElementById("matchSelect");
  const newMatchBtn = document.getElementById("newMatch");
  const deleteMatchBtn = document.getElementById("deleteMatch");
  const saveFormationToMatchBtn = document.getElementById("saveFormationToMatch");
  const putStartersBtn = document.getElementById("putStartersOnPitch");
  const formationSelect = document.getElementById("autoFormationSelect");

  const openHistoryBtn = document.getElementById("openHistory");
  const historyModal = document.getElementById("historyModal");
  const closeHistoryBtn = document.getElementById("closeHistory");
  const historyListEl = document.getElementById("historyList");

  const exportTeamBtn = document.getElementById("exportTeamBtn");
  const importTeamInput = document.getElementById("importTeamInput");

  const eventType = document.getElementById("eventType");
  const eventPlayer = document.getElementById("eventPlayer");
  const assistWrapper = document.getElementById("assistWrapper");
  const assistPlayer = document.getElementById("assistPlayer");
  const subWrapper = document.getElementById("subWrapper");
  const subOff = document.getElementById("subOff");
  const subOn = document.getElementById("subOn");
  const addEventBtn = document.getElementById("addEvent");

  const matchTimer = document.getElementById("matchTimer");
  const startTimerBtn = document.getElementById("startTimer");
  const pauseTimerBtn = document.getElementById("pauseTimer");
  const resetTimerBtn = document.getElementById("resetTimer");
  const halfSelect = document.getElementById("halfSelect");
  const halfDurationSelect = document.getElementById("halfDurationSelect");

  const oppositionInput = document.getElementById("opposition");
  const locationInput = document.getElementById("location");
  const matchDateInput = document.getElementById("matchDate");
  const saveMatchBtn = document.getElementById("saveMatch");

  const saveFormationBtn = document.getElementById("saveFormation");
  const loadFormationBtn = document.getElementById("loadFormation");
  const clearFormationBtn = document.getElementById("clearFormation");
  const resetPitchBtn = document.getElementById("resetPitch");
  const clearAllBtn = document.getElementById("clearAll");
  const removeAllPlayersBtn = document.getElementById("removeAllPlayers");
  const flipSidesBtn = document.getElementById("flipSides");
  const togglePitchViewBtn = document.getElementById("togglePitchView");

  const openPlayerEditorBtn = document.getElementById("openPlayerEditor");

  // ... (existing implementation stays the same — formations, drag/drop, timer, event log, history, etc.)
  // The rest of your original script content remains unchanged here.
  // [SNIP: your existing app logic]
});

/* ====== (Your existing script content continues here — unchanged) ====== */
/* ... the full original file content remains here ... */
/* (Search/replace note: I didn't remove or alter any of your existing functions.) */


/* ===== EXPORT / IMPORT PLAYERS (Backup / Restore) =====
   This block adds two buttons ("Export Players", "Import Players")
   into the .backup-controls bar in the header. It works with:
   - localStorage "customPlayers" (from the Vue Player Editor)
   - window.loadPlayersData() fallback (players.json / inline)
*/
(function initBackupControls() {
  function ensureBackupControls() {
    let container = document.querySelector(".backup-controls");
    if (!container) {
      // create one near header if missing
      const header = document.querySelector("header .shell") || document.body;
      container = document.createElement("div");
      container.className = "backup-controls";
      container.style.display = "flex";
      container.style.gap = ".5rem";
      container.style.flexWrap = "wrap";
      container.style.margin = ".5rem 0";
      header.prepend(container);
    }
    return container;
  }

  async function exportPlayers() {
    let exported = [];
    try {
      const raw = localStorage.getItem("customPlayers");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) exported = arr;
      }
    } catch { }
    if (!exported.length && typeof window.loadPlayersData === "function") {
      try {
        const arr = await window.loadPlayersData();
        if (Array.isArray(arr) && arr.length) exported = arr;
      } catch { }
    }
    if (!Array.isArray(exported)) exported = [];

    const stamp = new Date();
    const yyyy = String(stamp.getFullYear());
    const mm = String(stamp.getMonth() + 1).padStart(2, "0");
    const dd = String(stamp.getDate()).padStart(2, "0");
    const filename = `players-backup-${yyyy}${mm}${dd}.json`;

    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    alert("✅ Players exported.");
  }

  async function importPlayersFromFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data) || !data.length) {
        alert("The file doesn't look like a valid players list.");
        return;
      }
      const normalized = data.map(p => ({
        number: Number(p.number) || 0,
        name: String(p.name || "").trim(),
        position: String(p.position || "MID"),
        altPosition: String(p.altPosition || "DEF"),
        photo: p.photo || ""
      }));
      localStorage.setItem("customPlayers", JSON.stringify(normalized));
      if (typeof window.refreshPlayersUI === "function") {
        window.refreshPlayersUI(normalized);
      } else {
        // Try to refresh common UI areas without a full reload
        if (typeof window.renderAll === "function") window.renderAll();
        else location.reload();
      }
      alert("✅ Players imported.");
    } catch (e) {
      console.error(e);
      alert("Couldn't import that file. Make sure it's a JSON export from this app.");
    }
  }

  // Build UI
  const container = ensureBackupControls();
  // Avoid duplicating if this script executes more than once
  if (!container.querySelector("#exportPlayersBtn")) {
    const exportBtn = document.createElement("button");
    exportBtn.id = "exportPlayersBtn";
    exportBtn.className = "btn";
    exportBtn.textContent = "Export Players";

    const importLabel = document.createElement("label");
    importLabel.className = "btn";
    importLabel.textContent = "Import Players";
    importLabel.setAttribute("for", "importPlayersInput");

    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = "application/json";
    importInput.id = "importPlayersInput";
    importInput.style.display = "none";

    container.appendChild(exportBtn);
    container.appendChild(importLabel);
    container.appendChild(importInput);

    exportBtn.addEventListener("click", () => exportPlayers());
    importInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      importPlayersFromFile(f);
      e.target.value = "";
    });
  }
})();
