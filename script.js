const gameList = document.getElementById("gameList");
const gameCount = document.getElementById("gameCount");
const searchInput = document.getElementById("searchInput");
const activeTitle = document.getElementById("activeTitle");
const activeDescription = document.getElementById("activeDescription");
const activeCategory = document.getElementById("activeCategory");
const nowPlaying = document.getElementById("nowPlaying");
const gameFrame = document.getElementById("gameFrame");
const emptyState = document.getElementById("emptyState");
const openGameLink = document.getElementById("openGameLink");
const reloadButton = document.getElementById("reloadButton");

let allGames = [];
let activeGameId = null;
const localFallbackGames = [
  {
    id: "meteor-dodge",
    title: "Meteor Dodge",
    description: "Move left and right, dodge falling meteors, and survive as long as you can.",
    category: "Arcade",
    tags: ["reflex", "survival", "keyboard"],
    iframeSrc: "games/meteor-dodge.html"
  },
  {
    id: "pixel-painter",
    title: "Pixel Painter",
    description: "Tap tiles to match the target color sequence before the timer runs out.",
    category: "Puzzle",
    tags: ["memory", "colors", "timed"],
    iframeSrc: "games/pixel-painter.html"
  },
  {
    id: "three-in-a-row",
    title: "Three in a Row",
    description: "A clean local tic-tac-toe game for two players sharing one keyboard or mouse.",
    category: "Board",
    tags: ["classic", "2-player", "strategy"],
    iframeSrc: "games/three-in-a-row.html"
  }
];

async function loadGames() {
  try {
    if (window.location.protocol === "file:") {
      allGames = localFallbackGames;
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

  gameList.innerHTML = games.map((game) => `
    <button class="game-card ${game.id === activeGameId ? "active" : ""}" data-game-id="${game.id}" type="button">
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.description)}</p>
      <div class="card-tags">
        <span>${escapeHtml(game.category)}</span>
        ${(game.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
    </button>
  `).join("");

  gameList.querySelectorAll(".game-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectGame(button.dataset.gameId);
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

  if (!normalizedQuery) {
    return allGames;
  }

  return allGames.filter((game) => {
    const searchableText = [
      game.title,
      game.description,
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

reloadButton.addEventListener("click", () => {
  if (gameFrame.src && gameFrame.src !== "about:blank") {
    gameFrame.src = gameFrame.src;
  }
});

loadGames();
