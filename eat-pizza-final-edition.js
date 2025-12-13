// ============================================
//  Optional Firebase config (safe fallback)
// ============================================
let auth = null, db = null, firebaseReady = false;

try {
  if (window.firebase && firebase.apps && firebase.apps.length === 0) {
    const firebaseConfig = {
  apiKey: "AIzaSyB8PV0S43tJdZYAgwSsXq5fpBrcukczgec",
  authDomain: "eat-pizza-b1651.firebaseapp.com",
  projectId: "eat-pizza-b1651",
  storageBucket: "eat-pizza-b1651.firebasestorage.app",
  messagingSenderId: "691132791942",
  appId: "1:691132791942:web:90070f3e73940e6916e507",
  measurementId: "G-GKJ6YS8G4E"    };
    firebase.initializeApp(firebaseConfig);
  }
  if (window.firebase && firebase.apps && firebase.apps.length > 0) {
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;
  }
} catch (e) {
  console.warn("Firebase not configured, running offline only.");
}

// ============================================
//  Canvas & basic state
// ============================================
const c = document.getElementById("gameCanvas");
const x = c.getContext("2d");
let W = innerWidth, H = innerHeight;

let p = { x: 0, y: 0, w: 0, h: 0, scale: 1, glow: false };
let reds = [], obs = [], greens = [], blues = [], buffs = [], bullets = [], particles = [];

let score = 0, hs = +localStorage.getItem("hs") || 0, pc = +localStorage.getItem("pc") || 0;
let ammo = 0, go = false, start = false, paused = false;
let currentMode = "normal", gameSpeed = 1, spawnPressure = 1;
let item = 40, bs = 20, zigzagIntensity = 1;

let combo = 0, comboMul = 1, comboText = "", comboUntil = 0, lastPizzaTime = 0;

let slowMoUntil = 0, ultraSlowUntil = 0, ultraFastUntil = 0, ultraModeUntil = 0;
let godMode = false, godUntil = 0, fever = false, feverUntil = 0;
let shake = 0;
let currentSkin = localStorage.getItem("skin") || "p";

// DOM refs
const startMenu = document.getElementById("startMenu");
const playBtn = document.getElementById("playBtn");
const modeChips = document.querySelectorAll(".mode-chip");
const menuTiles = document.querySelectorAll(".menu-tile");
const pauseMenu = document.getElementById("pauseMenu");
const hudScore = document.getElementById("hudScore");
const hudHigh  = document.getElementById("hudHigh");
const hudMode  = document.getElementById("hudMode");
const hudPC    = document.getElementById("hudPC");
const statusToast = document.getElementById("statusToast");
const skinMenu = document.getElementById("skinMenu");
const shopMenu = document.getElementById("shopMenu");
const shopList = shopMenu ? shopMenu.querySelector(".shop-list") : null;
const challengeMenu = document.getElementById("challengeMenu");
const challengeList = challengeMenu ? challengeMenu.querySelector("#challengeList") : null;
const leaderboardMenu = document.getElementById("leaderboardMenu");

// Profile DOM
const profileMenu = document.getElementById("profileMenu");
const usernameInput = document.getElementById("usernameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const closeProfileBtn = document.getElementById("closeProfileBtn");

// Loading screen + fun loading
const loadingScreen = document.getElementById("loadingScreen");
const loadingCanvas = document.getElementById("loadingCanvas");
const lc = loadingCanvas.getContext("2d");

// Profile state
let profile = JSON.parse(localStorage.getItem("profile") || "null");
let selectedAvatar = profile ? profile.avatar : null;
let pendingStartAfterProfile = false;

// ============================================
//  Resize
// ============================================
function R() {
  const r = devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  c.width = W * r; c.height = H * r;
  x.setTransform(r, 0, 0, r, 0, 0);
  let s = Math.min(W, H) * 0.22;
  p.w = p.h = s;
  p.x = (W - s) / 2;
  p.y = H - s - 10;
  item = s * 0.6;
  bs = s * 0.25;
  loadingCanvas.width = W;
  loadingCanvas.height = H;
}
R();
addEventListener("resize", R);

// ============================================
//  Images & Audio
// ============================================
const I = s => { const i = new Image(); i.src = s; return i; };
const img = {
  p:   I("PIZZA-KHOOR.png"),
  pizzakhoor11: I("pizzakhoor11.png"),
  pizzakhoor12: I("pizzakhoor12.png"),
  r:   I("pizza1.png"),
  g:   I("DRUG.png"),
  b:   I("weed.webp"),
  o:   I("shit.webp"),
  bu:  I("bullet.png"),
  s:   I("speed.png"),
  fever: I("pizza44.png"),
  bg:  I("pizzaback.jpg")
};

const makeAudio = s => { const a = new Audio(s); a.preload = "auto"; return a; };
const sounds = {
  pizza: [makeAudio("2.mp3"), makeAudio("3.mp3"), makeAudio("5.mp3")],
  drug: makeAudio("1.mp3"),
  explode: makeAudio("gooz1.mp3"),
  gameOver: makeAudio("gameover.mp3")
};
const bg = makeAudio("background.mp3");
bg.loop = true; bg.volume = 0.3;
let soundOn = true;

function playSound(name) {
  if (!start || !soundOn) return;
  const s = sounds[name]; if (!s) return;
  const base = Array.isArray(s) ? s[(Math.random() * s.length) | 0] : s;
  const a = base.cloneNode(); a.currentTime = 0; a.play().catch(() => {});
}

// ============================================
//  Background cover
// ============================================
function drawBG() {
  if (!img.bg.complete) return;
  const iw = img.bg.width, ih = img.bg.height;
  if (!iw || !ih) return;
  const cr = W / H, ir = iw / ih;
  let dw, dh;
  if (ir > cr) { dh = H; dw = ir * H; }
  else { dw = W; dh = W / ir; }
  const dx = (W - dw) / 2, dy = (H - dh) / 2;
  x.save(); x.globalAlpha = 0.25; x.drawImage(img.bg, dx, dy, dw, dh); x.restore();
}

// ============================================
//  Skins & Shop
// ============================================
const skins = {
  p: { id: "p", name: "Default", unlocked: true, requireScore: 0, price: 0 },
  pizzakhoor11: { id: "pizzakhoor11", name: "Pizzakhoor 11", unlocked: hs >= 300, requireScore: 300, price: 200 },
  pizzakhoor12: { id: "pizzakhoor12", name: "Pizzakhoor 12", unlocked: hs >= 800, requireScore: 800, price: 350 }
};

const shopItems = [
  { id: "skin_p11", type: "skin", skinId: "pizzakhoor11", title: "Pizzakhoor 11", desc: "Sharper crust.", price: 200 },
  { id: "skin_p12", type: "skin", skinId: "pizzakhoor12", title: "Pizzakhoor 12", desc: "Elite slice.",   price: 350 },
  { id: "upg_slowmo", type: "upgrade", title: "SlowMo Boost", desc: "Start with 3s slow motion.", price: 150, key: "upg_slowmo" },
  { id: "upg_ammo",   type: "upgrade", title: "Extra Ammo",   desc: "Start with +3 ammo.",        price: 120, key: "upg_ammo" },
  { id: "upg_double", type: "upgrade", title: "Double PC",    desc: "2x PC per pizza.",           price: 400, key: "upg_double" }
];

function updateHUD() {
  hudScore && (hudScore.textContent = "Score: " + score);
  hudHigh  && (hudHigh.textContent  = "High: "  + hs);
  hudPC    && (hudPC.textContent    = "PC: "    + pc);
  hudMode  && (hudMode.textContent  = "Mode: "  + currentMode.toUpperCase());
}

function showToast(msg, dur = 2000) {
  if (!statusToast) return console.log("TOAST:", msg);
  statusToast.textContent = msg;
  statusToast.classList.add("show");
  setTimeout(() => statusToast.classList.remove("show"), dur);
}

function updateSkinUnlocked() {
  skins.p.unlocked = true;
  skins.pizzakhoor11.unlocked = hs >= skins.pizzakhoor11.requireScore || skins.pizzakhoor11.unlocked;
  skins.pizzakhoor12.unlocked = hs >= skins.pizzakhoor12.requireScore || skins.pizzakhoor12.unlocked;
}

function updateSkinMenu() {
  if (!skinMenu) return;
  updateSkinUnlocked();
  const list = skinMenu.querySelector(".skin-list");
  if (!list) return;
  list.innerHTML = "";
  Object.keys(skins).forEach(id => {
    const s = skins[id];
    const div = document.createElement("div");
    div.className = "skin-option";
    div.dataset.skin = id;
    if (!s.unlocked) div.classList.add("locked");
    if (currentSkin === id) div.classList.add("selected");
    div.innerHTML = `
      <img class="skin-img" src="${img[id].src}">
      <div class="skin-label">${s.name} ${s.requireScore ? `(Score ${s.requireScore}+ / ${s.price} PC)` : ""}</div>`;
    div.onclick = () => {
      if (!s.unlocked) return showToast("از Shop بخر یا HighScore لازم رو بگیر");
      currentSkin = id;
      localStorage.setItem("skin", currentSkin);
      if (profile) {
        profile.skin = currentSkin;
        localStorage.setItem("profile", JSON.stringify(profile));
        saveProfileOnline();
      }
      updateSkinMenu();
    };
    list.appendChild(div);
  });
}

function openSkinMenu()  { skinMenu && skinMenu.classList.remove("hidden"); updateSkinMenu(); }
function closeSkinMenu() { skinMenu && skinMenu.classList.add("hidden"); }

function openShopMenu()  { shopMenu && shopMenu.classList.remove("hidden"); updateShopUI(); }
function closeShopMenu() { shopMenu && shopMenu.classList.add("hidden"); }

function updateShopUI() {
  if (!shopList) return;
  shopList.innerHTML = "";
  shopItems.forEach(item => {
    const div = document.createElement("div");
    div.className = "shop-item";
    let owned = item.type === "skin" ? skins[item.skinId].unlocked : localStorage.getItem(item.key) === "1";
    const imgHtml = item.type === "skin"
      ? `<img class="shop-item-img-tag" src="${img[item.skinId].src}">`
      : `<span class="shop-icon">${item.title[0]}</span>`;
    div.innerHTML = `
      <div class="shop-item-img">${imgHtml}</div>
      <div class="shop-item-info">
        <div class="shop-item-title">${item.title}</div>
        <div class="shop-item-sub">${item.desc}</div>
        <div class="shop-item-price">${item.price} PC</div>
      </div>
      <button class="shop-buy-btn">${owned ? (item.type === "skin" ? (currentSkin === item.skinId ? "Equipped" : "Equip") : "Owned") : "Buy"}</button>
    `;
    const btn = div.querySelector(".shop-buy-btn");
    if (item.type === "upgrade" && owned) btn.disabled = true;

    btn.onclick = () => {
      if (item.type === "skin") {
        if (!skins[item.skinId].unlocked) {
          if (pc < item.price) return showToast("PC کافی نیست");
          pc -= item.price; localStorage.setItem("pc", pc); updateHUD();
          skins[item.skinId].unlocked = true;
        }
        currentSkin = item.skinId; localStorage.setItem("skin", currentSkin);
        if (profile) {
          profile.skin = currentSkin;
          localStorage.setItem("profile", JSON.stringify(profile));
          saveProfileOnline();
        }
        updateSkinMenu(); updateShopUI();
      } else {
        if (localStorage.getItem(item.key) === "1") return;
        if (pc < item.price) return showToast("PC کافی نیست");
        pc -= item.price; localStorage.setItem("pc", pc); updateHUD();
        localStorage.setItem(item.key, "1");
        updateShopUI();
        showToast("خرید انجام شد");
        profile && saveProfileOnline();
      }
    };

    shopList.appendChild(div);
  });
}

// ============================================
//  Missions (daily, ساده)
// ============================================
const dailyMissions = [
  { id: "d1", title: "Collect 20 pizzas", goal: 20, progress: 0, reward: 25, type: "pizza" },
  { id: "d2", title: "Reach 100 score",   goal: 100, progress: 0, reward: 35, type: "score" },
  { id: "d3", title: "Hit 5 obstacles",   goal: 5, progress: 0, reward: 40, type: "obstacle" }
];

function loadMissions() {
  const d = localStorage.getItem("dailyMissions");
  const last = localStorage.getItem("dailyReset");
  const today = new Date().toDateString();
  if (last !== today) {
    dailyMissions.forEach(m => m.progress = 0);
    localStorage.setItem("dailyReset", today);
    saveMissions();
  } else if (d) {
    try {
      const arr = JSON.parse(d);
      arr.forEach((m, i) => dailyMissions[i].progress = m.progress);
    } catch {}
  }
}
function saveMissions() {
  localStorage.setItem("dailyMissions", JSON.stringify(dailyMissions));
}
function updateChallengesUI() {
  if (!challengeList) return;
  challengeList.innerHTML = "";
  dailyMissions.forEach(m => {
    const pct = Math.min(100, Math.round(100 * Math.max(0, m.progress) / m.goal));
    const div = document.createElement("div");
    div.className = "mission-item" + (m.progress >= m.goal ? " completed" : "");
    div.innerHTML = `
      <div class="mission-title">${m.title}</div>
      <div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
      <div class="mission-info">${m.progress > 0 ? m.progress : 0}/${m.goal} — ${m.reward} PC</div>`;
    if (m.progress >= m.goal) {
      div.onclick = () => {
        if (m.progress < m.goal) return;
        pc += m.reward; localStorage.setItem("pc", pc); updateHUD();
        m.progress = -999; saveMissions(); updateChallengesUI();
        showToast(`Reward +${m.reward} PC`);
        profile && saveProfileOnline();
      };
    }
    challengeList.appendChild(div);
  });
}
function openChallengeMenu()  { challengeMenu && (challengeMenu.classList.remove("hidden"), updateChallengesUI()); }
function closeChallengeMenu() { challengeMenu && challengeMenu.classList.add("hidden"); }

// ============================================
//  Profile (local + optional online)
// ============================================
function highlightAvatar() {
  document.querySelectorAll(".avatar").forEach(a => {
    a.classList.toggle("selected", a.dataset.id === selectedAvatar);
  });
}
function openProfileMenu() {
  if (!profileMenu) return;
  profileMenu.classList.remove("hidden");
  if (profile) {
    usernameInput.value = profile.username || "";
    selectedAvatar = profile.avatar;
  }
  highlightAvatar();
}
function closeProfileMenu() {
  profileMenu && profileMenu.classList.add("hidden");
}
document.querySelectorAll(".avatar").forEach(a => {
  a.onclick = () => { selectedAvatar = a.dataset.id; highlightAvatar(); };
});

saveProfileBtn && (saveProfileBtn.onclick = () => {
  const username = usernameInput.value.trim();
  if (!username || !selectedAvatar) {
    showToast("نام و آواتار را انتخاب کن");
    return;
  }
  profile = { username, avatar: selectedAvatar, skin: currentSkin };
  localStorage.setItem("profile", JSON.stringify(profile));
  saveProfileOnline();
  closeProfileMenu();
  if (pendingStartAfterProfile) {
    pendingStartAfterProfile = false;
    startGame();
  }
});
closeProfileBtn && (closeProfileBtn.onclick = closeProfileMenu);

// ============================================
//  Firebase online sync (امن در صورت نبود config)
// ============================================
if (firebaseReady && auth) {
  auth.signInAnonymously()
    .then(() => { console.log("✅ Firebase Connected:", auth.currentUser.uid); loadOnlineData(); })
    .catch(err => console.error("❌ Firebase Error:", err));
}

function saveProfileOnline() {
  if (!firebaseReady || !auth || !profile) return;
  const user = auth.currentUser; if (!user) return;
  db.collection("profiles").doc(user.uid).set({
    username: profile.username,
    avatar: profile.avatar,
    skin: currentSkin,
    pc,
    updated: Date.now()
  }, { merge: true }).catch(console.error);
}
function saveHighScoreOnline() {
  if (!firebaseReady || !auth) return;
  const user = auth.currentUser; if (!user) return;
  db.collection("scores").doc(user.uid).set({
    score: hs,
    username: profile ? profile.username : "Guest",
    updated: Date.now()
  }, { merge: true }).catch(console.error);
}
function loadOnlineData() {
  if (!firebaseReady || !auth) return;
  const user = auth.currentUser; if (!user) return;
  db.collection("profiles").doc(user.uid).get().then(doc => {
    if (doc.exists) {
      const d = doc.data();
      profile = { username: d.username, avatar: d.avatar, skin: d.skin || "p" };
      pc = d.pc != null ? d.pc : pc;
      currentSkin = profile.skin || currentSkin;
      localStorage.setItem("profile", JSON.stringify(profile));
      localStorage.setItem("pc", pc);
      localStorage.setItem("skin", currentSkin);
      updateSkinMenu(); updateShopUI(); updateHUD();
    }
  });
  db.collection("scores").doc(user.uid).get().then(doc => {
    if (doc.exists) {
      const d = doc.data();
      hs = d.score || hs;
      localStorage.setItem("hs", hs);
      updateHUD();
    }
  });
}

// ============================================
//  Leaderboard (اختیاری)
// ============================================
function openLeaderboard() {
  if (!leaderboardMenu) return;
  leaderboardMenu.classList.remove("hidden");
  const list = leaderboardMenu.querySelector(".leaderboard-list");
  if (!firebaseReady || !db) {
    list.innerHTML = "Offline mode (no Firebase config)";
    return;
  }
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
    })
    .catch(err => { list.innerHTML = "Error loading leaderboard"; console.error(err); });
}
function closeLeaderboard() {
  leaderboardMenu && leaderboardMenu.classList.add("hidden");
}

// ============================================
//  Mode, Reset, Spawn
// ============================================
let nextRed = 0, nextObs = 0, nextGreen = 0, nextBlue = 0, nextBuff = 0;

function applyMode(mode) {
  currentMode = mode;
  if (mode === "easy")   { gameSpeed = 0.7; zigzagIntensity = 0.4; }
  else if (mode === "normal") { gameSpeed = 1.0; zigzagIntensity = 1; }
  else                   { gameSpeed = 1.4; zigzagIntensity = 1.8; }
  updateHUD();
}

function reset() {
  reds = []; obs = []; greens = []; blues = []; buffs = []; bullets = []; particles = [];
  score = 0; ammo = 0; go = false;
  combo = 0; comboMul = 1; comboText = ""; comboUntil = 0; shake = 0;
  slowMoUntil = 0; ultraSlowUntil = 0; ultraFastUntil = 0; ultraModeUntil = 0;
  godMode = false; godUntil = 0; fever = false; feverUntil = 0;
  applyMode(currentMode);

  if (localStorage.getItem("upg_ammo") === "1") ammo += 3;
  if (localStorage.getItem("upg_slowmo") === "1") slowMoUntil = Date.now() + 3000;

  const now = Date.now();
  nextRed = now; nextObs = now; nextGreen = now + 2000; nextBlue = now + 3000; nextBuff = now + 4000;
  updateHUD();
}

function spawn(type, w, h, zigChance = 0.3) {
  const zig = Math.random() < zigChance;
  return {
    x: Math.random() * (W - w),
    y: -h,
    w, h,
    zigzag: zig,
    dir: Math.random() < 0.5 ? -1 : 1,
    amp: 15 + Math.random() * 40,
    t: Math.random() * Math.PI * 2,
    baseX: null,
    tType: type,
    zigSpeed: 0.05 + Math.random() * 0.06
  };
}
function applyZigzag(o, sp) {
  if (!o.zigzag) return;
  if (o.baseX == null) o.baseX = o.x;
  o.t += (o.zigSpeed || 0.05) * sp;
  o.x = o.baseX + Math.sin(o.t) * o.amp * zigzagIntensity;
}
function limitObjects() {
  if (reds.length > 12) reds.length = 12;
  if (obs.length > 8) obs.length = 8;
  if (greens.length > 4) greens.length = 4;
  if (blues.length > 4) blues.length = 4;
  if (buffs.length > 3) buffs.length = 3;
}

// ============================================
//  Combo & effects
// ============================================
function handleCombo() {
  const now = Date.now();
  if (now - lastPizzaTime < 2000) combo++; else combo = 1;
  lastPizzaTime = now;
  if      (combo >= 8) { comboMul = 3;   comboText = "MEGA COMBO x3"; }
  else if (combo >= 5) { comboMul = 2;   comboText = "COMBO x2"; }
  else if (combo >= 3) { comboMul = 1.5; comboText = "COMBO x1.5"; }
  else                 { comboMul = 1;   comboText = ""; }
  comboUntil = comboText ? now + 1500 : 0;
}
function breakCombo() { combo = 0; comboMul = 1; comboText = ""; comboUntil = 0; }

function activateSlowMo(ms = 5000) { slowMoUntil = Date.now() + ms; }
function activateUltraSlow() { ultraSlowUntil = Date.now() + 8000; ultraFastUntil = 0; }
function activateUltraFast() { ultraFastUntil = Date.now() + 8000; ultraSlowUntil = 0; }
function activateUltraMode() { ultraModeUntil = Date.now() + 20000; showToast("ULTRA MODE"); }

function updGod(now) { if (godMode && now > godUntil) { godMode = false; p.glow = false; } }
function activateGod(ms = 6000) { godMode = true; godUntil = Date.now() + ms; p.glow = true; }

function updFever(now) { if (fever && now > feverUntil) { fever = false; gameSpeed /= 1.2; } }
function activateFever() {
  if (fever) return;
  fever = true; feverUntil = Date.now() + 6000; gameSpeed *= 1.2;
  let gain = 10; if (localStorage.getItem("upg_double") === "1") gain *= 2;
  pc += gain; localStorage.setItem("pc", pc); updateHUD();
  profile && saveProfileOnline();
}

function isPulledByUltra(r, effSp) {
  const now = Date.now();
  if (ultraModeUntil <= now) return false;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const rx = r.x + r.w / 2, ry = r.y + r.h / 2;
  const dx = cx - rx, dy = cy - ry;
  const dist = Math.hypot(dx, dy);
  if (dist > H * 0.6) return false;
  const pull = 0.25 * effSp;
  r.x += (dx / (dist || 1)) * pull;
  r.y += (dy / (dist || 1)) * pull;
  return coll(p, r);
}

// ============================================
//  Input
// ============================================
function move(mx) {
  p.x = Math.max(0, Math.min(mx - p.w / 2, W - p.w));
}
addEventListener("mousemove", e => {
  if (!start || go || paused) return;
  const r = c.getBoundingClientRect();
  move(e.clientX - r.left);
});
addEventListener("touchmove", e => {
  if (!start || go || paused) return;
  const r = c.getBoundingClientRect(), t = e.touches[0];
  move(t.clientX - r.left);
}, { passive: true });

let lastTap = 0, canShootKey = true;
function shoot() {
  if (ammo <= 0) return;
  ammo--;
  bullets.push({ x: p.x + p.w / 2 - bs / 2, y: p.y - 6, w: bs, h: bs * 2, s: 12, img: img.bu });
}
addEventListener("touchstart", e => {
  if (!start || go || paused) return;
  const now = Date.now();
  if (now - lastTap < 300) shoot();
  lastTap = now;
}, { passive: true });

addEventListener("keydown", e => {
  if (e.code === "Space" && canShootKey) {
    canShootKey = false;
    if (start && !go && !paused) shoot();
  }
  if (e.code === "KeyP" && start && !go) togglePause();
});
addEventListener("keyup", e => {
  if (e.code === "Space") canShootKey = true;
});

// ============================================
//  Collision & particles
// ============================================
const coll = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function spawnParticles(x0, y0, color, n = 6) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: x0, y: y0,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 400,
      color
    });
  }
}
function updParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p0 = particles[i];
    p0.x += p0.vx; p0.y += p0.vy; p0.life -= dt; p0.vy += 0.05;
    if (p0.life <= 0) particles.splice(i, 1);
  }
}

// ============================================
//  Update
// ============================================
function upd() {
  if (!start || go || paused) return;
  const now = Date.now();
  updGod(now); updFever(now);

  spawnPressure = 1 + Math.min(score / 1500, 2);
  let sp = gameSpeed, effSlow = 1;
  if (now < slowMoUntil) effSlow *= 0.7;
  if (now < ultraSlowUntil) effSlow *= 0.4;
  if (now < ultraFastUntil) sp *= 1.5;
  let effSp = sp * effSlow;
  const dt = 16;

  limitObjects();

  if (now > nextRed)  { reds.push(spawn("red", item, item)); nextRed  = now + (1600 / effSp) / spawnPressure; }
  if (now > nextObs)  { if (Math.random() < 0.5 * spawnPressure) obs.push(spawn("obs", item * 0.8, item * 0.8)); nextObs  = now + (3800 / effSp) / spawnPressure; }
  if (now > nextGreen && Math.random() < 0.2) { greens.push(spawn("green", item, item, 0.2)); nextGreen = now + 6000; }
  if (now > nextBlue  && Math.random() < 0.2) { blues.push(spawn("blue", item, item, 0.2));  nextBlue  = now + 8000; }
  if (now > nextBuff  && Math.random() < 0.25) { buffs.push(spawn("buff", item, item, 0.2)); nextBuff  = now + 9000; }

  // reds
  for (let i = reds.length - 1; i >= 0; i--) {
    const r = reds[i];
    r.y += 1.3 * effSp; applyZigzag(r, effSp);
    const collected = coll(p, r) || isPulledByUltra(r, effSp);
    if (collected) {
      handleCombo();
      let base = 5;
      if (fever) base *= 2;
      if (ultraModeUntil > now) base *= 1.5;
      score += Math.round(base * comboMul);

      let pcGain = 1;
      if (localStorage.getItem("upg_double") === "1") pcGain = 2;
      pc += pcGain; localStorage.setItem("pc", pc);

      dailyMissions.forEach(m => {
        if (m.type === "pizza" && m.progress >= 0) m.progress++;
        if (m.type === "score" && score >= m.goal && m.progress >= 0) m.progress = m.goal;
      });

      if (score > hs) {
        hs = score; localStorage.setItem("hs", hs);
        saveHighScoreOnline();
      }

      spawnParticles(r.x + r.w / 2, r.y + r.h / 2, "orange", 10);
      p.scale = 1.2; setTimeout(() => p.scale = 1, 150);
      reds.splice(i, 1); playSound("pizza");
    } else if (r.y > H) {
      reds.splice(i, 1); breakCombo();
    }
  }

  // obs
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];
    o.y += 1.5 * effSp; applyZigzag(o, effSp);
    if (coll(p, o)) {
      if (!godMode && ultraModeUntil < now) {
        go = true; playSound("gameOver");
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "red", 15); shake = 20;
      } else {
        obs.splice(i, 1);
        spawnParticles(o.x + o.w / 2, o.y + o.h / 2, "#00faff", 15); shake = 5;
      }
    } else if (o.y > H) obs.splice(i, 1);
  }

  // greens
  for (let i = greens.length - 1; i >= 0; i--) {
    const g = greens[i];
    g.y += 1.1 * effSp; applyZigzag(g, effSp);
    if (coll(p, g)) {
      activateSlowMo(2000);
      greens.splice(i, 1);
      spawnParticles(g.x + g.w / 2, g.y + g.h / 2, "#00ff99", 8);
      playSound("drug");
    }
  }

  // blues
  for (let i = blues.length - 1; i >= 0; i--) {
    const b = blues[i];
    b.y += 1.0 * effSp; applyZigzag(b, effSp);
    if (coll(p, b)) {
      activateGod(4000);
      blues.splice(i, 1);
      spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#00ccff", 8);
    }
  }

  // buffs
  for (let i = buffs.length - 1; i >= 0; i--) {
    const bf = buffs[i];
    bf.y += 1.3 * effSp; applyZigzag(bf, effSp);
    if (coll(p, bf)) {
      if (Math.random() < 0.5) activateUltraFast(); else activateUltraSlow();
      if (Math.random() < 0.3) activateFever();
      spawnParticles(bf.x + bf.w / 2, bf.y + bf.h / 2, "#ffcc00", 20);
      buffs.splice(i, 1);
    } else if (bf.y > H) buffs.splice(i, 1);
  }

  // bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.s;
    if (b.y + b.h < 0) { bullets.splice(i, 1); continue; }
    for (let j = obs.length - 1; j >= 0; j--) {
      const o = obs[j];
      if (coll(b, o)) {
        obs.splice(j, 1); bullets.splice(i, 1);
        score += 3;
        dailyMissions.forEach(m => { if (m.type === "obstacle" && m.progress >= 0) m.progress++; });
        spawnParticles(o.x + o.w / 2, o.y + o.h / 2, "#ff6600", 12);
        playSound("explode"); shake = 10;
        break;
      }
    }
  }

  updParticles(dt);
  if (combo > 0 && now - lastPizzaTime > 2500) breakCombo();
  saveMissions();
  updateHUD();
}

// ============================================
//  Draw
// ============================================
function draw() {
  x.save(); x.clearRect(0, 0, W, H);
  const now = Date.now();

  x.fillStyle = "#050505"; x.fillRect(0, 0, W, H);
  drawBG();

  if (shake > 0) {
    x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.9; if (shake < 0.5) shake = 0;
  }

  if (!start) { x.restore(); return; }

  if (now < ultraSlowUntil || now < slowMoUntil) {
    x.fillStyle = "rgba(120,170,255,0.18)"; x.fillRect(0, 0, W, H);
  }
  if (now < ultraFastUntil) {
    x.fillStyle = "rgba(255,220,130,0.16)"; x.fillRect(0, 0, W, H);
  }
  if (fever) {
    x.fillStyle = "rgba(255,220,80,0.1)"; x.fillRect(0, 0, W, H);
  }

  // player
  x.save();
  x.translate(p.x + p.w / 2, p.y + p.h / 2);
  x.scale(p.scale, p.scale);
  if (p.glow) {
    const g = x.createRadialGradient(0, 0, p.w * 0.3, 0, 0, p.w);
    g.addColorStop(0, "rgba(0,250,255,0.8)"); g.addColorStop(1, "rgba(0,250,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, p.w, 0, Math.PI * 2); x.fill();
  }
  if (img[currentSkin] && img[currentSkin].complete) {
    x.drawImage(img[currentSkin], -p.w / 2, -p.h / 2, p.w, p.h);
  }
  x.restore();

  reds.forEach(r => img.r.complete && x.drawImage(img.r, r.x, r.y, r.w, r.h));
  greens.forEach(g0 => img.g.complete && x.drawImage(img.g, g0.x, g0.y, g0.w, g0.h));
  blues.forEach(b0 => img.b.complete && x.drawImage(img.b, b0.x, b0.y, b0.w, b0.h));
  obs.forEach(o => img.o.complete && x.drawImage(img.o, o.x, o.y, o.w, o.h));
  buffs.forEach(bf => img.s.complete && x.drawImage(img.s, bf.x, bf.y, bf.w, bf.h));

  bullets.forEach(b => {
    if (b.img && b.img.complete) x.drawImage(b.img, b.x, b.y, b.w, b.h);
    x.fillStyle = "rgba(255,255,0,0.4)";
    x.fillRect(b.x + b.w / 4, b.y + b.h, b.w / 2, 15);
  });

  particles.forEach(p0 => {
    x.fillStyle = p0.color;
    x.globalAlpha = Math.max(0, p0.life / 400);
    x.beginPath(); x.arc(p0.x, p0.y, 4, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1;
  });

  if (comboText && now < comboUntil) {
    x.textAlign = "center"; x.font = "24px Arial"; x.fillStyle = "#ff8800";
    x.fillText(comboText, W / 2, 70);
  }
  if (now < ultraModeUntil) {
    x.textAlign = "center"; x.font = "20px Arial"; x.fillStyle = "#ff00ff";
    x.fillText("ULTRA MODE", W / 2, 100);
  }

  if (go) {
    x.fillStyle = "rgba(0,0,0,0.6)"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "40px Arial"; x.fillText("Game Over", W / 2, H / 2 - 20);
    x.font = "20px Arial";
    x.fillText("Tap / Space to Restart", W / 2, H / 2 + 20);
    x.fillText("High: " + hs, W / 2, H / 2 + 50);
    x.fillText("PC: " + pc, W / 2, H / 2 + 80);
  }

  x.restore();
}

// ============================================
//  Loop
// ============================================
(function loop() {
  upd(); draw(); requestAnimationFrame(loop);
})();

// ============================================
//  Start menu & pause & sound
// ============================================
function startGame() {
  if (!profile) {
    pendingStartAfterProfile = true;
    openProfileMenu();
    return;
  }
  start = true; go = false; reset();
  startMenu && startMenu.classList.add("hidden");
  if (soundOn) bg.play().catch(() => {});
}
function togglePause() {
  paused = !paused;
  pauseMenu && pauseMenu.classList.toggle("hidden", !paused);
}
function goToMainMenu() {
  start = false; go = false; paused = false;
  reset(); bg.pause();
  startMenu && startMenu.classList.remove("hidden");
  pauseMenu && pauseMenu.classList.add("hidden");
}
function toggleSound() {
  soundOn = !soundOn;
  if (!soundOn) bg.pause(); else if (start) bg.play().catch(() => {});
}

playBtn && (playBtn.onclick = () => { startGame(); });
modeChips.forEach(chip => {
  chip.onclick = () => {
    modeChips.forEach(c => c.classList.remove("selected"));
    chip.classList.add("selected");
    applyMode(chip.dataset.mode || "normal");
  };
});
menuTiles.forEach(btn => {
  btn.onclick = () => {
    const a = btn.dataset.action;
    if (a === "shop") openShopMenu();
    else if (a === "skins") openSkinMenu();
    else if (a === "daily") openChallengeMenu();
    else if (a === "profile") openProfileMenu();
    else if (a === "leaderboard") openLeaderboard();
    else if (a === "settings") showToast("Settings soon");
  };
});

// ============================================
//  Fun loading (falling pizzas)
// ============================================
let fallingPizzas = [];
function spawnLoadingPizza() {
  fallingPizzas.push({
    x: Math.random() * W,
    y: -50,
    s: 40 + Math.random() * 30,
    speed: 1 + Math.random() * 2,
    rot: Math.random() * Math.PI * 2,
    rv: (Math.random() - 0.5) * 0.05
  });
}
setInterval(spawnLoadingPizza, 200);

function loadingLoop() {
  lc.clearRect(0, 0, W, H);
  fallingPizzas.forEach(pz => {
    pz.y += pz.speed; pz.rot += pz.rv;
    lc.save();
    lc.translate(pz.x + pz.s / 2, pz.y + pz.s / 2);
    lc.rotate(pz.rot);
    if (img.r.complete) lc.drawImage(img.r, -pz.s / 2, -pz.s / 2, pz.s, pz.s);
    lc.restore();
  });
  fallingPizzas = fallingPizzas.filter(pz => pz.y < H + 60);
  requestAnimationFrame(loadingLoop);
}
loadingLoop();

// ============================================
//  Asset loading & start
// ============================================
const assets = [
  img.p, img.pizzakhoor11, img.pizzakhoor12,
  img.r, img.g, img.b, img.o, img.bu, img.s, img.fever, img.bg,
  ...Object.values(sounds).flat(), bg
];
let loadedCount = 0;
function assetDone() {
  loadedCount++;
  if (loadedCount >= assets.length) {
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.style.opacity = "0";
        setTimeout(() => loadingScreen.remove(), 400);
      }
      startMenu && startMenu.classList.remove("hidden");
      updateSkinMenu(); updateShopUI(); loadMissions(); updateChallengesUI(); updateHUD();
    }, 400);
  }
}
assets.forEach(a => {
  if (a instanceof Image) {
    a.onload = assetDone; a.onerror = assetDone;
  } else if (a instanceof Audio) {
    a.oncanplaythrough = assetDone; a.onerror = assetDone;
  }
});

// Expose for HTML buttons
window.goToMainMenu = goToMainMenu;
window.toggleSound = toggleSound;
window.openShopMenu = openShopMenu;
window.closeShopMenu = closeShopMenu;
window.openSkinMenu = openSkinMenu;
window.closeSkinMenu = closeSkinMenu;
window.openChallengeMenu = openChallengeMenu;
window.closeChallengeMenu = closeChallengeMenu;
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;

console.log("✅ Eat Pizza Final Edition Loaded");
