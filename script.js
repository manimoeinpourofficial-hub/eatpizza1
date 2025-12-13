// ---------------------------
//  BASIC SETUP
// ---------------------------
const c = document.getElementById("gameCanvas");
const x = c.getContext("2d");

let W = innerWidth, H = innerHeight;

let p = { x: 0, y: 0, w: 0, h: 0, scale: 1, glow: false };

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

// SlowMo (چیت دوم اولیه، نگه می‌داریم)
let slowMoUntil = 0;

// God Mode (چیت جدید ضد ضربه)
let godMode = false;
let godModeUntil = 0;

// Fever Mode
let feverActive = false;
let feverUntil = 0;

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

// LOADING refs
const loadingScreen = document.getElementById("loadingScreen");
const loadingFill = document.getElementById("loadingFill");
const loadingPercent = document.getElementById("loadingPercent");

// PROFILE refs
const profileMenu = document.getElementById("profileMenu");
const usernameInput = document.getElementById("usernameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const profileDisplay = document.getElementById("profileDisplay");
const profileAvatarImg = document.getElementById("profileAvatar");
const profileNameSpan = document.getElementById("profileName");

let selectedAvatar = null;
let profile = JSON.parse(localStorage.getItem("profile") || "null");

function updateSoundStateText() {
  if (!soundStateSpan) return;
  soundStateSpan.textContent = soundOn ? "On" : "Off";
}
updateSoundStateText();

// ---------------------------
//  AUDIO (preload list)
// ---------------------------
const makeAudio = src => {
  let a = new Audio(src);
  a.preload = "auto";
  return a;
};

const sounds = {
  pizza: [makeAudio("2.mp3"), makeAudio("3.mp3"), makeAudio("5.mp3")],
  drug: makeAudio("1.mp3"),
  //weed: makeAudio("weed.mp3"),
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

  const now = Date.now();
  if (now - (cool[n] || 0) < 120) return; // کمی کوتاه‌تر که هیجان بیشتر بشه
  cool[n] = now;

  const s = sounds[n];
  if (!s) return;

  let baseAudio = Array.isArray(s) ? s[(Math.random() * s.length) | 0] : s;
  // برای اینکه حتی اگر در حال پخش است، دوباره بشنوی، از cloneNode استفاده کن:
  const a = baseAudio.cloneNode();
  a.currentTime = 0;
  a.play().catch(() => {});
}

function playHitSound() {
  // شیت / برخورد تیر / هرچی: این یکی همیشه باید شنیده بشه
  const base = sounds.shit;
  if (!base) return;
  const a = base.cloneNode();
  a.currentTime = 0;
  a.play().catch(() => {});
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
  s: I("speed.png"),
  fever: I("pizza44.png") // برای آینده: آیتم Fever Mode
};

// ---------------------------
//  LOADING LOGIC
// ---------------------------
const assetsToLoad = [
  img.p, img.r, img.g, img.b, img.o, img.bu, img.s, img.fever,
  ...Object.values(sounds).flat().filter(a => a instanceof Audio),
  bg
];

let loadedCount = 0;

function updateLoadingProgress() {
  loadedCount++;
  const total = assetsToLoad.length;
  const percent = Math.round((loadedCount / total) * 100);
  loadingFill.style.width = percent + "%";
  loadingPercent.textContent = percent + "%";

  if (loadedCount >= total) {
    setTimeout(() => {
      loadingScreen.style.display = "none";
      startMenu.classList.remove("hidden");
      updateProfileDisplay();
    }, 300);
  }
}

assetsToLoad.forEach(asset => {
  if (asset instanceof Image) {
    asset.addEventListener("load", updateLoadingProgress);
    asset.addEventListener("error", updateLoadingProgress);
  } else if (asset instanceof Audio) {
    asset.addEventListener("canplaythrough", updateLoadingProgress, { once: true });
    asset.addEventListener("error", updateLoadingProgress, { once: true });
  }
});

setTimeout(() => {
  if (loadingScreen.style.display !== "none") {
    loadingFill.style.width = "100%";
    loadingPercent.textContent = "100%";
    loadingScreen.style.display = "none";
    startMenu.classList.remove("hidden");
    updateProfileDisplay();
  }
}, 8000);

// ---------------------------
//  START MENU LOGIC
// ---------------------------
if (startGameBtn) {
  startGameBtn.addEventListener("click", () => {
    if (startMenu) startMenu.classList.add("hidden");
    start = true;
    if (soundOn) bg.play();
  });
}

document.querySelectorAll(".menu-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const act = btn.dataset.action;
    if (act === "login") {
      openProfileMenu();
    } else if (act === "modes") {
      // بعداً Mode جدا
    } else if (act === "leaderboard") {
      // بعداً
    } else if (act === "settings") {
      // بعداً
    }
  });
});

// ---------------------------
//  PROFILE SYSTEM
// ---------------------------
function highlightAvatar() {
  document.querySelectorAll(".avatar").forEach(a => {
    a.classList.remove("selected");
    if (a.dataset.id === selectedAvatar) a.classList.add("selected");
  });
}

function openProfileMenu() {
  profileMenu.classList.remove("hidden");
  if (profile) {
    usernameInput.value = profile.username;
    selectedAvatar = profile.avatar;
    highlightAvatar();
  }
}

function closeProfileMenu() {
  profileMenu.classList.add("hidden");
}

document.querySelectorAll(".avatar").forEach(a => {
  a.addEventListener("click", () => {
    selectedAvatar = a.dataset.id;
    highlightAvatar();
  });
});

saveProfileBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username || !selectedAvatar) return;

  profile = { username, avatar: selectedAvatar };
  localStorage.setItem("profile", JSON.stringify(profile));

  updateProfileDisplay();
  closeProfileMenu();
});

closeProfileBtn.addEventListener("click", closeProfileMenu);

function updateProfileDisplay() {
  if (!profile || !profileDisplay) {
    if (profileDisplay) profileDisplay.classList.add("hidden");
    return;
  }
  profileAvatarImg.src = profile.avatar + ".png";
  profileNameSpan.textContent = profile.username;
  profileDisplay.classList.remove("hidden");
}

// ---------------------------
//  INPUT + CHEATS
// ---------------------------
function move(mx) {
  p.x = Math.max(0, Math.min(mx - p.w / 2, W - p.w));
}

c.addEventListener("mousemove", e => {
  const rect = c.getBoundingClientRect();
  move(e.clientX - rect.left);
});
c.addEventListener("touchmove", e => {
  const rect = c.getBoundingClientRect();
  move(e.touches[0].clientX - rect.left);
}, { passive: true });

// دابل‌تپ برای شلیک روی موبایل
let lastTapTime = 0;

// CHEAT 1: 20 input → +30 ammo
let inputTimes = [];

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

// SlowMo چیت قدیمی
let cheatBuffer = "";

function activateSlowMo() {
  slowMoUntil = Date.now() + 5000;
  spawnParticles(p.x + p.w / 2, p.y, "#88ddff", 40);
}

// GodMode چیت جدید (ضد ضربه + افکت نور)
function activateGodMode(duration = 8000) {
  godMode = true;
  godModeUntil = Date.now() + duration;
  p.glow = true;
  spawnParticles(p.x + p.w / 2, p.y, "#00faff", 50);
}

function updateGodMode(now) {
  if (!godMode) return;
  if (now > godModeUntil) {
    godMode = false;
    p.glow = false;
  }
}

// تبدیل cheat ANFO از SlowMo به GodMode:
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  cheatBuffer += k;
  if (cheatBuffer.length > 4) cheatBuffer = cheatBuffer.slice(-4);

  if (cheatBuffer === "anfo") {
    activateGodMode();
    cheatBuffer = "";
  }
});

// CHEAT 3 MOBILE: Swipe pattern → SlowMo (فعلاً نگه می‌داریم)
let swipeState = [];
let touchStartX = 0, touchStartY = 0;
let touchActive = false;

function addSwipeDir(dir) {
  swipeState.push(dir);
  if (swipeState.length > 4) swipeState = swipeState.slice(-4);
  const pattern = swipeState.join("-");
  if (pattern === "LR-DU-RL-UD") {
    activateSlowMo();
    swipeState = [];
  }
}

c.addEventListener("touchstart", e => {
  const t = e.touches[0];
  const rect = c.getBoundingClientRect();
  const x0 = t.clientX - rect.left;
  const y0 = t.clientY - rect.top;

  if (!start) {
    start = true;
    if (soundOn) bg.play();
    if (startMenu) startMenu.classList.add("hidden");
    return;
  }
  if (go) { reset(); return; }

  const now = Date.now();
  if (now - lastTapTime < 300) {
    shootSingle();
  }
  lastTapTime = now;

  registerInputForCheat();

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
  const minDist = 60;

  if (absX < minDist && absY < minDist) {
    touchActive = false;
    return;
  }

  if (absX > absY) {
    addSwipeDir(dx > 0 ? "LR" : "RL");
  } else {
    addSwipeDir(dy < 0 ? "DU" : "UD");
  }
  touchActive = false;
});

// شلیک تک‌تیر (کیبورد – نگه داشتن Space اسپم نمی‌کند)
let canShootKeyboard = true;

addEventListener("keydown", e => {
  if (e.code === "Space" && canShootKeyboard) {
    canShootKeyboard = false;

    if (!start) {
      start = true;
      if (soundOn) bg.play();
      if (startMenu) startMenu.classList.add("hidden");
    } else if (go) {
      reset();
    } else {
      shootSingle();
    }

    registerInputForCheat();
  }

  if (e.code === "KeyP" && start && !go) togglePause();
});

addEventListener("keyup", e => {
  if (e.code === "Space") {
    canShootKeyboard = true;
  }
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
  if (ammo <= 0) return;
  ammo--;
  bullets.push({
    x: p.x + p.w / 2 - bs / 2,
    y: p.y - 6,
    w: bs,
    h: bs * 2,
    s: 12,
    img: img.bu
  });
  // صدای شلیک اگر بعداً اضافه شد می‌تونی اینجا playSound("...") بزنی
}

// ---------------------------
//  COLLISION
// ---------------------------
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

  slowMoUntil = 0;
  godMode = false;
  p.glow = false;
  feverActive = false;
  feverUntil = 0;

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
    if (soundOn && start && !go) bg.play();
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
      if (startMenu) startMenu.classList.remove("hidden");
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
    amp: 15 + Math.random() * 50,   // کمی متنوع‌تر
    t: Math.random() * Math.PI * 2,
    baseX: null,
    tType: type,
    zigSpeed: 0.05 + Math.random() * 0.07  // سرعت متفاوت زیگزاگ
  };
}

// ---------------------------
//  HARDER OVER TIME
// ---------------------------
setInterval(() => {
  if (start && !go && !paused) {
    if (currentMode === "easy") gameSpeed += 0.003;
    else if (currentMode === "normal") gameSpeed += 0.007;
    else gameSpeed += 0.015;
    if (gameSpeed > 3) gameSpeed = 3;
  }
}, 4000);

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
//  ZIGZAG (بهبود‌یافته)
// ---------------------------
function applyZigzag(o, sp) {
  if (!o.zigzag) return;
  if (o.baseX == null) o.baseX = o.x;
  const zsp = o.zigSpeed || 0.08;
  o.t += zsp * sp;
  o.x = o.baseX + Math.sin(o.t) * o.amp * o.dir;
}

// ---------------------------
//  FEVER MODE
// ---------------------------
function activateFever() {
  if (feverActive) return;
  feverActive = true;
  feverUntil = Date.now() + 7000; // 7 ثانیه
  gameSpeed *= 1.2;
  comboMultiplier *= 2; // توی Fever کامبو قوی‌تر
  bg.playbackRate = 1.3;
}

function updateFever(now) {
  if (!feverActive) return;
  if (now > feverUntil) {
    feverActive = false;
    gameSpeed /= 1.2;
    comboMultiplier = 1;
    bg.playbackRate = 1;
  }
}

// ---------------------------
//  UPDATE
// ---------------------------
function upd() {
  if (!start || go || paused) return;

  const now = Date.now();

  // زمان‌بندی حالت‌ها
  updateGodMode(now);
  updateFever(now);

  let sp = gameSpeed;
  let slowFactor = 1;
  if (now < slowMoUntil) {
    slowFactor = 0.5;
  }

  // اگر Speed Buff فعاله، کمی تقویت
  if (now < speedBoostUntil) {
    sp *= 1.3;
  }

  let effSp = sp * slowFactor;
  const dt = 16;

  // اسپان‌ها بر اساس زمان
  if (now > nextRed) {
    reds.push(spawn("red", item, item));
    nextRed = now + 1700 / effSp;
  }

  if (now > nextObs) {
    if (Math.random() < 0.7) {
      obs.push(spawn("obs", item * 0.8, item * 0.8));
    }
    nextObs = now + 4000 / effSp;
  }

  if (now > nextGreen && Math.random() < 0.2) {
    greens.push(spawn("green", item, item, 0.25));
    nextGreen = now + 6000;
  }

  if (now > nextBlue && Math.random() < 0.2) {
    blues.push(spawn("blue", item, item, 0.25));
    nextBlue = now + 8000;
  }

  if (now > nextBuff && Math.random() < 0.25) {
    buffs.push(spawn("speed", item, item, 0.25));
    nextBuff = now + 9000;
  }

  // Reds (pizza)
  for (let i = reds.length - 1; i >= 0; i--) {
    const r = reds[i];
    r.y += 1.3 * effSp;
    applyZigzag(r, effSp);

    if (coll(p, r)) {
      handleComboPizzaTake();
      let base = 5;
      if (now < slowMoUntil) base *= 1.2;
      if (feverActive) base *= 2;
      let gained = base * comboMultiplier;
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

      // اگر خواستی: روی کامبو بالا Fever فعال کن
      if (combo >= 10 && !feverActive) {
        activateFever();
      }

    } else if (r.y > H) {
      reds.splice(i, 1);
      miss++;
      breakCombo();
      if (miss >= (currentMode === "easy" ? 6 : 3)) {
        go = true;
        playSound("gameOver");
        shake = 20;
      }
    }
  }

  // Obstacles
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];
    o.y += 1.5 * effSp;
    applyZigzag(o, effSp);

    if (coll(p, o)) {
      if (!godMode) {
        go = true;
        playHitSound();
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "red", 15);
        shake = 20;
      } else {
        // در God Mode دشمن نابود میشه ولی تو نمی‌میری
        obs.splice(i, 1);
        spawnParticles(o.x + o.w / 2, o.y + o.h / 2, "#00faff", 15);
        shake = 5;
      }
    } else if (o.y > H) {
      obs.splice(i, 1);
    }
  }

  // Greens
  for (let i = greens.length - 1; i >= 0; i--) {
    const g = greens[i];
    g.y += 1.1 * effSp;
    applyZigzag(g, effSp);

    if (coll(p, g)) {
      hunger = Math.max(0, hunger - 15);
      prob = Math.max(0, prob * 0.85);
      greens.splice(i, 1);
      spawnParticles(g.x + g.w / 2, g.y + g.h / 2, "#00ff99", 8);
      playSound("drug");
    }
  }

  // Blues
  for (let i = blues.length - 1; i >= 0; i--) {
    const b = blues[i];
    b.y += 1.0 * effSp;
    applyZigzag(b, effSp);

    if (coll(p, b)) {
      hunger = Math.min(100, hunger + 10);
      prob = Math.min(1, prob * 1.1);
      blues.splice(i, 1);
      spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#00ccff", 8);
      //playSound("weed");
    }
  }

  // Buffs (speed / در آینده fever)
  for (let i = buffs.length - 1; i >= 0; i--) {
    const bf = buffs[i];
    bf.y += 1.3 * effSp;
    applyZigzag(bf, effSp);

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
  }

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.s;
    if (b.y + b.h < 0) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = obs.length - 1; j >= 0; j--) {
      const o = obs[j];
      if (coll(b, o)) {
        obs.splice(j, 1);
        score += 3;
        bullets.splice(i, 1);
        spawnParticles(o.x + o.w / 2, o.y + o.h / 2, "#ff6600", 12);
        playSound("explode");
        shake = 10;
        break;
      }
    }
  }

  updParticles(dt);

  if (combo > 0 && now - lastPizzaTime > 2500) breakCombo();

  // HUD update (بهینه: یکجا)
  if (hudScore) hudScore.textContent = "Score: " + score;
  if (hudHigh) hudHigh.textContent = "High: " + hs;
  if (hudAmmo) hudAmmo.textContent = "Ammo: " + ammo;
  if (hudHunger) hudHunger.textContent = "Hunger: " + hunger + "%";
  if (hudMiss) hudMiss.textContent = "Miss: " + miss + (currentMode === "easy" ? "/6" : "/3");
  if (hudSpeed) hudSpeed.textContent = "Speed: " + gameSpeed.toFixed(1);
  if (hudMode) hudMode.textContent = "Mode: " + currentMode.toUpperCase();
}

// ---------------------------
//  DRAW
// ---------------------------
function draw() {
  x.save();
  x.clearRect(0, 0, W, H);

  const now = Date.now();
  const inSlowMo = now < slowMoUntil;

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

  if (inSlowMo) {
    x.fillStyle = "rgba(100,150,255,0.08)";
    x.fillRect(0, 0, W, H);
  }

  if (feverActive) {
    x.fillStyle = "rgba(255, 220, 80, 0.12)";
    x.fillRect(0, 0, W, H);
  }

  // Player
  x.save();
  x.translate(p.x + p.w / 2, p.y + p.h / 2);
  x.scale(p.scale || 1, p.scale || 1);

  if (p.glow) {
    const grd = x.createRadialGradient(0, 0, p.w * 0.3, 0, 0, p.w);
    grd.addColorStop(0, "rgba(0,250,255,0.8)");
    grd.addColorStop(1, "rgba(0,250,255,0)");
    x.fillStyle = grd;
    x.beginPath();
    x.arc(0, 0, p.w, 0, Math.PI * 2);
    x.fill();
  }

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
  if (comboText && now < comboTextUntil) {
    x.textAlign = "center";
    x.font = "24px Arial";
    x.fillStyle = "#ffdd33";
    x.fillText(comboText, W / 2, 70);
  }

  // SlowMo text
  if (inSlowMo) {
    x.textAlign = "center";
    x.font = "18px Arial";
    x.fillStyle = "#88ddff";
    x.fillText("ANFO SLOW-MO", W / 2, 100);
  }

  if (feverActive) {
    x.textAlign = "center";
    x.font = "20px Arial";
    x.fillStyle = "#ffbb33";
    x.fillText("FEVER MODE!", W / 2, 130);
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

// Firebase
auth.signInAnonymously()
  .then(() => {
    console.log("✅ Firebase Connected:", auth.currentUser.uid);
  })
  .catch(err => {
    console.error("❌ Firebase Error:", err);
  });
