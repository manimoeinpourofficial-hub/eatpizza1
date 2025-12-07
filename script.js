const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const isMobile = window.innerWidth < 600;

// 🎮 وضعیت بازی
let player = { x: 0, y: 0, w: 0, h: 0 };
let reds = [], obstacles = [], greens = [], blues = [], bullets = [];
let score = 0, gameOver = false, pizzaProbability = 0.3;
let gameStarted = false;
let allSoundsReady = false;
let isUserPrimed = false;

// 📊 شمارش صداها
let loadedSounds = 0;
let totalSounds = 0;

// ⬆️ سایزها
const itemSize = isMobile ? 30 : 60;
const bulletSize = isMobile ? 12 : 20;

// 📐 ریسپانسیو
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const scale = isMobile ? 0.12 : 0.25;
  const size = Math.max(80, Math.min(canvas.width * scale, isMobile ? 120 : 180));
  player.w = player.h = size;
  player.y = canvas.height - player.h - (isMobile ? 40 : 0);
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
const bulletImg = new Image(); bulletImg.src = "bullet.png";

// 🎵 صداها
function makeAudio(src) {
  const a = new Audio(src);
  a.preload = "auto";
  totalSounds++;
  a.addEventListener("canplaythrough", () => { loadedSounds++; });
  return a;
}
const sounds = {
  pizza: [makeAudio("2.mp3"), makeAudio("3.mp3"), makeAudio("5.mp3"), makeAudio("6.mp3")],
  gameOver: [makeAudio("sounds/gameover1.ogg"), makeAudio("sounds/gameover2.ogg")],
  drug: makeAudio("1.mp3"),
  shit: makeAudio("4.mp3")
};
const bgMusic = makeAudio("background.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;
function setBgVolume(value) {
  bgMusic.volume = Math.max(0, Math.min(1, value));
}

// 🎶 صف پخش صداها
let soundQueue = [];
let isPlaying = false;
function playSound(name) {
  const s = sounds[name];
  if (!s || !gameStarted) return;
  let audio;
  if (Array.isArray(s)) {
    const i = Math.floor(Math.random() * s.length);
    audio = s[i].cloneNode();
  } else {
    audio = s.cloneNode();
  }
  soundQueue.push(audio);
  processQueue();
}
function processQueue() {
  if (isPlaying || soundQueue.length === 0) return;
  const current = soundQueue.shift();
  isPlaying = true;
  current.currentTime = 0;
  current.play().catch(()=>{isPlaying=false;});
  current.onended = () => { isPlaying = false; processQueue(); };
}

// 🕹️ کنترل بازیکن
function move(x) {
  player.x = Math.max(0, Math.min(x - player.w / 2, canvas.width - player.w));
}
canvas.addEventListener("mousemove", e => move(e.clientX - canvas.getBoundingClientRect().left));
canvas.addEventListener("touchmove", e => move(e.touches[0].clientX - canvas.getBoundingClientRect().left));

// 🔫 شلیک
function shoot() {
  bullets.push({
    x: player.x + player.w/2 - bulletSize/2,
    y: player.y,
    w: bulletSize, h: bulletSize * 2,
    speed: 8
  });
}

// 🎯 اسپاون
function spawnRed(){reds.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize,h:itemSize,alpha:1,caught:false});}
function spawnObstacle(){obstacles.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize,h:itemSize});}
function spawnGreen(){greens.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize,h:itemSize});}
function spawnBlue(){blues.push({x:Math.random()*(canvas.width-itemSize),y:-itemSize,w:itemSize+15,h:itemSize+15});}

// 💥 برخورد
function isColliding(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

// 🔄 آپدیت
function update(){
  if (gameOver || !gameStarted) return;
  reds.forEach(r=>{
    r.y+=3;
    if(isColliding(player,r)&&!r.caught){
      score++; r.caught=true; playSound("pizza");
      if(score % 7 === 0) shoot();
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
  bullets.forEach(b=>ctx.drawImage(bulletImg,b.x,b.y,b.w,b.h));
  ctx.fillStyle="black"; ctx.font="20px Arial";
  ctx.fillText(`Score: ${score}`,10,30);
  ctx.fillText(`Pizza Chance: ${(pizzaProbability*100).toFixed(0)}%`,10,60);
  if(!allSoundsReady){
    const percent = Math.floor((loadedSounds / totalSounds) * 100);
    ctx.font="24px Arial";
    ctx.fillText(`Loading sounds... ${percent}%`, canvas.width/2-100, canvas.height/2);
  } else if(!gameStarted){
    ctx.font="24px Arial";
    ctx.fillText("Tap or Space to start!", canvas.width/2-100, canvas.height/2+30);
  }
  if(gameOver){
    ctx.font="40px Arial"; ctx.fillText("Game Over!",canvas.width/2-100,canvas.height/2);
    ctx.font="20px Arial"; ctx.fillText("Tap or Space to Restart",canvas.width/2-130,canvas.height/2+40);
  }
}

// 🔁 ریستارت
function restartGame(){
  reds=[]; obstacles=[]; greens=[]; blues=[]; bullets=[];
  score=0; pizzaProbability=0.3; gameOver=false;
}

//
