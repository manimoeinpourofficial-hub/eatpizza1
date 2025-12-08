const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const isMobile = window.innerWidth < 600;

let player = { x: 0, y: 0, w: 0, h: 0 };
let reds = [], obstacles = [], greens = [], blues = [], bullets = [], explosions = [];
let score = 0, ammo = 0;
let gameOver = false, gameStarted = false;
let pizzaProbability = 0.3;

let itemSize = 60;
let bulletSize = 20;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const maxWidth = 800;
  const maxHeight = 600;
  const targetWidth = Math.min(window.innerWidth, maxWidth);
  const targetHeight = Math.min(window.innerHeight, maxHeight);

  canvas.width = targetWidth * ratio;
  canvas.height = targetHeight * ratio;
  canvas.style.width = targetWidth + "px";
  canvas.style.height = targetHeight + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const rect = canvas.getBoundingClientRect();
  const scale = isMobile ? 0.16 : 0.25;
  const size = Math.max(60, Math.min(rect.width * scale, isMobile ? 140 : 180));
  player.w = player.h = size;
  player.x = (rect.width - player.w) / 2;
  player.y = rect.height - player.h;

  itemSize = Math.floor(player.w * 0.6);
  bulletSize = Math.floor(player.w * 0.25);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// کنترل حرکت با هماهنگی ابعاد
function move(x) {
  const rect = canvas.getBoundingClientRect();
  player.x = Math.max(0, Math.min(x - player.w / 2, rect.width - player.w));
}
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  move(e.clientX - rect.left);
});
canvas.addEventListener("touchmove", e => {
  const rect = canvas.getBoundingClientRect();
  move(e.touches[0].clientX - rect.left);
}, { passive: true });

// اسپاون آیتم‌ها با عرض واقعی کانواس
function getCanvasBounds() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}
function spawnRed() {
  const { width } = getCanvasBounds();
  reds.push({ x: Math.random() * (width - itemSize), y: -itemSize, w: itemSize, h: itemSize, alpha:1, caught:false });
}
function spawnObstacle() {
  const { width } = getCanvasBounds();
  obstacles.push({ x: Math.random() * (width - itemSize), y: -itemSize, w: itemSize, h: itemSize });
}
function spawnGreen() {
  const { width } = getCanvasBounds();
  greens.push({ x: Math.random() * (width - itemSize), y: -itemSize, w: itemSize, h: itemSize });
}
function spawnBlue() {
  const { width } = getCanvasBounds();
  blues.push({ x: Math.random() * (width - itemSize), y: -itemSize, w: itemSize+15, h: itemSize+15 });
}

// رسم وسط‌چین برای لودینگ و گیم‌اور
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  reds.forEach(r=> ctx.drawImage(redImg, r.x, r.y, r.w, r.h));
  obstacles.forEach(o=> ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h));
  greens.forEach(g=> ctx.drawImage(greenImg, g.x, g.y, g.w, g.h));
  blues.forEach(b=> ctx.drawImage(blueImg, b.x, b.y, b.w, b.h));
  bullets.forEach(b=> ctx.drawImage(bulletImg, b.x, b.y, b.w, b.h));
  explosions.forEach(e=> ctx.drawImage(explosionImg, e.x, e.y, itemSize, itemSize));

  ctx.fillStyle = "black"; ctx.font = "20px Arial";
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Pizza Chance: ${(pizzaProbability*100).toFixed(0)}%`, 10, 60);
  ctx.fillText(`Ammo: ${ammo}`, 10, 90);

  const rect = canvas.getBoundingClientRect();

  if (!gameStarted) {
    const percent = totalSounds ? Math.floor((loadedSounds / totalSounds) * 100) : 0;
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`Loading sounds... ${percent}%`, rect.width/2, rect.height/2 - 80);
    ctx.fillText("Tap or Space to start!", rect.width/2, rect.height/2 + 60);

    const barWidth = rect.width * 0.6;
    const barHeight = 20;
    const barX = rect.width/2 - barWidth/2;
    const barY = rect.height/2 - 20;

    ctx.strokeStyle = "black";
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "green";
    ctx.fillRect(barX, barY, barWidth * (percent/100), barHeight);
  }

  if (gameOver) {
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Game Over!", rect.width/2, rect.height/2);
    ctx.font = "20px Arial";
    ctx.fillText("Tap or Space to Restart", rect.width/2, rect.height/2 + 50);
  }
}

// برخورد
function isColliding(a,b){ 
  return a.x < b.x + b.w && 
         a.x + a.w > b.x && 
         a.y < b.y + b.h && 
         a.y + a.h > b.y; 
}

// آپدیت
function update(){
  if (gameOver || !gameStarted) return;

  reds.forEach(r=>{
    r.y += 3;
    if (isColliding(player, r) && !r.caught) {
      score++; r.caught = true; playSound("pizza");
      if (score % 2 === 0) { ammo++; updateAmmoDisplay(); }
    }
    if (r.caught) { r.alpha -= 0.05; if (r.alpha <= 0) reds.splice(reds.indexOf(r), 1); }
    if (r.y > canvas.height/(window.devicePixelRatio||1) && !r.caught) { gameOver = true; playSound("gameOver"); }
  });

  obstacles.forEach(o=>{
    o.y += 3;
    if (isColliding(player, o)) { gameOver = true; playSound("shit"); playSound("gameOver"); }
    if (o.y > canvas.height/(window.devicePixelRatio||1)) obstacles.splice(obstacles.indexOf(o), 1);
  });

  greens.forEach(g=>{
    g.y += 3;
    if (isColliding(player, g)) { pizzaProbability = Math.max(0.05, pizzaProbability - 0.15); playSound("drug"); greens.splice(greens.indexOf(g),1); }
    if (g.y > canvas.height/(window.devicePixelRatio||1)) greens.splice(greens.indexOf(g),1);
  });

  blues.forEach(b=>{
    b.y += 3;
    if (isColliding(player, b)) { pizzaProbability = Math.min(0.9, pizzaProbability + 0.1); blues.splice(blues.indexOf(b),1); }
    if (b.y > canvas.height/(window.devicePixelRatio||1)) blues.splice(blues.indexOf(b),1);
  });

  bullets.forEach(b=>{
    b.y -= b.speed;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const bb = { x: b.x, y: b.y, w: b.w, h: b.h };
      if (isColliding(bb, o)) {
        explosions.push({ x: o.x, y: o.y, frame: 0 });
        playSound("explode");
        obstacles.splice(i, 1);
        bullets.splice(bullets.indexOf(b), 1);
        score += 2;
        break;
      }
    }
    if (b.y + b.h < 0) bullets.splice(bullets.indexOf(b), 1);
  });

  explosions.forEach(e=>{
    e.frame++;
    if (e.frame > 10) explosions.splice(explosions.indexOf(e), 1);
  });
}

// نمایش آیکون تیر
function updateAmmoDisplay() {
  const ammoIcon = document.getElementById("ammoIcon");
  if (!ammoIcon) return;
  ammoIcon.style.display = ammo > 0 ? "inline" : "none";
}

// ریستارت بازی
function restartGame(){
  reds = []; obstacles = []; greens = []; blues = []; bullets = []; explosions = [];
  score = 0; ammo = 0; pizzaProbability = 0.3; gameOver = false;
  updateAmmoDisplay();
}

// تایمرهای اسپاون
setInterval(()=>{ if (gameStarted && Math.random() < pizzaProbability) spawnRed(); }, 1500);
setInterval(()=>{ if (gameStarted) spawnObstacle(); }, 3000);
setInterval(()=>{ if (gameStarted && Math.random() < 0.2) spawnGreen(); }, 5000);
setInterval(()=>{ if (gameStarted && Math.random() < 0.2) spawnBlue(); }, 7000);

// حلقه‌ی اصلی بازی
(function gameLoop(){
  update();
  draw();
  requestAnimationFrame(gameLoop);
})();
