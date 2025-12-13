// audio.js

const AudioSystem = (() => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const buffers = {};
  const lastPlayTime = {};
  const cooldowns = {
    eat: 0.12,
    hit: 0.2,
    powerup: 0.3,
    combo: 0.4,
    slowmo: 0.5,
    ultra: 1.0
  };

  const channels = {
    music: null,
    sfx: null,
    power: null,
    combo: null
  };

  const queues = {
    power: [],
    combo: []
  };

  function loadSound(name, url) {
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(data => ctx.decodeAudioData(data))
      .then(buf => buffers[name] = buf)
      .catch(console.error);
  }

  function canPlay(name) {
    const now = ctx.currentTime;
    const cd = cooldowns[name] || 0;
    if (!lastPlayTime[name] || now - lastPlayTime[name] >= cd) {
      lastPlayTime[name] = now;
      return true;
    }
    return false;
  }

  function playBuffer(name, opts = {}) {
    const buf = buffers[name];
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = opts.volume ?? 1;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
  }

  function playSfx(name, priority = 1) {
    if (!canPlay(name)) return;
    // Simple priority system: explosion > hit > eat, etc.
    if (channels.sfx && channels.sfx.priority > priority) return;
    playBuffer(name, { volume: 1 });
    channels.sfx = { priority };
  }

  function enqueuePower(name) {
    queues.power.push(name);
    processQueue("power");
  }

  function enqueueCombo(name) {
    queues.combo.push(name);
    processQueue("combo");
  }

  function processQueue(type) {
    const q = queues[type];
    if (!q.length || channels[type]) return;
    const name = q.shift();
    const buf = buffers[name];
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(ctx.destination);

    channels[type] = src;
    src.start(0);
    src.onended = () => {
      channels[type] = null;
      processQueue(type);
    };
  }

  function playMusic(name, loop = true, volume = 0.5) {
    stopMusic();
    const buf = buffers[name];
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    channels.music = src;
  }

  function stopMusic() {
    if (channels.music) {
      channels.music.stop();
      channels.music = null;
    }
  }

  function unlockAudio() {
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  }

  // Example loading (you replace URLs)
  loadSound("eat", "sounds/eat.wav");
  loadSound("hit", "sounds/hit.wav");
  loadSound("powerup", "sounds/powerup.wav");
  loadSound("combo", "sounds/combo.wav");
  loadSound("slowmo", "sounds/slowmo.wav");
  loadSound("ultra", "sounds/ultra.wav");
  loadSound("bg", "sounds/bg.mp3");

  return {
    unlockAudio,
    playSfx,
    enqueuePower,
    enqueueCombo,
    playMusic,
    stopMusic
  };
})();

// systems.js

// --- Firebase init ---
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT",
  // ...
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Profile / Coins / Skins ---
let profile = null;
let pc = 0; // PizzaCoin
let currentSkin = "p";
let voiceCheatEnabled = false;
let voiceCheatCooldownUntil = 0;

const skins = {
  p: { id: "p", name: "Default", rarity: "common", price: 0, unlocked: true, trail: false, glow: false },
  p1: { id: "p1", name: "Pro 500", rarity: "rare", price: 200, unlocked: false, trail: true, glow: true },
  p2: { id: "p2", name: "Master 1500", rarity: "epic", price: 500, unlocked: false, trail: "color", glow: "strong" },
  neon1: { id: "neon1", name: "Neon Pulse", rarity: "legendary", price: 1200, unlocked: false, trail: "neon", glow: "neon" }
};

function loadLocalProfile() {
  const p = localStorage.getItem("profile");
  if (p) profile = JSON.parse(p);
  const savedPc = localStorage.getItem("pc");
  if (savedPc) pc = parseInt(savedPc);
  const savedSkin = localStorage.getItem("skin");
  if (savedSkin && skins[savedSkin]) currentSkin = savedSkin;
  updateProfileDisplay();
  updatePcLabel();
}

function saveLocalProfile() {
  if (profile) localStorage.setItem("profile", JSON.stringify(profile));
  localStorage.setItem("pc", pc);
  localStorage.setItem("skin", currentSkin);
}

function updateProfileDisplay() {
  const box = document.getElementById("profileBox");
  if (!profile) {
    box.textContent = "Guest";
  } else {
    box.textContent = `${profile.username} | Skin: ${currentSkin}`;
  }
}

function updatePcLabel() {
  const lbl = document.getElementById("pcLabel");
  lbl.textContent = `PC: ${pc}`;
}

function addPc(amount) {
  pc += amount;
  updatePcLabel();
  saveProfileOnline();
}

// --- Firebase profile save/load ---
function saveProfileOnline() {
  if (!auth.currentUser) {
    saveLocalProfile();
    return;
  }
  const docRef = db.collection("profiles").doc(auth.currentUser.uid);
  const data = {
    username: profile?.username || "Player",
    skin: currentSkin,
    pc: pc,
    skins: Object.fromEntries(Object.entries(skins).map(([id, s]) => [id, { unlocked: s.unlocked }]))
  };
  docRef.set(data, { merge: true }).then(saveLocalProfile);
}

function loadOnlineData() {
  if (!auth.currentUser) return;
  db.collection("profiles").doc(auth.currentUser.uid).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      pc = data.pc ?? pc;
      if (data.skins) {
        Object.keys(data.skins).forEach(id => {
          if (skins[id]) skins[id].unlocked = data.skins[id].unlocked;
        });
      }
      if (data.skin && skins[data.skin]) currentSkin = data.skin;
      profile = { username: data.username || auth.currentUser.displayName || "Player" };
      saveLocalProfile();
      updateProfileDisplay();
      updatePcLabel();
    }
  });

  db.collection("weekly").doc(auth.currentUser.uid).get().then(doc => {
    if (doc.exists) loadWeeklyOnline(doc.data());
  });
}

// --- Auth ---
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(res => {
    const user = res.user;
    profile = { username: user.displayName || "Player" };
    saveProfileOnline();
    loadOnlineData();
    alert("✅ Logged in as " + profile.username);
  }).catch(() => alert("Login failed"));
}

function openEmailLogin() {
  document.getElementById("emailLoginMenu").classList.remove("hidden");
}

function closeEmailLogin() {
  document.getElementById("emailLoginMenu").classList.add("hidden");
}

function emailLogin() {
  const email = emailInput.value;
  const pass = passwordInput.value;
  auth.signInWithEmailAndPassword(email, pass).then(res => {
    profile = { username: email.split("@")[0] };
    saveProfileOnline();
    loadOnlineData();
    closeEmailLogin();
    alert("✅ Logged in");
  }).catch(err => alert(err.message));
}

function emailSignup() {
  const email = emailInput.value;
  const pass = passwordInput.value;
  auth.createUserWithEmailAndPassword(email, pass).then(() => {
    alert("✅ Account created! Now login.");
  }).catch(err => alert(err.message));
}

function logout() {
  auth.signOut().then(() => {
    profile = null;
    saveLocalProfile();
    updateProfileDisplay();
    alert("✅ Logged out");
  });
}

// --- Leaderboard ---
function saveHighScoreOnline(score) {
  if (!auth.currentUser) return;
  const ref = db.collection("scores").doc(auth.currentUser.uid);
  ref.set({
    username: profile?.username || "Player",
    score: score,
    avatar: "p",
    updatedAt: Date.now()
  }, { merge: true });
}

function openLeaderboard() {
  const lb = document.getElementById("leaderboardMenu");
  const list = lb.querySelector(".leaderboard-list");
  const loading = document.getElementById("leaderboardLoading");

  lb.classList.remove("hidden");
  list.innerHTML = "";
  loading.style.display = "block";

  db.collection("scores").orderBy("score", "desc").limit(20).get()
    .then(snap => {
      loading.style.display = "none";
      if (snap.empty) {
        list.innerHTML = "<div class='leaderboard-loading'>No records yet</div>";
        return;
      }
      let rank = 1;
      snap.forEach(doc => {
        const d = doc.data();
        const isSelf = auth.currentUser && doc.id === auth.currentUser.uid;
        let rankIcon = rank;
        if (rank === 1) rankIcon = "🥇";
        else if (rank === 2) rankIcon = "🥈";
        else if (rank === 3) rankIcon = "🥉";

        const div = document.createElement("div");
        div.className = "leaderboard-item" + (isSelf ? " lb-self" : "");
        div.innerHTML = `
          <div class="rank">${rankIcon}</div>
          <img class="avatar" src="${(d.avatar || 'p')}.png">
          <div class="lb-name">${d.username || "Player"}</div>
          <div class="lb-score">${d.score}</div>
        `;
        list.appendChild(div);
        rank++;
      });
    });
}

function closeLeaderboard() {
  document.getElementById("leaderboardMenu").classList.add("hidden");
}

// --- Shop ---
function openShop() {
  const menu = document.getElementById("shopMenu");
  const featuredBox = document.getElementById("shopFeatured");
  const skinsBox = document.getElementById("shopSkins");
  menu.classList.remove("hidden");
  featuredBox.innerHTML = "<div class='shop-section-title'>Featured</div>";
  skinsBox.innerHTML = "<div class='shop-section-title'>All Skins</div>";

  Object.values(skins).forEach(s => {
    const div = document.createElement("div");
    div.className = "shop-item";
    const rarityClass = "rarity-" + s.rarity;
    const owned = s.unlocked;
    div.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-title">${s.name}
          <span class="skin-rarity ${rarityClass}">(${s.rarity})</span>
        </div>
        <div class="shop-item-sub">${owned ? "Owned" : "Not owned"}</div>
      </div>
      <div class="shop-price">${s.price} PC</div>
      <button class="shop-buy-btn" ${owned ? "disabled" : ""}>${owned ? "Equip" : "Buy"}</button>
    `;
    const btn = div.querySelector(".shop-buy-btn");
    btn.onclick = () => {
      if (owned) {
        currentSkin = s.id;
        saveProfileOnline();
        updateProfileDisplay();
      } else {
        if (pc < s.price) {
          alert("Not enough PC!");
          return;
        }
        pc -= s.price;
        s.unlocked = true;
        currentSkin = s.id;
        updatePcLabel();
        saveProfileOnline();
        openShop(); // refresh
      }
    };
    skinsBox.appendChild(div);
  });
}

function closeShop() {
  document.getElementById("shopMenu").classList.add("hidden");
}

// --- Challenges & Weekly ---

const challenges = {
  daily: [
    { id: "d1", text: "Collect 20 pizzas", target: 20, reward: "pc+30", progress: 0, done: false },
    { id: "d2", text: "Survive 60 seconds", target: 60, reward: "pc+50", progress: 0, done: false },
    { id: "d3", text: "Hit 5 obstacles with bullets", target: 5, reward: "skin:p1", progress: 0, done: false }
  ],
  achievements: [
    { id: "a1", text: "First Blood (first shot)", target: 1, reward: "pc+50", progress: 0, done: false },
    { id: "a2", text: "Combo Master (x3)", target: 1, reward: "pc+100", progress: 0, done: false },
    { id: "a3", text: "Pizza God (3000 score)", target: 1, reward: "skin:neon1", progress: 0, done: false }
  ]
};

let weeklyChallenges = [
  { id: "w1", text: "Reach 1500 score", target: 1500, progress: 0, reward: "pc+120", done: false },
  { id: "w2", text: "Get 3 combos above x2", target: 3, progress: 0, reward: "trail:neon", done: false },
  { id: "w3", text: "Survive 3 minutes", target: 180, progress: 0, reward: "pc+200", done: false }
];

function openChallenges() {
  const menu = document.getElementById("challengeMenu");
  const list = document.getElementById("challengeList");
  menu.classList.remove("hidden");
  list.innerHTML = "";

  const all = [...challenges.daily, ...challenges.achievements];

  all.forEach(ch => {
    const div = document.createElement("div");
    div.className = "challenge-item";
    const percent = Math.min(100, (ch.progress / ch.target) * 100);
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

function giveReward(reward) {
  if (reward.startsWith("pc+")) {
    const amount = parseInt(reward.split("+")[1]);
    addPc(amount);
    alert(`+${amount} PC!`);
  } else if (reward.startsWith("skin:")) {
    const id = reward.split(":")[1];
    if (skins[id]) {
      skins[id].unlocked = true;
      alert("New skin unlocked: " + skins[id].name);
    }
  } else if (reward.startsWith("trail:")) {
    const type = reward.split(":")[1];
    skins[currentSkin].trail = type;
    alert("Trail unlocked!");
  }
  saveProfileOnline();
}

function resetWeeklyIfNeeded() {
  const lastReset = parseInt(localStorage.getItem("weeklyReset") || "0");
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (!lastReset || now - lastReset > weekMs) {
    weeklyChallenges.forEach(w => { w.progress = 0; w.done = false; });
    localStorage.setItem("weeklyReset", String(now));
    saveWeeklyOnline();
  }
}

function saveWeeklyOnline() {
  if (!auth.currentUser) return;
  db.collection("weekly").doc(auth.currentUser.uid).set({
    weeklyChallenges: weeklyChallenges,
    updated: Date.now()
  }, { merge: true });
}

function loadWeeklyOnline(data) {
  if (data && data.weeklyChallenges) {
    weeklyChallenges = data.weeklyChallenges;
  }
}

// --- Voice Cheat ---
function toggleVoiceCheat() {
  voiceCheatEnabled = !voiceCheatEnabled;
  document.getElementById("voiceCheatState").textContent = voiceCheatEnabled ? "On" : "Off";
  if (voiceCheatEnabled) {
    startVoiceRecognition();
  } else {
    stopVoiceRecognition();
  }
}

let recognition = null;

function startVoiceRecognition() {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
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
    voiceCheatCooldownUntil = now + 3 * 60 * 1000; // 3 min
    activateUltraCheat();
  }
}

// game.js

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = 0, H = 0;
let lastTime = 0;
let running = false;
let paused = false;
let mode = "normal";

let score = 0;
let comboMultiplier = 1;
let comboTimer = 0;
let highScore = 0;

let pcEarnedThisRun = 0;

let player = {
  x: 0, y: 0, w: 26, h: 26, vx: 0, speed: 0.22
};

let pizzas = [];
let obstacles = [];
let particles = [];

let keys = {};
let touchX = null;

let gameSpeed = 1;
let slowMoTimer = 0;
let speedTimer = 0;
let anfoModeTimer = 0;
let ultraFeverTimer = 0;
let timeFreezeTimer = 0;

let alive = true;
let startTime = 0;

window.addEventListener("resize", resize);
window.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "Escape") togglePause();
});
window.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("pointerdown", e => {
  AudioSystem.unlockAudio();
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
  if (document.hidden && running) {
    pauseGame();
  }
});

auth.onAuthStateChanged(user => {
  if (user) {
    loadOnlineData();
  } else {
    loadLocalProfile();
  }
});

// --- Game control ---
function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  W = canvas.width;
  H = canvas.height;
}

resize();
loadLocalProfile();
resetWeeklyIfNeeded();

function startGame(m) {
  mode = m;
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("pauseMenu").classList.add("hidden");

  score = 0;
  comboMultiplier = 1;
  comboTimer = 0;
  pcEarnedThisRun = 0;
  alive = true;
  gameSpeed = 1;
  slowMoTimer = 0;
  speedTimer = 0;
  anfoModeTimer = 0;
  ultraFeverTimer = 0;
  timeFreezeTimer = 0;
  pizzas = [];
  obstacles = [];
  particles = [];

  player.w = W * 0.06;
  player.h = player.w;
  player.x = (W - player.w) / 2;
  player.y = H * 0.75;
  player.vx = 0;
  player.speed = mode === "hard" ? 0.25 : 0.22;

  startTime = performance.now();
  lastTime = performance.now();
  running = true;
  paused = false;

  document.getElementById("modeLabel").textContent = "Mode: " + mode;
  AudioSystem.playMusic("bg", true, 0.55);

  requestAnimationFrame(loop);
}

function loop(t) {
  if (!running) return;
  const dtMs = t - lastTime;
  lastTime = t;
  const dt = dtMs / 16.67; // base on 60 fps
  if (!paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function pauseGame() {
  paused = true;
  document.getElementById("pauseMenu").classList.remove("hidden");
}

function resumeGame() {
  paused = false;
  lastTime = performance.now();
  document.getElementById("pauseMenu").classList.add("hidden");
}

function togglePause() {
  if (!running) return;
  if (paused) resumeGame(); else pauseGame();
}

function goToStart() {
  running = false;
  AudioSystem.stopMusic();
  document.getElementById("startMenu").classList.remove("hidden");
  document.getElementById("pauseMenu").classList.add("hidden");
}

// --- Update ---
function update(dt) {
  if (!alive) return;

  let speedFactor = gameSpeed;

  if (slowMoTimer > 0) {
    slowMoTimer -= dt;
    speedFactor *= 0.6;
    if (slowMoTimer <= 0) gameSpeed = 1;
  }

  if (speedTimer > 0) {
    speedTimer -= dt;
    player.speed = mode === "hard" ? 0.33 : 0.3;
    if (speedTimer <= 0) player.speed = mode === "hard" ? 0.25 : 0.22;
  }

  if (timeFreezeTimer > 0) {
    timeFreezeTimer -= dt;
    speedFactor *= 0.3;
  }

  if (anfoModeTimer > 0) {
    anfoModeTimer -= dt;
  }

  if (ultraFeverTimer > 0) {
    ultraFeverTimer -= dt;
  }

  comboTimer -= dt;
  if (comboTimer <= 0) {
    if (comboMultiplier > 1) comboMultiplier -= 1;
    comboTimer = 0;
  }

  handleInput(dt);
  spawnObjects(dt, speedFactor);
  updateObjects(dt, speedFactor);
  handleCollisions();
  updateChallengesAndWeekly(dt);

  document.getElementById("scoreLabel").textContent = "Score: " + Math.floor(score);
  document.getElementById("comboLabel").textContent = "Combo: x" + comboMultiplier;

  // Dynamic difficulty (soft)
  if (score > 1000 && mode === "normal") {
    gameSpeed = 1.1;
  }
  if (score > 2000 && mode === "normal") {
    gameSpeed = 1.2;
  }

  // Safe performance: trim particles
  if (particles.length > 140) particles.splice(0, particles.length - 140);
}

// --- Input ---
function handleInput(dt) {
  const move = player.speed * dt * (H / 10);
  if (keys["ArrowLeft"] || keys["a"]) player.x -= move;
  if (keys["ArrowRight"] || keys["d"]) player.x += move;

  if (touchX !== null) {
    const target = touchX - player.w / 2;
    player.x += (target - player.x) * 0.25;
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > W) player.x = W - player.w;
}

// --- Spawn ---
let pizzaSpawnTimer = 0;
let obstacleSpawnTimer = 0;

function spawnObjects(dt, speedFactor) {
  pizzaSpawnTimer -= dt;
  obstacleSpawnTimer -= dt;

  if (pizzaSpawnTimer <= 0) {
    pizzaSpawnTimer = 30 / (speedFactor * 60); // average ~0.5s
    spawnPizza();
  }

  if (obstacleSpawnTimer <= 0) {
    obstacleSpawnTimer = 60 / (speedFactor * 60); // average ~1s
    spawnObstacle();
  }
}

function spawnPizza() {
  const size = W * 0.05;
  const x = Math.random() * (W - size);
  pizzas.push({ x, y: -size, w: size, h: size, type: "normal" });
}

function spawnObstacle() {
  const size = W * 0.06;
  const x = Math.random() * (W - size);
  const zig = mode === "hard" ? (Math.random() < 0.5) : false;
  obstacles.push({ x, y: -size, w: size, h: size, vx: zig ? (Math.random() < 0.5 ? -0.4 : 0.4) : 0 });
}

// --- Update objects ---
function updateObjects(dt, speedFactor) {
  const baseFall = H * 0.006 * speedFactor * dt;

  pizzas.forEach(p => {
    p.y += baseFall;
  });

  obstacles.forEach(o => {
    o.y += baseFall;
    o.x += o.vx * dt * (W / 100);
    if (o.x < 0 || o.x + o.w > W) o.vx *= -1;
  });

  // Ultra cheat (pizza attract)
  if (ultraFeverTimer > 0) {
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    pizzas.forEach(p => {
      const px = p.x + p.w / 2;
      const py = p.y + p.h / 2;
      const dx = cx - px;
      const dy = cy - py;
      const d = Math.max(1, Math.hypot(dx, dy));
      const pull = 0.5 * dt;
      p.x += (dx / d) * pull * (W / 20);
      p.y += (dy / d) * pull * (H / 20);
    });
  }

  pizzas = pizzas.filter(p => p.y < H + p.h);
  obstacles = obstacles.filter(o => o.y < H + o.h);
}

// --- Collisions ---
function rectHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

let hitBuffer = 0;

function handleCollisions() {
  hitBuffer = Math.max(0, hitBuffer - 0.05);

  // pizza
  pizzas.forEach((p, idx) => {
    if (rectHit(player, p)) {
      pizzas.splice(idx, 1);
      eatPizza();
    }
  });

  // obstacles
  if (hitBuffer <= 0 && anfoModeTimer <= 0) {
    for (let i = 0; i < obstacles.length; i++) {
      if (rectHit(player, obstacles[i])) {
        hitObstacle();
        break;
      }
    }
  }
}

function eatPizza() {
  score += 10 * comboMultiplier;
  pcEarnedThisRun += 1;
  comboMultiplier++;
  comboTimer = 3; // 3 seconds to keep combo
  AudioSystem.playSfx("eat", 1);
  spawnComboParticles();

  handleComboPowers();
  challenges.daily[0].progress++; // collect 20 pizzas
}

function hitObstacle() {
  AudioSystem.playSfx("hit", 3);
  hitBuffer = 0.3;
  if (anfoModeTimer > 0) return;
  alive = false;
  endRun();
}

function spawnComboParticles() {
  particles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, life: 0.4, r: player.w * 1.6 });
}

// --- Combo powers ---
function handleComboPowers() {
  const c = comboMultiplier;
  if (c === 2) {
    AudioSystem.enqueuePower("powerup");
    speedTimer = Math.max(speedTimer, 60 * 0.3); // ~10s scaled by dt
  }
  if (c === 3) {
    AudioSystem.enqueueCombo("combo");
    // double score handled by multiplier or extra factor
  }
  if (c === 4) {
    // Bullet Storm → اینجا در نسخهٔ ساده فقط یک boost امتیاز، اگر تیر داری می‌تونی بعداً اضافه کنی
  }
  if (c === 5) {
    anfoModeTimer = 60 * 0.25;
  }
  if (c === 6) {
    ultraFeverTimer = 60 * 0.35;
  }
  if (c === 7) {
    timeFreezeTimer = 60 * 0.18;
  }
  if (c === 8) {
    // Neon Explosion:
    obstacles = [];
    AudioSystem.enqueueCombo("ultra");
  }
}

// --- Challenges / Weekly update ---
function updateChallengesAndWeekly(dt) {
  const now = performance.now();
  const aliveSec = (now - startTime) / 1000;

  // daily survive 60s
  challenges.daily[1].progress = Math.min(challenges.daily[1].target, aliveSec);

  // weekly survive 3 minutes
  if (!weeklyChallenges[2].done) {
    weeklyChallenges[2].progress = Math.min(weeklyChallenges[2].target, aliveSec);
    if (weeklyChallenges[2].progress >= weeklyChallenges[2].target) {
      weeklyChallenges[2].done = true;
      giveReward(weeklyChallenges[2].reward);
      saveWeeklyOnline();
    }
  }

  // achievements: combo master
  if (!challenges.achievements[1].done && comboMultiplier >= 3) {
    challenges.achievements[1].progress = 1;
    challenges.achievements[1].done = true;
    giveReward(challenges.achievements[1].reward);
  }
}

// --- Ultra Cheat activation ---
function activateUltraCheat() {
  if (!running || !alive) return;
  ultraFeverTimer = 60 * (50 / 16.67); // اسکِیل به ۵۰ ثانیه
  AudioSystem.enqueueCombo("ultra");
  document.getElementById("statusLabel").textContent = "ANFO ULTRA MODE 50s";
  setTimeout(() => {
    document.getElementById("statusLabel").textContent = "";
  }, 5000);
}

// --- End Run ---
function endRun() {
  running = false;
  AudioSystem.stopMusic();
  highScore = Math.max(highScore, score);
  saveHighScoreOnline(Math.floor(score));
  addPc(pcEarnedThisRun);
  alert(`Game Over\nScore: ${Math.floor(score)}\nPC earned: ${pcEarnedThisRun}`);
  goToStart();
}

// --- Draw ---
function draw() {
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,W,H);

  // background
  ctx.fillStyle = "#020617";
  ctx.fillRect(0,0,W,H);

  // pizzas
  ctx.fillStyle = "#f97316";
  pizzas.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI * 2);
    ctx.fill();
  });

  // obstacles
  ctx.fillStyle = "#dc2626";
  obstacles.forEach(o => {
    ctx.fillRect(o.x, o.y, o.w, o.h);
  });

  // particles (simple)
  particles.forEach(pt => {
    pt.life -= 0.016;
    if (pt.life <= 0) return;
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.strokeStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r * (1 - pt.life), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  particles = particles.filter(p => p.life > 0);

  // player
  ctx.save();
  ctx.translate(player.x + player.w/2, player.y + player.h/2);

  // glow
  const s = skins[currentSkin];
  if (s.glow) {
    const grd = ctx.createRadialGradient(0,0,player.w*0.3,0,0,player.w*1.4);
    grd.addColorStop(0, "rgba(255,255,255,0.7)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0,0,player.w*1.4,0,Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(0,0,player.w/2,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

