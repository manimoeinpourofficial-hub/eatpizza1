const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// تنظیم ابعاد ریسپانسیو
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// بارگذاری تصاویر
const playerImg = new Image();
playerImg.src = "PIZZA-KHOOR.png";

const obstacleImg = new Image();
obstacleImg.src = "shit.webp";

const redImg = new Image();
redImg.src = "pizza1.png";

const greenImg = new Image();
greenImg.src = "DRUG.png"; // آبجکت سبز

const blueImg = new Image();
blueImg.src = "weed.webp"; // آبجکت آبی

let player = { x: canvas.width/2 - 60, y: canvas.height - 170, w: 170, h: 170 };
let reds = [];
let obstacles = [];
let greens = [];
let blues = [];
let score = 0;
let gameOver = false;

// احتمال ظاهر شدن پیتزا
let pizzaProbability = 0.3;

// 🎵 صداها
const pizzaSounds = [
  new Audio("pizza1.ogg"),
  new Audio("pizza2.ogg")
];

const gameOverSounds = [
  new Audio("gameover1.ogg"),
  new Audio("gameover1.ogg")
];

function playRandomSound(soundArray) {
  const index = Math.floor(Math.random() * soundArray.length);
  soundArray[index].play();
}

// حرکت با موس
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  player.x = e.clientX - rect.left - player.w / 2;
});

// حرکت با لمس موبایل
canvas.addEventListener("touchmove", e => {
  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  player.x = touchX - player.w / 2;
});

// کلیک یا لمس برای ریستارت
canvas.addEventListener("click", () => { if (gameOver) restartGame(); });
canvas.addEventListener("touchstart", () => { if (gameOver) restartGame(); });

function spawnRed() {
  reds.push({
    x: Math.random() * (canvas.width - 60),
    y: -60,
    w: 60,
    h: 60,
    alpha: 1,
    caught: false
  });
}

function spawnObstacle() {
  obstacles.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 60, h: 60 });
}

function spawnGreen() {
  greens.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 60, h: 60 });
}

function spawnBlue() {
  blues.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 80, h: 80 });
}

function update() {
  if (gameOver) return;

  // پیتزاها
  reds.forEach(r => {
    r.y += 3;
    if (isColliding(player, r) && !r.caught) {
      score++;
      r.caught = true;
      playRandomSound(pizzaSounds); // 🎵 صدا خوردن پیتزا
    }
    if (r.caught) {
      r.alpha -= 0.05;
      if (r.alpha <= 0) reds.splice(reds.indexOf(r), 1);
    }
    if (r.y > canvas.height && !r.caught) {
      gameOver = true;
      playRandomSound(gameOverSounds); // 🎵 صدا Game Over
    }
  });

  // موانع
  obstacles.forEach(o => {
    o.y += 4;
    if (isColliding(player, o)) {
      gameOver = true;
      playRandomSound(gameOverSounds); // 🎵 صدا Game Over
    }
    if (o.y > canvas.height) obstacles.splice(obstacles.indexOf(o), 1);
  });

  // سبزها
  greens.forEach(g => {
    g.y += 3;
    if (isColliding(player, g)) {
      pizzaProbability = Math.max(0.1, pizzaProbability - 0.1);
      greens.splice(greens.indexOf(g), 1);
    }
    if (g.y > canvas.height) greens.splice(greens.indexOf(g), 1);
  });

  // آبی‌ها
  blues.forEach(b => {
    b.y += 3;
    if (isColliding(player, b)) {
      pizzaProbability = Math.min(0.9, pizzaProbability + 0.1);
      blues.splice(blues.indexOf(b), 1);
    }
    if (b.y > canvas.height) blues.splice(blues.indexOf(b), 1);
  });
}

function isColliding(a, b) {
  return a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  reds.forEach(r => {
    ctx.save();
    if (r.caught) {
      ctx.globalAlpha = r.alpha;
      ctx.filter = "blur(2px)";
    }
    ctx.drawImage(redImg, r.x, r.y, r.w, r.h);
    ctx.restore();
  });

  obstacles.forEach(o => {
    ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h);
  });

  greens.forEach(g => {
    ctx.drawImage(greenImg, g.x, g.y, g.w, g.h);
  });

  blues.forEach(b => {
    ctx.drawImage(blueImg, b.x, b.y, b.w, b.h);
  });

  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Pizza Chance: ${(pizzaProbability*100).toFixed(0)}%`, 10, 60);

  if (gameOver) {
    ctx.fillStyle = "black";
    ctx.font = "40px Arial";
    ctx.fillText("Game Over!", canvas.width/2 - 100, canvas.height/2);
    ctx.font = "20px Arial";
    ctx.fillText("Tap or Click to Restart", canvas.width/2 - 100, canvas.height/2 + 40);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  reds = [];
  obstacles = [];
  greens = [];
  blues = [];
  score = 0;
  pizzaProbability = 0.3;
  gameOver = false;
}

// زمان‌بندی ظاهر شدن آیتم‌ها
setInterval(() => {
  if (Math.random() < pizzaProbability) spawnRed();
}, 1500);

setInterval(spawnObstacle, 3000);

setInterval(() => {
  if (Math.random() < 0.2) spawnGreen();
}, 5000);

setInterval(() => {
  if (Math.random() < 0.2) spawnBlue();
}, 7000);


gameLoop();
