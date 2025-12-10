/* کانواس و زمینه */
const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
const isMobile=innerWidth<600;
let player={x:0,y:0,w:0,h:0};
let reds=[],obstacles=[],greens=[],blues=[],bullets=[],explosions=[],buffs=[];
let score=0,ammo=0,gameOver=false,gameStarted=false,pizzaProbability=0.3,itemSize=40,bulletSize=20;
let viewW=innerWidth,viewH=innerHeight;

/* رکورد */
let highScore = parseInt(localStorage.getItem("highScore")||"0",10);

/* ابعاد کانواس */
function resizeCanvas(){
  const r=devicePixelRatio||1;
  viewW=innerWidth; viewH=innerHeight;
  canvas.style.width=viewW+"px"; canvas.style.height=viewH+"px";
  canvas.width=Math.round(viewW*r); canvas.height=Math.round(viewH*r);
  ctx.setTransform(r,0,0,r,0,0);
  const s=Math.max(60,Math.min(viewW*(isMobile?0.26:0.25),viewH*0.25));
  player.w=player.h=s; player.x=(viewW-s)/2; player.y=viewH-s-20;
  itemSize=Math.floor(s*0.6); bulletSize=Math.floor(s*0.25);
}
resizeCanvas(); addEventListener("resize",resizeCanvas);

/* تصاویر (PNG شفاف) */
const loadImg=src=>{const i=new Image(); i.src=src; return i;};
const playerImg=loadImg("PIZZA-KHOOR.png");
const playerAltImg=loadImg("pizzakhoor1.png");
const obstacleImg=loadImg("shit.webp");
const redImg=loadImg("pizza1.png");
const greenImg=loadImg("DRUG.png");
const blueImg=loadImg("weed.webp");
const bulletImg=loadImg("bullet.png");
const bulletAltImg=loadImg("AMMO1.png");
const explosionImg=loadImg("31.png");
const speedImg=loadImg("speed.png");
const gunImg=loadImg("gun.png");

/* صداها */
let loadedSounds=0,totalSounds=0;
const makeAudio=src=>{let a=new Audio(src);a.preload="auto";totalSounds++;a.oncanplaythrough=()=>loadedSounds++;return a;};
const sounds={
  pizza:[makeAudio("2.mp3"),makeAudio("3.mp3"),makeAudio("5.mp3")],
  gameOver:[makeAudio("gameover.mp3")],
  drug:makeAudio("1.mp3"),
  shit:makeAudio("4.mp3"),
  explode:makeAudio("gooz1.mp3")
};
const bgMusic=makeAudio("background.mp3"); bgMusic.loop=true; bgMusic.volume=0.3;

/* صف پخش صدا */
let soundQueue=[],isPlaying=false,soundCooldown={};
function playSound(n){
  if(!gameStarted) return;
  const now=Date.now(); if(now-(soundCooldown[n]||0)<500) return;
  soundCooldown[n]=now; const s=sounds[n]; if(!s) return;
  const a=(Array.isArray(s)?s[Math.random()*s.length|0]:s).cloneNode();
  soundQueue.push(a); processQueue();
}
function processQueue(){
  if(isPlaying||!soundQueue.length) return;
  const c=soundQueue.shift(); isPlaying=true; c.currentTime=0;
  c.play().catch(()=>isPlaying=false);
  c.onended=()=>{isPlaying=false;processQueue();};
}

/* حالت‌ها */
let gameSpeed = 1;
let speedBoostActive=false, speedBoostUntil=0;
let gunActive=false, gunUntil=0;
let shooting=false;

/* حرکت پلیر */
function move(x){ player.x=Math.max(0,Math.min(x-player.w/2,viewW-player.w)); }
canvas.addEventListener("mousemove",e=>move(e.clientX-canvas.getBoundingClientRect().left));
canvas.addEventListener("touchmove",e=>move(e.touches[0].clientX-canvas.getBoundingClientRect().left),{passive:true});

/* شروع/شلیک موبایل: سه لمس برای شلیک و نگه داشتن برای تیر بی‌نهایت */
let touchCount=0,lastTouchTime=0;
canvas.addEventListener("touchstart",()=>{
  if(!gameStarted){gameStarted=true;bgMusic.play().catch(()=>{});return;}
  if(gameOver){restartGame();return;}
  shooting=true; // نگه داشتن = شلیک پیوسته وقتی گان فعال است
  const now=Date.now();
  if(now-lastTouchTime>1000) touchCount=0;
  lastTouchTime=now; touchCount++;
  if(touchCount===3 && !gunActive){ shoot(); touchCount=0; } // سه لمس فقط وقتی گان فعال نیست
},{passive:true});
canvas.addEventListener("touchend",()=>{ shooting=false; },{passive:true});

/* Space: شروع/ریست و شلیک */
addEventListener("keydown",e=>{
  if(e.code==="Space"){
    if(!gameStarted){gameStarted=true;bgMusic.play().catch(()=>{});}
    else if(gameOver){restartGame();}
    else {
      shooting=true;
      if(!gunActive) shoot();
    }
  }
});
addEventListener("keyup",e=>{
  if(e.code==="Space") shooting=false;
});

/* شلیک تکی */
function shoot(){
  if(ammo>0){
    ammo--; updateAmmoDisplay();
    bullets.push({
      x:player.x+player.w/2-bulletSize/2,
      y:player.y,
      w:bulletSize,
      h:bulletSize*2,
      speed:10,
      img:bulletImg
    });
  }
}

/* شلیک پیوسته هنگام گان فعال */
let lastAutoShot=0;
function autoShoot(){
  const now=Date.now();
  if(now-lastAutoShot>80){ // نرخ آتش
    bullets.push({
      x:player.x+player.w/2-bulletSize/2,
      y:player.y,
      w:bulletSize,
      h:bulletSize*2,
      speed:12,
      img:bulletAltImg
    });
    lastAutoShot=now;
  }
}

/* اسپاون‌ها */
const randX = w => Math.random()*(viewW-w);
const spawnRed=()=>reds.push({x:randX(itemSize),y:-itemSize,w:itemSize,h:itemSize,img:redImg,speed:2});
const spawnObstacle=()=>obstacles.push({x:randX(itemSize),y:-itemSize,w:itemSize,h:itemSize,img:obstacleImg,speed:2,type:"obstacle"});
const spawnGreen=()=>greens.push({x:randX(itemSize),y:-itemSize,w:itemSize,h:itemSize,img:greenImg,speed:1.6});
const spawnBlue=()=>blues.push({x:randX(itemSize+15),y:-itemSize,w:itemSize+15,h:itemSize+15,img:blueImg,speed:1.4});
const spawnSpeed=()=>buffs.push({x:randX(itemSize),y:-itemSize,w:itemSize,h:itemSize,img:speedImg,speed:2,type:"speed"});
const spawnGun=()=>buffs.push({x:randX(itemSize),y:-itemSize,w:itemSize,h:itemSize,img:gunImg,speed:2,type:"gun"});

/* برخورد ساده محور محور */
const isColliding=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

/* نمایش آیکون تیر */
function updateAmmoDisplay(){
  const icon=document.getElementById("ammoIcon");
  if(icon) icon.style.display=ammo>0 || gunActive ? "inline" : "none";
}

/* ریستارت */
function restartGame(){
  reds=[]; obstacles=[]; greens=[]; blues=[]; bullets=[]; explosions=[]; buffs=[];
  score=0; ammo=0; pizzaProbability=0.3; gameOver=false;
  gameSpeed=1; speedBoostActive=false; gunActive=false;
  playerImg.src="PIZZA-KHOOR.png";
  updateAmmoDisplay();
}

/* تایمر اسپاون (سریع‌تر از قبل) */
setInterval(()=>gameStarted&&Math.random()<pizzaProbability&&spawnRed(),1200);
setInterval(()=>gameStarted&&spawnObstacle(),2400);
setInterval(()=>gameStarted&&Math.random()<0.25&&spawnGreen(),5000);
setInterval(()=>gameStarted&&Math.random()<0.25&&spawnBlue(),7000);
setInterval(()=>gameStarted&&Math.random()<0.15&&spawnSpeed(),8000);
setInterval(()=>gameStarted&&Math.random()<0.12&&spawnGun(),9000);

/* به‌روزرسانی امتیاز و رکورد */
function addScore(points){
  score += points;
  if(score > highScore){
    highScore = score;
    localStorage.setItem("highScore", String(highScore));
  }
}

/* حلقه اصلی */
(function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
})();

/* به‌روزرسانی */
function update(){
  if(!gameStarted || gameOver) return;

  // افزایش عمومی سرعت با امتیاز، تهاجمی‌تر
  gameSpeed = 1 + score/35;

  // مدیریت باف‌ها
  const now = Date.now();
  if(speedBoostActive && now>speedBoostUntil){ speedBoostActive=false; }
  if(gunActive && now>gunUntil){
    gunActive=false;
    playerImg.src="PIZZA-KHOOR.png";
    updateAmmoDisplay();
  }

  // شلیک پیوسته اگر گان فعال و کاربر نگه‌داشته
  if(gunActive && shooting){ autoShoot(); }

  // حرکت آیتم‌ها با درنظر گرفتن سرعت
  const moveGroup = (arr)=>{
    for(let i=arr.length-1;i>=0;i--){
      const o=arr[i];
      o.y += o.speed * (speedBoostActive ? gameSpeed*1.6 : gameSpeed);
      if(o.y>viewH) arr.splice(i,1);
    }
  };
  moveGroup(reds); moveGroup(obstacles); moveGroup(greens); moveGroup(blues); moveGroup(bullets); moveGroup(buffs);

  // برخورد پلیر با آیتم‌ها
  for(let i=reds.length-1;i>=0;i--){
    const r=reds[i];
    if(isColliding(player,r)){
      addScore(5);
      pizzaProbability = Math.min(0.6, pizzaProbability+0.01);
      playSound("pizza");
      reds.splice(i,1);
    }
  }
  for(let i=greens.length-1;i>=0;i--){
    const g=greens[i];
    if(isColliding(player,g)){
      ammo = Math.min(99, ammo+5);
      updateAmmoDisplay();
      playSound("drug");
      greens.splice(i,1);
    }
  }
  for(let i=blues.length-1;i>=0;i--){
    const b=blues[i];
    if(isColliding(player,b)){
      addScore(10);
      blues.splice(i,1);
    }
  }
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i];
    if(isColliding(player,o)){
      gameOver=true;
      playSound("gameOver");
      break;
    }
  }
  for(let i=buffs.length-1;i>=0;i--){
    const bf=buffs[i];
    if(isColliding(player,bf)){
      if(bf.type==="speed"){
        speedBoostActive=true;
        speedBoostUntil=Date.now()+10000; // 10 ثانیه
      }else if(bf.type==="gun"){
        gunActive=true;
        gunUntil=Date.now()+10000; // 10 ثانیه
        playerImg.src="PIZZA-KHOOR1.png";
        updateAmmoDisplay();
      }
      buffs.splice(i,1);
    }
  }

  // برخورد گلوله‌ها با مانع
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.y -= (speedBoostActive ? gameSpeed*1.2 : gameSpeed);
    let hit=false;
    for(let j=obstacles.length-1;j>=0;j--){
      const o=obstacles[j];
      if(isColliding(b,o)){
        obstacles.splice(j,1);
        addScore(3);
        playSound("explode");
        hit=true; break;
      }
    }
    if(hit || b.y + b.h < 0){ bullets.splice(i,1); }
  }
}

/* رسم */
function draw(){
  // پاک کردن کامل برای حفظ شفافیت PNG و جلوگیری از هاله
  ctx.clearRect(0,0,viewW,viewH);

  // لودینگ بار (اختیاری: حذف متغیر ناشناخته percent)
  // می‌تونی این بخش را کامل حذف کنی یا percent تعریف کنی

  if(!gameStarted){
    ctx.fillStyle="#222"; ctx.fillRect(0,0,viewW,viewH);
    ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="bold 28px Arial";
    ctx.fillText("برای شروع، لمس یا Space", viewW/2, viewH/2-20);
    ctx.font="16px Arial";
    ctx.fillText("سه لمس = شلیک تکی، نگه داشتن = شلیک بی‌نهایت هنگام گان", viewW/2, viewH/2+20);
    ctx.fillText("بیشترین رکورد: "+highScore, viewW/2, viewH/2+60);
    return;
  }

  // افکت سرعت
  if(speedBoostActive){
    ctx.strokeStyle="rgba(0,255,0,0.35)";
    ctx.lineWidth=4;
    for(let i=0;i<8;i++){
      const y = (Date.now()/4 + i*80) % viewH;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(60,y-20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(viewW-60,y); ctx.lineTo(viewW,y-20); ctx.stroke();
    }
    ctx.fillStyle="rgba(0,255,0,0.08)";
    ctx.fillRect(0,0,viewW,viewH);
  }

  // پلیر
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  // رندر آیتم‌ها
  const drawArr = arr=>{
    for(const o of arr){
      if(o.img) ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
      else { ctx.fillStyle="#f00"; ctx.fillRect(o.x, o.y, o.w, o.h); }
    }
  };
  drawArr(reds); drawArr(greens); drawArr(blues); drawArr(obstacles); drawArr(buffs);

  // گلوله‌ها
  for(const b of bullets){
    ctx.drawImage(b.img||bulletImg, b.x, b.y, b.w, b.h);
  }

  // HUD
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.fillRect(0,0,viewW,40);
  ctx.fillStyle="#fff"; ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.font="16px Arial";
  ctx.fillText("امتیاز: "+score, 12, 20);
  ctx.fillText("رکورد: "+highScore, 120, 20);
  ctx.fillText("مهمات: "+(gunActive?"∞":ammo), 240, 20);
  if(speedBoostActive){
    const left = Math.max(0, Math.ceil((speedBoostUntil-Date.now())/1000));
    ctx.fillStyle="#0f0";
    ctx.fillText("سرعت+: "+left+"s", 350, 20);
  }
  if(gunActive){
    const left = Math.max(0, Math.ceil((gunUntil-Date.now())/1000));
    ctx.fillStyle="#0ff";
    ctx.fillText("گان: "+left+"s", 450, 20);
  }

  // گیم‌اور
  if(gameOver){
    ctx.fillStyle="rgba(0,0,0,0.6)";
    ctx.fillRect(0,0,viewW,viewH);
    ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="40px Arial";
    ctx.fillText("Game Over!",viewW/2,viewH/2-20);
    ctx.font="20px Arial";
    ctx.fillText("Tap یا Space برای Restart",viewW/2,viewH/2+20);
    ctx.fillText("High Score: "+highScore, viewW/2, viewH/2+60);
  }
}

/* آیکون مهمات اختیاری: اگر در HTML داری نشان بده */
function updateAmmoDisplay(){
  const icon=document.getElementById("ammoIcon");
  if(icon) icon.style.display=ammo>0 || gunActive ? "inline" : "none";
}

