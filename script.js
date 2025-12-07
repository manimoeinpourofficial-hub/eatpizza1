<canvas id="gameCanvas"></canvas>
<script>
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 🎨 تصاویر
const images = {
  player: "PIZZA-KHOOR.png",
  pizza: "pizza1.png",
  drug: "DRUG.png",
  weed: "weed.webp",
  shit: "shit.webp"
};
for (let key in images) {
  const img = new Image();
  img.src = images[key];
  images[key] = img;
}

// 🎵 صداها
const sounds = {
  pizza: [new Audio("2.mp3"), new Audio("3.mp3"), new Audio("5.mp3"), new Audio("6.mp3")],
  gameOver: [new Audio("sounds/gameover1.ogg"), new Audio("sounds/gameover2.ogg")],
  drug: new Audio("1.mp3"),
  shit: new Audio("4.mp3")
};
function playSound(name) {
  const s = sounds[name];
  if (!s) return;
  if (Array.isArray(s)) {
    const i = Math.floor(Math.random() * s.length);
    s[i].currentTime = 0;
    s[i].play();
  } else {
    s.currentTime = 0;
    s.play();
  }
}

// 🎮 وضعیت بازی
let player = { x: 0, y: 0, w: 0, h: 0 };
let reds = [], obstacles = [], greens = [], blues = [];
let score = 0, gameOver = false, pizzaProbability = 0.3;

// 📐 تنظیم اندازه و موقعیت
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const size = Math.max(150, Math.min(canvas.width * 0.25, 180));
  player.w = player.h = size;
  player.y = canvas.height - player.h;
  player.x = canvas.width / 2 - player.w / 2;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// 🕹️ کنترل بازیکن
function move(x) {
  player.x = Math.max(0, Math.min(x - player.w / 2, canvas.width - player.w));
}
canvas.addEventListener("mousemove", e => move(e.clientX - canvas.getBoundingClientRect().left));
canvas.addEventListener("touchmove", e => move(e.touches[0].clientX - canvas.getBoundingClientRect().left));
["click", "touchstart"].forEach(ev => canvas.addEventListener(ev, () => { if (gameOver) restartGame(); }));

// 🎯 اسپاون آبجکت‌ها
function spawn(arr, w, h) {
  arr.push({ x: Math.random() * (canvas.width - w), y: -h, w, h, alpha: 1, caught: false });
}
setInterval(() => { if (Math.random() < pizzaProbability) spawn(reds, 60, 60); }, 1500);
setInterval(() => spawn(obstacles, 60, 60), 3000);
setInterval(() => { if (Math.random() < 0.2) spawn(greens, 60, 60); }, 5000);
setInterval(() => { if (Math.random() < 0.2) spawn(blues, 80, 80); }, 7000);

// 💥 برخورد
function isColliding(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// 🔄 آپدیت
function update() {
  if (gameOver) return;

  reds.forEach(r => {
    r.y += 3;
    if (isColliding(player, r) && !r.caught) {
      score++; r.caught = true; playSound("pizza");
    }
    if (r.caught) {
      r.alpha -= 0.05;
      if (r.alpha <= 0) reds.splice(reds.indexOf(r), 1);
    }
    if (r.y > canvas.height && !r.caught) {
      gameOver = true; playSound("gameOver");
    }
  });

  obstacles.forEach(o => {
    o.y += 3;
    if (isColliding(player, o)) {
      gameOver = true;
      playSound("shit");
      playSound("gameOver");
    }
    if (o.y > canvas.height) obstacles.splice(obstacles.indexOf(o), 1);
  });

  greens.forEach(g => {
    g.y += 3;
    if (isColliding(player, g)) {
      pizzaProbability = Math.max(0.05, pizzaProbability - 0.15);
      playSound("drug");
      greens.splice(greens.indexOf(g), 1);
    }
    if (g.y > canvas.height) greens.splice(greens.indexOf(g), 1);
  });

  blues.forEach(b => {
    b.y += 3;
    if (isColliding(player, b)) {
      pizzaProbability = Math.min(0.9, pizzaProbability + 0.1);
      blues.splice(blues.indexOf(b), 1);
    }
    if (b.y > canvas.height) blues.splice(blues.indexOf(b), 1);
  });
}

// 🖼️ رسم
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(images.player, player.x, player.y, player.w, player.h);

  reds.forEach(r => {
    ctx.save();
    if (r.caught) { ctx.globalAlpha = r.alpha; ctx.filter = "blur(2px)"; }
    ctx.drawImage(images.pizza, r.x, r.y, r.w, r.h);
    ctx.restore();
  });

  obstacles.forEach(o => ctx.drawImage(images.shit, o.x, o.y, o.w, o.h));
  greens.forEach(g => ctx.drawImage(images.drug, g.x, g.y, g.w, g.h));
  blues.forEach(b => ctx.drawImage(images.weed, b.x, b.y, b.w, b.h));

  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Pizza Chance: ${(pizzaProbability * 100).toFixed(0)}%`, 10, 60);

  if (gameOver) {
    ctx.font = "40px Arial";
    ctx.fillText("Game Over!", canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Tap or Click to Restart", canvas.width / 2 - 100, canvas.height / 2 + 40);
  }
}

// 🔁 ریستارت
function restartGame() {
  reds = []; obstacles = []; greens = []; blues = [];
  score = 0; pizzaProbability = 0.3; gameOver = false;
}

// 🚀 اجرا
(function gameLoop() {
  update(); draw(); requestAnimationFrame(gameLoop);
})();
</script>
