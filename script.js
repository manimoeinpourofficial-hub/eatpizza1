// ---------------------------
//  SETUP
// ---------------------------
const c = document.getElementById("gameCanvas");
const x = c.getContext("2d");

let W = innerWidth, H = innerHeight;

// Player
let p = { x: 0, y: 0, w: 0, h: 0, scale: 1 };

// Objects
let reds = [], obs = [], greens = [], blues = [], bullets = [], buffs = [], particles = [];

// Game state
let score = 0, ammo = 0, go = false, start = false;
let prob = 0.3, item = 40, bs = 20;
let hs = +localStorage.getItem("hs") || 0;
let hunger = 0, miss = 0;
let gun = false, gunUntil = 0, shooting = false, lastShot = 0;
let pizzaCount = 0, speedBoostUntil = 0;
let gameSpeed = 1;

// Combo
let combo = 0, lastPizzaTime = 0, comboMultiplier = 1;
let comboText = "", comboTextUntil = 0;

// Screen shake
let shake = 0;

// Pause + Mode
let paused = false;
let currentMode = "normal";
const pauseMenu = document.getElementById("pauseMenu");

// ---------------------------
//  AUDIO
// ---------------------------
const makeAudio = src => {
  let a = new Audio(src);
  a.preload = "auto";
  return a;
};

const sounds = {
  pizza: [makeAudio("2.mp3"), makeAudio("3.mp3"), makeAudio("5.mp3")],
  drug: makeAudio("1.mp3"),
  weed: makeAudio("weed.mp3"),
  shit: makeAudio("4.mp3"),
  explode: makeAudio("gooz1.mp3"),
  gameOver: makeAudio("gameover.mp3")
};

const bg = makeAudio("background.mp3");
bg.loop = true;
bg.volume = 0.3;

// Sound queue
let queue = [], playing = false, cool = {};

function playSound(n) {
  if (!start) return;
  if (playing) return;

  const now = Date.now();
  if (now - (cool[n] || 0) < 500) return;
  cool[n] = now;

  let s = sounds[n];
  if (!s) return;

  let a = (Array.isArray(s) ? s[Math.random() * s.length | 0] : s).cloneNode();
  queue.push(a);
  processQueue();
}

function processQueue() {
  if (playing || !queue.length) return;
  const a = queue.shift();
  playing = true;
  a.currentTime = 0;
  a.play().catch(() => playing = false);
  a.onended = () => { playing = false; processQueue(); };
}

// ---------------------------
//  RESIZE
// ---------------------------
function R() {
  const r = devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  c.width = W * r;
  c.height = H * r;
  x.setTransform(r, 0, 0, r, 0, 0);

  let s = Math.max(60, Math.min(W * 0.25, H * 0.25));
  p.w = p.h = s;
  p.x = (W - s) / 2;
  p.y = H - s;
  item = s * 0.6;
  bs = s * 0.25;
}
R();
addEventListener("resize", R);

// ---------------------------
//  IMAGES
// ---------------------------
const I = s => { let i = new Image(); i.src = s; return i; };

const img = {
  p: I("PIZZA-KHOOR.png"),
  pg: I("pizzakhoor.png"),
  r: I("pizza1.png"),
  g: I("DRUG.png"),
  b: I("weed.webp"),
  o: I("shit.webp"),
  bu: I("bullet.png"),
  bi: I("AMMO1.PNG"),
  s: I("speed.png"),
  gun: I("gun.png")
};

// ---------------------------
//  INPUT
// ---------------------------
function move(mx) {
  p.x = Math.max(0, Math.min(mx - p.w / 2, W - p.w));
}

c.addEventListener("mousemove", e => move(e.clientX - c.getBoundingClientRect().left));
c.addEventListener("touchmove", e => move(e.touches[0].clientX - c.getBoundingClientRect().left), { passive: true });

let tc = 0, lt = 0;

c.addEventListener("touchstart", () => {
  if (!start) { start = true; bg.play(); return; }
  if (go) { reset(); return; }

  const n = Date.now();
  if (n - lt > 1000) tc = 0;
  lt = n;
  tc++;

  if (gun) shooting = true;
  else if (tc === 3) { shoot(); tc = 0; }
}, { passive: true });

c.addEventListener("touchend", () => shooting = false, { passive: true });

addEventListener("keydown", e => {
  if (e.code === "Space") {
    if (!start) { start = true; bg.play(); }
    else if (go) reset();
    else { if (gun) shooting = true; else shoot(); }
  }

  if (e.code === "KeyP" && start && !go) togglePause();
});

addEventListener("keyup", e => {
  if (e.code === "Space") shooting = false;
});

// ---------------------------
//  SHOOTING
// ---------------------------
function shoot() {
  if (ammo > 0) {
    ammo--;
    bullets.push({
      x: p.x + p.w / 2 - bs / 2,
      y: p.y - 6,
      w: bs,
      h: bs * 2,
      s: 12,
      img: img.bu
    });
  }
}

function auto() {
  const n = Date.now();
  if (n - lastShot > 90) {
    bullets.push({
      x: p.x + p.w / 2 - bs / 2,
      y: p.y - 6,
      w: bs,
      h: bs * 2,
      s: 14,
      img: img.bi
    });
    lastShot = n;
  }
}

const coll = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

// ---------------------------
//  PARTICLES
// ---------------------------
function spawnParticles(x0, y0, color, count = 6) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x0,
      y: y0,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3 - 1,
      life: 400,
      color
    });
  }
}

function updParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p0 = particles[i];
    p0.x += p0.vx;
    p0.y += p0.vy;
    p0.life -= dt;
    p0.vy += 0.05;
    if (p0.life <= 0) particles.splice(i, 1);
  }
}

// ---------------------------
//  MODE
// ---------------------------
function applyMode(mode) {
  currentMode = mode;

  if (mode === "easy") {
    gameSpeed = 0.7;
    prob = 0.25;
  } else if (mode === "normal") {
    gameSpeed = 1;
    prob = 0.3;
  } else if (mode === "hard") {
    gameSpeed = 1.4;
    prob = 0.4;
  }
}

// ---------------------------
//  RESET
// ---------------------------
function reset() {
  reds = [];
  obs = [];
  greens = [];
  blues = [];
  bullets = [];
  buffs = [];
  particles = [];

  score = 0;
  ammo = 0;
  go = false;
  hunger = 0;
  miss = 0;
  gun = false;
  shooting = false;
  pizzaCount = 0;

  combo = 0;
  comboMultiplier = 1;
  comboText = "";
  comboTextUntil = 0;

  shake = 0;

  applyMode(currentMode);
}

// ---------------------------
//  PAUSE MENU
// ---------------------------
function showPauseMenu() {
  pauseMenu.classList.remove("hidden");
}

function hidePauseMenu() {
  pauseMenu.classList.add("hidden");
}

function togglePause() {
  if (paused) {
    paused = false;
    hidePauseMenu();
    bg.play();
  } else {
    paused = true;
    showPauseMenu();
    bg.pause();
  }
}

pauseMenu.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const act = btn.getAttribute("data-action");

  if (act === "resume") togglePause();
  else if (act === "restart") { reset(); togglePause(); }
  else if (act === "modeEasy") { applyMode("easy"); reset(); togglePause(); }
  else if (act === "modeNormal") { applyMode("normal"); reset(); togglePause(); }
  else if (act === "modeHard") { applyMode("hard"); reset(); togglePause(); }
  else if (act === "quit") {
    reset();
    start = false;
    paused = false;
    hidePauseMenu();
    bg.pause();
  }
});

// ---------------------------
//  SPAWN WITH ZIGZAG
// ---------------------------
function spawn(type, imgW, imgH, chanceZig = 0.3) {
  const zig = Math.random() < chanceZig;

  return {
    x: Math.random() * (W - imgW),
    y: -imgH,
    w: imgW,
    h: imgH,
    zigzag: zig,
    dir: Math.random() < 0.5 ? -1 : 1,
    amp: 20 + Math.random() * 40,
    t: Math.random() * Math.PI * 2,
    baseX: null,
    type
  };
}

setInterval(() => start && !go && Math.random() < prob && reds.push(spawn("red", item, item)), 1500);
setInterval(() => start && !go && obs.push(spawn("obs", item * 0.8, item * 0.8)), 3000);
setInterval(() => start && !go && Math.random() < 0.2 && greens.push(spawn("green", item, item, 0.2)), 5000);
setInterval(() => start && !go && Math.random() < 0.2 && blues.push(spawn("blue", item, item, 0.2)), 7000);
setInterval(() => start && !go && Math.random() < 0.15 && buffs.push(spawn("speed", item, item, 0.25)), 8000);
setInterval(() => start && !go && Math.random() < 0.12 && buffs.push(spawn("gun", item, item, 0.25)), 9000);

// ---------------------------
//  HARDER OVER TIME
// ---------------------------
setInterval(() => {
  if (start && !go && !paused) {
    gameSpeed += (currentMode === "easy" ? 0.01 : currentMode === "hard" ? 0.03 : 0.02);
  }
}, 2000);

// ---------------------------
//  COMBO
// ---------------------------
function handleComboPizzaTake() {
  const now = Date.now();

  if (now - lastPizzaTime < 2000) combo++;
  else combo = 1;

  lastPizzaTime = now;

  if (combo >= 10) { comboMultiplier = 3; comboText = "MEGA COMBO x3!"; }
  else if (combo >= 6) { comboMultiplier = 2; comboText = "BIG COMBO x2!"; }
  else if (combo >= 3) { comboMultiplier = 1.5; comboText = "COMBO x1.5"; }
  else { comboMultiplier = 1; comboText = ""; }

  if (comboText) comboTextUntil = now + 1500;
}

function breakCombo() {
  combo = 0;
  comboMultiplier = 1;
  comboText = "";
  comboTextUntil = 0;
}

// ---------------------------
//  ZIGZAG
// ---------------------------
function applyZigzag(o, sp) {
  if (!o.zigzag) return;
  if (o.baseX == null) o.baseX = o.x;
  o.t += 0.08 * sp;
  o.x = o.baseX + Math.sin(o.t) * o.amp * o.dir;
}

// ---------------------------
//  UPDATE
// ---------------------------
function upd() {
  if (!start || go || paused) return;

  const now = Date.now();
  let sp = gameSpeed;
  if (now < speedBoostUntil) sp *= 1.8;

  const dt = 16;

  // REDS
  reds.forEach((r, i) => {
    r.y += 2 * sp;
    applyZigzag(r, sp);

    if (coll(p, r)) {
      handleComboPizzaTake();
      let gained = 5 * comboMultiplier;
      score += Math.round(gained);

      if (score > hs) {
        hs = score;
        localStorage.setItem("hs", hs);
      }

      pizzaCount++;
      if (pizzaCount % 2 === 0) ammo++;

      spawnParticles(r.x + r.w / 2, r.y + r.h / 2, "orange", 10);
      p.scale = 1.2;
      setTimeout(() => p.scale = 1, 150);

      reds.splice(i, 1);
      playSound("pizza");
    } 
    else if (r.y > H) {
      reds.splice(i, 1);
      miss++;
      breakCombo();

      if (miss >= 3) {
        go = true;
        playSound("gameOver");
        shake = 20;
      }
    }
  });

  // ---------------------------
  // OBSTACLES
  // ---------------------------
  obs.forEach((o, i) => {
    o.y += 2.2 * sp;
    applyZigzag(o, sp);

    if (coll(p, o)) {
      go = true;
      playSound("shit");
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "red", 15);
      shake = 20;
    } 
    else if (o.y > H) {
      obs.splice(i, 1);
    }
  });

  // ---------------------------
  // GREENS
  // ---------------------------
  greens.forEach((g, i) => {
    g.y += 1.8 * sp;
    applyZigzag(g, sp);

    if (coll(p, g)) {
      hunger = Math.max(0, hunger - 15);
      prob = Math.max(0, prob * 0.85);

      greens.splice(i, 1);
      spawnParticles(g.x + g.w / 2, g.y + g.h / 2, "#00ff99", 8);
      playSound("drug");
    }
  });

  // ---------------------------
  // BLUES
  // ---------------------------
  blues.forEach((b, i) => {
    b.y += 1.6 * sp;
    applyZigzag(b, sp);

    if (coll(p, b)) {
      hunger = Math.min(100, hunger + 10);
      prob = Math.min(1, prob * 1.1);

      blues.splice(i, 1);
      spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#00ccff", 8);
      playSound("weed");
    }
  });

  // ---------------------------
  // BUFFS
  // ---------------------------
  buffs.forEach((bf, i) => {
    bf.y += 2 * sp;
    applyZigzag(bf, sp);

    if (coll(p, bf)) {
      if (bf.t === "speed") {
        speedBoostUntil = now + 10000;
        if (miss > 0) miss--;
        spawnParticles(bf.x + bf.w / 2, bf.y + bf.h / 2, "yellow", 10);
      }

      if (bf.t === "gun") {
        gun = true;
        gunUntil = now + 10000;
        spawnParticles(bf.x + bf.w / 2, bf.y + bf.h / 2, "#ffff00", 10);
      }

      buffs.splice(i, 1);
    } 
    else if (bf.y > H) {
      buffs.splice(i, 1);
    }
  });

  // ---------------------------
  // BULLETS
  // ---------------------------
  bullets.forEach((b, i) => {
    b.y -= b.s;

    if (b.y + b.h < 0) {
      bullets.splice(i, 1);
      return;
    }

    obs.forEach((o, j) => {
      if (coll(b, o)) {
        obs.splice(j, 1);
        score += 3;

        bullets.splice(i, 1);
        spawnParticles(o.x + o.w / 2, o.y + o.h / 2, "#ff6600", 12);
        playSound("explode");
        shake = 10;
      }
    });
  });

  // ---------------------------
  // GUN AUTO FIRE
  // ---------------------------
  if (gun) {
    if (now > gunUntil) gun = false;
    else if (shooting) auto();
  }

  // ---------------------------
  // PARTICLES
  // ---------------------------
  updParticles(dt);

  // ---------------------------
  // COMBO TIMEOUT
  // ---------------------------
  if (combo > 0 && now - lastPizzaTime > 2500) breakCombo();
}

function draw() {
  x.save();
  x.clearRect(0, 0, W, H);

  // Screen shake
  if (shake > 0) {
    x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.9;
    if (shake < 0.5) shake = 0;
  }

  // Start screen
  if (!start) {
    x.fillStyle = "#222";
    x.fillRect(0, 0, W, H);

    x.fillStyle = "#fff";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = "26px Arial";

    x.fillText("Eat Pizza - Anfo Arcade", W / 2, H / 2 - 50);
    x.fillText("Start: Tap or Space", W / 2, H / 2 - 10);
    x.fillText("Missed pizzas: lose", W / 2, H / 2 + 20);
    x.fillText("High: " + hs, W / 2, H / 2 + 50);

    x.restore();
    return;
  }

  // Player
  x.save();
  x.translate(p.x + p.w / 2, p.y + p.h / 2);
  x.scale(p.scale || 1, p.scale || 1);
  x.drawImage(gun ? img.pg : img.p, -p.w / 2, -p.h / 2, p.w, p.h);
  x.restore();

  // Objects
  reds.forEach(r => x.drawImage(img.r, r.x, r.y, r.w, r.h));
  greens.forEach(g => x.drawImage(img.g, g.x, g.y, g.w, g.h));
  blues.forEach(b => x.drawImage(img.b, b.x, b.y, b.w, b.h));
  obs.forEach(o => x.drawImage(img.o, o.x, o.y, o.w, o.h));
  buffs.forEach(bf => x.drawImage(bf.t === "speed" ? img.s : img.gun, bf.x, bf.y, bf.w, bf.h));

  // Bullets
  bullets.forEach(b => {
    x.drawImage(b.img, b.x, b.y, b.w, b.h);
    x.fillStyle = "rgba(255,255,0,0.4)";
    x.fillRect(b.x + b.w / 4, b.y + b.h, b.w / 2, 15);
  });

  // Particles
  particles.forEach(p0 => {
    x.fillStyle = p0.color;
    x.globalAlpha = Math.max(0, p0.life / 400);
    x.beginPath();
    x.arc(p0.x, p0.y, 4, 0, Math.PI * 2);
    x.fill();
    x.globalAlpha = 1;
  });

  // UI
  x.fillStyle = "rgba(0,0,0,0.5)";
  x.fillRect(0, 0, W, 40);

  x.fillStyle = "#fff";
  x.textAlign = "left";
  x.textBaseline = "middle";
  x.font = "15px Arial";

  x.fillText("Score: " + score, 12, 20);
  x.fillText("High: " + hs, 100, 20);
  x.fillText("Ammo: " + (gun ? "∞" : ammo), 200, 20);
  x.fillText("Hunger: " + hunger + "%", 300, 20);
  x.fillText("Missed: " + miss + "/3", 420, 20);
  x.fillText("Speed: " + gameSpeed.toFixed(1), 520, 20);
  x.fillText("Mode: " + currentMode.toUpperCase(), 620, 20);

  // Combo text
  if (comboText && Date.now() < comboTextUntil) {
    x.textAlign = "center";
    x.font = "24px Arial";
    x.fillStyle = "#ffdd33";
    x.fillText(comboText, W / 2, 70);
  }

  // Game Over
  if (go) {
    x.fillStyle = "rgba(0,0,0,0.6)";
    x.fillRect(0, 0, W, H);

    x.fillStyle = "#fff";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = "40px Arial";
    x.fillText("Game Over", W / 2, H / 2 - 20);

    x.font = "20px Arial";
    x.fillText("Tap/Space Restart", W / 2, H / 2 + 20);
    x.fillText("High: " + hs, W / 2, H / 2 + 60);
  }

  x.restore();
}

// ---------------------------
//  GAME LOOP
// ---------------------------
(function loop() {
  upd();
  draw();
  requestAnimationFrame(loop);
})();

// Default mode
applyMode("normal");
reset();
