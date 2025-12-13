/* ============================================================
   MOBILE FIX + PLAYER FIX + AUTO-SCALE SKINS + HIGH QUALITY
   نسخه مخصوص Mani — ANFO Edition
============================================================ */

/* -------------------------------
   Firebase Safe Mode
--------------------------------*/
let auth = null, db = null, firebaseReady = false;
try {
  if (window.firebase && firebase.apps && firebase.apps.length > 0) {
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;
  }
} catch {}

/* -------------------------------
   Canvas Setup
--------------------------------*/
const c = document.getElementById("gameCanvas");
const x = c.getContext("2d");

let W = innerWidth;
let H = innerHeight;

let DPR = window.devicePixelRatio || 1;

/* -------------------------------
   Player Object
--------------------------------*/
let p = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  scale: 1,
  glow: false,
  img: null,
  baseSize: 0
};

/* -------------------------------
   Game State
--------------------------------*/
let start = false;
let go = false;
let paused = false;

let reds = [];
let obs = [];
let greens = [];
let blues = [];
let buffs = [];
let bullets = [];
let particles = [];
let specialPizzas = [];

let score = 0;
let hs = +localStorage.getItem("hs") || 0;
let pc = +localStorage.getItem("pc") || 0;

let hunger = 50;
let missCount = 0;

let currentSkin = localStorage.getItem("skin") || "p";

/* -------------------------------
   Images (High Quality)
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

  r: loadImg("pizza1.png"),
  g: loadImg("DRUG.png"),
  b: loadImg("weed.png"),      // ✅ WebP حذف شد
  o: loadImg("shit.png"),      // ✅ WebP حذف شد

  bu: loadImg("bullet.png"),
  s: loadImg("speed.png"),
  fever: loadImg("pizza44.png"),

  bg: loadImg("pizzaback.jpg")
};

/* -------------------------------
   Audio (Safe for Mobile)
--------------------------------*/
function safeAudio(src) {
  const a = new Audio(src);
  a.preload = "none"; // ✅ جلوگیری از Block شدن iOS
  return a;
}

const sounds = {
  pizza: [safeAudio("2.mp3"), safeAudio("3.mp3"), safeAudio("5.mp3")],
  drug: safeAudio("1.mp3"),
  explode: safeAudio("gooz1.mp3"),
  gameOver: safeAudio("gameover.mp3")
};

const bg = safeAudio("background.mp3");
bg.loop = true;
bg.volume = 0.3;

let soundOn = true;

/* -------------------------------
   Resize (Mobile Safe)
--------------------------------*/
function resizeAll() {
  DPR = window.devicePixelRatio || 1;

  W = window.innerWidth;
  H = window.innerHeight;

  c.width = W * DPR;
  c.height = H * DPR;
  c.style.width = W + "px";
  c.style.height = H + "px";

  x.setTransform(DPR, 0, 0, DPR, 0, 0);

  // ✅ Player always bottom
  const base = Math.min(W, H) * 0.22;
  p.baseSize = base;
  p.w = base;
  p.h = base;
  p.x = (W - p.w) / 2;
  p.y = H - p.h - 10;
}

window.addEventListener("resize", resizeAll);
window.addEventListener("load", resizeAll);

/* -------------------------------
   Player Hitbox (Auto-Scale)
--------------------------------*/
function playerHitbox() {
  return {
    x: p.x + p.w * 0.15,
    y: p.y + p.h * 0.15,
    w: p.w * 0.7,
    h: p.h * 0.7
  };
}

/* -------------------------------
   Draw Background
--------------------------------*/
function drawBG() {
  x.fillStyle = "rgba(255,255,255,0.08)";
  x.fillRect(0, 0, W, H);

  if (!img.bg.complete) return;

  const iw = img.bg.width;
  const ih = img.bg.height;
  const cr = W / H;
  const ir = iw / ih;

  let dw, dh;
  if (ir > cr) {
    dh = H;
    dw = ir * H;
  } else {
    dw = W;
    dh = W / ir;
  }

  x.save();
  x.globalAlpha = 0.15;
  x.drawImage(img.bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  x.restore();
}

/* -------------------------------
   Draw Player (High Quality)
--------------------------------*/
function drawPlayer() {
  const skin = img[currentSkin];
  if (!skin.complete) return;

  x.save();
  x.translate(p.x + p.w / 2, p.y + p.h / 2);
  x.scale(p.scale, p.scale);

  x.drawImage(skin, -p.w / 2, -p.h / 2, p.w, p.h);

  x.restore();
}

/* -------------------------------
   Update Loop
--------------------------------*/
function update() {
  if (!start || go || paused) return;

  // TODO: بقیهٔ آپدیت‌ها مثل قبل
}

/* -------------------------------
   Draw Loop
--------------------------------*/
function draw() {
  x.clearRect(0, 0, W, H);

  drawBG();
  drawPlayer();

  if (go) {
    x.fillStyle = "rgba(0,0,0,0.6)";
    x.fillRect(0, 0, W, H);

    x.fillStyle = "#fff";
    x.textAlign = "center";
    x.font = "32px Arial";
    x.fillText("Game Over", W / 2, H / 2);
  }
}

/* -------------------------------
   Main Loop
--------------------------------*/
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

/* -------------------------------
   Start Game
--------------------------------*/
function startGame() {
  start = true;
  go = false;

  resizeAll();

  if (soundOn) bg.play().catch(() => {});

  document.body.classList.add("playing");
}

/* -------------------------------
   Restart
--------------------------------*/
window.addEventListener("touchstart", () => {
  if (go) {
    go = false;
    startGame();
  }
});

window.addEventListener("keydown", e => {
  if (e.code === "Space" && go) {
    go = false;
    startGame();
  }
});

/* -------------------------------
   Expose to HTML
--------------------------------*/
window.startGame = startGame;
