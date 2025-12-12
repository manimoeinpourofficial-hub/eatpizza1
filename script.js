// ---------------------------
//  BASIC SETUP
// ---------------------------
const c = document.getElementById("gameCanvas");
const x = c.getContext("2d");

let W = innerWidth, H = innerHeight;

let p = { x: 0, y: 0, w: 0, h: 0, scale: 1 };

let reds = [], obs = [], greens = [], blues = [], bullets = [], buffs = [], particles = [];

let score = 0, ammo = 0, go = false, start = false;
let prob = 0.3, item = 40, bs = 20;
let hs = +localStorage.getItem("hs") || 0;
let hunger = 0, miss = 0;

let pizzaCount = 0;
let speedBoostUntil = 0;
let gameSpeed = 1;

// Combo
let combo = 0, lastPizzaTime = 0, comboMultiplier = 1;
let comboText = "", comboTextUntil = 0;

// Screen shake
let shake = 0;

// Pause / Mode / Settings
let paused = false;
let currentMode = "normal";
let soundOn = true;

// DOM refs
const pauseMenu = document.getElementById("pauseMenu");
const pauseTitle = document.getElementById("pauseTitle");
const pauseMain = document.getElementById("pauseMain");
const pauseSettings = document.getElementById("pauseSettings");
const soundStateSpan = document.getElementById("soundState");
const pauseBtn = document.getElementById("pauseBtn");

const hudScore = document.getElementById("hudScore");
const hudHigh = document.getElementById("hudHigh");
const hudAmmo = document.getElementById("hudAmmo");
const hudHunger = document.getElementById("hudHunger");
const hudMiss = document.getElementById("hudMiss");
const hudSpeed = document.getElementById("hudSpeed");
const hudMode = document.getElementById("hudMode");

// START MENU refs
const startMenu = document.getElementById("startMenu");
const startGameBtn = document.getElementById("startGameBtn");
const startLogo = document.getElementById("startLogo");

function updateSoundStateText() {
  if (!soundStateSpan) return;
  soundStateSpan.textContent = soundOn ? "On" : "Off";
}
updateSoundStateText();

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

let queue = [], playing = false, cool = {};

function playSound(n) {
  if (!start || !soundOn) return;
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
  r: I("pizza1.png"),
  g: I("DRUG.png"),
  b: I("weed.webp"),
  o: I("shit.webp"),
  bu: I("bullet.png"),
  s: I("speed.png")
};

// ---------------------------
//  START MENU LOGIC
// ---------------------------
if (startGameBtn) {
  startGameBtn.addEventListener("click", () => {
    if (startMenu) startMenu.style.display = "none";
    start = true;
    if (soundOn) bg.play();
  });
}

// ---------------------------
//  INPUT + CHEATS
// ---------------------------
function move(mx) {
  p.x = Math.max(0, Math.min(mx - p.w / 2, W - p.w));
}

c.addEventListener("mousemove", e => move(e.clientX - c.getBoundingClientRect().left));
c.addEventListener("touchmove", e => move(e.touches[0].clientX - c.getBoundingClientRect().left), { passive: true });

// دابل‌تپ برای شلیک روی موبایل
let lastTapTime = 0;

// برای چیت 1: ذخیره زمان کلیک‌ها (کیبورد + تاچ)
let inputTimes = [];

// ✅ CHEAT 1: 20 inputs in 5 seconds → +30 ammo
function registerInputForCheat() {
  const now = Date.now();
  inputTimes.push(now);
  inputTimes = inputTimes.filter(t => now - t <= 5000);

  if (inputTimes.length >= 20) {
    ammo += 30;
    spawnParticles(p.x + p.w / 2, p.y, "gold", 25);
    inputTimes = [];
  }
}

// ✅ CHEAT 2 DESKTOP: Type "anfo"
let cheatBuffer = "";

addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  cheatBuffer += k;
  if (cheatBuffer.length > 4) cheatBuffer = cheatBuffer.slice(-4);

  if (cheatBuffer === "anfo") {
    ammo += 50;
    speedBoostUntil = Date.now() + 5000;
    spawnParticles(p.x + p.w / 2, p.y, "yellow", 40);
    cheatBuffer = "";
  }
});

// ✅ CHEAT 3 MOBILE: Swipe pattern LR → DU → RL → UD
let swipeState = [];
let touchStartX = 0, touchStartY = 0;
let touchActive = false;

function addSwipeDir(dir) {
  swipeState.push(dir);
  if (swipeState.length > 4) swipeState = swipeState.slice(-4);
  const pattern = swipeState.join("-");
  if (pattern === "LR-DU-RL-UD") {
    ammo += 50;
    speedBoostUntil = Date.now() + 5000;
    spawnParticles(p.x + p.w / 2, p.y, "yellow", 40);
    swipeState = [];
  }
}

c.addEventListener("touchstart", e => {
  const t = e.touches[0];
  const rect = c.getBoundingClientRect();
  const x0 = t.clientX - rect.left;
  const y0 = t.clientY - rect.top;

  // کنترل شروع بازی و ریست
  if (!start) { start = true; if (soundOn) bg.play(); if (startMenu) startMenu.style.display = "none"; return; }
  if (go) { reset(); return; }

  // دابل‌تپ برای شلیک
  const now = Date.now();
  if (now - lastTapTime < 300) {
    shootSingle();
  }
  lastTapTime = now;

  // برای چیت 1
  registerInputForCheat();

  // برای سوایپ
  touchActive = true;
  touchStartX = x0;
  touchStartY = y0;
}, { passive: true });

c.addEventListener("touchend", e => {
  if (!touchActive) return;
  const rect = c.getBoundingClientRect();
  const changed = e.changedTouches[0];
  const x1 = changed.clientX - rect.left;
  const y1 = changed.clientY - rect.top;

  const dx = x1 - touchStartX;
  const dy = y1 - touchStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const minDist = 50;

  if (absX < minDist && absY < minDist) {
    touchActive = false;
    return;
  }

  if (absX > absY) {
    if (dx > 0) addSwipeDir("LR");
    else addSwipeDir("RL");
  } else {
    if (dy < 0) addSwipeDir("DU");
    else addSwipeDir("UD");
  }

  touchActive = false;
});

addEventListener("keydown", e => {
  if (e.code === "Space") {
    if (!start) {
      start = true;
      if (soundOn) bg.play();
      if (startMenu) startMenu.style.display = "none";
    } else if (go) {
      reset();
    } else {
      shootSingle();
    }

    registerInputForCheat();
  }

  if (e.code === "KeyP" && start && !go) togglePause();
});

// دکمه Pause موبایل
if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    if (!start || go) return;
    togglePause();
  });
}

// ---------------------------
//  SHOOTING
// ---------------------------
function shootSingle() {
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
//  MODE (نرم‌تر شده)
// ---------------------------
function applyMode(mode) {
  currentMode = mode;

  if (mode === "easy") {
    gameSpeed = 0.6;
    prob = 0.18;
  } else if (mode === "normal") {
    gameSpeed = 0.9;
    prob = 0.25;
  } else if (mode === "hard") {
    gameSpeed = 1.2;
    prob = 0.3;
  }
}

// ---------------------------
//  RESET
// ---------------------------
let nextRed = 0;
let nextObs = 0;
let nextGreen = 0;
let nextBlue = 0;
let nextBuff = 0;

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
  pizzaCount = 0;

  combo = 0;
  comboMultiplier = 1;
  comboText = "";
  comboTextUntil = 0;

  shake = 0;

  applyMode(currentMode);

  const now = Date.now();
  nextRed = now;
  nextObs = now;
  nextGreen = now + 2000;
  nextBlue = now + 3000;
  nextBuff = now + 4000;
}

// ---------------------------
//  PAUSE / SETTINGS
// ---------------------------
function showPauseMenu() {
  if (pauseMenu) pauseMenu.classList.remove("hidden");
}
function hidePauseMenu() {
  if (pauseMenu) pauseMenu.classList.add("hidden");
}

function togglePause() {
  if (paused) {
    paused = false;
    hidePauseMenu();
    if (soundOn) bg.play();
  } else {
    paused = true;
    showPauseMenu();
    bg.pause();
    if (pauseMain && pauseSettings && pauseTitle) {
      pauseMain.style.display = "block";
      pauseSettings.style.display = "none";
      pauseTitle.textContent = "Paused";
    }
  }
}

if (pauseMenu) {
  pauseMenu.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const act = btn.getAttribute("data-action");

    if (act === "resume") {
      togglePause();
    } else if (act === "restart") {
      reset();
      togglePause();
    } else if (act === "modeEasy") {
      applyMode("easy");
      reset();
      togglePause();
    } else if (act === "modeNormal") {
      applyMode("normal");
      reset();
      togglePause();
    } else if (act === "modeHard") {
      applyMode("hard");
      reset();
      togglePause();
    } else if (act === "quit") {
      reset();
      start = false;
      paused = false;
      hidePauseMenu();
      bg.pause();
      if (startMenu) startMenu.style.display = "flex";
    } else if (act === "settings") {
      if (pauseMain && pauseSettings && pauseTitle) {
        pauseMain.style.display = "none";
        pauseSettings.style.display = "block";
        pauseTitle.textContent = "Settings";
      }
    } else if (act === "backFromSettings") {
      if (pauseMain && pauseSettings && pauseTitle) {
        pauseSettings.style.display = "none";
        pauseMain.style.display = "block";
        pauseTitle.textContent = "Paused";
      }
    } else if (act === "toggleSound") {
      soundOn = !soundOn;
      updateSoundStateText();
      if (!soundOn) bg.pause();
      else if (start && !go && !paused) bg.play();
    }
  });
}

// ---------------------------
//  SPAWN SYSTEM
// ---------------------------
function spawn(type, w, h, chanceZig = 0.3) {
  const zig = Math.random() < chanceZig;
  return {
    x: Math.random() * (W - w),
    y: -h,
    w,
    h,
    zigzag: zig,
    dir: Math.random() < 0.5 ? -1 : 1,
    amp: 20 + Math.random() * 40,
    t: Math.random() * Math.PI * 2,
    baseX: null,
    tType: type
  };
}

// ---------------------------
//  HARDER OVER TIME (نرم‌تر)
// ---------------------------
setInterval(() => {
  if (start && !go && !paused) {
    gameSpeed += (currentMode === "easy" ? 0.005 : currentMode === "hard" ? 0.02 : 0.01);
    if (gameSpeed > 3) gameSpeed = 3;
  }
}, 3000);

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
//  UPDATE (قسمت اول)
// ---------------------------
function upd() {
  if (!start || go || paused) return;

  const now = Date.now();
  let sp = gameSpeed;
  if (now < speedBoostUntil) sp *= 1.8;
  const dt = 16;

  // اسپان‌ها بر اساس زمان
  if (now > nextRed) {
    reds.push(spawn("red", item, item));
    nextRed = now + 1500 / sp;
  }

  if (now > nextObs) {
    if (Math.random() < 0.7) {
      obs.push(spawn("obs", item * 0.8, item * 0.8));
    }
    nextObs = now + 3500 / sp;
  }

  if (now > nextGreen && Math.random() < 0.2) {
    greens.push(spawn("green", item, item, 0.2));
    nextGreen = now + 5000;
  }

  if (now > nextBlue && Math.random() < 0.2) {
    blues.push(spawn("blue", item, item, 0.2));
    nextBlue = now + 7000;
  }

  if (now > nextBuff && Math.random() < 0.25) {
    buffs.push(spawn("speed", item, item, 0.25));
    nextBuff = now + 7000;
  }

  // Reds (pizza)
  reds.forEach((r, i) => {
    r.y += 1.6 * sp;
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
    } else if (r.y > H) {
      reds.splice(i, 1);
      miss++;
      breakCombo();
      if (miss >= (currentMode === "easy" ? 5 : 3)) {
        go = true;
        playSound("gameOver");
        shake = 20;
      }
    }
  });
    // Obstacles
  obs.forEach((o, i) => {
    o.y += 1.9 * sp;
    applyZigzag(o, sp);

    if (coll(p, o)) {
      go = true;
      playSound("shit");
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "red", 15);
      shake = 20;
    } else if (o.y > H) {
      obs.splice(i, 1);
    }
  });

  // Greens
  greens.forEach((g, i) => {
    g.y += 1.4 * sp;
    applyZigzag(g, sp);

    if (coll(p, g)) {
      hunger = Math.max(0, hunger - 15);
      prob = Math.max(0, prob * 0.85);
      greens.splice(i, 1);
      spawnParticles(g.x + g.w / 2, g.y + g.h / 2, "#00ff99", 8);
      playSound("drug");
    }
  });

  // Blues
  blues.forEach((b, i) => {
    b.y += 1.3 * sp;
    applyZigzag(b, sp);

    if (coll(p, b)) {
      hunger = Math.min(100, hunger + 10);
      prob = Math.min(1, prob * 1.1);
      blues.splice(i, 1);
      spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#00ccff", 8);
      playSound("weed");
    }
  });

  // Buffs (speed)
  buffs.forEach((bf, i) => {
    bf.y += 1.6 * sp;
    applyZigzag(bf, sp);

    if (coll(p, bf)) {
      if (bf.tType === "speed") {
        speedBoostUntil = now + 10000;
        if (miss > 0) miss--;
        spawnParticles(bf.x + bf.w / 2, bf.y + bf.h / 2, "yellow", 10);
      }
      buffs.splice(i, 1);
    } else if (bf.y > H) {
      buffs.splice(i, 1);
    }
  });

  // Bullets
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

  updParticles(dt);

  if (combo > 0 && now - lastPizzaTime > 2500) breakCombo();

  // HUD update
  if (hudScore) hudScore.textContent = "Score: " + score;
  if (hudHigh) hudHigh.textContent = "High: " + hs;
  if (hudAmmo) hudAmmo.textContent = "Ammo: " + ammo;
  if (hudHunger) hudHunger.textContent = "Hunger: " + hunger + "%";
  if (hudMiss) hudMiss.textContent = "Miss: " + miss + (currentMode === "easy" ? "/5" : "/3");
  if (hudSpeed) hudSpeed.textContent = "Speed: " + gameSpeed.toFixed(1);
  if (hudMode) hudMode.textContent = "Mode: " + currentMode.toUpperCase();
}

// ---------------------------
//  DRAW
// ---------------------------
function draw() {
  x.save();
  x.clearRect(0, 0, W, H);

  if (shake > 0) {
    x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.9;
    if (shake < 0.5) shake = 0;
  }

  if (!start) {
    x.fillStyle = "transparent";
    x.fillRect(0, 0, W, H);
    x.restore();
    return;
  }

  // Player
  x.save();
  x.translate(p.x + p.w / 2, p.y + p.h / 2);
  x.scale(p.scale || 1, p.scale || 1);
  x.drawImage(img.p, -p.w / 2, -p.h / 2, p.w, p.h);
  x.restore();

  // Objects
  reds.forEach(r => x.drawImage(img.r, r.x, r.y, r.w, r.h));
  greens.forEach(g => x.drawImage(img.g, g.x, g.y, g.w, g.h));
  blues.forEach(b => x.drawImage(img.b, b.x, b.y, b.w, b.h));
  obs.forEach(o => x.drawImage(img.o, o.x, o.y, o.w, o.h));
  buffs.forEach(bf => x.drawImage(img.s, bf.x, bf.y, bf.w, bf.h));

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

  // Combo text
  if (comboText && Date.now() < comboTextUntil) {
    x.textAlign = "center";
    x.font = "24px Arial";
    x.fillStyle = "#ffdd33";
    x.fillText(comboText, W / 2, 70);
  }

  // Game Over overlay
  if (go) {
    x.fillStyle = "rgba(0,0,0,0.6)";
    x.fillRect(0, 0, W, H);

    x.fillStyle = "#fff";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = "40px Arial";
    x.fillText("Game Over", W / 2, H / 2 - 20);

    x.font = "20px Arial";
    x.fillText("Tap / Space to Restart", W / 2, H / 2 + 20);
    x.fillText("High: " + hs, W / 2, H / 2 + 60);
  }

  x.restore();
}

// ---------------------------
//  LOOP
// ---------------------------
(function loop() {
  upd();
  draw();
  requestAnimationFrame(loop);
})();

applyMode("normal");
reset();
