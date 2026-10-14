(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const levelEl = document.getElementById("level");
  const stateEl = document.getElementById("game-state");
  const overlay = document.getElementById("overlay");
  const overlaySymbol = document.getElementById("overlay-symbol");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayCopy = document.getElementById("overlay-copy");
  const startBtn = document.getElementById("start-btn");

  const CELLS = 24;
  const CELL = canvas.width / CELLS;
  const STORAGE_KEY = "pixel-arcade-neon-snake-best";
  let snake, food, direction, nextDirection, score, best, running, paused, gameOver, timer, lastTick;

  try { best = Number(localStorage.getItem(STORAGE_KEY)) || 0; }
  catch (_) { best = 0; }
  bestEl.textContent = formatScore(best);
  document.getElementById("year").textContent = new Date().getFullYear();

  function formatScore(value) { return String(value).padStart(3, "0"); }
  function randomCell() { return Math.floor(Math.random() * CELLS); }

  function reset() {
    snake = [
      { x: 11, y: 12 }, { x: 10, y: 12 }, { x: 9, y: 12 },
      { x: 8, y: 12 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    paused = false;
    gameOver = false;
    running = false;
    placeFood();
    updateStats();
    draw();
    showOverlay("¿PREPARADO?", "Empieza la partida", "Recoge los orbes y evita las paredes y tu propia cola.", "▶", "JUGAR AHORA");
    stateEl.textContent = "LISTO";
  }

  function placeFood() {
    do { food = { x: randomCell(), y: randomCell() }; }
    while (snake && snake.some(part => part.x === food.x && part.y === food.y));
  }

  function updateStats() {
    scoreEl.textContent = formatScore(score);
    levelEl.textContent = String(Math.min(99, 1 + Math.floor(score / 5))).padStart(2, "0");
    bestEl.textContent = formatScore(best);
  }

  function showOverlay(kicker, title, copy, symbol, buttonText) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    overlaySymbol.textContent = symbol;
    startBtn.innerHTML = `${buttonText} <span>↗</span>`;
    overlay.classList.remove("hidden");
  }

  function start() {
    if (gameOver) reset();
    running = true;
    paused = false;
    overlay.classList.add("hidden");
    stateEl.textContent = "EN JUEGO";
    lastTick = 0;
    cancelAnimationFrame(timer);
    timer = requestAnimationFrame(loop);
  }

  function pause() {
    if (!running || gameOver) return;
    paused = !paused;
    if (paused) {
      running = false;
      stateEl.textContent = "PAUSA";
      showOverlay("PARTIDA EN PAUSA", "Tómate un respiro", "Tu partida te espera. Cuando quieras, seguimos.", "Ⅱ", "CONTINUAR");
    } else {
      start();
    }
  }

  function endGame() {
    running = false;
    gameOver = true;
    stateEl.textContent = "FIN DE PARTIDA";
    if (score > best) {
      best = score;
      try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) {}
    }
    updateStats();
    showOverlay("FIN DE PARTIDA", "¡Choque!", `Has conseguido ${score} puntos. ¿Te atreves a superar tu récord?`, "↻", "VOLVER A JUGAR");
  }

  function tick() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const ate = head.x === food.x && head.y === food.y;
    const bodyToCheck = ate ? snake : snake.slice(0, -1);

    if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS ||
        bodyToCheck.some(part => part.x === head.x && part.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (ate) {
      score += 1;
      if (score > best) best = score;
      placeFood();
      updateStats();
    } else {
      snake.pop();
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#090d1b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = "rgba(126, 145, 206, 0.075)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= CELLS; i++) {
      const p = i * CELL + .5;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
    }

    // Food orb
    const fx = (food.x + .5) * CELL, fy = (food.y + .5) * CELL;
    ctx.save();
    ctx.shadowColor = "#ff6bd6";
    ctx.shadowBlur = 24;
    const gradient = ctx.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, CELL * .42);
    gradient.addColorStop(0, "#fff2fb");
    gradient.addColorStop(.35, "#ff8fe0");
    gradient.addColorStop(1, "#ff4fc8");
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(fx, fy, CELL * .29, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Snake
    snake.forEach((part, i) => {
      const pad = i === 0 ? 2.5 : 3.5;
      const x = part.x * CELL + pad, y = part.y * CELL + pad;
      const size = CELL - pad * 2;
      ctx.save();
      ctx.shadowColor = i === 0 ? "#4df6dc" : "transparent";
      ctx.shadowBlur = i === 0 ? 18 : 0;
      const grad = ctx.createLinearGradient(x, y, x + size, y + size);
      if (i === 0) {
        grad.addColorStop(0, "#e0fff9");
        grad.addColorStop(1, "#4df6dc");
      } else {
        const alpha = Math.max(.42, 1 - i / (snake.length * 1.5));
        grad.addColorStop(0, `rgba(77,246,220,${alpha})`);
        grad.addColorStop(1, `rgba(59,181,190,${alpha})`);
      }
      ctx.fillStyle = grad;
      roundedRect(x, y, size, size, i === 0 ? 6 : 4);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = "#09201e";
        const eyeSize = 2.2;
        let eyes;
        if (direction.x === 1) eyes = [[x + size * .68, y + size * .29], [x + size * .68, y + size * .7]];
        else if (direction.x === -1) eyes = [[x + size * .3, y + size * .29], [x + size * .3, y + size * .7]];
        else if (direction.y === -1) eyes = [[x + size * .3, y + size * .3], [x + size * .7, y + size * .3]];
        else eyes = [[x + size * .3, y + size * .7], [x + size * .7, y + size * .7]];
        eyes.forEach(([ex, ey]) => { ctx.beginPath(); ctx.arc(ex, ey, eyeSize, 0, Math.PI * 2); ctx.fill(); });
      }
      ctx.restore();
    });
  }

  function loop(timestamp) {
    if (!running) return;
    const speed = Math.max(65, 145 - Math.floor(score / 4) * 8);
    if (!lastTick) lastTick = timestamp;
    if (timestamp - lastTick >= speed) {
      tick();
      draw();
      lastTick = timestamp;
    }
    if (running) timer = requestAnimationFrame(loop);
  }

  function setDirection(name) {
    const dirs = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
      left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
    };
    const candidate = dirs[name];
    if (!candidate) return;
    if (candidate.x === -direction.x && candidate.y === -direction.y) return;
    nextDirection = candidate;
    if (!running && !gameOver && overlay.classList.contains("hidden")) start();
  }

  document.addEventListener("keydown", event => {
    const keys = {
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    };
    if (keys[event.key]) {
      event.preventDefault();
      if (gameOver) return;
      setDirection(keys[event.key]);
      if (!running && !paused && overlay.classList.contains("hidden")) start();
    } else if (event.code === "Space") {
      event.preventDefault();
      if (paused) start(); else pause();
    } else if (event.key === "Enter") {
      if (gameOver) reset();
      start();
    }
  });

  startBtn.addEventListener("click", () => {
    if (paused) { start(); return; }
    if (gameOver) reset();
    start();
  });

  document.querySelectorAll("[data-dir]").forEach(button => {
    button.addEventListener("click", () => {
      if (gameOver) return;
      setDirection(button.dataset.dir);
      if (!running && !paused) start();
    });
  });

  // Swipe controls for phones and tablets.
  let touchStart = null;
  canvas.addEventListener("touchstart", event => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) {
      setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      if (!running && !paused) start();
    }
    touchStart = null;
  }, { passive: true });

  reset();
})();
