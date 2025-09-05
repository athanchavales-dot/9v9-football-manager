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

  const timerEl = document.getElementById("matchTimer");
  const startBtn = document.getElementById("startTimer");
  const pauseBtn = document.getElementById("pauseTimer");
  const resetBtn = document.getElementById("resetTimer");
  const halfLengthInput = document.getElementById("halfLengthInput");
  const startFirstHalfBtn = document.getElementById("startFirstHalf");
  const startSecondHalfBtn = document.getElementById("startSecondHalf");
  const currentHalfLabel = document.getElementById("currentHalfLabel");
  const remainingTimeEl = document.getElementById("remainingTime");

  const eventForm = document.getElementById("eventForm");
  const eventTypeEl = document.getElementById("eventType");
  const eventPlayerEl = document.getElementById("eventPlayer");
  const assistPlayerEl = document.getElementById("assistPlayer");
  const eventLogEl = document.getElementById("eventLog");
  const exportCSVBtn = document.getElementById("exportCSV");
  const cardTypeEl = document.getElementById("cardType");
  const subRowEl = document.getElementById("subRow");
  const subOutEl = document.getElementById("subOut");
  const subInEl = document.getElementById("subIn");
  const openHistoryBtn = document.getElementById("openHistory");
  const historyModal = document.getElementById("historyModal");
  const closeHistoryBtn = document.getElementById("closeHistory");
  const historyListEl = document.getElementById("historyList");
  const statsBodyEl = document.getElementById("statsBody");


  const modal = document.getElementById("playerEditorModal");
  const openEditor = document.getElementById("openPlayerEditor");

  // State
  let players = [];

function nameFrom(id) {
  const p = players && players[id];
  if (p) return `#${p.number} ${p.name}`;
  return (id !== undefined && id !== null && !Number.isNaN(id)) ? `#${id}` : "";
}

  let placementIndex = 0;
  let lastRemovedPlayer = null;

  // Timer / halves
  let timer = 0;
  let interval = null;
  let currentHalf = 0;
  let halfElapsed = 0;
  const halfLengthSec = () =>
    Math.max(5, Math.min(50, parseInt(halfLengthInput.value) || 35)) * 60;

  // Per-player playtime (seconds while on pitch)
  let playSec = [];

  // Helpers
  const formatTime = (s) => {
    const m = Math.floor(s / 60), r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };
  const renderTimer = () => { timerEl.textContent = formatTime(timer); };
  const renderRemaining = () => {
    if (!currentHalf) {
      currentHalfLabel.textContent = "—";
      remainingTimeEl.textContent = "00:00";
      return;
    }
    const rem = Math.max(0, halfLengthSec() - halfElapsed);
    currentHalfLabel.textContent = currentHalf === 1 ? "1st" : "2nd";
    remainingTimeEl.textContent = formatTime(rem);
  };

  function tick() {
    timer++;
    renderTimer();

    if (currentHalf) {
      halfElapsed = Math.min(halfLengthSec(), halfElapsed + 1);
      renderRemaining();
      if (halfElapsed >= halfLengthSec()) {
        clearInterval(interval);
        interval = null;
        try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch { }
        try {
          new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAACAgICAgICAg').play().catch(() => { });
        } catch { }
      }
    }

    getActivePlayerIds().forEach((id) => {
      playSec[id] = (playSec[id] || 0) + 1;
    });
    updatePlaytimeWidgets();
    // Persist playtime to the active match periodically
    if (currentMatchId && (timer % 5 === 0)) {
      const m = matchById(currentMatchId);
      if (m) { m.playSec = playSec; saveMatches(matches); }
    }
  }

  // Timer controls
  startBtn.addEventListener("click", () => { if (!interval) interval = setInterval(tick, 1000); });
  pauseBtn.addEventListener("click", () => { clearInterval(interval); interval = null; });
  resetBtn.addEventListener("click", () => {
    clearInterval(interval); interval = null;
    timer = 0; halfElapsed = 0; currentHalf = 0;
    renderTimer(); renderRemaining();
  });
  startFirstHalfBtn.addEventListener("click", () => { currentHalf = 1; halfElapsed = 0; renderRemaining(); });
  startSecondHalfBtn.addEventListener("click", () => { currentHalf = 2; halfElapsed = 0; renderRemaining(); });

  // Matches
  const loadMatches = () => JSON.parse(localStorage.getItem("matches") || "[]");
  const saveMatches = (m) => localStorage.setItem("matches", JSON.stringify(m));
  const uid = () => {
    const d = new Date();
    return `${d.toISOString().slice(0, 10)}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  };
  let matches = loadMatches();
  let currentMatchId = null;
  const matchById = (id) => matches.find((m) => m.id === id) || null;
  const isMatchActive = () => !!currentMatchId;

  function setUIEnabled(enabled) {
    const disableClass = "disabled-ui";
    field.classList.toggle(disableClass, !enabled);
    document.querySelectorAll("#teamLineUpList .player-card, #saveFormation, #loadFormation, #saveFormationToMatch, #putStartersOnPitch")
      .forEach(el => el.classList.toggle(disableClass, !enabled));
    [startBtn, pauseBtn, resetBtn, startFirstHalfBtn, startSecondHalfBtn, halfLengthInput].forEach(el => { el.disabled = !enabled; });
    eventForm.querySelectorAll("select, button").forEach(el => { el.disabled = !enabled; });
  }
  const style = document.createElement("style");
  style.textContent = `.disabled-ui{pointer-events:none!important;opacity:.4}`;
  document.head.appendChild(style);
  setUIEnabled(false);

  function updateAvailabilityUI() {
    if (!teamLineUpList) return;
    teamLineUpList.classList.toggle("locked", isMatchActive());
  }
  function renderMatchOptions() {
    if (!matchSelect) return;
    matchSelect.innerHTML = `<option value="" disabled ${currentMatchId ? "" : "selected"}>— Select a match —</option>`;
    matches.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.date} • ${m.title || m.id}`;
      matchSelect.appendChild(opt);
    });
    if (matchSelect && currentMatchId && matchById(currentMatchId)) matchSelect.value = currentMatchId;
    updateAvailabilityUI();
  }

  function createNewMatch() {
    const id = uid();
    const date = new Date().toISOString().slice(0, 10);
    const title = prompt("Optional match title") || "";
    const formation = takeFormationSnapshot();
    matches.push({ id, date, title, events: [], formation });
    saveMatches(matches);
    currentMatchId = id;

    // reset timers & playtime
    timer = 0; halfElapsed = 0; currentHalf = 0;
    renderTimer(); renderRemaining();
    playSec = new Array(players.length).fill(0);

    // kickoff: center ball
    placeFootballAtCenter();

    renderMatchOptions();
    renderEventLog();
    setUIEnabled(true);
    alert("✅ New match started.");
  }

  function deleteCurrentMatch() {
    if (!currentMatchId) return alert("No match selected.");
    const m = matchById(currentMatchId);
    if (!m) return alert("Match not found.");
    if (!confirm(`Delete match "${m.title || m.id}"?`)) return;
    matches = matches.filter((mm) => mm.id !== currentMatchId);
    saveMatches(matches);
    currentMatchId = null;
    eventLogEl.innerHTML = "";
    updateAvailabilityUI();
    setUIEnabled(false);
    alert("🗑️ Match deleted.");
  }

  function setActiveMatch(id, { loadFormation: lf = true } = {}) {
    currentMatchId = id;
    renderEventLog();
    if (lf) {
      const m = matchById(id);
      if (m?.formation) loadFormationSnapshot(m.formation);
    }
    playSec = (matchById(id)?.playSec && Array.isArray(matchById(id).playSec)) ? matchById(id).playSec.slice() : new Array(players.length).fill(0);
    timer = 0; halfElapsed = 0; currentHalf = 0;
    renderTimer(); renderRemaining();
    setUIEnabled(true);
    renderStats();
  }

  // ---- FOOTBALL: manual drag + snap + stick ----
  const football = document.createElement("img");
  football.src = "football-png-32.png";
  football.alt = "Football";
  football.className = "football-icon";
  field.appendChild(football);

  function placeFootballAtCenter() {
    football.style.left = `${(field.clientWidth / 2) - 16}px`;
    football.style.top = `${(field.clientHeight / 2) - 16}px`;
  }
  placeFootballAtCenter();

  let ballHolder = null; // element with possession

  function positionBallOnPlayer(playerEl) {
    if (!playerEl) return;
    const pr = playerEl.getBoundingClientRect();
    const fr = field.getBoundingClientRect();
    const left = pr.left - fr.left + pr.width / 2 - football.offsetWidth / 2;
    const top = pr.top - fr.top + pr.height - 4;
    football.style.left = `${left}px`;
    football.style.top = `${top}px`;
  }

  function centerDistance(elA, elB) {
    const a = elA.getBoundingClientRect();
    const b = elB.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    return Math.hypot(ax - bx, ay - by);
  }

  function snapToNearestPlayer() {
    const playersOnPitch = [...field.querySelectorAll(".draggable-player")];
    if (!playersOnPitch.length) { ballHolder = null; return; }
    const SNAP_RADIUS = 50;
    let nearest = null, best = Infinity;
    for (const p of playersOnPitch) {
      const d = centerDistance(football, p);
      if (d < best) { best = d; nearest = p; }
    }
    if (nearest && best <= SNAP_RADIUS) {
      ballHolder = nearest;
      positionBallOnPlayer(nearest);
    } else {
      ballHolder = null;
    }
  }

  // follow holder while they move
  const mo = new MutationObserver(() => {
    if (ballHolder && field.contains(ballHolder)) positionBallOnPlayer(ballHolder);
  });
  mo.observe(field, { attributes: true, childList: true, subtree: true });

  // make the ball draggable
  (function makeFootballDraggable() {
    let offsetX = 0, offsetY = 0;

    function moveTo(clientX, clientY) {
      const rect = field.getBoundingClientRect();
      let x = clientX - rect.left - offsetX;
      let y = clientY - rect.top - offsetY;
      x = Math.max(0, Math.min(x, field.clientWidth - football.offsetWidth));
      y = Math.max(0, Math.min(y, field.clientHeight - football.offsetHeight));
      football.style.left = `${x}px`;
      football.style.top = `${y}px`;
    }

    // mouse
    football.addEventListener("mousedown", (e) => {
      e.preventDefault();
      ballHolder = null; // release from player
      const r = football.getBoundingClientRect();
      offsetX = e.clientX - r.left; offsetY = e.clientY - r.top;
      football.style.cursor = "grabbing";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
    function onMove(e) { moveTo(e.clientX, e.clientY); }
    function onUp() {
      football.style.cursor = "grab";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      snapToNearestPlayer();
    }

    // touch
    football.addEventListener("touchstart", (e) => { e.preventDefault();
      ballHolder = null;
      const t = e.touches[0];
      const r = football.getBoundingClientRect();
      offsetX = t.clientX - r.left; offsetY = t.clientY - r.top;
    }, { passive: false });
    football.addEventListener("touchmove", (e) => { e.preventDefault();
      const t = e.touches[0]; if (t) moveTo(t.clientX, t.clientY);
    }, { passive: false });
    football.addEventListener("touchend", () => snapToNearestPlayer());
  })();

  // ----- Lineup UI -----
  function updatePutButton() {
    const starters = starterList?.querySelectorAll(".player-card").length || 0;
    putStartersBtn.classList.toggle("hidden", starters !== 9);
  }
  function getStartersCount() {
    const count = starterList?.querySelectorAll(".player-card").length || 0;
    startersCounter.textContent = `Starters (${count}/9)`;
    updatePutButton();
    return count;
  }

  function setLineupUsed(playerId, used) {
    const card = teamLineUpList.querySelector(`.player-card[data-player-id="${playerId}"]`);
    if (card) {
      card.classList.toggle("used", used);
      card.classList.toggle("disabled", used);
    }
  }

  function playtimeWidgetHTML(pid) {
    return `<div class="pt-wrap" data-pt-id="${pid}">
      <div class="pt-time">⏱ <span class="pt-text" data-pt-text="${pid}">00:00</span></div>
      <div class="pt-bg"><div class="pt-bar pt-low" data-pt-bar="${pid}" style="width:0%"></div></div>
    </div>`;
  }

  function createLineupCard(player, index) {
    const card = document.createElement("div");
    card.className = "player-card text-center";
    card.dataset.playerId = index;
    card.dataset.listType = "lineup";
    card.innerHTML = `
      <img src="${player.photo}" onerror="this.src='avatars/placeholder.jpg'" class="mx-auto rounded-full object-cover"/>
      <div class="text-xs font-bold mt-1">#${player.number} ${player.name}</div>
      <div class="text-[10px] text-slate-300">${player.position} / ${player.altPosition}</div>
      ${playtimeWidgetHTML(index)}
    `;
    card.addEventListener("click", () => {
      if (isMatchActive()) {
        alert("This player is not available today. Use Starters or Game Changers for subs.");
        return;
      }
      if (card.classList.contains("disabled")) return;
      if (getStartersCount() < 9) {
        starterList.appendChild(createPlayerCard(player, index, "starter"));
      } else {
        benchList.appendChild(createPlayerCard(player, index, "bench"));
      }
      setLineupUsed(index, true);
      getStartersCount();
    });
    return card;
  }

  function createPlayerCard(player, index, listType) {
    const card = document.createElement("div");
    card.className = "player-card text-center";
    card.dataset.playerId = index;
    card.dataset.listType = listType;
    card.innerHTML = `
      <img src="${player.photo}" onerror="this.src='avatars/placeholder.jpg'" class="mx-auto rounded-full object-cover" style="width:42px;height:42px"/>
      <div class="text-xs font-bold mt-1">#${player.number} ${player.name}</div>
      <div class="text-[10px] text-slate-300">${player.position} / ${player.altPosition}</div>
      ${playtimeWidgetHTML(index)}
    `;
    if (listType === "bench") {
      card.setAttribute("draggable", "true");
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", String(index));
        e.dataTransfer.effectAllowed = "move";
      });
    }
    card.addEventListener("click", () => {
      if (!field.querySelector(`.draggable-player[data-player-id="${index}"]`)) {
        addPlayerToField(index, player);
      }
    });
    card.addEventListener("dblclick", () => {
      const pid = parseInt(card.dataset.playerId);
      card.remove();
      setLineupUsed(pid, false);
      getStartersCount();
    });
    return card;
  }

  // Players loader (robust: only trusts non-empty custom list)
  async function loadPlayersData() {
    try {
      const customRaw = localStorage.getItem("customPlayers");
      if (customRaw) {
        const custom = JSON.parse(customRaw);
        if (Array.isArray(custom) && custom.length > 0) return custom;
      }
    } catch { }
    try {
      const inline = document.getElementById("playersData");
      if (inline) {
        const arr = JSON.parse(inline.textContent.trim());
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch { }
    try {
      const res = await fetch("players.json?v=4", { cache: "no-store" });
      if (res.ok) {
        const arr = await res.json();
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch { }
    return []; // final fallback
  }

  loadPlayersData().then((data) => {
    players = data;
    playSec = new Array(players.length).fill(0);
    teamLineUpList.innerHTML = "";
    if (!Array.isArray(players) || players.length === 0) {
      teamLineUpList.innerHTML = "<div class='col-span-full text-rose-400 font-semibold'>No players available.</div>";
      return;
    }
    players.forEach((p, i) => teamLineUpList.appendChild(createLineupCard(p, i)));
    refreshEventPlayerDropdown(); renderStats();
    renderMatchOptions();
    getStartersCount();
    updatePlaytimeWidgets();
  });

  const getActivePlayerIds = () =>
    [...field.querySelectorAll(".draggable-player")]
      .map((div) => parseInt(div.dataset.playerId))
      .filter((id) => !Number.isNaN(id));

  function fillPlayerSelect(selectEl, excludeId = null) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="" ${selectEl === assistPlayerEl ? "" : "disabled"} selected>${selectEl === assistPlayerEl ? "— Select Assist Player (optional) —" : "— Select Player —"}</option>`;
    const activeIds = getActivePlayerIds();
    activeIds.forEach((id) => {
      if (excludeId !== null && String(id) === String(excludeId)) return;
      const p = players[id]; if (!p) return;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `#${p.number} ${p.name}`;
      selectEl.appendChild(opt);
    });
  }

  function getOnPitchIds() {
    return [...document.querySelectorAll('#formationField .draggable-player')]
      .map(el => parseInt(el.dataset.playerId))
      .filter(id => !Number.isNaN(id));
  }
  function getBenchIds() {
    return [...document.querySelectorAll('#benchList .player-card')]
      .map(el => parseInt(el.dataset.playerId))
      .filter(id => !Number.isNaN(id));
  }
  function fillOnPitchSelect(selectEl, excludeId = null) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="" disabled selected>— Select —</option>`;
    getOnPitchIds().forEach((id) => {
      if (excludeId !== null && String(id) === String(excludeId)) return;
      const p = players[id]; if (!p) return;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `#${p.number} ${p.name}`;
      selectEl.appendChild(opt);
    });
  }
  function fillBenchSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="" disabled selected>— Select —</option>`;
    getBenchIds().forEach((id) => {
      const p = players[id]; if (!p) return;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `#${p.number} ${p.name}`;
      selectEl.appendChild(opt);
    });
  }
  
  function refreshEventPlayerDropdown() {
    const type = eventTypeEl.value;
    // Base player select default to on-pitch for most events
    if (type === "Substitution") {
      // Hide main player; show Sub row
      eventPlayerEl.classList.add("hidden");
      assistPlayerEl.classList.add("hidden");
      cardTypeEl.classList.add("hidden");
      subRowEl.classList.remove("hidden");
      fillOnPitchSelect(subOutEl);
      fillBenchSelect(subInEl);
    } else {
      eventPlayerEl.classList.remove("hidden");
      fillOnPitchSelect(eventPlayerEl);
      subRowEl.classList.add("hidden");
      // Assist only for Goal
      if (type === "Goal") {
        assistPlayerEl.classList.remove("hidden");
        fillOnPitchSelect(assistPlayerEl, eventPlayerEl.value || null);
      } else {
        assistPlayerEl.classList.add("hidden");
        assistPlayerEl.value = "";
      }
      // Card type only for Card
      if (type === "Card") {
        cardTypeEl.classList.remove("hidden");
      } else {
        cardTypeEl.classList.add("hidden");
      }
    }
  }
  eventTypeEl.addEventListener("change", refreshEventPlayerDropdown);
("change", refreshEventPlayerDropdown);
  eventPlayerEl.addEventListener("change", () => {
    if (eventTypeEl.value === "Goal")
      fillPlayerSelect(assistPlayerEl, eventPlayerEl.value || null);
  });

  // Formations
  function getTemplatePercents(name = "3-3-2") {

  // Reposition only the players currently on the pitch to the selected formation
  function applyFormationToOnField() {
    if (!formationSelect) return;
    const template = getTemplatePercents(formationSelect.value || "3-3-2");
    const W = field.clientWidth, H = field.clientHeight;

    // Collect current on-field player elements
    let els = [...field.querySelectorAll(".draggable-player")];
    if (els.length === 0) return;

    // Put GK first (if exactly one), keep others in their existing order
    const findIsGK = (el) => {
      const id = parseInt(el.dataset.playerId);
      return players[id]?.position === "GK";
    };
    const gkIndex = els.findIndex(findIsGK);
    if (gkIndex > 0) { const [gkEl] = els.splice(gkIndex, 1); els.unshift(gkEl); }

    // Apply as many template points as we have players on the field
    const n = Math.min(els.length, template.length);
    for (let i = 0; i < n; i++) {
      const el = els[i];
      const { x, y } = template[i];
      el.style.left = `${(x / 100) * W}px`;
      el.style.top  = `${(y / 100) * H}px`;
    }
  }

  // Change event: when selecting a formation, just reposition current on-pitch players.
  formationSelect?.addEventListener("change", applyFormationToOnField);
    const lanesY = (n) => n === 1 ? [50] : n === 2 ? [35, 65] : n === 3 ? [25, 50, 75] : [18, 41, 59, 82];
    switch (name) {
      case "3-2-3": return [{ x: 6, y: 50 }, ...lanesY(3).map((y) => ({ x: 22, y })), ...lanesY(2).map((y) => ({ x: 45, y })), ...lanesY(3).map((y) => ({ x: 70, y }))];
      case "2-3-3": return [{ x: 6, y: 50 }, ...lanesY(2).map((y) => ({ x: 22, y })), ...lanesY(3).map((y) => ({ x: 45, y })), ...lanesY(3).map((y) => ({ x: 70, y }))];
      case "4-3-1": return [{ x: 6, y: 50 }, ...lanesY(4).map((y) => ({ x: 22, y })), ...lanesY(3).map((y) => ({ x: 47, y })), { x: 72, y: 50 }];
      default: return [{ x: 6, y: 50 }, ...lanesY(3).map((y) => ({ x: 22, y })), ...lanesY(3).map((y) => ({ x: 47, y })), ...lanesY(2).map((y) => ({ x: 72, y }))];
    }
  }

  function clearField() {
    field.querySelectorAll(".draggable-player").forEach((el) => {
      updatePlayerCardState(el.dataset.playerId, false);
      el.remove();
    });
    placementIndex = 0;
    lastRemovedPlayer = null;
    if (ballHolder && !field.contains(ballHolder)) ballHolder = null;
    refreshEventPlayerDropdown(); renderStats();
  }

  function autoPlaceStarters() {
    const starterCards = [...starterList.querySelectorAll(".player-card")];
    if (starterCards.length !== 9) return alert("You need exactly 9 starters.");
    const chosen = formationSelect?.value || "3-3-2";
    const template = getTemplatePercents(chosen);
    clearField();
    const W = field.clientWidth, H = field.clientHeight;

    const ids = starterCards.map((c) => parseInt(c.dataset.playerId));
    const gkIndex = ids.findIndex((id) => players[id]?.position === "GK");
    if (gkIndex > 0) { const [gk] = ids.splice(gkIndex, 1); ids.unshift(gk); }
    ids.slice(0, template.length).forEach((id, i) => {
      const p = players[id];
      const { x, y } = template[i];
      addPlayerToField(id, p, `${(x / 100) * W}px`, `${(y / 100) * H}px`);
    });
    refreshEventPlayerDropdown(); renderStats();
  }
  putStartersBtn?.addEventListener("click", autoPlaceStarters);

  function getAutoPosition() {
    const spacingX = 96, spacingY = 96, cols = 6;
    const x = 36 + (placementIndex % cols) * spacingX;
    const y = 36 + Math.floor(placementIndex / cols) * spacingY;
    placementIndex++;
    return { x, y };
  }

  function attachDropHandlers(div) {
    div.addEventListener("dragover", (e) => {
      if (!e.dataTransfer) return;
      if (e.dataTransfer.types.includes("text/plain")) {
        e.preventDefault();
        div.classList.add("drop-target");
      }
    });
    div.addEventListener("dragleave", () => div.classList.remove("drop-target"));
    div.addEventListener("drop", (e) => {
      e.preventDefault();
      div.classList.remove("drop-target");
      const incomingId = parseInt(e.dataTransfer.getData("text/plain"));
      if (Number.isNaN(incomingId)) return;
      const benchCard = benchList.querySelector(`.player-card[data-player-id="${incomingId}"]`);
      if (!benchCard) return alert("Only Game Changers can come on. All Players are not available today.");
      if (field.querySelector(`.draggable-player[data-player-id="${incomingId}"]`)) return alert("That player is already on the pitch.");

      const targetId = parseInt(div.dataset.playerId);
      const incoming = players[incomingId], outgoing = players[targetId];
      if (!incoming || !outgoing) return;

      div.dataset.playerId = String(incomingId);
      div.innerHTML = playerOnPitchHTML(incoming);

      benchCard.remove();
      benchList.appendChild(createPlayerCard(outgoing, targetId, "bench"));
      setLineupUsed(incomingId, true);
      setLineupUsed(targetId, false);

      if (currentMatchId) {
        const m = matchById(currentMatchId);
        if (m) {
          m.events.push({ time: timerEl.textContent, type: "Substitution", outId: targetId, outName: `#${outgoing.number} ${outgoing.name}`, inId: incomingId, inName: `#${incoming.number} ${incoming.name}` });
          saveMatches(matches);
          renderEventLog();
        }
      }
      refreshEventPlayerDropdown(); renderStats();
    });
  }

  function playerOnPitchHTML(p) {
    return `
    <div class="flex flex-col items-center text-center pointer-events-none select-none">
      <img src="${p.photo || 'avatars/placeholder.jpg'}" 
           alt="${p.name}" class="w-12 h-12 rounded-full shadow-md mb-0.5">
      <span class="text-[10px] leading-tight font-medium truncate max-w-[84px]">${p.name}</span>
    </div>
    `;
  }

  function addPlayerToField(index, player, left = null, top = null) {
    if (field.querySelectorAll(".draggable-player").length >= 9 &&
      !field.querySelector(`.draggable-player[data-player-id="${index}"]`)) {
      return alert("⚠️ Only 9 players allowed.");
    }
    const div = document.createElement("div");
    div.className = "draggable-player";
    div.dataset.playerId = index;
    div.style.left = left || `${getAutoPosition().x}px`;
    div.style.top = top || `${getAutoPosition().y}px`;
    div.style.position = "absolute";
    div.innerHTML = playerOnPitchHTML(player);

    // remove from pitch (double click / double tap)
    let tapTs = 0;
    div.addEventListener("dblclick", () => removeFromPitch(div));
    div.addEventListener("touchend", () => {
      const now = Date.now(); if (now - tapTs < 250) removeFromPitch(div); tapTs = now;
    });

    makeDraggable(div);
    attachDropHandlers(div);
    field.appendChild(div);
    updatePlayerCardState(index, true);
    refreshEventPlayerDropdown(); renderStats();
  }

  function removeFromPitch(div) {
    const removedId = parseInt(div.dataset.playerId);
    const removedPlayer = players[removedId];
    if (ballHolder === div) ballHolder = null; // drop ball
    div.remove();
    updatePlayerCardState(removedId, false);
    if (currentMatchId && removedPlayer) {
      lastRemovedPlayer = {
        id: removedId,
        name: `#${removedPlayer.number} ${removedPlayer.name}`,
        time: timerEl.textContent,
      };
    }
    refreshEventPlayerDropdown(); renderStats();
  }

  function updatePlayerCardState(playerId, active) {
    [starterList, benchList, teamLineUpList].forEach((list) => {
      if (!list) return;
      const card = list.querySelector(`.player-card[data-player-id="${playerId}"]`);
      if (card) {
        card.classList.toggle("used", active);
        card.classList.toggle("disabled", active);
        if (!active && card.dataset.listType === "bench") {
          card.setAttribute("draggable", "true");
          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", String(playerId));
            e.dataTransfer.effectAllowed = "move";
          });
        }
      }
    });
  }

  
  // ===== Bench -> Field pointer drag (mobile friendly) =====
  (function enableBenchPointerDrag(){
    let drag = null; // {id, ghost}
    function makeGhost(fromEl){
      const g = document.createElement('div');
      g.className = 'drag-ghost';
      const img = fromEl.querySelector('img')?.cloneNode();
      if (img) { img.style.width='44px'; img.style.height='44px'; img.style.borderRadius='9999px'; g.appendChild(img); }
      else { g.style.background = '#f59e0b'; }
      document.body.appendChild(g);
      return g;
    }
    function moveGhost(clientX, clientY){
      if (!drag) return;
      drag.ghost.style.left = clientX + 'px';
      drag.ghost.style.top  = clientY + 'px';
    }
    benchList.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.player-card');
      if (!card) return;
      const pid = parseInt(card.dataset.playerId, 10);
      if (Number.isNaN(pid)) return;
      e.preventDefault();
      drag = { id: pid, fromEl: card, ghost: makeGhost(card) };
    }, { passive:false });

    window.addEventListener('pointermove', (e)=>{ if (drag){ e.preventDefault(); moveGhost(e.clientX, e.clientY); } }, { passive:false });
    window.addEventListener('pointerup', (e)=>{
      if (!drag) return;
      e.preventDefault();
      const incomingId = drag.id;
      // find drop target
      const drop = document.elementFromPoint(e.clientX, e.clientY);
      const targetChip = drop?.closest?.('.draggable-player');
      if (targetChip){
        const targetId = parseInt(targetChip.dataset.playerId, 10);
        if (!Number.isNaN(targetId) && incomingId !== targetId) {
          // Perform substitution (mirror existing drop handler)
          const benchCard = benchList.querySelector(`.player-card[data-player-id="${incomingId}"]`);
          if (benchCard && !field.querySelector(`.draggable-player[data-player-id="${incomingId}"]`)) {
            const incoming = players[incomingId], outgoing = players[targetId];
            if (incoming && outgoing){
              targetChip.dataset.playerId = String(incomingId);
              targetChip.innerHTML = playerOnPitchHTML(incoming);

              benchCard.remove();
              benchList.appendChild(createPlayerCard(outgoing, targetId, "bench"));
              setLineupUsed(incomingId, true);
              setLineupUsed(targetId, false);

              if (currentMatchId) {
                const m = matchById(currentMatchId);
                if (m) {
                  m.events.push({ time: timerEl.textContent, type: "Substitution", outId: targetId, outName: `#${outgoing.number} ${outgoing.name}`, inId: incomingId, inName: `#${incoming.number} ${incoming.name}` });
                  saveMatches(matches);
                  renderEventLog();
                }
              }
              refreshEventPlayerDropdown(); renderStats();
            }
          }
        }
      } else if (drop?.closest?.('#formationField')) {
        // Drop onto empty pitch: if not already on pitch and there is space, place near drop
        if (!field.querySelector(`.draggable-player[data-player-id="${incomingId}"]`)) {
          if (field.querySelectorAll('.draggable-player').length < 9) {
            const r = field.getBoundingClientRect();
            const left = Math.max(0, Math.min(e.clientX - r.left - 36, field.clientWidth - 72)) + 'px';
            const top  = Math.max(0, Math.min(e.clientY - r.top  - 36, field.clientHeight - 72)) + 'px';
            addPlayerToField(incomingId, players[incomingId], left, top);
            const benchCard = benchList.querySelector(`.player-card[data-player-id="${incomingId}"]`);
            benchCard?.remove();
            setLineupUsed(incomingId, true);
          }
        }
      }
      drag.ghost?.remove();
      drag = null;
    }, { passive:false });
  })();

  // Drag helpers for players
  function makeDraggable(el) {
    let offsetX, offsetY;

    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
    function onMouseMove(e) { moveTo(e.clientX, e.clientY); }
    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    el.addEventListener("touchstart", (e) => { e.preventDefault();
      const t = e.touches[0];
      const rect = el.getBoundingClientRect();
      offsetX = t.clientX - rect.left;
      offsetY = t.clientY - rect.top;
    }, { passive: false });

    el.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      moveTo(t.clientX, t.clientY);
    }, { passive: false });

    function moveTo(clientX, clientY) {
      const rect = field.getBoundingClientRect();
      let x = clientX - rect.left - offsetX;
      let y = clientY - rect.top - offsetY;
      x = Math.max(0, Math.min(x, field.clientWidth - el.offsetWidth));
      y = Math.max(0, Math.min(y, field.clientHeight - el.offsetHeight));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (ballHolder === el) positionBallOnPlayer(el); // keep ball at feet
    }

    el.style.cursor = "move";
  }

  // Save / Load formation
  document.getElementById("saveFormation").addEventListener("click", () => {
    localStorage.setItem("savedFormation", JSON.stringify(takeFormationSnapshot()));
    alert("✅ Formation saved!");
  });
  document.getElementById("loadFormation").addEventListener("click", () => {
    const data = localStorage.getItem("savedFormation");
    if (!data) return alert("⚠️ No saved formation.");
    loadFormationSnapshot(JSON.parse(data));
  });
  saveFormationToMatchBtn.addEventListener("click", () => {
    if (!currentMatchId) return alert("Select or create a match first.");
    const m = matchById(currentMatchId);
    if (m) {
      m.formation = takeFormationSnapshot();
      saveMatches(matches);
      alert("📌 Attached.");
    }
  });

  const takeFormationSnapshot = () =>
    [...field.querySelectorAll(".draggable-player")].map((div) => ({
      id: div.dataset.playerId,
      left: div.style.left,
      top: div.style.top,
    }));

  function loadFormationSnapshot(formation) {
    field.querySelectorAll(".draggable-player").forEach((el) => {
      updatePlayerCardState(el.dataset.playerId, false);
      el.remove();
    });
    placementIndex = 0;
    formation.forEach((pos) => {
      const player = players[pos.id];
      if (player) addPlayerToField(pos.id, player, pos.left, pos.top);
    });
    refreshEventPlayerDropdown(); renderStats();
  }

  // Events
  function renderEventLog() {
    eventLogEl.innerHTML = "";
    if (!currentMatchId) return;
    const match = matchById(currentMatchId);
    if (!match) return;
    match.events.forEach((ev, i) => {
      const li = document.createElement("li");
      let text = "";
      if (ev.type === "Goal") {
        const assistText = ev.assistName ? ` (assist: ${ev.assistName})` : "";
        text = `[${ev.time}] Goal — ${ev.playerName}${assistText}`;
      } else if (ev.type === "Save") {
        text = `[${ev.time}] Save — ${ev.playerName}`;
      } else if (ev.type === "Card") {
        text = `[${ev.time}] ${ev.card || "Card"} — ${ev.playerName}`;
      } else if (ev.type === "Substitution") {
        text = `[${ev.time}] Sub — OUT ${ev.outName} ⇄ IN ${ev.inName}`;
      } else {
        const who = ev.playerName ? ` — ${ev.playerName}` : "";
        text = `[${ev.time}] ${ev.type}${who}`;
      }
      li.textContent = text;
      const del = document.createElement("button");
      del.textContent = "✕";
      del.className = "text-xs bg-rose-600 text-white px-1 rounded ml-2";
      del.addEventListener("click", () => {
        match.events.splice(i, 1);
        match.playSec = playSec; saveMatches(matches);
        renderEventLog(); renderStats();
      });
      li.appendChild(del);
      eventLogEl.appendChild(li);
    });
  }

  eventForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentMatchId) return alert("Please select a match first.");
    const match = matchById(currentMatchId);

    const type = eventTypeEl.value;

    const makeName = (id) => {
      const p = players[id]; return p ? `#${p.number} ${p.name}` : "";
    };

    let ev = { time: timerEl.textContent, type };

    if (type === "Goal") {
      const pid = parseInt(eventPlayerEl.value);
      if (Number.isNaN(pid)) return alert("Choose the scorer.");
      ev.playerId = pid;
      ev.playerName = makeName(pid);
      const aid = assistPlayerEl.value ? parseInt(assistPlayerEl.value) : null;
      if (aid !== null && !Number.isNaN(aid)) {
        if (aid === pid) return alert("Scorer and assist cannot be the same player.");
        ev.assistId = aid; ev.assistName = makeName(aid);
      }
    } else if (type === "Save") {
      const pid = parseInt(eventPlayerEl.value);
      if (Number.isNaN(pid)) return alert("Choose the goalkeeper.");
      ev.playerId = pid; ev.playerName = makeName(pid);
    } else if (type === "Card") {
      const pid = parseInt(eventPlayerEl.value);
      if (Number.isNaN(pid)) return alert("Choose the player.");
      ev.playerId = pid; ev.playerName = makeName(pid);
      ev.card = cardTypeEl.value || "Yellow";
    } else if (type === "Substitution") {
      const outId = parseInt(subOutEl.value);
      const inId = parseInt(subInEl.value);
      if (Number.isNaN(outId) || Number.isNaN(inId)) return alert("Choose both OUT and IN players.");
      if (outId === inId) return alert("OUT and IN cannot be the same.");
      ev.outId = outId; ev.outName = makeName(outId);
      ev.inId = inId; ev.inName = makeName(inId);
    } else {
      // Fallback: try to treat as simple player event
      const pid = parseInt(eventPlayerEl.value);
      if (!Number.isNaN(pid)) { ev.playerId = pid; ev.playerName = makeName(pid); }
    }

    match.events.push(ev);
    saveMatches(matches);
    renderEventLog();
    eventForm.reset();
    refreshEventPlayerDropdown(); renderStats();
  });

  // CSV Export
  exportCSVBtn?.addEventListener("click", () => {
    if (!currentMatchId) return alert("Please select a match first.");
    const m = matchById(currentMatchId);
    if (!m) return;

    const rows = [
      ["Match ID", "Date", "Title", "Clock", "Type", "Player", "Assist", "Card", "Out", "In"],
      ...m.events.map((ev) => [
        m.id, m.date, m.title || "", ev.time, ev.type,
        ev.playerName || "", ev.assistName || "", ev.card || "", (ev.outName || nameFrom(ev.outId) || ""), (ev.inName || nameFrom(ev.inId) || ""),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${m.date}_${(m.title || "match").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Match bindings
  if (matchSelect) matchSelect.addEventListener("change", () => setActiveMatch(matchSelect.value));
  newMatchBtn.addEventListener("click", createNewMatch);
  if (deleteMatchBtn) deleteCurrentMatch; // removed delete button

  // Playtime helpers
  function getSelectedTodayIds() {
    const ids = new Set();
    [...starterList.querySelectorAll(".player-card"), ...benchList.querySelectorAll(".player-card")].forEach((c) => {
      ids.add(parseInt(c.dataset.playerId));
    });
    return [...ids];
  }
  function fairTargetSec() {
    const totalMatch = 2 * halfLengthSec();
    const selectedCount = Math.max(1, getSelectedTodayIds().length || 9);
    return (9 * totalMatch) / selectedCount;
  }
  function updatePlaytimeWidgets() {
    const target = Math.max(1, fairTargetSec());
    players.forEach((p, i) => {
      const sec = playSec[i] || 0;
      document.querySelectorAll(`[data-pt-text="${i}"]`).forEach((el) => (el.textContent = formatTime(sec)));
      const ratio = Math.min(1, sec / target);
      document.querySelectorAll(`[data-pt-bar="${i}"]`).forEach((el) => {
        el.style.width = `${Math.round(ratio * 100)}%`;
        el.classList.remove("pt-low", "pt-mid", "pt-high");
        if (ratio < 0.5) el.classList.add("pt-low");
        else if (ratio < 0.9) el.classList.add("pt-mid");
        else el.classList.add("pt-high");
      });
    });
  }

  // Player editor modal
  openEditor.addEventListener("click", () => modal.classList.remove("hidden"));
  modal.addEventListener("click", (e) => { if (e.target.classList.contains("pe-backdrop")) modal.classList.add("hidden"); });
  window.__closePlayerEditor = () => modal.classList.add("hidden");

  // Hooks for the player editor
  window.loadPlayersData = loadPlayersData;
  window.refreshPlayersUI = function (newPlayers) {
    players = newPlayers || players;
    teamLineUpList.innerHTML = "";
    players.forEach((p, i) => teamLineUpList.appendChild(createLineupCard(p, i)));
    playSec = new Array(players.length).fill(0);
    updatePlaytimeWidgets();
    refreshEventPlayerDropdown(); renderStats();
  };

  
  // ---- Stats (per-player) ----
  function computeStatsForMatch(m) {
    const stats = players.map(() => ({ goals: 0, assists: 0, saves: 0, minutes: 0 }));
    if (!m) return stats;
    (m.events || []).forEach(ev => {
      if (ev.type === "Goal" && Number.isInteger(ev.playerId)) stats[ev.playerId].goals++;
      if (ev.type === "Goal" && Number.isInteger(ev.assistId)) stats[ev.assistId].assists++;
      if (ev.type === "Assist" && Number.isInteger(ev.playerId)) stats[ev.playerId].assists++;
      if (ev.type === "Save" && Number.isInteger(ev.playerId)) stats[ev.playerId].saves++;
    });
    const sec = m.playSec || [];
    sec.forEach((s, i) => { stats[i].minutes = Math.round((s || 0) / 60); });
    return stats;
  }

  function renderStats() {
    if (!statsBodyEl) return;
    statsBodyEl.innerHTML = "";
    if (!currentMatchId) return;
    const m = matchById(currentMatchId);
    const stats = computeStatsForMatch(m);
    // Only show players who are selected today or who have any stat > 0
    const selected = new Set(getSelectedTodayIds ? getSelectedTodayIds() : []);
    stats.forEach((st, i) => {
      const any = st.goals || st.assists || st.saves || st.minutes;
      if (!any && !selected.has(i)) return;
      const p = players[i]; if (!p) return;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-2 py-1">#${p.number} ${p.name}</td>
        <td class="px-2 py-1 text-right">${st.goals}</td>
        <td class="px-2 py-1 text-right">${st.assists}</td>
        <td class="px-2 py-1 text-right">${st.saves}</td>
        <td class="px-2 py-1 text-right">${st.minutes}</td>`;
      statsBodyEl.appendChild(tr);
    });
  }

  // Recompute stats when event type/player changes (so assists list stays fresh)
  eventTypeEl.addEventListener("change", () => setTimeout(renderStats, 0));
  eventPlayerEl.addEventListener("change", () => setTimeout(renderStats, 0));

  // ---- History modal ----
  function openHistory() {
    if (!historyModal) return;
    historyModal.classList.remove("hidden");
    renderHistoryList();
  }
  function closeHistory() {
    if (!historyModal) return;
    historyModal.classList.add("hidden");
  }
  function totalGoals(m) {
    return (m.events || []).filter(ev => ev.type === "Goal").length;
  }
  function renderHistoryList() {
    if (!historyListEl) return;
    historyListEl.innerHTML = "";
    matches.slice().sort((a,b) => a.date < b.date ? 1 : -1).forEach((m) => {
      const stats = computeStatsForMatch(m);
      const goals = totalGoals(m);
      const div = document.createElement("div");
      div.className = "border border-slate-800 rounded p-2";
      const title = `${m.date} • ${m.title || m.id}`;
      // Small summary: goals, top scorer
      let top = null, topIndex = -1;
      stats.forEach((st,i) => { if (st.goals > (top?.goals||0)) { top = st; topIndex = i; } });
      const topName = top && top.goals ? `Top scorer: #${players[topIndex]?.number} ${players[topIndex]?.name} (${top.goals})` : "";
      div.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="font-medium">${title}</div>
            <div class="text-xs opacity-80">Goals: ${goals} ${topName ? "• " + topName : ""}</div>
          </div>
          <div class="flex gap-2">
            <button class="pe-btn" data-act="print">Print Match Details</button>
            <button class="pe-btn" data-act="export">Export Match Details</button>
            <button class="pe-btn" data-act="delete">Delete</button>
          </div>
        </div>
        <details class="mt-2">
          <summary class="cursor-pointer text-sm">View details</summary>
          <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div class="font-medium text-sm mb-1">Events</div>
              <ul class="text-sm list-disc ml-5">
                ${(m.events||[]).map(ev => {
                  if (ev.type === "Goal") {
                    return `<li>[${ev.time}] Goal — ${ev.playerName}${ev.assistName ? " (assist: " + ev.assistName + ")" : ""}</li>`;
                  } else if (ev.type === "Substitution") {
                    return `<li>[${ev.time}] Sub — OUT ${ev.outName} ⇄ IN ${ev.inName}</li>`;
                  } else if (ev.type === "Card") {
                    return `<li>[${ev.time}] ${ev.card||"Card"} — ${ev.playerName}</li>`;
                  } else if (ev.type === "Save") {
                    return `<li>[${ev.time}] Save — ${ev.playerName}</li>`;
                  } else {
                    return `<li>[${ev.time}] ${ev.type} ${ev.playerName ? "— " + ev.playerName : ""}</li>`;
                  }
                }).join("")}
              </ul>
            </div>
            <div>
              <div class="font-medium text-sm mb-1">Per-player stats</div>
              <table class="text-xs w-full">
                <thead><tr><th class="text-left">Player</th><th>G</th><th>A</th><th>S</th><th>Min</th></tr></thead>
                <tbody>
                  ${stats.map((st,i) => {
                    const p = players[i]; if (!p) return "";
                    const any = st.goals || st.assists || st.saves || st.minutes;
                    if (!any) return "";
                    return `<tr><td class="text-left">#${p.number} ${p.name}</td><td class="text-center">${st.goals}</td><td class="text-center">${st.assists}</td><td class="text-center">${st.saves}</td><td class="text-center">${st.minutes}</td></tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      `;
      
      div.querySelector('[data-act="export"]').addEventListener("click", () => {
        const rows = [
          ["Match ID", "Date", "Title", "Clock", "Type", "Player", "Assist", "Card", "Out", "In"],
          ...(m.events || []).map((ev) => [
            m.id, m.date, m.title || "", ev.time, ev.type,
            ev.playerName || "", ev.assistName || "", ev.card || "", (ev.outName || nameFrom(ev.outId) || ""), (ev.inName || nameFrom(ev.inId) || ""),
          ]),
          [],
          ["— Player Minutes —"],
          ["Number", "Name", "Played (mm:ss)"],
          ...players.map((p, i) => [p.number, p.name, formatTime((m.playSec && m.playSec[i]) || 0)]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(",")).join("\\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (m.title ? m.title.replace(/\\W+/g,'_') : m.id) + "_details.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
      div.querySelector('[data-act="print"]').addEventListener("click", () => {
        const rows = (m.events || []).map((ev) => `
          <tr>
            <td>${ev.time || ""}</td>
            <td>${ev.type || ""}</td>
            <td>${ev.playerName || (ev.outName || nameFrom(ev.outId) || "")}</td>
            <td>${ev.assistName || (ev.inName || nameFrom(ev.inId) || "")}</td>
            <td>${ev.card || ""}</td>
          </tr>`).join("");

        const mins = players.map((p, i) => `
          <tr>
            <td>${p.number}</td>
            <td>${p.name}</td>
            <td>${formatTime((m.playSec && m.playSec[i]) || 0)}</td>
          </tr>`).join("");

        const w = window.open("", "_blank");
        w.document.write(`<!doctype html>
        <html><head>
          <meta charset="utf-8"/>
          <title>Match ${m.title || m.id}</title>
          <style>
            body{font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:20px;}
            h1,h2{margin:0 0 8px}
            table{border-collapse: collapse; width:100%; margin:8px 0 16px}
            th,td{border:1px solid #ddd; padding:6px; font-size:12px; text-align:left}
            .muted{color:#666; font-size:12px}
            .grid{display:grid; grid-template-columns: 1fr 1fr; gap:16px;}
          </style>
        </head><body>
          <h1>${m.title || "Match"}</h1>
          <div class="muted">${m.date}</div>
          <div class="grid">
            <div>
              <h2>Events</h2>
              <table><thead><tr><th>Clock</th><th>Type</th><th>Player</th><th>Assist/In</th><th>Card</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="5" class="muted">No events recorded</td></tr>'}</tbody></table>
            </div>
            <div>
              <h2>Player Minutes</h2>
              <table><thead><tr><th>#</th><th>Name</th><th>Played</th></tr></thead>
              <tbody>${mins}</tbody></table>
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body></html>`);
        w.document.close();
      });

      div.querySelector('[data-act="delete"]').addEventListener("click", () => {
        if (!confirm("Delete this match?")) return;
        matches = matches.filter(x => x.id !== m.id);
        saveMatches(matches);
        if (currentMatchId === m.id) { currentMatchId = null; renderEventLog(); setUIEnabled(false); }
        renderMatchOptions(); renderHistoryList();
      });
      historyListEl.appendChild(div);
    });
  }

  openHistoryBtn?.addEventListener("click", openHistory);
  closeHistoryBtn?.addEventListener("click", closeHistory);
  historyModal?.addEventListener("click", (e) => { if (e.target === historyModal) closeHistory(); });
// Initial draw
  renderTimer();
  renderRemaining();
});

// ---- Backup helpers ----
function loadLS(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } }
function saveLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function exportAll() {
  const payload = {
    matches: loadLS('matches', []),
    players: loadLS('customPlayers', null),
    formation: loadLS('savedFormation', null),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'team-manager-backup.json';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

async function importAll(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('Invalid backup');
  if ('matches' in data) saveLS('matches', data.matches ?? []);
  if ('players' in data) saveLS('customPlayers', data.players ?? null);
  if ('formation' in data) saveLS('savedFormation', data.formation ?? null);
  location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exportBtn')?.addEventListener('click', exportAll);
  document.getElementById('importInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await importAll(file); alert('Import complete.'); }
    catch (err) { console.error(err); alert('Import failed: ' + err.message); }
    finally { e.target.value = ''; }
  });
});


// === Fair Time Control (DOM-driven) ===
(function(){
  function q(sel){ return document.querySelector(sel); }
  function qa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function parseClock(txt){ if(!txt) return 0; const m=txt.match(/(\d+):(\d+)/); if(!m) return 0; return parseInt(m[1])*60+parseInt(m[2]); }
  function nameFromId(pid){
    const card = q(`#teamLineUpList .player-card[data-player-id="${pid}"] .text-xs.font-bold`);
    if (card) return card.textContent.trim();
    const chip = q(`#formationField .draggable-player[data-player-id="${pid}"] span`);
    if (chip) return chip.textContent.trim();
    return `#${pid}`;
  }

  function compute(){
    const halfInput = q('#halfLengthInput');
    const target = halfInput ? (Math.max(5, Math.min(50, parseInt(halfInput.value)||35))*60) : (35*60);
    const onIds = qa('#formationField .draggable-player').map(el => parseInt(el.dataset.playerId)).filter(Number.isFinite);
    const benchIds = qa('#benchList .player-card').map(el => parseInt(el.dataset.playerId)).filter(Number.isFinite);
    const allIds = qa('#teamLineUpList .player-card').map(el => parseInt(el.dataset.playerId)).filter(Number.isFinite);

    const secondsById = {};
    allIds.forEach(id => {
      const t = q(`[data-pt-text="${id}"]`);
      secondsById[id] = parseClock(t?.textContent||"00:00");
    });

    const under = [], over = [];
    allIds.forEach(id => {
      const sec = secondsById[id]||0;
      if (sec < target*0.6) under.push({id, sec, name: nameFromId(id)});
      else if (sec > target*1.4) over.push({id, sec, name: nameFromId(id)});
    });

    let bringOn = null, takeOff = null, fallback=false, reason=null;
    if (onIds.length === 0){ reason = "No players on the pitch yet."; }
    else {
      let candidates = benchIds.slice();
      if (candidates.length === 0){
        candidates = allIds.filter(id => !onIds.includes(id));
        fallback = candidates.length>0;
      }
      if (candidates.length === 0){
        reason = "No bench (or extra) players available.";
      } else {
        const delta = id => (target - (secondsById[id]||0)); // positive = under
        const offPick = candidates.map(id => ({id, d: delta(id)})).sort((a,b)=> b.d - a.d)[0];
        const onPick  = onIds.map(id => ({id, d: delta(id)})).sort((a,b)=> a.d - b.d)[0];
        if (offPick && onPick){ bringOn = offPick; takeOff = onPick; } else { reason = "Not enough players selected."; }
      }
    }
    return { target, under, over, bringOn, takeOff, fallback, reason };
  }

  function render(){
    const host = q('#fairtimeSummary'); if (!host) return;
    const { target, under, over, bringOn, takeOff, fallback, reason } = compute();
    const underTxt = under.slice(0,3).map(p=>`${p.name} (${pad2(Math.floor(p.sec/60))}:${pad2(p.sec%60)})`).join(', ') || '—';
    const overTxt  = over.slice(0,3).map(p=>`${p.name} (${pad2(Math.floor(p.sec/60))}:${pad2(p.sec%60)})`).join(', ') || '—';
    let sugg = `<div class="mt-1 text-slate-300">${reason || "No suggestion available."}</div>`;
    if (bringOn && takeOff){
      const need = Math.max(0, Math.round(bringOn.d/60));
      const overm = Math.max(0, Math.round((-takeOff.d)/60));
      const badge = fallback ? ' <span class="text-xs opacity-70">(from roster)</span>' : '';
      sugg = `<div class="mt-1"><div class="panel-subtitle">Suggested Sub${badge}</div>
              <div class="text-sm">IN: <b>${nameFromId(bringOn.id)}</b> (needs ~${need}m) • OUT: <b>${nameFromId(takeOff.id)}</b> (over by ~${overm}m)</div></div>`;
    }
    host.innerHTML = `<div>Target per player: <b>${Math.round(target/60)} min</b></div>
      <div class="text-rose-300 mt-1">Needs more time: ${underTxt}${under.length>3?` (+${under.length-3} more)`:``}</div>
      <div class="text-amber-300">Played too much: ${overTxt}${over.length>3?` (+${over.length-3} more)`:``}</div>
      ${sugg}`;
  }

  setInterval(render, 1000);
  window.addEventListener('load', render);
})();
// === End Fair Time Control (DOM-driven) ===
