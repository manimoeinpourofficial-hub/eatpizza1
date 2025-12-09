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

/* ابعاد کانواس دقیقاً برابر صفحه، با DPI درست */
function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
    canvas.width = Math.round(viewW * ratio);
    canvas.height = Math.round(viewH * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // سایز پلیر (موبایل کمی بزرگ‌تر)
    const scale = isMobile ? 0.22 : 0.25;
    const size = Math.max(60, Math.min(viewW * scale, viewH * scale));
    player.w = player.h = size;

    // پلیر وسط و چسبیده به پایین
    player.x = (viewW - player.w) / 2;
    player.y = viewH - player.h;

    // آیتم‌ها کوچیک‌تر از پلیر، گلوله‌ها متناسب
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
bgMusic.volume = 0.3; // صدای بکگراند کمتر شد

/* صف پخش صداها */
let soundQueue = [], isPlaying = false;
let lastSoundTime = 0;
function playSound(name) {
    if (!gameStarted) return;
    const now = Date.now();
    if (now - lastSoundTime < 5000) return; // فقط هر ۵ ثانیه یکبار
    lastSoundTime = now;

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
    const viewW = window.innerWidth;
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
    if (now - lastTouchTime > 1000) {
        touchCount = 0;
    }
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
function spawnRed() {
    const viewW = window.innerWidth;
    reds.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize, h: itemSize, caught:false });
}
function spawnObstacle() {
    const viewW = window.innerWidth;
    obstacles.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize, h: itemSize });
}
function spawnGreen() {
    const viewW = window.innerWidth;
    greens.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize, h: itemSize });
}
function spawnBlue() {
    const viewW = window.innerWidth;
    blues.push({ x: Math.random() * (viewW - itemSize), y: -itemSize, w: itemSize+15, h: itemSize+15 });
}

/* برخورد */
function isColliding(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

/* آپدیت */
function update(){
    if (gameOver || !gameStarted) return;
    const viewH = window.innerHeight;

    reds.forEach(r=>{
        r.y += 3;
        if (isColliding(player, r) && !r.caught) {
            score++;
            r.caught = true;
            playSound("pizza");
            if (score % 2 === 0) {
                ammo++;
                updateAmmoDisplay();
            }
        }
        if (r.caught) {
            reds.splice(reds.indexOf(r), 1); // حذف مستقیم بدون فید
        }
        if (r.y > viewH && !r.caught) {
            gameOver = true;
            playSound("gameOver");
        }
    });

    obstacles.forEach(o=>{
        o.y += 3;
        if (isColliding(player, o)) {
            gameOver = true;
            playSound("shit");
            playSound("gameOver");
        }
        if (o.y > viewH) obstacles.splice(obstacles.indexOf(o), 1);
    });

    greens.forEach(g=>{
        g.y += 3;
        if (isColliding(player, g)) {
            pizzaProbability = Math.max(0.05, pizzaProbability - 0.15);
            playSound("drug");
            greens.splice(greens.indexOf(g),1);
        }
        if (g.y > viewH) greens.splice(greens.indexOf(g),1);
    });

    blues.forEach(b=>{
        b.y += 3;
        if (isColliding(player, b)) {
            pizzaProbability = Math.min(0.9, pizzaProbability + 0.1);
            blues.splice(blues.indexOf(b),1);
        }
        if (b.y > viewH) blues.splice(blues.indexOf(b),1);
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

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

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


