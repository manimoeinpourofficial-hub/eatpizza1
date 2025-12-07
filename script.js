const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 📱 تشخیص موبایل
const isMobile = window.innerWidth < 600;

// 🎮 وضعیت بازی
let player = { x: 0, y: 0, w: 0, h: 0 };
let reds = [], obstacles = [], greens = [], blues = [], bullets = [];
let score = 0, gameOver = false, pizzaProbability = 0.3;

// 📐 تنظیم اندازه و موقعیت
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const scale = isMobile ? 0.15 : 0.25;
  const size = Math.max(100, Math.min(canvas.width * scale, isMobile ? 140 : 180));
  player.w = player.h = size;
  player.y = canvas.height - player.h - (isMobile ? 30 : 0);
  player.x = canvas.width / 2 - player.w / 2;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// 🎨 تصاویر
const playerImg = new Image(); playerImg.src = "PIZZA-KHOOR.png";
const obstacleImg = new Image(); obstacleImg.src = "shit.webp";
const redImg = new Image(); redImg.src = "pizza1.png";
const greenImg = new Image(); greenImg.src = "DRUG.png";
const blueImg = new Image(); blueImg.src = "weed.webp";
const bulletImg = new Image(); bulletImg.src = "bullet.png"; // عکس گلوله

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
    s[i].currentTime = 0; s[i].play();
  } else { s.currentTime = 0; s.play(); }
}

// 🕹️ کنترل بازیکن
function move(x) {
  player.x = Math.max(0, Math.min(x - player.w / 2, canvas.width - player.w));
}
canvas.addEventListener("mousemove", e => move(e.clientX - canvas.getBoundingClientRect().left));
canvas.addEventListener("touchmove", e => move(e.touches[0].clientX - canvas.getBoundingClientRect().left));
["click","touchstart"].forEach(ev => canvas.addEventListener(ev,()=>{if(gameOver)restartGame();}));

// 🎯 اسپاون
const itemSize = isMobile ? 40 : 60;
const bulletSize = isMobile ? 15 : 20;

function spawnRed(){reds.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize,h:itemSize,alpha:1,caught:false});}
function spawnObstacle(){obstacles.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize,h:itemSize});}
function spawnGreen(){greens.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize,h:itemSize});}
function spawnBlue(){blues.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize+20,h:itemSize+20});}

// 💥 برخورد
function isColliding(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

// 🔄 آپدیت
function update(){
  if(gameOver) return;

  reds.forEach(r=>{
    r.y+=3;
    if(isColliding(player,r)&&!r.caught){
      score++; r.caught=true; playSound("pizza");

      // 🎯 هر ۷ پیتزا → شلیک
      if(score % 7 === 0){
        bullets.push({
          x: player.x + player.w/2 - bulletSize/2,
          y: player.y,
          w: bulletSize, h: bulletSize * 2,
          speed: 8
        });
      }
    }
    if(r.caught){r.alpha-=0.05;if(r.alpha<=0)reds.splice(reds.indexOf(r),1);}
    if(r.y>canvas.height&&!r.caught){gameOver=true;playSound("gameOver");}
  });

  obstacles.forEach(o=>{
    o.y+=3;
    if(isColliding(player,o)){gameOver=true;playSound("shit");playSound("gameOver");}
    if(o.y>canvas.height)obstacles.splice(obstacles.indexOf(o),1);
  });

  greens.forEach(g=>{
    g.y+=3;
    if(isColliding(player,g)){pizzaProbability=Math.max(0.05,pizzaProbability-0.15);playSound("drug");greens.splice(greens.indexOf(g),1);}
    if(g.y>canvas.height)greens.splice(greens.indexOf(g),1);
  });

  blues.forEach(b=>{
    b.y+=3;
    if(isColliding(player,b)){pizzaProbability=Math.min(0.9,pizzaProbability+0.1);blues.splice(blues.indexOf(b),1);}
    if(b.y>canvas.height)blues.splice(blues.indexOf(b),1);
  });

  // 🔫 حرکت گلوله‌ها
  bullets.forEach(b=>{
    b.y -= b.speed;
    if(b.y+b.h<0) bullets.splice(bullets.indexOf(b),1);
  });
}

// 🖼️ رسم
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(playerImg,player.x,player.y,player.w,player.h);

  reds.forEach(r=>{
    ctx.save();
    if(r.caught){ctx.globalAlpha=r.alpha;ctx.filter="blur(2px)";}
    ctx.drawImage(redImg,r.x,r.y,r.w,r.h);
    ctx.restore();
  });

  obstacles.forEach(o=>ctx.drawImage(obstacleImg,o.x,o.y,o.w,o.h));
  greens.forEach(g=>ctx.drawImage(greenImg,g.x,g.y,g.w,g.h));
  blues.forEach(b=>ctx.drawImage(blueImg,b.x,b.y,b.w,b.h));

  // 🔫 رسم گلوله‌ها
  bullets.forEach(b=>ctx.drawImage(bulletImg,b.x,b.y,b.w,b.h));

  ctx.fillStyle="black"; ctx.font="20px Arial";
  ctx.fillText(`Score: ${score}`,10,30);
  ctx.fillText(`Pizza Chance: ${(pizzaProbability*100).toFixed(0)}%`,10,60);

  if(gameOver){
    ctx.font="40px Arial"; ctx.fillText("Game Over!",canvas.width/2-100,canvas.height/2);
    ctx.font="20px Arial"; ctx.fillText("Tap or Click to Restart",canvas.width/2-100,canvas.height/2+40);
  }
}

// 🔁 ریستارت
function restartGame(){
  reds=[]; obstacles=[]; greens=[]; blues=[]; bullets=[];
  score=0; pizzaProbability=0.3; gameOver=false;
}

// ⏱️ زمان‌بندی
setInterval(()=>{if(Math.random()<pizzaProbability)spawnRed();},1500);
setInterval(spawnObstacle,3000);
setInterval(()=>{if(Math.random()<0.2)spawnGreen();},5000);
setInterval(()=>{if(Math.random()<0.2)spawnBlue();},7000);

// 🚀 اجرا
(function gameLoop(){update();draw();requestAnimationFrame(gameLoop);})();
