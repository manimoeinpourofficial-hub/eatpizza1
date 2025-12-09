const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const isMobile = window.innerWidth < 600;

let player = { x: 0, y: 0, w: 0, h: 0 };
let reds = [], obstacles = [], greens = [], blues = [], bullets = [], explosions = [];
let score = 0, ammo = 0;
let gameOver = false, gameStarted = false;
let pizzaProbability = 0.3;
let itemSize = 40;
let bulletSize = 20;
let viewW = window.innerWidth, viewH = window.innerHeight;

/* ابعاد کانواس دقیقاً برابر صفحه */
function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
    canvas.width = Math.round(viewW * ratio);
    canvas.height = Math.round(viewH * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const scale = isMobile ? 0.26 : 0.25;
    const size = Math.max(60, Math.min(viewW * scale, viewH * scale));
    player.w = player.h = size;
    player.x = (viewW - player.w) / 2;
    player.y = viewH - player.h;

    itemSize = Math.floor(player.w * 0.6);
    bulletSize = Math.floor(player.w * 0.25);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* تصاویر */
const playerImg = new Image(); playerImg.src = "PIZZA-KHOOR.png";
const obstacleImg = new Image(); obstacleImg.src = "shit.webp";
const redImg = new Image(); redImg.src = "pizza1.png";
const greenImg = new Image(); greenImg.src = "DRUG.png";
const blueImg = new Image(); blueImg.src = "weed.webp";
const bulletImg = new Image(); bulletImg.src = "bullet.png";
const explosionImg = new Image(); explosionImg.src = "31.png";

/* صداها */
let loadedSounds = 0, totalSounds = 0;
function makeAudio(src) {
    const a = new Audio(src);
    a.preload = "auto";
    totalSounds++;
    a.addEventListener("canplaythrough", () => { loadedSounds++; });
    return a;
}
const sounds = {
    pizza: [makeAudio("2.mp3"), makeAudio("3.mp3"), makeAudio("5.mp3")],
    gameOver: [makeAudio("gameover.mp3")],
    drug: makeAudio("1.mp3"),
    shit: makeAudio("4.mp3"),
    explode: makeAudio("gooz1.mp3")
};
const bgMusic = makeAudio("background.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.3;

/* صف پخش صداها با کول‌داون جدا */
let soundQueue = [], isPlaying = false;
const soundCooldown = {};
function playSound(name) {
    if (!gameStarted) return;
    const now = Date.now();
    const last = soundCooldown[name] || 0;
    if (now - last < 5000) return;
    soundCooldown[name] = now;

    const s = sounds[name];
    if (!s) return;
    const audio = Array.isArray(s) ? s[Math.floor(Math.random() * s.length)].cloneNode() : s.cloneNode();
    soundQueue.push(audio);
    processQueue();
}
function processQueue() {
    if (isPlaying || soundQueue.length === 0) return;
    const current = soundQueue.shift();
    isPlaying = true;
    current.currentTime = 0;
    current.play().catch(()=>{ isPlaying = false; });
    current.onended = () => { isPlaying = false; processQueue(); };
}

/* حرکت پلیر */
function move(x) {
    player.x = Math.max(0, Math.min(x - player.w / 2, viewW - player.w));
}
canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    move(e.clientX - rect.left);
});
canvas.addEventListener("touchmove", e => {
    const rect = canvas.getBoundingClientRect();
    move(e.touches[0].clientX - rect.left);
}, { passive: true });

/* سه بار لمس برای شلیک روی موبایل */
let touchCount = 0;
let lastTouchTime = 0;
canvas.addEventListener("touchstart", () => {
    if (!gameStarted) {
        gameStarted = true;
        bgMusic.play().catch(()=>{});
        return;
    }
    if (gameOver) {
        restartGame();
        return;
    }
    const now = Date.now();
    if (now - lastTouchTime > 1000) touchCount = 0;
    lastTouchTime = now;
    touchCount++;
    if (touchCount === 3) {
        shoot();
        touchCount = 0;
    }
}, { passive: true });

/* Space برای دسکتاپ */
window.addEventListener("keydown", e => {
    if (e.code === "Space") {
        if (!gameStarted) {
            gameStarted = true;
            bgMusic.play().catch(()=>{});
        } else if (gameOver) {
            restartGame();
        } else {
            shoot();
        }
    }
});

/* شلیک */
function shoot() {
    if (ammo > 0) {
        ammo--;
        updateAmmoDisplay();
        bullets.push({ x: player.x + player.w/2 - bulletSize/2, y: player.y, w: bulletSize, h: bulletSize * 2, speed: 8 });
    }
}

/* اسپاون آیتم‌ها */
function spawnRed() { reds.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize, h: itemSize, caught:false }); }
function spawnObstacle() { obstacles.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize, h: itemSize }); }
function spawnGreen() { greens.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize, h: itemSize }); }
function spawnBlue() { blues.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize+15, h: itemSize+15 }); }

/* برخورد */
function isColliding(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

/* آپدیت */
function update(){
    if (gameOver || !gameStarted) return;

    // پیتزاها
    reds = reds.filter(r => {
        r.y += 3;
        if (!r.caught && isColliding(player, r)) {
            score++;
            r.caught = true;
            playSound("pizza");
            if (score % 2 === 0) { ammo++; updateAmmoDisplay(); }
            return false;
        }
        if (!r.caught && r.y > viewH) {
            if (!gameOver) { gameOver = true; playSound("gameOver"); }
            return false;
        }
        return true;
    });

    // موانع
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.y += 3;
        if (isColliding(player, o)) {
            if (!gameOver) { gameOver = true; playSound("shit"); playSound("gameOver"); }
            obstacles.splice(i, 1);
            continue;
        }
        if (o.y > viewH) obstacles.splice(i, 1);
    }

    // آیتم سبز
    greens = greens.filter(g => {
        g.y += 3;
        if (isColliding(player, g)) {
            pizzaProbability = Math.max(0.05, pizzaProbability - 0.15);
            playSound("drug");
            return false;
        }
        if (g.y > viewH) return false;
        return true;
    });

    // آیتم آبی
    blues = blues.filter(b => {
        b.y += 3;
        if (isColliding(player, b)) {
            pizzaProbability = Math.min(0.9, pizzaProbability + 0.1);
            return false;
        }
        if (b.y > viewH) return false;
        return true;
    });

    // گلوله‌ها
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        b.y -= b.speed;
        let hit = false;
        for (let oi = obstacles.length - 1; oi >= 0; oi--) {
            const o = obstacles[oi];
            if (isColliding(b, o)) {
                explosions.push({ x: o.x, y: o.y, frame: 0 });
                playSound("explode");
                obstacles.splice(oi, 1);
                bullets.splice(bi, 1);
                score += 2;
                hit = true;
                break;
            }
        }
        if (hit) continue;
        if (b.y + b.h < 0) bullets.splice(bi, 1);
    }

    // انفجارها
    for (let ei = explosions.length - 1; ei >= 0; ei--) {
        const e = explosions[ei];
        e.frame++;
        if (e.frame > 10) explosions.splice(ei, 1);
    }
}

/* رسم */
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // بازیکن
    ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

    // آیتم‌ها
    reds.forEach(r=> ctx.drawImage(redImg, r.x, r.y, r.w, r.h));
    obstacles.forEach(o=> ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h));
    greens.forEach(g=> ctx.drawImage(greenImg, g.x, g.y, g.w, g.h));
    blues.forEach(b=> ctx.drawImage(blueImg, b.x, b.y, b.w, b.h));
    bullets.forEach(b=> ctx.drawImage(bulletImg, b.x, b.y, b.w, b.h));
    explosions.forEach(e=> ctx.drawImage(explosionImg, e.x, e.y, itemSize, itemSize));

    // UI
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Pizza Chance: ${(pizzaProbability*100).toFixed(0)}%`, 10, 60);
    ctx.fillText(`Ammo: ${ammo}`, 10, 90);

    // لودینگ
    if (!gameStarted) {
        const percent = totalSounds ? Math.floor((loadedSounds / totalSounds) * 100) : 0;
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Loading sounds... ${percent}%`, viewW/2, viewH/2 - 80);
        ctx.fillText("Tap or Space to start!", viewW/2, viewH/2 + 60);

        const barWidth = viewW * 0.6;
        const barHeight = 20;
        const barX = viewW/2 - barWidth/2;
        const barY = viewH/2 - 20;
        ctx.strokeStyle = "black";
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = "green";
        ctx.fillRect(barX, barY, barWidth * (percent/100), barHeight);
    }

    // گیم‌اور
    if (gameOver) {
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Game Over!", viewW/2, viewH/2);
        ctx.font = "20px Arial";
        ctx.fillText("Tap or Space to Restart", viewW/2, viewH/2 + 50);
    }
}

/* نمایش آیکون تیر */
function updateAmmoDisplay() {
    const ammoIcon = document.getElementById("ammoIcon");
    if (!ammoIcon) return;
    ammoIcon.style.display = ammo > 0 ? "inline" : "none";
}

/* ریستارت بازی */
function restartGame(){
    reds = [];
    obstacles = [];
    greens = [];
    blues = [];
    bullets = [];
    explosions = [];
    score = 0;
    ammo = 0;
    pizzaProbability = 0.3;
    gameOver = false;
    updateAmmoDisplay();
}

/* تایمرهای اسپاون */
setInterval(()=>{ if (gameStarted && Math.random() < pizzaProbability) spawnRed(); }, 1500);
setInterval(()=>{ if (gameStarted) spawnObstacle(); }, 3000);
setInterval(()=>{ if (gameStarted && Math.random() < 0.2) spawnGreen(); }, 5000);
setInterval(()=>{ if (gameStarted && Math.random() < 0.2) spawnBlue(); }, 7000);

/* حلقه‌ی اصلی بازی */
(function gameLoop(){
    update();
    draw();
    requestAnimationFrame(gameLoop);
})();

