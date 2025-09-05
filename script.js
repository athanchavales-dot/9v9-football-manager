/* ==========================================================
   SAFE PLAYER LOADER
   Always returns a player list, even if localStorage or fetch fails
========================================================== */
if (!window.loadPlayersData) {
  window.loadPlayersData = async function () {
    // 1) customPlayers (from the Player Editor)
    try {
      const raw = localStorage.getItem("customPlayers");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {
      console.warn("customPlayers parse failed", e);
    }

    // 2) players.json (GitHub Pages / local dev)
    try {
      const res = await fetch("players.json", { cache: "no-store" });
      if (res.ok) {
        const arr = await res.json();
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {
      console.warn("players.json fetch failed", e);
    }

    // 3) Inline fallback from index.html
    try {
      const el = document.getElementById("playersData");
      if (el && el.textContent.trim()) {
        const arr = JSON.parse(el.textContent);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {
      console.warn("inline playersData parse failed", e);
    }

    return [];
  };
}

/* ==========================================================
   APP INIT
========================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Load players
  const players = await window.loadPlayersData();

  // Safety bootstrap for lineup
  const ul = document.getElementById("teamLineUpList");
  if (players.length && ul && ul.children.length === 0) {
    ul.innerHTML = "";
    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = "lineup-item";
      li.textContent = `#${p.number} ${p.name} — ${p.position}`;
      ul.appendChild(li);
    });
  }

  // Populate selects for events
  const selects = ["eventPlayer", "assistPlayer", "subOff", "subOn"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (selects.length) {
    const opts =
      `<option value="">— Select Player —</option>` +
      players
        .map(
          (p, i) =>
            `<option value="${i}">#${p.number} ${p.name}</option>`
        )
        .join("");
    selects.forEach((sel) => (sel.innerHTML = opts));
  }

  // Let Vue editor or app renderer take over
  if (typeof window.refreshPlayersUI === "function") {
    window.refreshPlayersUI(players);
  } else if (typeof window.renderAll === "function") {
    window.renderAll();
  }
});

/* ==========================================================
   EXPORT / IMPORT PLAYERS
========================================================== */
(function initBackupControls() {
  function ensureBackupControls() {
    let container = document.querySelector(".backup-controls");
    if (!container) {
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
    } catch {}
    if (!exported.length && typeof window.loadPlayersData === "function") {
      try {
        const arr = await window.loadPlayersData();
        if (Array.isArray(arr) && arr.length) exported = arr;
      } catch {}
    }
    if (!Array.isArray(exported)) exported = [];

    const stamp = new Date();
    const yyyy = String(stamp.getFullYear());
    const mm = String(stamp.getMonth() + 1).padStart(2, "0");
    const dd = String(stamp.getDate()).padStart(2, "0");
    const filename = `players-backup-${yyyy}${mm}${dd}.json`;

    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json",
    });
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
      const normalized = data.map((p) => ({
        number: Number(p.number) || 0,
        name: String(p.name || "").trim(),
        position: String(p.position || "MID"),
        altPosition: String(p.altPosition || "DEF"),
        photo: p.photo || "",
      }));
      localStorage.setItem("customPlayers", JSON.stringify(normalized));
      if (typeof window.refreshPlayersUI === "function") {
        window.refreshPlayersUI(normalized);
      } else if (typeof window.renderAll === "function") {
        window.renderAll();
      } else {
        location.reload();
      }
      alert("✅ Players imported.");
    } catch (e) {
      console.error(e);
      alert(
        "Couldn't import that file. Make sure it's a JSON export from this app."
      );
    }
  }

  // Build UI
  const container = ensureBackupControls();
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
