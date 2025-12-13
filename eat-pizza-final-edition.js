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

// NEW: PC (coin / pizza coin)
let pc = +localStorage.getItem("pc") || 0;

// Combo
let combo = 0, lastPizzaTime = 0, comboMultiplier = 1;
let comboText = "", comboTextUntil = 0;

// Screen shake
let shake = 0;

// Pause / Mode / Settings
let paused = false;
let currentMode = "normal";
let soundOn = true;

// Effects
let slowMoUntil = 0;
let godMode = false, godModeUntil = 0;
let feverActive = false, feverUntil = 0;
let drugEffectUntil = 0, weedEffectUntil = 0;

// NEW: Slow/Fast modes
let ultraSlowUntil = 0;
let ultraFastUntil = 0;

// Voice cheat / Ultra Mode
let voiceCheatEnabled = false;
let ultraModeUntil = 0;
let voiceCooldownUntil = 0;
let recognition = null;

// SKINS
let currentSkin = localStorage.getItem("skin") || "p";
const skins = {
  p:  { name: "Default",        unlocked: true,                   requireScore: 0,    price: 0,   id:"p"  },
  p1: { name: "Pro 500",        unlocked: hs >= 500,              requireScore: 500,  price: 250, id:"p1" },
  p2: { name: "Master 1500",    unlocked: hs >= 1500,             requireScore: 1500, price: 400, id:"p2" },
  p3: { name: "Cute Pink",      unlocked: false,                  requireScore: 0,    price: 300, id:"p3" },
  p4: { name: "Neon Slice",     unlocked: false,                  requireScore: 0,    price: 600, id:"p4" }
};

// Mode tuning
let zigzagIntensity = 1;
let obstacleRate = 1;
let pizzaRate = 1;
let drugPower = 15;
let weedPower = 10;

// Dynamic spawn pressure
let spawnPressure = 1;

// DOM refs
const pauseMenu = document.getElementById("pauseMenu");
const soundStateSpan = document.getElementById("soundState");
const pauseBtn = document.getElementById("pauseBtn");

const hudScore = document.getElementById("hudScore");
const hudHigh = document.getElementById("hudHigh");
const hudAmmo = document.getElementById("hudAmmo");
const hudHunger = document.getElementById("hudHunger");
const hudMiss = document.getElementById("hudMiss");
const hudSpeed = document.getElementById("hudSpeed");
const hudMode = document.getElementById("hudMode");
const hudPC = document.getElementById("hudPC");

// START MENU refs
const startMenu = document.getElementById("startMenu");
const startGameBtns = document.querySelectorAll("[data-mode-start]");

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

// SKIN MENU
const skinMenu = document.getElementById("skinMenu");

// SHOP MENU
const shopMenu = document.getElementById("shopMenu");
const shopList = shopMenu ? shopMenu.querySelector(".shop-list") : null;

// CHALLENGES MENU
const challengeMenu = document.getElementById("challengeMenu");
const challengeList = challengeMenu ? challengeMenu.querySelector("#challengeList") : null;
const weeklyMenu = document.getElementById("weeklyMenu");
const weeklyList = weeklyMenu ? weeklyMenu.querySelector("#weeklyList") : null;

// LEADERBOARD MENU
const leaderboardMenu = document.getElementById("leaderboardMenu");

// VOICE CHEAT TOGGLE
const voiceCheatStateSpan = document.getElementById("voiceCheatState");

// STATUS / TOAST
const statusToast = document.getElementById("statusToast");

let selectedAvatar = null;
let profile = JSON.parse(localStorage.getItem("profile") || "null");

function updateSoundStateText() {
  if (!soundStateSpan) return;
  soundStateSpan.textContent = soundOn ? "On" : "Off";
}
updateSoundStateText();

function updateHUDPC() {
  if (hudPC) hudPC.textContent = "PC: " + pc;
}
updateHUDPC();

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
  shit: makeAudio("4.mp3"),
  explode: makeAudio("gooz1.mp3"),
  gameOver: makeAudio("gameover.mp3")
};

const bg = makeAudio("background.mp3");
bg.loop = true;
bg.volume = 0.3;

// جلوگیری از قاطی شدن صداها
let audioLock = false;
function playSound(name) {
  if (!start || !soundOn) return;

  // shit و background اجازه دارند هر زمان
  if (name !== "shit" && name !== "background") {
    if (audioLock) return;
    audioLock = true;
    setTimeout(() => audioLock = false, 150);
  }

  const s = sounds[name];
  if (!s) return;

  const base = Array.isArray(s) ? s[(Math.random() * s.length) | 0] : s;
  const a = base.cloneNode();
  a.currentTime = 0;
  a.play().catch(() => {});
}

function playHitSound() {
  const base = sounds.shit;
  if (!base) return;
  const a = base.cloneNode();
  a.currentTime = 0;
  a.play().catch(() => {});
}

function applyGlobalPlaybackRate(rate) {
  bg.playbackRate = rate;
  Object.values(sounds).flat().forEach(s => {
    if (s instanceof Audio) s.playbackRate = rate;
  });
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
  p1: I("skin1.png"),
  p2: I("skin2.png"),
  p3: I("skin3.png"),
  p4: I("skin4.png"),
  r: I("pizza1.png"),
  g: I("DRUG.png"),
  b: I("weed.webp"),
  o: I("shit.webp"),
  bu: I("bullet.png"),
  s: I("speed.png"),
  fever: I("pizza44.png"),
  bg: I("pizzaback.jpg")
};

// ---------------------------
//  LOADING LOGIC
// ---------------------------
const assetsToLoad = [
  img.p, img.p1, img.p2, img.p3, img.p4,
  img.r, img.g, img.b, img.o, img.bu, img.s, img.fever, img.bg,
  ...Object.values(sounds).flat().filter(a => a instanceof Audio),
  bg
];

let loadedCount = 0;

function updateLoadingProgress() {
  loadedCount++;
  const total = assetsToLoad.length;
  const percent = Math.round((loadedCount / total) * 100);
  if (loadingFill) loadingFill.style.width = percent + "%";
  if (loadingPercent) loadingPercent.textContent = percent + "%";

  if (loadedCount >= total) {
    setTimeout(() => {
      if (loadingScreen) loadingScreen.style.display = "none";
      if (startMenu) startMenu.classList.remove("hidden");
      updateProfileDisplay();
      updateSkinMenu();
      updateShopUI();
      updateChallengesUI();
      updateWeeklyUI();
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
  if (loadingScreen && loadingScreen.style.display !== "none") {
    loadingFill.style.width = "100%";
    loadingPercent.textContent = "100%";
    loadingScreen.style.display = "none";
    if (startMenu) startMenu.classList.remove("hidden");
    updateProfileDisplay();
    updateSkinMenu();
    updateShopUI();
    updateChallengesUI();
    updateWeeklyUI();
  }
}, 8000);

// ---------------------------
//  START MENU LOGIC
// ---------------------------
startGameBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.modeStart || "normal";
    applyMode(mode);
    if (startMenu) startMenu.classList.add("hidden");
    start = true;
    go = false;
    reset();
    if (soundOn) bg.play().catch(() => {});
  });
});

document.querySelectorAll(".menu-btn, .menu-icon-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const act = btn.dataset.action;
    if (!act) return;
    if (act === "login") openProfileMenu();
    else if (act === "skins") openSkinMenu();
    else if (act === "leaderboard") openLeaderboard();
    else if (act === "settings") { /* reserved */ }
    else if (act === "shop") openShopMenu();
    else if (act === "daily") openChallengeMenu();
    else if (act === "weekly") openWeeklyMenu();
    else if (act === "voice") toggleVoiceCheat();
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
  if (!profileMenu) return;
  profileMenu.classList.remove("hidden");
  if (profile) {
    usernameInput.value = profile.username;
    selectedAvatar = profile.avatar;
    highlightAvatar();
  }
}

function closeProfileMenu() {
  if (!profileMenu) return;
  profileMenu.classList.add("hidden");
}

document.querySelectorAll(".avatar").forEach(a => {
  a.addEventListener("click", () => {
    selectedAvatar = a.dataset.id;
    highlightAvatar();
  });
});

if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    if (!username || !selectedAvatar) return;

    profile = { username, avatar: selectedAvatar, skin: currentSkin };
    localStorage.setItem("profile", JSON.stringify(profile));

    updateProfileDisplay();
    closeProfileMenu();
    saveProfileOnline();
  });
}

if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", closeProfileMenu);
}

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
//  SKIN SYSTEM
// ---------------------------
function updateSkinUnlockedState() {
  skins.p.unlocked = true;
  skins.p1.unlocked = hs >= skins.p1.requireScore || skins.p1.price === 0;
  skins.p2.unlocked = hs >= skins.p2.requireScore || skins.p2.price === 0;
}

function updateSkinMenu() {
  if (!skinMenu) return;
  updateSkinUnlockedState();

  const container = skinMenu.querySelector(".skin-list");
  if (!container) return;
  container.innerHTML = "";

  Object.keys(skins).forEach(id => {
    const s = skins[id];
    const div = document.createElement("div");
    div.className = "skin-option";
    div.dataset.skin = id;

    const imgEl = document.createElement("img");
    imgEl.src = img[id].src;
    imgEl.className = "skin-img";

    const label = document.createElement("div");
    let extra = "";
    if (s.requireScore) extra = ` (Score ${s.requireScore}+ )`;
    if (s.price && s.price > 0) extra += ` | ${s.price} PC`;
    label.textContent = s.name + extra;
    label.className = "skin-label";

    if (!s.unlocked) div.classList.add("locked");
    if (currentSkin === id) div.classList.add("selected");

    div.appendChild(imgEl);
    div.appendChild(label);
    container.appendChild(div);
  });

  container.querySelectorAll(".skin-option").forEach(opt => {
    opt.addEventListener("click", () => {
      const id = opt.dataset.skin;
      const s = skins[id];
      if (!s.unlocked) {
        alert("این اسکین هنوز آزاد نشده! از Shop بخرش یا HighScore لازم رو بگیر.");
        return;
      }
      currentSkin = id;
      localStorage.setItem("skin", currentSkin);
      if (profile) {
        profile.skin = currentSkin;
        localStorage.setItem("profile", JSON.stringify(profile));
        saveProfileOnline();
      }
      updateSkinMenu();
    });
  });
}

function openSkinMenu() {
  if (!skinMenu) return;
  skinMenu.classList.remove("hidden");
  updateSkinMenu();
}

function closeSkinMenu() {
  if (!skinMenu) return;
  skinMenu.classList.add("hidden");
}

// ---------------------------
//  SHOP SYSTEM
// ---------------------------
function openShopMenu() {
  if (!shopMenu || !shopList) return;
  shopMenu.classList.remove("hidden");
  updateShopUI();
}

function closeShopMenu() {
  if (!shopMenu) return;
  shopMenu.classList.add("hidden");
}

function updateShopUI() {
  if (!shopList) return;
  shopList.innerHTML = "";

  Object.keys(skins).forEach(id => {
    const s = skins[id];
    if (id === "p") return;

    const div = document.createElement("div");
    div.className = "shop-item";

    const left = document.createElement("div");
    left.className = "shop-item-info";
    left.innerHTML = `
      <div class="shop-item-title">${s.name}</div>
      <div class="shop-item-sub">
        ${s.unlocked ? "Unlocked" : (s.price ? s.price + " PC" : "Unlock by score")}
      </div>
    `;

    const btn = document.createElement("button");
    btn.className = "shop-buy-btn";

    if (s.unlocked) {
      btn.textContent = (currentSkin === id) ? "Equipped" : "Equip";
      btn.disabled = (currentSkin === id);
    } else {
      if (!s.price || s.price <= 0) {
        btn.textContent = "Unlock by score";
        btn.disabled = true;
      } else {
        btn.textContent = "Buy";
        btn.disabled = pc < s.price;
      }
    }

    btn.addEventListener("click", () => {
      if (s.unlocked) {
        currentSkin = id;
        localStorage.setItem("skin", currentSkin);
        if (profile) {
          profile.skin = currentSkin;
          localStorage.setItem("profile", JSON.stringify(profile));
          saveProfileOnline();
        }
        updateShopUI();
        updateSkinMenu();
      } else {
        if (pc < s.price) {
          showToast("PC کافی نداری!");
          return;
        }
        pc -= s.price;
        localStorage.setItem("pc", pc);
        updateHUDPC();
        s.unlocked = true;
        currentSkin = id;
        localStorage.setItem("skin", currentSkin);

        if (profile) {
          profile.skin = currentSkin;
          localStorage.setItem("profile", JSON.stringify(profile));
          saveProfileOnline();
        }
        showToast("اسکین جدید خریدی!");
        updateShopUI();
        updateSkinMenu();
      }
    });

    div.appendChild(left);
    div.appendChild(btn);
    shopList.appendChild(div);
  });
}

// ---------------------------
//  INPUT + CHEATS
// ---------------------------
function move(mx) {
  p.x = Math.max(0, Math.min(mx - p.w / 2, W - p.w));
}

// canvas فقط نمایش، نه input
c.style.pointerEvents = "none";

addEventListener("mousemove", e => {
  const rect = c.getBoundingClientRect();
  move(e.clientX - rect.left);
});
addEventListener("touchmove", e => {
  const rect = c.getBoundingClientRect();
  const t = e.touches[0];
  move(t.clientX - rect.left);
}, { passive: true });

let lastTapTime = 0;

// Cheat 1: 20 input → +30 ammo
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

// SlowMo cheat buffer (keyboard)
let cheatBuffer = "";

function activateSlowMo() {
  slowMoUntil = Date.now() + 5000;
  spawnParticles(p.x + p.w / 2, p.y, "#88ddff", 40);
}

// God Mode cheat
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

addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  cheatBuffer += k;
  if (cheatBuffer.length > 4) cheatBuffer = cheatBuffer.slice(-4);
  if (cheatBuffer === "anfo") {
    activateGodMode();
    cheatBuffer = "";
  }
});

// Swipe cheat برای SlowMo
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

addEventListener("touchstart", e => {
  const rect = c.getBoundingClientRect();
  const t = e.touches[0];
  const x0 = t.clientX - rect.left;
  const y0 = t.clientY - rect.top;

  if (!start) {
    start = true;
    go = false;
    if (soundOn) bg.play().catch(() => {});
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

addEventListener("touchend", e => {
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

// شلیک تک‌تیر با Space
let canShootKeyboard = true;

addEventListener("keydown", e => {
  if (e.code === "Space" && canShootKeyboard) {
    canShootKeyboard = false;

    if (!start) {
      start = true;
      if (soundOn) bg.play().catch(() => {});
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
  if (e.code === "Space") canShootKeyboard = true;
});

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
//  MODE SYSTEM
// ---------------------------
function applyMode(mode) {
  currentMode = mode;

  if (mode === "easy") {
    gameSpeed = 0.7;
    prob = 0.18;
    zigzagIntensity = 0.5;
    obstacleRate = 0.6;
    pizzaRate = 1.3;
    drugPower = 25;
    weedPower = 5;
  } else if (mode === "normal") {
    gameSpeed = 1.0;
    prob = 0.25;
    zigzagIntensity = 1.0;
    obstacleRate = 1.0;
    pizzaRate = 1.0;
    drugPower = 15;
    weedPower = 10;
  } else if (mode === "hard") {
    gameSpeed = 1.4;
    prob = 0.35;
    zigzagIntensity = 1.8;
    obstacleRate = 1.5;
    pizzaRate = 0.8;
    drugPower = 10;
    weedPower = 20;
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
let nextFever = 0;

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

  drugEffectUntil = 0;
  weedEffectUntil = 0;

  ultraSlowUntil = 0;
  ultraFastUntil = 0;
  ultraModeUntil = 0;

  applyMode(currentMode);

  const now = Date.now();
  nextRed = now;
  nextObs = now;
  nextGreen = now + 2000;
  nextBlue = now + 3000;
  nextBuff = now + 4000;
  nextFever = now + 5000;

  applyGlobalPlaybackRate(1);
}

// ---------------------------
//  COMBO SYSTEM
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
//  ZIGZAG MOVEMENT (فقط Hard)
// ---------------------------
function applyZigzag(o, sp) {
  if (currentMode !== "hard") return;
  if (!o.zigzag) return;

  if (o.baseX == null) o.baseX = o.x;

  o.t += (o.zigSpeed || 0.05) * sp;

  const wave = Math.sin(o.t) * o.amp * zigzagIntensity * o.dir;
  const noise = Math.sin(o.t * 0.3) * 3;

  o.x = o.baseX + wave + noise;

  if (Math.random() < 0.003) {
    o.dir *= -1;
  }
}

// ---------------------------
//  FEVER MODE
// ---------------------------
function activateFever() {
  if (feverActive) return;

  feverActive = true;
  feverUntil = Date.now() + 7000;

  gameSpeed *= 1.25;
  comboMultiplier *= 2;

  spawnParticles(p.x + p.w / 2, p.y, "#ffcc00", 40);

  pc += 10;
  localStorage.setItem("pc", pc);
  updateHUDPC();
}

function updateFever(now) {
  if (!feverActive) return;

  if (now > feverUntil) {
    feverActive = false;
    gameSpeed /= 1.25;
    comboMultiplier = 1;
  }
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
    amp: 15 + Math.random() * 50,
    t: Math.random() * Math.PI * 2,
    baseX: null,
    tType: type,
    zigSpeed: 0.05 + Math.random() * 0.07
  };
}

// ---------------------------
//  LIMIT OBJECTS
// ---------------------------
function limitObjects() {
  const max = {
    red: 12,
    obs: 8,
    green: 4,
    blue: 4,
    buff: 3
  };

  if (reds.length > max.red) reds.length = max.red;
  if (obs.length > max.obs) obs.length = max.obs;
  if (greens.length > max.green) greens.length = max.green;
  if (blues.length > max.blue) blues.length = max.blue;
  if (buffs.length > max.buff) buffs.length = max.buff;
}

// ---------------------------
//  DAILY / WEEKLY CHALLENGES
// ---------------------------
const dailyKey = "ep_daily_state_v1";
const weeklyKey = "ep_weekly_state_v1";

let dailyState = JSON.parse(localStorage.getItem(dailyKey) || "null");
let weeklyState = JSON.parse(localStorage.getItem(weeklyKey) || "null");

const dailyTemplate = [
  { id: "d1", text: "Collect 30 pizzas", type: "pizzas", target: 30, rewardPC: 20 },
  { id: "d2", text: "Reach 800 score", type: "score", target: 800, rewardPC: 15 },
  { id: "d3", text: "Survive with <= 2 miss", type: "lowMiss", target: 2, rewardPC: 10 }
];

const weeklyTemplate = [
  { id: "w1", text: "Reach 2000 score", type: "score", target: 2000, rewardPC: 50 },
  { id: "w2", text: "Collect 150 pizzas", type: "pizzas", target: 150, rewardPC: 40 },
  { id: "w3", text: "Play 20 rounds", type: "rounds", target: 20, rewardPC: 60 }
];

function getDayStart(t) {
  const d = new Date(t);
  d.setHours(0,0,0,0);
  return d.getTime();
}

function getWeekStart(t) {
  const d = new Date(t);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d.getTime();
}

function resetDailyState() {
  dailyState = {
    ts: getDayStart(Date.now()),
    data: dailyTemplate.map(ch => ({
      id: ch.id,
      type: ch.type,
      text: ch.text,
      target: ch.target,
      rewardPC: ch.rewardPC,
      progress: 0,
      done: false
    }))
  };
  localStorage.setItem(dailyKey, JSON.stringify(dailyState));
}

function resetWeeklyState() {
  weeklyState = {
    ts: getWeekStart(Date.now()),
    data: weeklyTemplate.map(ch => ({
      id: ch.id,
      type: ch.type,
      text: ch.text,
      target: ch.target,
      rewardPC: ch.rewardPC,
      progress: 0,
      done: false
    }))
  };
  localStorage.setItem(weeklyKey, JSON.stringify(weeklyState));
}

(function initChallenges() {
  const now = Date.now();
  if (!dailyState || dailyState.ts !== getDayStart(now)) resetDailyState();
  if (!weeklyState || weeklyState.ts !== getWeekStart(now)) resetWeeklyState();
})();

function updateChallengesOnPizzaCollect() {
  if (!dailyState || !weeklyState) return;

  dailyState.data.forEach(ch => {
    if (ch.type === "pizzas" && !ch.done) {
      ch.progress++;
      if (ch.progress >= ch.target) {
        ch.progress = ch.target;
        ch.done = true;
        pc += ch.rewardPC;
        showToast("Daily Complete: +" + ch.rewardPC + " PC");
      }
    }
  });

  weeklyState.data.forEach(ch => {
    if (ch.type === "pizzas" && !ch.done) {
      ch.progress++;
      if (ch.progress >= ch.target) {
        ch.progress = ch.target;
        ch.done = true;
        pc += ch.rewardPC;
        showToast("Weekly Complete: +" + ch.rewardPC + " PC");
      }
    }
  });

  localStorage.setItem(dailyKey, JSON.stringify(dailyState));
  localStorage.setItem(weeklyKey, JSON.stringify(weeklyState));
  localStorage.setItem("pc", pc);
  updateHUDPC();
}

function updateChallengesOnScore(scoreNow) {
  if (!dailyState || !weeklyState) return;

  dailyState.data.forEach(ch => {
    if (ch.type === "score" && !ch.done && scoreNow >= ch.target) {
      ch.done = true;
      ch.progress = ch.target;
      pc += ch.rewardPC;
      showToast("Daily Complete: +" + ch.rewardPC + " PC");
    }
  });

  weeklyState.data.forEach(ch => {
    if (ch.type === "score" && !ch.done && scoreNow >= ch.target) {
      ch.done = true;
      ch.progress = ch.target;
      pc += ch.rewardPC;
      showToast("Weekly Complete: +" + ch.rewardPC + " PC");
    }
  });

  localStorage.setItem(dailyKey, JSON.stringify(dailyState));
  localStorage.setItem(weeklyKey, JSON.stringify(weeklyState));
  localStorage.setItem("pc", pc);
  updateHUDPC();
}

function updateChallengesOnRoundEnd() {
  if (!weeklyState) return;
  weeklyState.data.forEach(ch => {
    if (ch.type === "rounds" && !ch.done) {
      ch.progress++;
      if (ch.progress >= ch.target) {
        ch.progress = ch.target;
        ch.done = true;
        pc += ch.rewardPC;
        showToast("Weekly Complete: +" + ch.rewardPC + " PC");
      }
    }
  });
  localStorage.setItem(weeklyKey, JSON.stringify(weeklyState));
  localStorage.setItem("pc", pc);
  updateHUDPC();
}

function openChallengeMenu() {
  if (!challengeMenu || !dailyState) return;
  challengeMenu.classList.remove("hidden");
  updateChallengesUI();
}

function closeChallengeMenu() {
  if (!challengeMenu) return;
  challengeMenu.classList.add("hidden");
}

function updateChallengesUI() {
  if (!challengeList || !dailyState) return;
  challengeList.innerHTML = "";
  dailyState.data.forEach(ch => {
    const percent = Math.floor((ch.progress / ch.target) * 100);
    const div = document.createElement("div");
    div.className = "challenge-item";
    div.innerHTML = `
      <div>${ch.text} ${ch.done ? "✅" : ""}</div>
      <div class="challenge-sub">Reward: ${ch.rewardPC} PC</div>
      <div class="challenge-progress">
        <div class="challenge-progress-fill" style="width:${percent}%;"></div>
      </div>
    `;
    challengeList.appendChild(div);
  });
}

function openWeeklyMenu() {
  if (!weeklyMenu || !weeklyState) return;
  weeklyMenu.classList.remove("hidden");
  updateWeeklyUI();
}

function closeWeeklyMenu() {
  if (!weeklyMenu) return;
  weeklyMenu.classList.add("hidden");
}

function updateWeeklyUI() {
  if (!weeklyList || !weeklyState) return;
  weeklyList.innerHTML = "";
  weeklyState.data.forEach(ch => {
    const percent = Math.floor((ch.progress / ch.target) * 100);
    const div = document.createElement("div");
    div.className = "weekly-item";
    div.innerHTML = `
      <div>${ch.text} ${ch.done ? "✅" : ""}</div>
      <div class="challenge-sub">Reward: ${ch.rewardPC} PC</div>
      <div class="weekly-progress">
        <div class="weekly-progress-fill" style="width:${percent}%;"></div>
      </div>
    `;
    weeklyList.appendChild(div);
  });
}

// ---------------------------
//  ULTRA SLOW / FAST
// ---------------------------
function activateUltraSlow() {
  ultraSlowUntil = Date.now() + 10000;
  ultraFastUntil = 0; // if any fast, cancel it
  spawnParticles(p.x + p.w/2, p.y, "#88ccff", 40);
}

function activateUltraFast() {
  ultraFastUntil = Date.now() + 10000;
  ultraSlowUntil = 0; // cancel slow if any
  spawnParticles(p.x + p.w/2, p.y, "#ffcc00", 40);
}

// ---------------------------
//  ULTRA MODE (Voice Cheat)
// ---------------------------
function toggleVoiceCheat() {
  voiceCheatEnabled = !voiceCheatEnabled;
  if (voiceCheatStateSpan) {
    voiceCheatStateSpan.textContent = voiceCheatEnabled ? "On" : "Off";
  }
  if (voiceCheatEnabled) {
    startVoiceRecognition();
    showToast("Voice Cheat: Say 'ANFO Ultra Mode'");
  } else {
    stopVoiceRecognition();
  }
}

function startVoiceRecognition() {
  if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
    showToast("Voice not supported on this device");
    voiceCheatEnabled = false;
    if (voiceCheatStateSpan) voiceCheatStateSpan.textContent = "Off";
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = e => {
    const text = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
    handleVoiceCommand(text);
  };
  recognition.onend = () => {
    if (voiceCheatEnabled) recognition.start();
  };
  recognition.start();
}

function stopVoiceRecognition() {
  if (recognition) recognition.stop();
}

function handleVoiceCommand(text) {
  const now = Date.now();
  if (!voiceCheatEnabled) return;
  if (now < voiceCooldownUntil) return;
  if (text.includes("anfo ultra mode")) {
    activateUltraMode();
    voiceCooldownUntil = now + 3 * 60 * 1000;
  }
}

function activateUltraMode() {
  const now = Date.now();
  ultraModeUntil = now + 50000;
  spawnParticles(p.x + p.w / 2, p.y, "#ff00ff", 50);
  showToast("ANFO ULTRA MODE – 50s");
}

function isPulledByUltra(r, effSp) {
  const now = Date.now();
  if (ultraModeUntil <= now) return false;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const rx = r.x + r.w / 2;
  const ry = r.y + r.h / 2;
  const dx = cx - rx;
  const dy = cy - ry;
  const dist = Math.hypot(dx, dy);
  if (dist > H * 0.6) return false;

  const pull = 0.25 * effSp;
  r.x += (dx / (dist || 1)) * pull;
  r.y += (dy / (dist || 1)) * pull;
  return coll(p, r);
}

// ---------------------------
//  UPDATE LOOP
// ---------------------------
function upd() {
  if (!start || go || paused) return;

  const now = Date.now();

  updateGodMode(now);
  updateFever(now);

  // Dynamic spawn pressure based on score
  spawnPressure = 1 + Math.min(score / 1500, 2); // تا حدود 3x

  let sp = gameSpeed;
  let effSlowFactor = 1;

  if (now < slowMoUntil) effSlowFactor *= 0.7;
  if (now < ultraSlowUntil) effSlowFactor *= 0.4;
  if (now < ultraFastUntil) sp *= 1.5;

  // صداها بر اساس Slow/Fast
  if (now < ultraSlowUntil) {
    applyGlobalPlaybackRate(0.6);
  } else if (now < ultraFastUntil) {
    applyGlobalPlaybackRate(1.4);
  } else {
    applyGlobalPlaybackRate(1);
  }

  let effSp = sp * effSlowFactor;
  const dt = 16;

  limitObjects();

  // SPAWN OBJECTS
  if (now > nextRed) {
    reds.push(spawn("red", item, item));
    nextRed = now + (1600 / effSp) / spawnPressure;
  }

  if (now > nextObs) {
    if (Math.random() < 0.5 * spawnPressure) {
      obs.push(spawn("obs", item * 0.8, item * 0.8));
    }
    nextObs = now + (3800 / effSp) / spawnPressure;
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

  if (now > nextFever && Math.random() < 0.15) {
    buffs.push(spawn("fever", item, item, 0.25));
    nextFever = now + 15000;
  }

  // REDS (PIZZA)
  for (let i = reds.length - 1; i >= 0; i--) {
    const r = reds[i];
    r.y += 1.3 * effSp;
    applyZigzag(r, effSp);

    const collected = coll(p, r) || isPulledByUltra(r, effSp);

    if (collected) {
      handleComboPizzaTake();

      let base = 5;
      if (now < slowMoUntil) base *= 1.2;
      if (feverActive) base *= 2;
      if (ultraModeUntil > now) base *= 1.5;

      score += Math.round(base * comboMultiplier);

      pc += 1;
      localStorage.setItem("pc", pc);
      updateHUDPC();

      if (score > hs) {
        hs = score;
        localStorage.setItem("hs", hs);
        updateSkinUnlockedState();
        saveHighScoreOnline();
        updateChallengesOnScore(score);
      }

      pizzaCount++;
      if (pizzaCount % 2 === 0) ammo++;

      spawnParticles(r.x + r.w / 2, r.y + r.h / 2, "orange", 10);

      p.scale = 1.2;
      setTimeout(() => p.scale = 1, 150);

      reds.splice(i, 1);
      playSound("pizza");

      updateChallengesOnPizzaCollect();

    } else if (r.y > H) {
      reds.splice(i, 1);
      miss++;
      breakCombo();

      if (miss >= (currentMode === "easy" ? 6 : 3)) {
        go = true;
        playSound("gameOver");
        shake = 20;
        updateChallengesOnRoundEnd();
      }
    }
  }

  // OBSTACLES
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];
    o.y += 1.5 * effSp;
    applyZigzag(o, effSp);

    if (coll(p, o)) {
      if (!godMode && ultraModeUntil < now) {
        go = true;
        playHitSound();
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "red", 15);
        shake = 20;
        updateChallengesOnRoundEnd();
      } else {
        obs.splice(i, 1);
        spawnParticles(o.x + o.w / 2, o.y + o.h / 2, "#00faff", 15);
        shake = 5;
      }
    } else if (o.y > H) {
      obs.splice(i, 1);
    }
  }

  // GREENS (DRUG)
  for (let i = greens.length - 1; i >= 0; i--) {
    const g = greens[i];
    g.y += 1.1 * effSp;
    applyZigzag(g, effSp);

    if (coll(p, g)) {
      hunger = Math.max(0, hunger - drugPower);
      greens.splice(i, 1);
      spawnParticles(g.x + g.w / 2, g.y + g.h / 2, "#00ff99", 8);
      playSound("drug");
      drugEffectUntil = now + 1500;
    }
  }

  // BLUES (WEED)
  for (let i = blues.length - 1; i >= 0; i--) {
    const b = blues[i];
    b.y += 1.0 * effSp;
    applyZigzag(b, effSp);

    if (coll(p, b)) {
      hunger = Math.min(100, hunger + weedPower);
      blues.splice(i, 1);
      spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#00ccff", 8);
      weedEffectUntil = now + 1500;
    }
  }

  // BUFFS (speed + pizza44)
  for (let i = buffs.length - 1; i >= 0; i--) {
    const bf = buffs[i];
    bf.y += 1.3 * effSp;
    applyZigzag(bf, effSp);

    if (coll(p, bf)) {
      if (bf.tType === "speed") {
        activateUltraFast();
        if (miss > 0) miss--;
      }
      if (bf.tType === "fever") {
        activateUltraSlow();
      }

      spawnParticles(bf.x + bf.w / 2, bf.y + bf.h / 2, "#ffcc00", 20);
      buffs.splice(i, 1);

    } else if (bf.y > H) {
      buffs.splice(i, 1);
    }
  }

  // BULLETS
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

  // HUD update
  if (hudScore) hudScore.textContent = "Score: " + score;
  if (hudHigh) hudHigh.textContent = "High: " + hs;
  if (hudAmmo) hudAmmo.textContent = "Ammo: " + ammo;
  if (hudHunger) hudHunger.textContent = "Hunger: " + hunger + "%";
  if (hudMiss) hudMiss.textContent = "Miss: " + miss + (currentMode === "easy" ? "/6" : "/3");
  if (hudSpeed) hudSpeed.textContent = "Speed: " + gameSpeed.toFixed(1);
  if (hudMode) hudMode.textContent = "Mode: " + currentMode.toUpperCase();
  updateHUDPC();
}

// ---------------------------
//  DRAW
// ---------------------------
function draw() {
  x.save();
  x.clearRect(0, 0, W, H);

  const now = Date.now();
  const inSlowMo = now < slowMoUntil || now < ultraSlowUntil;

  // BACKGROUND: سفید + pizzaback با اوپسیتی کم
  if (img.bg && img.bg.complete) {
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.22;
    x.drawImage(img.bg, 0, 0, W, H);
    x.globalAlpha = 1;
  } else {
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, W, H);
  }

  // Screen shake
  if (shake > 0) {
    x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.9;
    if (shake < 0.5) shake = 0;
  }

  if (!start) {
    x.restore();
    return;
  }

  // Slow overlay
  if (now < ultraSlowUntil) {
    x.fillStyle = "rgba(120,170,255,0.18)";
    x.fillRect(0, 0, W, H);
  } else if (inSlowMo) {
    x.fillStyle = "rgba(100,150,255,0.08)";
    x.fillRect(0, 0, W, H);
  }

  // Fast overlay
  if (now < ultraFastUntil) {
    x.fillStyle = "rgba(255,220,130,0.16)";
    x.fillRect(0, 0, W, H);
  }

  // Fever overlay (کم)
  if (feverActive) {
    x.fillStyle = "rgba(255, 220, 80, 0.1)";
    x.fillRect(0, 0, W, H);
  }

  // NOTE: Drug/Weed overlay حذف شده

  // PLAYER
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

  x.drawImage(img[currentSkin], -p.w / 2, -p.h / 2, p.w, p.h);
  x.restore();

  // OBJECTS
  reds.forEach(r => x.drawImage(img.r, r.x, r.y, r.w, r.h));
  greens.forEach(g => x.drawImage(img.g, g.x, g.y, g.w, g.h));
  blues.forEach(b => x.drawImage(img.b, b.x, b.y, b.w, b.h));
  obs.forEach(o => x.drawImage(img.o, o.x, o.y, o.w, o.h));

  buffs.forEach(bf => {
    if (bf.tType === "speed") x.drawImage(img.s, bf.x, bf.y, bf.w, bf.h);
    if (bf.tType === "fever") x.drawImage(img.fever, bf.x, bf.y, bf.w, bf.h);
  });

  // BULLETS
  bullets.forEach(b => {
    x.drawImage(b.img, b.x, b.y, b.w, b.h);
    x.fillStyle = "rgba(255,255,0,0.4)";
    x.fillRect(b.x + b.w / 4, b.y + b.h, b.w / 2, 15);
  });

  // PARTICLES
  particles.forEach(p0 => {
    x.fillStyle = p0.color;
    x.globalAlpha = Math.max(0, p0.life / 400);
    x.beginPath();
    x.arc(p0.x, p0.y, 4, 0, Math.PI * 2);
    x.fill();
    x.globalAlpha = 1;
  });

  // TEXTS
  if (comboText && now < comboTextUntil) {
    x.textAlign = "center";
    x.font = "24px Arial";
    x.fillStyle = "#ff8800";
    x.fillText(comboText, W / 2, 70);
  }

  if (now < slowMoUntil || now < ultraSlowUntil) {
    x.textAlign = "center";
    x.font = "18px Arial";
    x.fillStyle = "#88ddff";
    x.fillText("SLOW MODE", W / 2, 100);
  }

  if (now < ultraFastUntil) {
    x.textAlign = "center";
    x.font = "18px Arial";
    x.fillStyle = "#ffcc33";
    x.fillText("SPEED BOOST", W / 2, 130);
  }

  if (ultraModeUntil > now) {
    x.textAlign = "center";
    x.font = "20px Arial";
    x.fillStyle = "#ff00ff";
    x.fillText("ANFO ULTRA MODE", W / 2, 160);
  }

  // GAME OVER
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
    x.fillText("PC: " + pc, W / 2, H / 2 + 90);
  }

  x.restore();
}

// ---------------------------
//  LOOP
// ---------------------------
(function loopFn() {
  upd();
  draw();
  requestAnimationFrame(loopFn);
})();

applyMode("normal");
reset();

// ---------------------------
//  FIREBASE ONLINE SYSTEM
// ---------------------------

// فرض: firebase، auth و db در index.html تعریف شده‌اند
auth.signInAnonymously()
  .then(() => {
    console.log("✅ Firebase Connected:", auth.currentUser.uid);
    loadOnlineData();
  })
  .catch(err => {
    console.error("❌ Firebase Error:", err);
  });

function saveProfileOnline() {
  if (!auth.currentUser || !profile) return;

  db.collection("profiles").doc(auth.currentUser.uid).set({
    username: profile.username,
    avatar: profile.avatar,
    skin: profile.skin,
    pc: pc,
    updated: Date.now()
  }, { merge: true })
  .then(() => console.log("✅ Profile Saved Online"))
  .catch(err => console.error("❌ Profile Save Error:", err));
}

function saveHighScoreOnline() {
  if (!auth.currentUser) return;

  db.collection("scores").doc(auth.currentUser.uid).set({
    score: hs,
    updated: Date.now(),
    username: profile ? profile.username : "Guest"
  }, { merge: true })
  .then(() => console.log("✅ High Score Saved Online"))
  .catch(err => console.error("❌ Score Save Error:", err));
}

function loadOnlineData() {
  if (!auth.currentUser) return;

  db.collection("profiles").doc(auth.currentUser.uid).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        profile = {
          username: data.username,
          avatar: data.avatar,
          skin: data.skin
        };
        pc = data.pc != null ? data.pc : pc;
        localStorage.setItem("profile", JSON.stringify(profile));
        localStorage.setItem("pc", pc);
        currentSkin = profile.skin || "p";
        updateProfileDisplay();
        updateSkinMenu();
        updateShopUI();
        updateHUDPC();
      }
    });

  db.collection("scores").doc(auth.currentUser.uid).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        hs = data.score || hs;
        localStorage.setItem("hs", hs);
      }
    });
}

// LEADERBOARD
function openLeaderboard() {
  const lb = leaderboardMenu;
  if (!lb) return;

  lb.classList.remove("hidden");

  const list = lb.querySelector(".leaderboard-list");
  list.innerHTML = "Loading...";

  db.collection("scores")
    .orderBy("score", "desc")
    .limit(10)
    .get()
    .then(snap => {
      list.innerHTML = "";
      snap.forEach(doc => {
        const d = doc.data();
        const div = document.createElement("div");
        div.className = "leaderboard-item";
        div.textContent = `${d.username || "Player"} — ${d.score}`;
        list.appendChild(div);
      });
    });
}

function closeLeaderboard() {
  const lb = leaderboardMenu;
  if (!lb) return;
  lb.classList.add("hidden");
}

// PAUSE SYSTEM
function togglePause() {
  paused = !paused;
  if (paused && pauseMenu) pauseMenu.classList.remove("hidden");
  else if (pauseMenu) pauseMenu.classList.add("hidden");
}

function goToMainMenu() {
  go = false;
  paused = false;
  start = false;
  reset();
  if (pauseMenu) pauseMenu.classList.add("hidden");
  if (startMenu) startMenu.classList.remove("hidden");
  try { bg.pause(); } catch {}
}

function toggleSound() {
  soundOn = !soundOn;
  if (!soundOn) {
    try { bg.pause(); } catch {}
  } else {
    if (start) try { bg.play(); } catch {}
  }
  updateSoundStateText();
}

// TOAST
function showToast(msg, duration = 2000) {
  if (!statusToast) {
    console.log("TOAST:", msg);
    return;
  }
  statusToast.textContent = msg;
  statusToast.classList.add("show");
  setTimeout(() => {
    statusToast.classList.remove("show");
  }, duration);
}

// Export for HTML
window.goToMainMenu = goToMainMenu;
window.toggleSound = toggleSound;
window.closeSkinMenu = closeSkinMenu;
window.closeShopMenu = closeShopMenu;
window.openShopMenu = openShopMenu;
window.openChallengeMenu = openChallengeMenu;
window.closeChallengeMenu = closeChallengeMenu;
window.openWeeklyMenu = openWeeklyMenu;
window.closeWeeklyMenu = closeWeeklyMenu;
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;

console.log("✅ Eat Pizza Final Edition Loaded");
