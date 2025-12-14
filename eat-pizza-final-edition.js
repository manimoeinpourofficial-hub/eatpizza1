/* -------------------------------
   Firebase Safe Mode
--------------------------------*/
let auth = null, db = null, firebaseReady = false;
let firebaseOfflineReason = "";

try {
  if (window.firebase && firebase.apps && firebase.apps.length > 0) {
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;
  } else {
    firebaseOfflineReason = "No firebase.apps";
    console.warn("Firebase app not initialized, running offline.");
  }
} catch (e) {
  firebaseOfflineReason = e?.message || "Firebase init error";
  console.warn("Firebase not available, running offline.", e);
  firebaseReady = false;
}

/* -------------------------------
   Canvas & globals
--------------------------------*/
const c = document.getElementById("gameCanvas");
const x = c.getContext("2d");

let W = window.innerWidth;
let H = window.innerHeight;
let DPR = window.devicePixelRatio || 1;

let start = false;
let go = false;
let paused = false;

let score = 0;
let hs = +localStorage.getItem("hs") || 0;
let pc  = +localStorage.getItem("pc") || 0;

let ammo = 0;
let hunger = 50;          // 0..100
let missCount = 0;
const maxMiss = 5;

let reds = [];
let obs = [];
let greens = [];
let blues = [];
let buffs = [];
let bullets = [];
let particles = [];
let specialPizzas = [];

let currentMode = "normal";
let gameSpeed = 1;
let spawnPressure = 1;
let zigzagIntensity = 0;  // فقط در هارد فعال می‌کنیم

// هر ۲ پیتزا → یک شلیک
let pizzasSinceLastBullet = 0;

let slowMoUntil = 0, ultraSlowUntil = 0, ultraFastUntil = 0, ultraModeUntil = 0;
let speedBoostUntil = 0;
let specialSlowUntil = 0;

let weedEffectUntil = 0, drugEffectUntil = 0;
let pizzaSpawnMul = 1;

let godMode = false, godUntil = 0, fever = false, feverUntil = 0;
let shake = 0;
let combo = 0, comboMul = 1, comboText = "", comboUntil = 0, lastPizzaTime = 0;

let currentSkin = localStorage.getItem("skin") || "p";

/* Control type: "touch" | "tilt" | "both" */
let controlType = localStorage.getItem("controlType") || "touch";
let tiltActive = false;
let tiltBaseline = 0;

/* Player object */
let p = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  scale: 1,
  glow: false
};

/* DOM refs */
const startMenu = document.getElementById("startMenu");
const playBtn = document.getElementById("playBtn");
const modeChips = document.querySelectorAll(".mode-chip");
const menuTiles = document.querySelectorAll(".menu-tile");
const pauseMenu = document.getElementById("pauseMenu");
const pauseBtn = document.getElementById("pauseBtn");
const hudScore = document.getElementById("hudScore");
const hudHigh  = document.getElementById("hudHigh");
const hudMode  = document.getElementById("hudMode");
const hudPC    = document.getElementById("hudPC");
const hudHunger = document.getElementById("hudHunger");
const statusToast = document.getElementById("statusToast");
const skinMenu = document.getElementById("skinMenu");
const shopMenu = document.getElementById("shopMenu");
const shopList = shopMenu ? shopMenu.querySelector(".shop-list") : null;
const challengeMenu = document.getElementById("challengeMenu");
const challengeList = challengeMenu ? challengeMenu.querySelector("#challengeList") : null;
const weeklyMenu = document.getElementById("weeklyMenu");
const weeklyList = weeklyMenu ? weeklyMenu.querySelector("#weeklyList") : null;
const leaderboardMenu = document.getElementById("leaderboardMenu");
const settingsMenu = document.getElementById("settingsMenu");

/* Profile DOM */
const profileMenu = document.getElementById("profileMenu");
const usernameInput = document.getElementById("usernameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const closeProfileBtn = document.getElementById("closeProfileBtn");

/* Loading screen */
const loadingScreen = document.getElementById("loadingScreen");
const loadingCanvas = document.getElementById("loadingCanvas");
const lc = loadingCanvas.getContext("2d");

/* Profile state */
let profile = JSON.parse(localStorage.getItem("profile") || "null");
let selectedAvatar = profile ? profile.avatar : null;
let pendingStartAfterProfile = false;

/* -------------------------------
   Ability system (player4, player5)
--------------------------------*/
let abilityActive = false;
let abilityType = null;       // "player4_shrink" | "player5_invis"
let abilityUntil = 0;
let lastAbilityUseTime = 0;
const ABILITY_COOLDOWN = 60000; // 1 دقیقه

function canUseAbility() {
  const now = Date.now();
  if (abilityActive) return false;
  if (now - lastAbilityUseTime < ABILITY_COOLDOWN) return false;
  if (currentSkin !== "player4" && currentSkin !== "player5") return false;
  return true;
}

function activateAbility(type, durationMs) {
  const now = Date.now();
  abilityActive = true;
  abilityType = type;
  abilityUntil = now + durationMs;
  lastAbilityUseTime = now;

  if (type === "player4_shrink") {
    p.scale = 0.5;
    showToast("Player 4: دو بار ↑ → کوچک شدن 10 ثانیه (هر 1 دقیقه)");
  } else if (type === "player5_invis") {
    showToast("Player 5: یک بار ←→ و دو بار →← → نامرئی 7 ثانیه (هر 1 دقیقه)");
  }
}

/* -------------------------------
   Images
--------------------------------*/
function loadImg(src) {
  const i = new Image();
  i.src = src;
  i.loading = "eager";
  return i;
}

const img = {
  p: loadImg("PIZZA-KHOOR.png"),
  pizzakhoor11: loadImg("pizzakhoor11.png"),
  pizzakhoor12: loadImg("pizzakhoor12.png"),

  player4: loadImg("player4.png"),
  player5: loadImg("player5.png"),

  r: loadImg("pizza1.png"),
  g: loadImg("DRUG.png"),     // drug
  b: loadImg("weed.webp"),    // weed
  o: loadImg("shit.webp"),    // shit

  bu: loadImg("bullet.png"),
  s: loadImg("speed.png"),
  fever: loadImg("pizza44.png"),

  bg: loadImg("pizzaback.jpg")
};

/* -------------------------------
   Audio (mobile safe)
--------------------------------*/
function safeAudio(src) {
  const a = new Audio(src);
  a.preload = "none";
  return a;
}

const sounds = {
  pizzaVoices: [safeAudio("2.mp3"), safeAudio("3.mp3"), safeAudio("5.mp3")],
  drug: safeAudio("1.mp3"),
  weed: safeAudio("weed.mp3"),       // این فایل‌ها رو خودت بذار
  shit: safeAudio("shitdamage.mp3"), // این هم

  explode: safeAudio("gooz1.mp3"),
  gameOver: safeAudio("gameover.mp3"),
  shoot: safeAudio("shoot.mp3")
};

const bg = safeAudio("background.mp3");
bg.loop = true;
bg.volume = 0.3;
let soundOn = true;

function playSound(name) {
  if (!start || !soundOn) return;
  const s = sounds[name];
  if (!s) return;
  const base = Array.isArray(s) ? s[(Math.random() * s.length) | 0] : s;
  const a = base.cloneNode();
  a.currentTime = 0;
  a.play().catch(() => {});
}

/* -------------------------------
   Pizza voice (5s cooldown)
--------------------------------*/
let lastPizzaVoiceTime = 0;
const PIZZA_VOICE_COOLDOWN = 5000;

function playPizzaVoice() {
  const now = Date.now();
  if (now - lastPizzaVoiceTime < PIZZA_VOICE_COOLDOWN) return;
  lastPizzaVoiceTime = now;

  const list = sounds.pizzaVoices;
  if (!list || list.length === 0) return;

  const base = list[(Math.random() * list.length) | 0];
  const a = base.cloneNode();
  a.currentTime = 0;
  a.play().catch(() => {});
}

/* -------------------------------
   Resize (canvas + loadingCanvas)
--------------------------------*/
function resizeAll() {
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;

  // canvas
  c.width = W * DPR;
  c.height = H * DPR;
  c.style.width = W + "px";
  c.style.height = H + "px";
  x.setTransform(DPR, 0, 0, DPR, 0, 0);

  // loading canvas
  loadingCanvas.width = W * DPR;
  loadingCanvas.height = H * DPR;
  loadingCanvas.style.width = W + "px";
  loadingCanvas.style.height = H + "px";
  lc.setTransform(DPR, 0, 0, DPR, 0, 0);

  const TARGET_SIZE = Math.min(W, H) * 0.22;
  const skin = img[currentSkin];

  if (skin.complete && skin.width > 0 && skin.height > 0) {
    const scale = Math.min(
      TARGET_SIZE / skin.width,
      TARGET_SIZE / skin.height
    );
    p.w = skin.width * scale;
    p.h = skin.height * scale;
  } else {
    p.w = TARGET_SIZE;
    p.h = TARGET_SIZE;
  }

  p.x = (W - p.w) / 2;
  p.y = H - p.h;
}

window.addEventListener("resize", resizeAll);
window.addEventListener("load", resizeAll);

/* -------------------------------
   Shooting
--------------------------------*/
function shoot() {
  if (paused || go || !start) return;
  if (ammo <= 0) return showToast("Ammo ندارید!");

  ammo--; // ✅ کم کردن مهمات
  updateHUD();

   bullets.push({
    x: p.x + p.w / 2 - 10,
    y: p.y - 20,
    w: 20,
    h: 40,
    speed: 18,
    img: img.bu
  });

  playSound("shoot");
}

/* -------------------------------
   HUD
--------------------------------*/
function updateHUD() {
  hudScore  && (hudScore.textContent  = "Score: " + score);
  hudHigh   && (hudHigh.textContent   = "High: "  + hs);
  hudPC     && (hudPC.textContent     = "PC: "    + pc);
  hudMode   && (hudMode.textContent   = "Mode: "  + currentMode.toUpperCase());
  hudHunger && (hudHunger.textContent = "Hunger: " + hunger + "%");
}

function showToast(msg, dur = 2000) {
  if (!statusToast) return console.log("TOAST:", msg);
  statusToast.textContent = msg;
  statusToast.classList.add("show");
  setTimeout(() => statusToast.classList.remove("show"), dur);
}

/* -------------------------------
   Skins & Shop
--------------------------------*/
const skins = {
  p: { id: "p", name: "Default", unlocked: true, requireScore: 0, price: 0 },

  pizzakhoor11: { id: "pizzakhoor11", name: "Pizzakhoor 11", unlocked: hs >= 300, requireScore: 300, price: 200 },
  pizzakhoor12: { id: "pizzakhoor12", name: "Pizzakhoor 12", unlocked: hs >= 800, requireScore: 800, price: 350 },

  player4: {
    id: "player4",
    name: "Player 4",
    unlocked: hs >= 0,
    requireScore: 0,
    price: 5000
  },

  player5: {
    id: "player5",
    name: "Player 5",
    unlocked: hs >= 0,
    requireScore: 0,
    price: 8000
  }
};

const shopItems = [
  { id: "skin_p11", type: "skin", skinId: "pizzakhoor11", title: "Pizzakhoor 11", desc: "Sharper crust.", price: 200 },
  { id: "skin_p12", type: "skin", skinId: "pizzakhoor12", title: "Pizzakhoor 12", desc: "Elite slice.",   price: 350 },

  { id: "skin_player4", type: "skin", skinId: "player4", title: "Player 4", desc: "قدرت: دو بار ↑ → کوچک شدن 10s.", price: 5000 },
  { id: "skin_player5", type: "skin", skinId: "player5", title: "Player 5", desc: "قدرت: ←→ و دو بار →← → نامرئی 7s.", price: 8000 },

  { id: "upg_slowmo", type: "upgrade", title: "SlowMo Boost", desc: "Start with 3s slow motion.", price: 150, key: "upg_slowmo" },
  { id: "upg_ammo",   type: "upgrade", title: "Extra Ammo",   desc: "Start with +3 ammo.",        price: 120, key: "upg_ammo" },
  { id: "upg_double", type: "upgrade", title: "Double PC",    desc: "2x PC per pizza.",           price: 400, key: "upg_double" }
];

function updateSkinUnlocked() {
  skins.p.unlocked = true;
  skins.pizzakhoor11.unlocked = hs >= skins.pizzakhoor11.requireScore || skins.pizzakhoor11.unlocked;
  skins.pizzakhoor12.unlocked = hs >= skins.pizzakhoor12.requireScore || skins.pizzakhoor12.unlocked;

  // ✅ اسکین‌های جدید فقط با PC باز می‌شن
  skins.player4.unlocked = localStorage.getItem("skin_player4") === "1";
  skins.player5.unlocked = localStorage.getItem("skin_player5") === "1";
}

function updateSkinMenu() {
  if (!skinMenu) return;
  updateSkinUnlocked();
  const list = skinMenu.querySelector(".skin-list");
  if (!list) return;
  list.innerHTML = "";
  Object.keys(skins).forEach(id => {
    const s = skins[id];
    if (!img[id]) {
      console.warn("Missing image for skin", id);
      return;
    }

    const abilityDesc =
      id === "player4"
        ? "قدرت: دو بار ↑ → کوچک شدن 10 ثانیه (هر 1 دقیقه)"
        : id === "player5"
        ? "قدرت: یک بار ←→ و دو بار →← → نامرئی 7 ثانیه (هر 1 دقیقه)"
        : "";

    const div = document.createElement("div");
    div.className = "skin-option";
    div.dataset.skin = id;
    if (!s.unlocked) div.classList.add("locked");
    if (currentSkin === id) div.classList.add("selected");
    div.innerHTML = `
      <img class="skin-img" src="${img[id].src}">
      <div class="skin-label">
        ${s.name} ${s.requireScore ? `(Score ${s.requireScore}+ / ${s.price} PC)` : (s.price ? `(${s.price} PC)` : "")}
      </div>
      ${abilityDesc ? `<div class="skin-ability">${abilityDesc}</div>` : ""}
    `;
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
        pc -= item.price;
        localStorage.setItem("pc", pc);
        localStorage.setItem("skin_" + item.skinId, "1"); // ✅ ذخیره خرید
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

function openShopMenu()  { shopMenu && shopMenu.classList.remove("hidden"); updateShopUI(); }
function closeShopMenu() { shopMenu && shopMenu.classList.add("hidden"); }

/* -------------------------------
   Missions (Daily + Weekly)
--------------------------------*/
const dailyMissions = [
  { id: "d1", title: "Collect 20 pizzas", goal: 20, progress: 0, reward: 25, type: "pizza" },
  { id: "d2", title: "Reach 100 score",   goal: 100, progress: 0, reward: 35, type: "score" },
  { id: "d3", title: "Hit 5 obstacles",   goal: 5, progress: 0, reward: 40, type: "obstacle" }
];

const weeklyMissions = [
  { id: "w1", title: "Play 10 games",       goal: 10,  progress: 0, reward: 100, type: "games" },
  { id: "w2", title: "Reach 500 score",     goal: 500, progress: 0, reward: 150, type: "score" },
  { id: "w3", title: "Collect 200 pizzas",  goal: 200, progress: 0, reward: 200, type: "pizzaTotal" }
];

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function saveMissions() {
  localStorage.setItem("dailyMissions", JSON.stringify(dailyMissions));
  localStorage.setItem("weeklyMissions", JSON.stringify(weeklyMissions));
}

function loadMissions() {
  // daily
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

  // weekly
  const w = localStorage.getItem("weeklyMissions");
  const wLast = localStorage.getItem("weeklyReset");
  const now = new Date();
  const currentWeekKey = now.getFullYear() + "-W" + getWeekNumber(now);
  if (wLast !== currentWeekKey) {
    weeklyMissions.forEach(m => m.progress = 0);
    localStorage.setItem("weeklyReset", currentWeekKey);
    saveMissions();
  } else if (w) {
    try {
      const arr = JSON.parse(w);
      arr.forEach((m, i) => weeklyMissions[i].progress = m.progress);
    } catch {}
  }
}

function buildMissionList(container, missions, isWeekly) {
  if (!container) return;
  container.innerHTML = "";
  missions.forEach(m => {
    const pct = Math.min(100, Math.round(100 * Math.max(0, m.progress) / m.goal));
    const done = m.progress >= m.goal;
    const div = document.createElement("div");
    div.className = "mission-item" + (done ? " completed" : "");
    div.innerHTML = `
      <div class="mission-title">${m.title}</div>
      <div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
      <div class="mission-info">${m.progress > 0 ? m.progress : 0}/${m.goal} — ${m.reward} PC</div>`;
    if (done) {
      div.onclick = () => {
        if (m.progress < m.goal) return;
        pc += m.reward; localStorage.setItem("pc", pc); updateHUD();
        m.progress = -999; saveMissions();
        if (isWeekly) updateWeeklyUI(); else updateChallengesUI();
        showToast(`Reward +${m.reward} PC`);
        profile && saveProfileOnline();
      };
    }
    container.appendChild(div);
  });
}

function updateChallengesUI() {
  buildMissionList(challengeList, dailyMissions, false);
}
function updateWeeklyUI() {
  buildMissionList(weeklyList, weeklyMissions, true);
}

function openChallengeMenu()  { challengeMenu && (challengeMenu.classList.remove("hidden"), updateChallengesUI()); }
function closeChallengeMenu() { challengeMenu && challengeMenu.classList.add("hidden"); }
function openWeeklyMenu()    { weeklyMenu && (weeklyMenu.classList.remove("hidden"), updateWeeklyUI()); }
function closeWeeklyMenu()   { weeklyMenu && weeklyMenu.classList.add("hidden"); }

/* -------------------------------
   Profile
--------------------------------*/
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

/* -------------------------------
   Firebase Online Sync (Safe Mode)
--------------------------------*/
function loadOnlineDataPromise() {
  if (!firebaseReady || !auth || !db) return Promise.resolve();
  const user = auth.currentUser;
  if (!user) return Promise.resolve();

  const profRef = db.collection("profiles").doc(user.uid);
  const scoreRef = db.collection("scores").doc(user.uid);

  const profP = profRef.get().then(doc => {
    if (!doc.exists) {
      const defaultProfile = {
        username: "Guest",
        avatar: "p1",
        skin: "p",
        pc: 0,
        created: Date.now()
      };

      profRef.set(defaultProfile);

      profile = { username: "Guest", avatar: "p1", skin: "p" };
      pc = 0;
      currentSkin = "p";

    } else {
      const d = doc.data();
      profile = {
        username: d.username || "Guest",
        avatar: d.avatar || "p1",
        skin: d.skin || "p"
      };

      pc = d.pc ?? 0;
      currentSkin = profile.skin;
    }

    if (!img[currentSkin]) currentSkin = "p";

    localStorage.setItem("profile", JSON.stringify(profile));
    localStorage.setItem("pc", pc);
    localStorage.setItem("skin", currentSkin);
  });

  const scoreP = scoreRef.get().then(doc => {
    if (!doc.exists) {
      scoreRef.set({
        score: 0,
        username: profile?.username || "Guest",
        created: Date.now()
      });
      hs = 0;
    } else {
      const d = doc.data();
      hs = d.score ?? 0;
    }
    localStorage.setItem("hs", hs);
  });

  return Promise.all([profP, scoreP]);
}

/* -------------------------------
   Save Profile Online
--------------------------------*/
function saveProfileOnline() {
  if (!firebaseReady || !auth || !db) return;
  const user = auth.currentUser;
  if (!user) return;

  db.collection("profiles").doc(user.uid).set({
    username: profile?.username || "Guest",
    avatar: profile?.avatar || "p1",
    skin: currentSkin || "p",
    pc: pc ?? 0,
    updated: Date.now()
  }, { merge: true })
  .catch(err => console.warn("profile save fail", err));
}

/* -------------------------------
   Save High Score Online
--------------------------------*/
function saveHighScoreOnline() {
  if (!firebaseReady || !auth || !db) return;
  const user = auth.currentUser;
  if (!user) return;

  db.collection("scores").doc(user.uid).set({
    score: hs ?? 0,
    username: profile?.username || "Guest",
    updated: Date.now()
  }, { merge: true })
  .catch(err => console.warn("hs save fail", err));
}

/* -------------------------------
   Leaderboard (Safe Mode)
--------------------------------*/
function openLeaderboard() {
  if (!leaderboardMenu) return;
  leaderboardMenu.classList.remove("hidden");
  const list = leaderboardMenu.querySelector(".leaderboard-list");
  if (!firebaseReady || !db) {
    list.innerHTML = "Offline mode (no online leaderboard)";
    return;
  }
  list.innerHTML = "Loading...";
  db.collection("scores").orderBy("score", "desc").limit(10).get()
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
    .catch(err => {
      list.innerHTML = "Error loading leaderboard";
      console.warn("leaderboard err", err);
    });
}
function closeLeaderboard() {
  leaderboardMenu && leaderboardMenu.classList.add("hidden");
}

/* -------------------------------
   Settings (control type)
--------------------------------*/
function openSettingsMenu() {
  settingsMenu && settingsMenu.classList.remove("hidden");
  updateSettingsUI();
}
function closeSettingsMenu() {
  settingsMenu && settingsMenu.classList.add("hidden");
}
function updateSettingsUI() {
  if (!settingsMenu) return;
  const chips = settingsMenu.querySelectorAll(".setting-chip");
  chips.forEach(chip => {
    const mode = chip.dataset.control;
    chip.classList.toggle("selected", mode === controlType);
    chip.onclick = () => {
      controlType = mode;
      localStorage.setItem("controlType", controlType);
      updateSettingsUI();
      showToast(`Control: ${mode.toUpperCase()}`);
      if (controlType === "tilt" || controlType === "both") enableTilt();
    };
  });
}

/* -------------------------------
   Mode / Reset / Spawn
--------------------------------*/
let nextRed = 0, nextObs = 0, nextGreen = 0, nextBlue = 0, nextBuff = 0;
let nextSpecialPizza = 0;

function applyMode(mode) {
  currentMode = mode;
  if (mode === "easy")   { gameSpeed = 0.7; zigzagIntensity = 0; }
  else if (mode === "normal") { gameSpeed = 1.0; zigzagIntensity = 0; }
  else                   { gameSpeed = 1.4; zigzagIntensity = 1.8; }
  updateHUD();
}

function reset() {
  reds = []; obs = []; greens = []; blues = []; buffs = []; bullets = []; particles = []; specialPizzas = [];
  score = 0; ammo = 0; go = false;
  combo = 0; comboMul = 1; comboText = ""; comboUntil = 0; shake = 0;
  slowMoUntil = 0; ultraSlowUntil = 0; ultraFastUntil = 0; ultraModeUntil = 0;
  speedBoostUntil = 0; specialSlowUntil = 0;
  weedEffectUntil = 0; drugEffectUntil = 0; pizzaSpawnMul = 1;
  missCount = 0; hunger = 50;
  pizzasSinceLastBullet = 0;
  abilityActive = false;
  abilityType = null;
  abilityUntil = 0;
  applyMode(currentMode);

  if (localStorage.getItem("upg_ammo") === "1") ammo += 3;
  if (localStorage.getItem("upg_slowmo") === "1") slowMoUntil = Date.now() + 3000;

  const now = Date.now();
  nextRed = now; nextObs = now;
  nextGreen = now + 2000;
  nextBlue = now + 3000;
  nextBuff = now + 4000;
  nextSpecialPizza = now + 15000;

  updateHUD();
}

function spawn(type, w, h, zigChance = 0.3) {
  const allowZig = (currentMode === "hard");
  const zig = allowZig && Math.random() < zigChance;
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
  if (!o.zigzag || zigzagIntensity === 0) return;
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
  if (specialPizzas.length > 2) specialPizzas.length = 2;
}

/* -------------------------------
   Player hitbox (skin-safe)
--------------------------------*/
function playerHitbox() {
  const base = {
    x: p.x + p.w * 0.15,
    y: p.y + p.h * 0.15,
    w: p.w * 0.7,
    h: p.h * 0.7
  };

  if (currentSkin === "player4" && abilityActive && abilityType === "player4_shrink") {
    const s = 0.6;
    return {
      x: base.x + base.w * (1 - s) / 2,
      y: base.y + base.h * (1 - s) / 2,
      w: base.w * s,
      h: base.h * s
    };
  }

  return base;
}

/* -------------------------------
   Combo & effects
--------------------------------*/
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

function updGod(now) { if (godMode && now > godUntil) { godMode = false; p.glow = false; } }
function activateGod(ms = 6000) { godMode = true; godUntil = Date.now() + ms; p.glow = true; }

function updFever(now) { if (fever && now > feverUntil) { fever = false; gameSpeed /= 1.2; } }

function isPulledByUltra(r, effSp) {
  const now = Date.now();
  if (ultraModeUntil <= now) return false;
  const hb = playerHitbox();
  const cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
  const rx = r.x + r.w / 2, ry = r.y + r.h / 2;
  const dx = cx - rx, dy = cy - ry;
  const dist = Math.hypot(dx, dy);
  if (dist > H * 0.6) return false;
  const pull = 0.25 * effSp;
  r.x += (dx / (dist || 1)) * pull;
  r.y += (dy / (dist || 1)) * pull;
  return coll(hb, r);
}

/* -------------------------------
   Input (Touch + Tilt + Abilities)
--------------------------------*/
function move(mx) {
  p.x = Math.max(0, Math.min(mx - p.w / 2, W - p.w));
}

let left = false, right = false;

// mouse move
window.addEventListener("mousemove", e => {
  if (!start || go || paused) return;
  if (controlType === "tilt") return;
  const r = c.getBoundingClientRect();
  move(e.clientX - r.left);
});

// touch move
window.addEventListener("touchmove", e => {
  if (!start || go || paused) return;
  if (controlType === "tilt") return;
  const r = c.getBoundingClientRect(), t = e.touches[0];
  move(t.clientX - r.left);
}, { passive: true });

/* --- swipe detection --- */
let touchStartX = 0;
let touchStartY = 0;
let lastTap = 0;
let swipePattern = [];

// -------------------------
// Swipe Up (Player 4 Shrink)
// -------------------------
function handleSwipeUp(now) {
  if (currentSkin !== "player4") return;
  if (!canUseAbility()) return;

  const DOUBLE_SWIPE_WINDOW = 400;

  // First swipe
  if (!handleSwipeUp.lastTime) {
    handleSwipeUp.lastTime = now;
    activateAbility("player4_shrink", 10000);
    return;
  }

  // Double swipe
  if (now - handleSwipeUp.lastTime < DOUBLE_SWIPE_WINDOW) {
    handleSwipeUp.lastTime = 0;
    activateAbility("player4_shrink", 10000);
  } else {
    handleSwipeUp.lastTime = now;
  }
}

// -------------------------
// Swipe Horizontal (Player 5 Invis)
// -------------------------
function handleSwipeHorizontal(dir, now) {
  if (currentSkin !== "player5") return;
  if (!canUseAbility()) return;

  activateAbility("player5_invis", 7000);
}

// -------------------------
// Pattern Window (if needed)
// -------------------------
const PATTERN_WINDOW = 2000;


  if (!handleSwipeHorizontal.lastTime || now - handleSwipeHorizontal.lastTime > PATTERN_WINDOW) {
    swipePattern = [];
  }
 function handleSwipeHorizontal.lastTime = now;

  swipePattern.push(dir);
  if (swipePattern.length > 3) swipePattern.shift();

  if (
    swipePattern.length === 3 &&
    swipePattern[0] === "LR" &&
    swipePattern[1] === "RL" &&
    swipePattern[2] === "RL"
  ) {
    swipePattern = [];
    activateAbility("player5_invis", 7000);
  }


// touchstart: ثبت شروع، تیر، restart
window.addEventListener("touchstart", e => {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  // double-tap برای تیر
  if (!start || paused || go) return;
  const now = Date.now();
  if (now - lastTap < 300) {
    shoot();
  }
  lastTap = now;
}, { passive: true });

// touchend: swipe و ریستارت
window.addEventListener("touchend", e => {
  if (start && go) {
    go = false;
    reset();
    return;
  }

  if (!start || paused || go) return;
  if (e.changedTouches.length === 0) return;

  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  const now = Date.now();
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const SWIPE_MIN = 50;

  // swipe عمودی
  if (absY > absX && absY > SWIPE_MIN) {
    if (dy < 0) handleSwipeUp(now);
  }

  // swipe افقی
  if (absX > absY && absX > SWIPE_MIN) {
    if (dx > 0) {
      handleSwipeHorizontal("LR", now);
    } else {
      handleSwipeHorizontal("RL", now);
    }
  }
}, { passive: true });

// restart desktop
window.addEventListener("mousedown", () => {
  if (start && go) {
    go = false;
    reset();
  }
});

// keyboard
window.addEventListener("keydown", e => {
  if (!start || paused) return;

  if (e.code === "ArrowLeft" || e.code === "KeyA") {
    left = true;
  }

  if (e.code === "ArrowRight" || e.code === "KeyD") {
    right = true;
  }

  if (e.code === "Space") {
    shoot();
  }

  if (go && e.code === "Enter") {
    go = false;
    reset();
  }
});

window.addEventListener("keyup", e => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") {
    left = false;
  }
  if (e.code === "ArrowRight" || e.code === "KeyD") {
    right = false;
  }
});

/* tilt */
function enableTilt() {
  if (tiltActive) return;
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then(res => {
        if (res === "granted") {
          window.addEventListener("deviceorientation", handleTilt, true);
          tiltActive = true;
        }
      })
      .catch(() => {});
  } else {
    window.addEventListener("deviceorientation", handleTilt, true);
    tiltActive = true;
  }
}
function handleTilt(e) {
  if (!start || go || paused) return;
  if (controlType === "touch") return;
  const gamma = e.gamma;
  if (gamma == null) return;
  if (tiltBaseline === 0) tiltBaseline = gamma;
  const diff = gamma - tiltBaseline;
  const tiltStrength = diff / 30;
  const moveX = p.x + tiltStrength * 10;
  p.x = Math.max(0, Math.min(moveX, W - p.w));
}

/* -------------------------------
   Collision & Particles
--------------------------------*/
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

/* -------------------------------
   Update loop
--------------------------------*/
function upd() {
  if (!start || go || paused) return;
  const now = Date.now();

  // اتمام قدرت‌ها
  if (abilityActive && now > abilityUntil) {
    abilityActive = false;
    abilityType = null;
    p.scale = 1;
  }

  // حرکت با کیبورد
  if (left)  p.x = Math.max(0, p.x - 6);
  if (right) p.x = Math.min(W - p.w, p.x + 6);

  updGod(now);
  updFever(now);

  if (now > weedEffectUntil && now > drugEffectUntil) pizzaSpawnMul = 1;

  spawnPressure = (1 + Math.min(score / 1500, 2)) * pizzaSpawnMul;

  let sp = gameSpeed, effSlow = 1;
  if (now < slowMoUntil) effSlow *= 0.7;
  if (now < ultraSlowUntil) effSlow *= 0.4;
  if (now < specialSlowUntil) effSlow *= 0.4;
  if (now < ultraFastUntil) sp *= 1.5;
  if (now < speedBoostUntil) sp *= 1.4;

  const effSp = sp * effSlow;
  const dt = 16;

  limitObjects();

  if (now > nextRed)  { reds.push(spawn("red", 40, 40)); nextRed  = now + (1600 / effSp) / spawnPressure; }
  if (now > nextObs)  { if (Math.random() < 0.5 * spawnPressure) obs.push(spawn("obs", 35, 35)); nextObs  = now + (3800 / effSp) / spawnPressure; }
  if (now > nextGreen && Math.random() < 0.2) { greens.push(spawn("green", 40, 40, 0.2)); nextGreen = now + 6000; }
  if (now > nextBlue  && Math.random() < 0.2) { blues.push(spawn("blue", 40, 40, 0.2));  nextBlue  = now + 8000; }
  if (now > nextBuff  && Math.random() < 0.25) { buffs.push(spawn("buff", 40, 40, 0.2)); nextBuff  = now + 9000; }

  if (now > nextSpecialPizza && Math.random() < 0.5) {
    specialPizzas.push(spawn("special", 40, 40, 0.2));
    nextSpecialPizza = now + 20000 + Math.random() * 10000;
  }

  const ph = playerHitbox();

  // pizzas
  for (let i = reds.length - 1; i >= 0; i--) {
    const r = reds[i];
    r.y += 1.3 * effSp; applyZigzag(r, effSp);
    const collected = coll(ph, r) || isPulledByUltra(r, effSp);
    if (collected) {
      handleCombo();

      let base = 5;
      if (fever) base *= 2;
      if (ultraModeUntil > now) base *= 1.5;
      score += Math.round(base * comboMul);

      let pcGain = 1;
      if (localStorage.getItem("upg_double") === "1") pcGain = 2;
      pc += pcGain; localStorage.setItem("pc", pc);

                pizzasSinceLastBullet++;
         if (pizzasSinceLastBullet >= 2) {
           pizzasSinceLastBullet = 0;
           ammo++; // ✅ فقط اضافه کن، شلیک نکن
         }

      dailyMissions.forEach(m => {
        if (m.type === "pizza" && m.progress >= 0) m.progress++;
        if (m.type === "score" && score >= m.goal && m.progress >= 0) m.progress = m.goal;
      });
      weeklyMissions.forEach(m => {
        if (m.type === "pizzaTotal" && m.progress >= 0) m.progress++;
        if (m.type === "score" && score >= m.goal && m.progress >= 0) m.progress = m.goal;
      });

      if (score > hs) {
        hs = score; localStorage.setItem("hs", hs);
        saveHighScoreOnline();
      }

      spawnParticles(r.x + r.w / 2, r.y + r.h / 2, "orange", 10);
      p.scale = 1.05; setTimeout(() => p.scale = 1, 120);
      reds.splice(i, 1);
      playPizzaVoice();
    } else if (r.y > H) {
      reds.splice(i, 1); breakCombo();
      missCount++;
      if (missCount >= maxMiss) {
        go = true; playSound("gameOver");
      }
    }
  }

  // obs (shit)
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];
    o.y += 1.5 * effSp; applyZigzag(o, effSp);
    if (coll(ph, o)) {
      go = true;
      playSound("shit");
      playSound("gameOver");
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "red", 15); shake = 20;
      weeklyMissions.forEach(m => {
        if (m.type === "games" && m.progress >= 0) m.progress++;
      });
    } else if (o.y > H) {
      obs.splice(i, 1);
    }
  }

  // drug
  for (let i = greens.length - 1; i >= 0; i--) {
    const g = greens[i];
    g.y += 1.1 * effSp; applyZigzag(g, effSp);
    if (coll(ph, g)) {
      const now2 = Date.now();
      hunger = Math.max(0, hunger - 30);
      pizzaSpawnMul = 0.7;
      drugEffectUntil = now2 + 10000;
      greens.splice(i, 1);
      spawnParticles(g.x + g.w / 2, g.y + g.h / 2, "#00ff99", 8);
      playSound("drug");
    }
  }

  // weed
  for (let i = blues.length - 1; i >= 0; i--) {
    const b = blues[i];
    b.y += 1.0 * effSp; applyZigzag(b, effSp);
    if (coll(ph, b)) {
      const now2 = Date.now();
      hunger = Math.min(100, hunger + 25);
      pizzaSpawnMul = 1.25;
      weedEffectUntil = now2 + 10000;
      blues.splice(i, 1);
      spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#00ccff", 8);
      playSound("weed");
    }
  }

  // speed buff
  for (let i = buffs.length - 1; i >= 0; i--) {
    const bf = buffs[i];
    bf.y += 1.3 * effSp; applyZigzag(bf, effSp);
    if (coll(ph, bf)) {
      const now2 = Date.now();
      speedBoostUntil = now2 + 10000;
      if (missCount > 0) missCount--;
      spawnParticles(bf.x + bf.w / 2, bf.y + bf.h / 2, "#ffcc00", 20);
      buffs.splice(i, 1);
    } else if (bf.y > H) buffs.splice(i, 1);
  }

  // pizza44
  for (let i = specialPizzas.length - 1; i >= 0; i--) {
    const s = specialPizzas[i];
    s.y += 1.1 * effSp; applyZigzag(s, effSp);
    if (coll(ph, s)) {
      specialSlowUntil = now + 10000;
      spawnParticles(s.x + s.w / 2, s.y + s.h / 2, "#ffffff", 12);
      specialPizzas.splice(i, 1);
    } else if (s.y > H) specialPizzas.splice(i, 1);
  }

  // bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.speed;

    if (b.y + b.h < 0) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = obs.length - 1; j >= 0; j--) {
      const o = obs[j];
      if (
        b.x < o.x + o.w &&
        b.x + b.w > o.x &&
        b.y < o.y + o.h &&
        b.y + b.h > o.y
      ) {
        obs.splice(j, 1);
        bullets.splice(i, 1);
        break;

if (collision) {
  playSound("explode"); // ✅ gooz1.mp3
}

if (
  b.x < o.x + o.w &&
  b.x + b.w > o.x &&
  b.y < o.y + o.h &&
  b.y + b.h > o.y
) {
  playSound("explode"); // ✅ صدای درست
  obs.splice(j, 1);
  bullets.splice(i, 1);
  break;
}
      }
    }
  }

  updParticles(dt);
  if (combo > 0 && now - lastPizzaTime > 2500) breakCombo();
  saveMissions();
  updateHUD();
}

/* -------------------------------
   Draw
--------------------------------*/
function drawBG() {
  x.fillStyle = "rgba(255,255,255,0.08)";
  x.fillRect(0, 0, W, H);
  if (!img.bg.complete) return;
  const iw = img.bg.width, ih = img.bg.height;
  const cr = W / H, ir = iw / ih;
  let dw, dh;
  if (ir > cr) { dh = H; dw = ir * H; }
  else { dw = W; dh = W / ir; }
  x.save();
  x.globalAlpha = 0.15;
  x.drawImage(img.bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  x.restore();
}

function drawPlayer() {
  if (currentSkin === "player5" && abilityActive && abilityType === "player5_invis") {
    return;
  }

  const skin = img[currentSkin] || img.p;
  if (!skin.complete) return;
  x.save();
  x.translate(p.x + p.w / 2, p.y + p.h / 2);
  x.scale(p.scale, p.scale);
  x.drawImage(skin, -p.w / 2, -p.h / 2, p.w, p.h);
  x.restore();
}

function draw() {
  x.save();
  x.clearRect(0, 0, W, H);

  const now = Date.now();
  drawBG();

  if (shake > 0) {
    x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.9; if (shake < 0.5) shake = 0;
  }

  if (!start) { x.restore(); return; }

  if (now < ultraSlowUntil || now < slowMoUntil || now < specialSlowUntil) {
    x.fillStyle = "rgba(120,170,255,0.18)"; x.fillRect(0, 0, W, H);
  }
  if (now < ultraFastUntil || now < speedBoostUntil) {
    x.fillStyle = "rgba(255,220,130,0.16)"; x.fillRect(0, 0, W, H);
  }
  if (fever) {
    x.fillStyle = "rgba(255,220,80,0.1)"; x.fillRect(0, 0, W, H);
  }

  drawPlayer();

  reds.forEach(r => img.r.complete && x.drawImage(img.r, r.x, r.y, r.w, r.h));
  greens.forEach(g0 => img.g.complete && x.drawImage(img.g, g0.x, g0.y, g0.w, g0.h));
  blues.forEach(b0 => img.b.complete && x.drawImage(img.b, b0.x, b0.y, b0.w, b0.h));
  obs.forEach(o => img.o.complete && x.drawImage(img.o, o.x, o.y, o.w, o.h));
  buffs.forEach(bf => img.s.complete && x.drawImage(img.s, bf.x, bf.y, bf.w, bf.h));
  specialPizzas.forEach(s => img.fever.complete && x.drawImage(img.fever, s.x, s.y, s.w, s.h));

  bullets.forEach(b => {
    if (b.img && b.img.complete) {
      x.drawImage(b.img, b.x, b.y, b.w, b.h);
    }
  });

  particles.forEach(p0 => {
    x.fillStyle = p0.color;
    x.globalAlpha = Math.max(0, p0.life / 400);
    x.beginPath(); x.arc(p0.x, p0.y, 4, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1;
  });

  if (comboText && now < comboUntil) {
    x.textAlign = "center"; x.font = "24px Arial"; x.fillStyle = "#facc15";
    x.fillText(comboText, W / 2, 70);
  }

  if (go) {
    x.fillStyle = "rgba(0,0,0,0.6)"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#fff"; x.textAlign = "center";
    x.font = "32px Arial"; x.fillText("Game Over", W / 2, H / 2 - 20);
    x.font = "18px Arial";
    x.fillText("Tap / Space to Restart", W / 2, H / 2 + 10);
  }

  x.restore();
}

/* -------------------------------
   Main Loop
--------------------------------*/
(function loop() {
  upd();
  draw();
  requestAnimationFrame(loop);
})();

/* -------------------------------
   Start / Pause / Sound
--------------------------------*/
function startGame() {
  if (!profile) {
    pendingStartAfterProfile = true;
    openProfileMenu();
    return;
  }
  start = true;
  go = false;
  reset();
  startMenu && startMenu.classList.add("hidden");
  document.body.classList.add("playing");
  if (soundOn) bg.play().catch(() => {});
}

function togglePause() {
  if (!start || go) return;
  paused = !paused;
  pauseMenu && pauseMenu.classList.toggle("hidden", !paused);
}

function goToMainMenu() {
  start = false; go = false; paused = false;
  reset(); bg.pause();
  document.body.classList.remove("playing");
  startMenu && startMenu.classList.remove("hidden");
  pauseMenu && pauseMenu.classList.add("hidden");
}

function toggleSound() {
  soundOn = !soundOn;
  const el = document.getElementById("soundState");
  if (el) el.textContent = soundOn ? "On" : "Off";
  if (!soundOn) bg.pause(); else if (start) bg.play().catch(() => {});
}

/* -------------------------------
   Buttons & Menu
--------------------------------*/
playBtn && (playBtn.onclick = () => startGame());
pauseBtn && (pauseBtn.onclick = () => togglePause());

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
    else if (a === "weekly") openWeeklyMenu();
    else if (a === "profile") openProfileMenu();
    else if (a === "leaderboard") openLeaderboard();
    else if (a === "voice") showToast("Voice reactions coming soon");
    else if (a === "settings") openSettingsMenu();
  };
});

/* -------------------------------
   Loading animation
--------------------------------*/
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
setInterval(() => {
  if (!loadingScreen) return;
  spawnLoadingPizza();
}, 220);

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
  fallingPizzas = fallingPizzas.filter(pz => pz.y < H + 80);
  requestAnimationFrame(loadingLoop);
}
loadingLoop();

/* -------------------------------
   Asset loading & removing loader
--------------------------------*/
const imgAssets = [
  img.p, img.pizzakhoor11, img.pizzakhoor12,
  img.player4, img.player5,
  img.r, img.g, img.b, img.o, img.bu, img.s, img.fever, img.bg
];

let imgLoadedCount = 0;
let firebasePhaseDone = false;
let uiPhaseDone = false;

function setLoadingPercent(p) {
  const fill = document.getElementById("loadingFill");
  const percentEl = document.getElementById("loadingPercent");
  if (fill) fill.style.width = p + "%";
  if (percentEl) percentEl.textContent = p + "%";
}

function assetImgDone() {
  imgLoadedCount++;
  const ratio = imgLoadedCount / imgAssets.length;
  const p = Math.min(60, Math.round(ratio * 60));
  setLoadingPercent(p);

  if (imgLoadedCount >= imgAssets.length) {
    startFirebasePhase();
  }
}

imgAssets.forEach(a => {
  if (a instanceof Image) {
    a.onload = assetImgDone; a.onerror = assetImgDone;
  } else {
    assetImgDone();
  }
});

function startFirebasePhase() {
  if (!firebaseReady || !auth || !db) {
    console.warn("Firebase offline or not ready:", firebaseOfflineReason);
    firebasePhaseDone = true;
    setLoadingPercent(75);
    startUIPhase();
    return;
  }

  setLoadingPercent(65);

  auth.signInAnonymously()
    .then(() => {
      console.log("✅ Firebase Connected");
      console.log("DEBUG profile (before online):", profile);
      console.log("DEBUG pc:", pc);
      console.log("DEBUG currentSkin:", currentSkin);
      console.log("DEBUG hs:", hs);
      console.log("DEBUG firebaseReady:", firebaseReady);
      console.log("DEBUG user:", auth.currentUser);

      return loadOnlineDataPromise();
    })
    .then(() => {
      firebasePhaseDone = true;
      setLoadingPercent(80);
      startUIPhase();
    })
    .catch(err => {
      console.warn("⚠ Firebase offline mode:", err);
      firebaseReady = false;
      firebasePhaseDone = true;
      setLoadingPercent(75);
      startUIPhase();
    });
}

function startUIPhase() {
  if (uiPhaseDone) return;
  uiPhaseDone = true;

  setLoadingPercent(90);

  updateSkinMenu();
  updateShopUI();
  loadMissions();
  updateChallengesUI();
  updateWeeklyUI();
  updateHUD();
  updateSettingsUI();

  finishLoading();
}

function finishLoading() {
  setLoadingPercent(100);
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => loadingScreen.remove(), 400);
    }
    startMenu && startMenu.classList.remove("hidden");
  }, 400);
}

/* -------------------------------
   Export for HTML
--------------------------------*/
window.goToMainMenu      = goToMainMenu;
window.toggleSound       = toggleSound;
window.openShopMenu      = openShopMenu;
window.closeShopMenu     = closeShopMenu;
window.openSkinMenu      = openSkinMenu;
window.closeSkinMenu     = closeSkinMenu;
window.openChallengeMenu = openChallengeMenu;
window.closeChallengeMenu= closeChallengeMenu;
window.openWeeklyMenu    = openWeeklyMenu;
window.closeWeeklyMenu   = closeWeeklyMenu;
window.openLeaderboard   = openLeaderboard;
window.closeLeaderboard  = closeLeaderboard;
window.closeSettingsMenu = closeSettingsMenu;

console.log("✅ Eat Pizza · Firebase Safe Mode · Mobile Ready · Abilities v1");
