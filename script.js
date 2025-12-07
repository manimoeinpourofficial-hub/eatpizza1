const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// شخصیت بازی
let player = { x: 0, y: 0, w: 0, h: 0 };

// تنظیم ابعاد ریسپانسیو و موقعیت شخصیت
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // مقیاس نسبی
  const scale = 0.25; // بزرگ‌تر از قبل (25٪ عرض صفحه)
  let size = canvas.width * scale;

  // محدودیت‌ها
  const minSize = 150;   // حداقل 100px
  const maxSize = 180;   // حداکثر 180px
  size = Math.max(minSize, Math.min(size, maxSize));

  player.w = size;
  player.h = size;

  // فاصله از پایین بیشتر (مثلاً 10٪ ارتفاع)
  const bottomMargin = canvas.height * 0.0;
  player.y = canvas.height - player.h - bottomMargin;

  // وسط‌چین افقی
  player.x = canvas.width / 2 - player.w / 2;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// بارگذاری تصاویر
const playerImg = new Image(); playerImg.src = "PIZZA-KHOOR.png";
const obstacleImg = new Image(); obstacleImg.src = "shit.webp";
const redImg = new Image(); redImg.src = "pizza1.png";
const greenImg = new Image(); greenImg.src = "DRUG.png";
const blueImg = new Image(); blueImg.src = "weed.webp";

let reds = [], obstacles = [], greens = [], blues = [];
let score = 0, gameOver = false;
let pizzaProbability = 0.3;

// 🎵 صداها
const pizzaSounds = [new Audio Audio("2.mp3"), new Audio("3.mp3"), new Audio("5.mp3"), new Audio("6.mp3")];
const gameOverSounds = [new Audio("sounds/gameover1.ogg"), new Audio("sounds/gameover1.ogg")];
    // 🎵 صدا برای DRUG
    const drugSound = new Audio("1.mp3");
    
    function playDrugSound() {
      drugSound.currentTime = 0; // از اول پخش بشه
      drugSound.play();
    }


function playRandomSound(arr) {
  const i = Math.floor(Math.random() * arr.length);
  arr[i].play();
}

// حرکت با موس
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  player.x = e.clientX - rect.left - player.w / 2;
  player.x = Math.max(0, Math.min(player.x, canvas.width - player.w));
});

// حرکت با لمس
canvas.addEventListener("touchmove", e => {
  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  player.x = touchX - player.w / 2;
  player.x = Math.max(0, Math.min(player.x, canvas.width - player.w));
});

// ریستارت
canvas.addEventListener("click", () => { if (gameOver) restartGame(); });
canvas.addEventListener("touchstart", () => { if (gameOver) restartGame(); });

// اسپاون آبجکت‌ها
function spawnRed() {
  reds.push({ x: Math.random() * (canvas.width - 60), y: -60, w: 60, h: 60, alpha: 1, caught: false });
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

// برخورد
function isColliding(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// آپدیت
function update() {
  if (gameOver) return;

  reds.forEach(r => {
    r.y += 3;
    if (isColliding(player, r) && !r.caught) {
      score++; r.caught = true; playRandomSound(pizzaSounds);
    }
    if (r.caught) {
      r.alpha -= 0.05;
      if (r.alpha <= 0) reds.splice(reds.indexOf(r), 1);
    }
    if (r.y > canvas.height && !r.caught) {
      gameOver = true; playRandomSound(gameOverSounds);
    }
  });

  obstacles.forEach(o => {
    o.y += 4;
    if (isColliding(player, o)) {
      gameOver = true; playRandomSound(gameOverSounds);
    }
    if (o.y > canvas.height) obstacles.splice(obstacles.indexOf(o), 1);
  });

   greens
    blues.forEach(b => {
      b.y += 3;
      if (isColliding(player, b)) {
        pizzaProbability = Math.min(0.9, pizzaProbability + 0.1);
        blues.splice(blues.indexOf(b), 1);
      }
      if (b.y > canvas.height) blues.splice(blues.indexOf(b), 1);
    });
}

// رسم
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  reds.forEach(r => {
    ctx.save();
    if (r.caught) { ctx.globalAlpha = r.alpha; ctx.filter = "blur(2px)"; }
    ctx.drawImage(redImg, r.x, r.y, r.w, r.h);
    ctx.restore();
  });

  obstacles.forEach(o => ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h));
  greens.forEach(g => ctx.drawImage(greenImg, g.x, g.y, g.w, g.h));
  blues.forEach(b => ctx.drawImage(blueImg, b.x, b.y, b.w, b.h));

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

// ریستارت
function restartGame() {
  reds = []; obstacles = []; greens = []; blues = [];
  score = 0; pizzaProbability = 0.3; gameOver = false;
}

// زمان‌بندی
setInterval(() => { if (Math.random() < pizzaProbability) spawnRed(); }, 1500);
setInterval(spawnObstacle, 3000);
setInterval(() => { if (Math.random() < 0.2) spawnGreen(); }, 5000);
setInterval(() => { if (Math.random() < 0.2) spawnBlue(); }, 7000);

// اجرا
function gameLoop() {
  update(); draw(); requestAnimationFrame(gameLoop);
}
gameLoop();


