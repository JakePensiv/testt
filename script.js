const gameList = document.getElementById("gameList");
const gameCount = document.getElementById("gameCount");
const sectionFilters = document.getElementById("sectionFilters");
const searchInput = document.getElementById("searchInput");
const activeTitle = document.getElementById("activeTitle");
const activeDescription = document.getElementById("activeDescription");
const activeCategory = document.getElementById("activeCategory");
const nowPlaying = document.getElementById("nowPlaying");
const gameFrame = document.getElementById("gameFrame");
const emptyState = document.getElementById("emptyState");
const openGameLink = document.getElementById("openGameLink");
const reloadButton = document.getElementById("reloadButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const approvedMessages = document.getElementById("approvedMessages");
const approvedCount = document.getElementById("approvedCount");
const pendingMessages = document.getElementById("pendingMessages");
const pendingCount = document.getElementById("pendingCount");
const chatForm = document.getElementById("chatForm");
const chatName = document.getElementById("chatName");
const chatMessage = document.getElementById("chatMessage");
const chatStatus = document.getElementById("chatStatus");
const ownerModeButton = document.getElementById("ownerModeButton");
const ownerPanel = document.getElementById("ownerPanel");
const accessGate = document.getElementById("accessGate");
const gateForm = document.getElementById("gateForm");
const gateCode = document.getElementById("gateCode");
const gateStatus = document.getElementById("gateStatus");
const logoutButton = document.getElementById("logoutButton");

let allGames = [];
let activeGameId = null;
let activeSection = "All";
const chatStorageKey = "arcadePortal.chatStore";
const chatOwnerModeKey = "arcadePortal.ownerMode";
const gateStorageKey = "arcadePortal.accessGranted";
const chatCooldownMs = 30 * 1000;
const bannedWords = ["slur1", "slur2", "hateword"];
const accessCode = "UNBLOCKEDGAMES";
let chatStore = loadChatStore();
const localFallbackGames = [
  {
    id: "meteor-dodge",
    title: "Meteor Dodge",
    description: "Move left and right, dodge falling meteors, and survive as long as you can.",
    section: "Local Games provided by Arcade Portal",
    category: "Arcade",
    tags: ["reflex", "survival", "keyboard"],
    iframeSrc: "games/meteor-dodge.html"
  },
  {
    id: "pixel-painter",
    title: "Pixel Painter",
    description: "Tap tiles to match the target color sequence before the timer runs out.",
    section: "Local Games provided by Arcade Portal",
    category: "Puzzle",
    tags: ["memory", "colors", "timed"],
    iframeSrc: "games/pixel-painter.html"
  },
  {
    id: "three-in-a-row",
    title: "Three in a Row",
    description: "A clean local tic-tac-toe game for two players sharing one keyboard or mouse.",
    section: "Local Games provided by Arcade Portal",
    category: "Board",
    tags: ["classic", "2-player", "strategy"],
    iframeSrc: "games/three-in-a-row.html"
  }
];

function generateId() {
  return window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createSeedMessages() {
  return [
    {
      id: generateId(),
      name: "PortalHost",
      text: "Welcome to the arcade. Keep messages short, kind, and school-appropriate.",
      status: "approved",
      createdAt: Date.now() - 1000 * 60 * 50
    },
    {
      id: generateId(),
      name: "GameScout",
      text: "Meteor Dodge feels way better in landscape on phones.",
      status: "approved",
      createdAt: Date.now() - 1000 * 60 * 18
    }
  ];
}

function loadChatStore() {
  try {
    const raw = localStorage.getItem(chatStorageKey);
    const parsed = raw ? JSON.parse(raw) : null;

    if (parsed && Array.isArray(parsed.messages)) {
      return parsed;
    }
  } catch (error) {
    console.warn("Unable to load chat store", error);
  }

  return {
    lastSubmittedAt: 0,
    messages: createSeedMessages()
  };
}

function saveChatStore() {
  localStorage.setItem(chatStorageKey, JSON.stringify(chatStore));
}

function renderChat() {
  const approved = chatStore.messages
    .filter((message) => message.status === "approved")
    .sort((left, right) => right.createdAt - left.createdAt);
  const pending = chatStore.messages
    .filter((message) => message.status === "pending")
    .sort((left, right) => left.createdAt - right.createdAt);

  approvedCount.textContent = `${approved.length} live`;
  pendingCount.textContent = `${pending.length} waiting`;
  approvedMessages.innerHTML = approved.length > 0
    ? approved.map((message) => renderMessageCard(message)).join("")
    : '<div class="empty-feed">No approved posts yet. Submit the first one for review.</div>';

  pendingMessages.innerHTML = pending.length > 0
    ? pending.map((message) => renderMessageCard(message, true)).join("")
    : '<div class="empty-feed">The moderation queue is clear.</div>';

  pendingMessages.querySelectorAll("[data-approve-id]").forEach((button) => {
    button.addEventListener("click", () => updateMessageStatus(button.dataset.approveId, "approved"));
  });

  pendingMessages.querySelectorAll("[data-reject-id]").forEach((button) => {
    button.addEventListener("click", () => updateMessageStatus(button.dataset.rejectId, "rejected"));
  });

  ownerPanel.hidden = localStorage.getItem(chatOwnerModeKey) !== "true";
  ownerModeButton.textContent = ownerPanel.hidden ? "Owner Tools" : "Hide Owner Tools";
}

function renderMessageCard(message, showActions = false) {
  const badgeClass = message.status === "approved" ? "approved" : message.status === "pending" ? "pending" : "rejected";

  return `
    <article class="message-card">
      <div class="message-meta">
        <div>
          <h4>${escapeHtml(message.name)}</h4>
          <span class="message-time">${formatTimestamp(message.createdAt)}</span>
        </div>
        <span class="message-badge ${badgeClass}">${message.status}</span>
      </div>
      <p>${escapeHtml(message.text)}</p>
      ${showActions ? `
        <div class="message-actions">
          <button type="button" data-approve-id="${message.id}">Approve</button>
          <button type="button" class="reject-button" data-reject-id="${message.id}">Reject</button>
        </div>
      ` : ""}
    </article>
  `;
}

function updateMessageStatus(messageId, status) {
  chatStore.messages = chatStore.messages.map((message) => (
    message.id === messageId ? { ...message, status } : message
  ));
  saveChatStore();
  renderChat();
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(timestamp);
}

function containsBlockedWord(text) {
  const normalized = text.toLowerCase();
  return bannedWords.some((word) => normalized.includes(word));
}

function setChatStatus(message, isError = false) {
  chatStatus.textContent = message;
  chatStatus.style.color = isError ? "#8f2d23" : "";
}

function setGateOpen(isOpen) {
  accessGate.classList.toggle("hidden", !isOpen);
  document.body.classList.toggle("gate-open", isOpen);

  if (isOpen) {
    gateCode.focus();
  }
}

function unlockSite() {
  sessionStorage.setItem(gateStorageKey, "true");
  setGateOpen(false);
}

function lockSite() {
  sessionStorage.removeItem(gateStorageKey);
  gateForm.reset();
  gateStatus.textContent = "Access is stored only in this browser.";
  gateStatus.style.color = "";
  setGateOpen(true);
}

async function loadGames() {
  try {
    if (window.location.protocol === "file:") {
      allGames = localFallbackGames;
      renderSectionFilters();
      renderGameList(allGames);

      if (allGames.length > 0) {
        selectGame(allGames[0].id);
      }

      return;
    }

    const response = await fetch("games.json");

    if (!response.ok) {
      throw new Error(`Unable to load catalog (${response.status})`);
    }

    const payload = await response.json();
    allGames = Array.isArray(payload.games) ? payload.games : [];
    renderSectionFilters();
    renderGameList(allGames);

    if (allGames.length > 0) {
      selectGame(allGames[0].id);
    }
  } catch (error) {
    gameList.innerHTML = `<div class="status-message">${error.message}. If you opened this page directly from disk, run it through a small local server so the browser can fetch <code>games.json</code>.</div>`;
    gameCount.textContent = "0 loaded";
  }
}

function renderGameList(games) {
  gameCount.textContent = `${games.length} loaded`;

  if (games.length === 0) {
    gameList.innerHTML = '<div class="status-message">No games match your search.</div>';
    return;
  }

  const groupedGames = games.reduce((groups, game) => {
    const section = game.section || "General";

    if (!groups[section]) {
      groups[section] = [];
    }

    groups[section].push(game);
    return groups;
  }, {});

  gameList.innerHTML = Object.entries(groupedGames).map(([section, sectionGames]) => `
    <div class="game-group">
      <p class="game-group-label">${escapeHtml(section)}</p>
      ${sectionGames.map((game) => `
        <button class="game-card ${game.id === activeGameId ? "active" : ""}" data-game-id="${game.id}" type="button">
          <h3>${escapeHtml(game.title)}</h3>
          <p>${escapeHtml(game.description)}</p>
          <div class="card-tags">
            <span>${escapeHtml(game.category)}</span>
            ${(game.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
        </button>
      `).join("")}
    </div>
  `).join("");

  gameList.querySelectorAll(".game-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectGame(button.dataset.gameId);
    });
  });
}

function renderSectionFilters() {
  const sections = ["All", ...new Set(allGames.map((game) => game.section || "General"))];

  sectionFilters.innerHTML = sections.map((section) => `
    <button class="section-filter ${section === activeSection ? "active" : ""}" data-section="${escapeHtml(section)}" type="button">
      ${escapeHtml(section)}
    </button>
  `).join("");

  sectionFilters.querySelectorAll(".section-filter").forEach((button) => {
    button.addEventListener("click", () => {
      activeSection = button.dataset.section;
      renderSectionFilters();
      renderGameList(filterGames(searchInput.value));
    });
  });
}

function selectGame(gameId) {
  const game = allGames.find((item) => item.id === gameId);

  if (!game) {
    return;
  }

  activeGameId = game.id;
  activeTitle.textContent = game.title;
  activeDescription.textContent = game.description;
  activeCategory.textContent = game.category;
  nowPlaying.textContent = game.title;
  gameFrame.src = game.iframeSrc;
  gameFrame.style.display = "block";
  emptyState.style.display = "none";
  openGameLink.href = game.iframeSrc;
  renderGameList(filterGames(searchInput.value));
}

function filterGames(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const sectionFilteredGames = allGames.filter((game) => (
    activeSection === "All" || (game.section || "General") === activeSection
  ));

  if (!normalizedQuery) {
    return sectionFilteredGames;
  }

  return sectionFilteredGames.filter((game) => {
    const searchableText = [
      game.title,
      game.description,
      game.section || "General",
      game.category,
      ...(game.tags || [])
    ].join(" ").toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

searchInput.addEventListener("input", (event) => {
  renderGameList(filterGames(event.target.value));
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = chatName.value.trim();
  const text = chatMessage.value.trim();
  const now = Date.now();

  if (!name || !text) {
    setChatStatus("Add both a nickname and a message before submitting.", true);
    return;
  }

  if (now - chatStore.lastSubmittedAt < chatCooldownMs) {
    setChatStatus("Please wait a few seconds before posting again.", true);
    return;
  }

  if (containsBlockedWord(text)) {
    setChatStatus("That message was blocked by the word filter.", true);
    return;
  }

  chatStore.lastSubmittedAt = now;
  chatStore.messages.unshift({
    id: generateId(),
    name,
    text,
    status: "pending",
    createdAt: now
  });
  saveChatStore();
  renderChat();
  chatForm.reset();
  setChatStatus("Thanks. Your post is now waiting for approval.");
});

gateForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const submittedCode = gateCode.value.trim().toUpperCase().replaceAll(" ", "");

  if (submittedCode !== accessCode) {
    gateStatus.textContent = "That passcode did not match. Try again.";
    gateStatus.style.color = "#8f2d23";
    gateCode.select();
    return;
  }

  unlockSite();
});

reloadButton.addEventListener("click", () => {
  if (gameFrame.src && gameFrame.src !== "about:blank") {
    gameFrame.src = gameFrame.src;
  }
});

fullscreenButton.addEventListener("click", async () => {
  if (!gameFrame.src || gameFrame.src === "about:blank") {
    return;
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await document.querySelector(".player-frame-wrap").requestFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
});

ownerModeButton.addEventListener("click", () => {
  const nextValue = localStorage.getItem(chatOwnerModeKey) === "true" ? "false" : "true";
  localStorage.setItem(chatOwnerModeKey, nextValue);
  renderChat();
});

logoutButton.addEventListener("click", () => {
  lockSite();
});

setGateOpen(sessionStorage.getItem(gateStorageKey) !== "true");
renderChat();
loadGames();
