// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyB8PV0S43tJdZYAgwSsXq5fpBrcukczgec",
  authDomain: "eat-pizza-b1651.firebaseapp.com",
  projectId: "eat-pizza-b1651",
  storageBucket: "eat-pizza-b1651.firebasestorage.app",
  messagingSenderId: "691132791942",
  appId: "1:691132791942:web:90070f3e73940e6916e507",
  measurementId: "G-GKJ6YS8G4E"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== CANVAS & STATE =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let W = 0, H = 0;

let running = false;
let paused = false;
let mode = "normal";

let score = 0;
let combo = 1;
let comboTimer = 0;
let pc = 0;
let alive = true;

let lastTime = 0;

// حرکت نرم‌تر: targetX برای lerp
const player = {
  x: 0, y: 0, w: 40, h: 40, speed: 0.9, targetX: 0
};

let pizzas = [];
let obstacles = [];
let particles = [];

let slowMoTimer = 0;
let speedTimer = 0;
let ultraTimer = 0;

let pizzaSpawnTimer = 0;
let obstacleSpawnTimer = 0;

let keys = {};
let touchX = null;

// Voice cheat
let voiceCheatEnabled = false;
let voiceCheatCooldownUntil = 0;
let recognition = null;

// Profile / Shop / Skins
let profile = null;
let currentSkinId = "default";

// ===== Images =====
const imgBg = new Image(); imgBg.src = "pizzaback.jpg";
const imgPlayerDefault = new Image(); imgPlayerDefault.src = "PIZZA-KHOOR.png";
const imgSkin1 = new Image(); imgSkin1.src = "skin1.png";
const imgSkin2 = new Image(); imgSkin2.src = "skin2.png";
const imgPizza = new Image(); imgPizza.src = "pizza1.png";
const imgDrug = new Image(); imgDrug.src = "DRUG.png";
const imgWeed = new Image(); imgWeed.src = "weed.webp";
const imgShit = new Image(); imgShit.src = "shit.webp";
const imgBullet = new Image(); imgBullet.src = "bullet.png";
const imgSpeed = new Image(); imgSpeed.src = "speed.png";
const imgPizza44 = new Image(); imgPizza44.src = "pizza44.png";

// ===== Audio (خیلی ساده) =====
const bgMusic = new Audio("background.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.4;

const eatSounds = [
  new Audio("1.mp3"),
  new Audio("2.mp3"),
  new Audio("3.mp3"),
  new Audio("4.mp3"),
  new Audio("5.mp3")
];
const fartSound = new Audio("gooz1.mp3");
const gameoverSound = new Audio("gameover.mp3");

// ===== Skins / Shop =====
const skins = {
  default: { id: "default", name: "Classic Pizza", rarity: "common", price: 0, sprite: imgPlayerDefault, unlocked: true },
  skin1: { id: "skin1", name: "Cute Pink", rarity: "rare", price: 200, sprite: imgSkin1, unlocked: false },
  skin2: { id: "skin2", name: "Neon Slice", rarity: "epic", price: 500, sprite: imgSkin2, unlocked: false }
};

function getCurrentSkinImage() {
  return skins[currentSkinId]?.sprite || imgPlayerDefault;
}

// ===== Local Storage =====
function loadLocal() {
  try {
    const pcStored = localStorage.getItem("pc");
    if (pcStored) pc = parseInt(pcStored);
    const skinStored = localStorage.getItem("skin");
    if (skinStored && skins[skinStored]) {
      currentSkinId = skinStored;
      skins[skinStored].unlocked = true;
    }
  } catch {}
  setLabel("pcLabel", "PC: " + pc);
  document.getElementById("profileBox").textContent = profile ? profile.username : "Guest";
}
function saveLocal() {
  localStorage.setItem("pc", pc);
  localStorage.setItem("skin", currentSkinId);
}
loadLocal();

// ===== Resize =====
function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  W = canvas.width;
  H = canvas.height;
}
resize();
window.addEventListener("resize", resize);

// ===== Input =====
window.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "Escape") togglePause();
});
window.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("pointerdown", e => {
  const rect = canvas.getBoundingClientRect();
  touchX = (e.clientX - rect.left) / rect.width * W;
});
canvas.addEventListener("pointermove", e => {
  if (touchX === null) return;
  const rect = canvas.getBoundingClientRect();
  touchX = (e.clientX - rect.left) / rect.width * W;
});
canvas.addEventListener("pointerup", () => touchX = null);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) pauseGame();
});

// ===== UI Helpers =====
function setLabel(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showToast(msg, duration = 2000) {
  const el = document.getElementById("statusToast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), duration);
}

// ===== Auth (ساده) =====
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(res => {
    profile = { username: res.user.displayName || "Player" };
    document.getElementById("profileBox").textContent = profile.username;
    showToast("Logged in as " + profile.username);
  }).catch(console.error);
}
function openEmailLogin() {
  document.getElementById("emailLoginMenu").classList.remove("hidden");
}
function closeEmailLogin() {
  document.getElementById("emailLoginMenu").classList.add("hidden");
}
function emailLogin() {
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  auth.signInWithEmailAndPassword(email, pass).then(res => {
    profile = { username: res.user.email };
    document.getElementById("profileBox").textContent = profile.username;
    closeEmailLogin();
  }).catch(err => alert(err.message));
}
function emailSignup() {
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  auth.createUserWithEmailAndPassword(email, pass).then(res => {
    profile = { username: res.user.email };
    document.getElementById("profileBox").textContent = profile.username;
    closeEmailLogin();
  }).catch(err => alert(err.message));
}
function logout() {
  auth.signOut().then(() => {
    profile = null;
    document.getElementById("profileBox").textContent = "Guest";
  });
}

// ===== Leaderboard (placeholder) =====
function openLeaderboard() {
  document.getElementById("leaderboardMenu").classList.remove("hidden");
  document.getElementById("leaderboardLoading").textContent = "Coming soon…";
}
function closeLeaderboard() {
  document.getElementById("leaderboardMenu").classList.add("hidden");
}

// ===== Shop =====
function openShop() {
  const menu = document.getElementById("shopMenu");
  const featuredBox = document.getElementById("shopFeatured");
  const skinsBox = document.getElementById("shopSkins");
  menu.classList.remove("hidden");
  featuredBox.innerHTML = "<div class='shop-section-title'>Featured Skin</div>";
  skinsBox.innerHTML = "<div class='shop-section-title'>All Skins</div>";

  Object.values(skins).forEach(s => {
    const div = document.createElement("div");
    div.className = "shop-item";
    const rarityClass = "rarity-" + s.rarity;
    const owned = s.unlocked;
    div.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-title">${s.name}<span class="skin-rarity ${rarityClass}">(${s.rarity})</span></div>
        <div class="shop-item-sub">${owned ? "Owned" : "Not owned"}</div>
      </div>
      <div class="shop-price">${s.price} PC</div>
      <button class="shop-buy-btn">${owned ? "Equip" : "Buy"}</button>
    `;
    const btn = div.querySelector(".shop-buy-btn");
    btn.onclick = () => {
      if (owned) {
        currentSkinId = s.id;
        saveLocal();
        showToast("Skin equipped");
      } else {
        if (pc < s.price) return showToast("Not enough PC");
        pc -= s.price;
        s.unlocked = true;
        currentSkinId = s.id;
        setLabel("pcLabel", "PC: " + pc);
        saveLocal();
        openShop();
      }
    };
    skinsBox.appendChild(div);
  });
}
function closeShop() {
  document.getElementById("shopMenu").classList.add("hidden");
}

// ===== Challenges =====
const challenges = [
  { id: "d1", text: "Collect 20 pizzas", target: 20, progress: 0, done: false },
  { id: "d2", text: "Survive 60 seconds", target: 60, progress: 0, done: false }
];
const weeklyChallenges = [
  { id: "w1", text: "Reach 1500 score", target: 1500, progress: 0, done: false }
];

function openChallenges() {
  const menu = document.getElementById("challengeMenu");
  const list = document.getElementById("challengeList");
  menu.classList.remove("hidden");
  list.innerHTML = "";
  challenges.forEach(ch => {
    const percent = Math.min(100, (ch.progress / ch.target) * 100);
    const div = document.createElement("div");
    div.className = "challenge-item";
    div.innerHTML = `
      <div>${ch.text} ${ch.done ? "✅" : ""}</div>
      <div class="challenge-progress">
        <div class="challenge-progress-fill" style="width:${percent}%"></div>
      </div>
    `;
    list.appendChild(div);
  });
}
function closeChallenges() {
  document.getElementById("challengeMenu").classList.add("hidden");
}
function openWeekly() {
  const menu = document.getElementById("weeklyMenu");
  const list = document.getElementById("weeklyList");
  menu.classList.remove("hidden");
  list.innerHTML = "";
  weeklyChallenges.forEach(w => {
    const percent = Math.min(100, (w.progress / w.target) * 100);
    const div = document.createElement("div");
    div.className = "weekly-item";
    div.innerHTML = `
      <div>${w.text} ${w.done ? "✅" : ""}</div>
      <div class="weekly-progress">
        <div class="weekly-progress-fill" style="width:${percent}%"></div>
      </div>
    `;
    list.appendChild(div);
  });
}
function closeWeekly() {
  document.getElementById("weeklyMenu").classList.add("hidden");
}

// ===== Voice Cheat =====
function toggleVoiceCheat() {
  voiceCheatEnabled = !voiceCheatEnabled;
  document.getElementById("voiceCheatState").textContent = voiceCheatEnabled ? "On" : "Off";
  if (voiceCheatEnabled) startVoiceRecognition(); else stopVoiceRecognition();
}
function startVoiceRecognition() {
  if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = e => {
    const text = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
    handleVoiceCommand(text);
  };
  recognition.start();
}
function stopVoiceRecognition() {
  if (recognition) recognition.stop();
}
function handleVoiceCommand(text) {
  if (!voiceCheatEnabled) return;
  const now = Date.now();
  if (now < voiceCheatCooldownUntil) return;
  if (text.includes("anfo ultra mode")) {
    voiceCheatCooldownUntil = now + 3 * 60 * 1000;
    activateUltraMode();
  }
}
function activateUltraMode() {
  ultraTimer = 50;
  showToast("ANFO Ultra Mode – 50s");
}

// ===== Game Control =====
function startGame(m) {
  mode = m;
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("pauseMenu").classList.add("hidden");

  score = 0;
  combo = 1;
  comboTimer = 0;
  alive = true;
  pizzas = [];
  obstacles = [];
  particles = [];
  slowMoTimer = 0;
  speedTimer = 0;
  ultraTimer = 0;

  player.w = W * 0.09;
  player.h = player.w;
  player.x = (W - player.w) / 2;
  player.y = H * 0.75;
  player.targetX = player.x;

  lastTime = performance.now();
  running = true;
  paused = false;

  setLabel("modeLabel", "Mode: " + mode);

  try { bgMusic.currentTime = 0; bgMusic.play(); } catch {}
  requestAnimationFrame(loop);
}
function pauseGame() {
  paused = true;
  document.getElementById("pauseMenu").classList.remove("hidden");
}
function resumeGame() {
  paused = false;
  document.getElementById("pauseMenu").classList.add("hidden");
  lastTime = performance.now();
}
function togglePause() {
  if (!running) return;
  if (paused) resumeGame(); else pauseGame();
}
function goToStart() {
  running = false;
  document.getElementById("startMenu").classList.remove("hidden");
  document.getElementById("pauseMenu").classList.add("hidden");
  try { bgMusic.pause(); } catch {}
}

// ===== Loop =====
function loop(t) {
  if (!running) return;
  const dt = (t - lastTime) / 1000;
  lastTime = t;
  if (!paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (!alive) return;

  comboTimer -= dt;
  if (comboTimer <= 0 && combo > 1) {
    combo -= 1;
    comboTimer = 0;
  }

  if (slowMoTimer > 0) slowMoTimer -= dt;
  if (speedTimer > 0) speedTimer -= dt;
  if (ultraTimer > 0) ultraTimer -= dt;

  handleInput(dt);
  spawnObjects(dt);
  updateObjects(dt);
  checkCollisions();

  setLabel("scoreLabel", "Score: " + Math.floor(score));
  setLabel("comboLabel", "Combo: x" + combo);
  setLabel("pcLabel", "PC: " + pc);
}

// حرکت نرم‌تر پلیر
function handleInput(dt) {
  const base = player.speed * H * dt;

  // کیبورد
  if (keys["ArrowLeft"] || keys["a"]) player.targetX -= base * 1.4;
  if (keys["ArrowRight"] || keys["d"]) player.targetX += base * 1.4;

  // تاچ
  if (touchX !== null) {
    player.targetX = touchX - player.w / 2;
  }

  // Clamp target
  if (player.targetX < 0) player.targetX = 0;
  if (player.targetX + player.w > W) player.targetX = W - player.w;

  // Lerp برای نرم‌شدن
  const lerpFactor = 0.18; // هرچی بیشتر، سریع‌تر می‌رسه
  player.x += (player.targetX - player.x) * lerpFactor;
}

function spawnObjects(dt) {
  pizzaSpawnTimer -= dt;
  obstacleSpawnTimer -= dt;

  if (pizzaSpawnTimer <= 0) {
    pizzaSpawnTimer = 0.5;
    const size = W * 0.08;
    pizzas.push({
      x: Math.random() * (W - size),
      y: -size,
      w: size,
      h: size,
      type: "pizza"
    });
  }

  if (obstacleSpawnTimer <= 0) {
    obstacleSpawnTimer = mode === "hard" ? 0.8 : 1.1;
    const size = W * 0.09;
    obstacles.push({
      x: Math.random() * (W - size),
      y: -size,
      w: size,
      h: size
    });
  }
}

function updateObjects(dt) {
  let fall = H * 0.22 * dt;
  if (slowMoTimer > 0) fall *= 0.6;
  pizzas.forEach(p => p.y += fall);
  obstacles.forEach(o => o.y += fall);

  if (ultraTimer > 0) {
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    pizzas.forEach(p => {
      const px = p.x + p.w / 2;
      const py = p.y + p.h / 2;
      const dx = cx - px;
      const dy = cy - py;
      const d = Math.max(1, Math.hypot(dx, dy));
      const pull = 150 * dt;
      p.x += (dx / d) * pull;
      p.y += (dy / d) * pull;
    });
  }

  pizzas = pizzas.filter(p => p.y < H + p.h);
  obstacles = obstacles.filter(o => o.y < H + o.h);
}

function rectHit(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function checkCollisions() {
  for (let i = pizzas.length - 1; i >= 0; i--) {
    if (rectHit(player, pizzas[i])) {
      pizzas.splice(i, 1);
      onPizzaEat();
    }
  }
  if (ultraTimer <= 0) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (rectHit(player, obstacles[i])) {
        onObstacleHit();
        break;
      }
    }
  }
}

function onPizzaEat() {
  score += 10 * combo;
  pc += 1;
  combo += 1;
  comboTimer = 3;
  challenges[0].progress += 1;

  const s = eatSounds[Math.floor(Math.random() * eatSounds.length)];
  try { s.currentTime = 0; s.play(); } catch {}
}
function onObstacleHit() {
  alive = false;
  running = false;
  showToast("Game Over", 1500);
  try { gameoverSound.play(); } catch {}
  setTimeout(goToStart, 1000);
}

// ===== Draw =====
function draw() {
  ctx.setTransform(1,0,0,1,0,0);

  if (imgBg.complete) {
    ctx.drawImage(imgBg, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0,0,W,H);
  }

  // پیتزا
  pizzas.forEach(p => {
    if (imgPizza.complete) {
      ctx.drawImage(imgPizza, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI*2);
      ctx.fill();
    }
  });

  // مانع – فعلاً shit.webp رو می‌ذاریم
  obstacles.forEach(o => {
    if (imgShit.complete) {
      ctx.drawImage(imgShit, o.x, o.y, o.w, o.h);
    } else {
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
  });

  // پلیر
  const skinImg = getCurrentSkinImage();
  if (skinImg.complete) {
    ctx.drawImage(skinImg, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(player.x + player.w/2, player.y + player.h/2, player.w/2, 0, Math.PI*2);
    ctx.fill();
  }
}

// ===== Export to window =====
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.goToStart = goToStart;

window.openShop = openShop;
window.closeShop = closeShop;
window.openChallenges = openChallenges;
window.closeChallenges = closeChallenges;
window.openWeekly = openWeekly;
window.closeWeekly = closeWeekly;
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;

window.googleLogin = googleLogin;
window.openEmailLogin = openEmailLogin;
window.closeEmailLogin = closeEmailLogin;
window.emailLogin = emailLogin;
window.emailSignup = emailSignup;
window.logout = logout;

window.toggleVoiceCheat = toggleVoiceCheat;
