/* ====== CONFIG & STATE (SHORT) ====== */
const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,isMobile=W<600,r=devicePixelRatio||1;
let player={x:0,y:0,w:0,h:0,img:null};
let reds=[],obstacles=[],greens=[],blues=[],bullets=[],buffs=[];
let score=0,ammo=0,gameOver=false,started=false,item=40,bullet=18;
let pizzaProb=0.3,highScore=+localStorage.getItem("highScore")||0;
let hunger=0,pizzaCount=0; // hunger: 0–100, pizzaCount: collected pizzas (max 3 => lose)
let gameSpeed=1,shooting=false;

/* ====== ASSETS (LAZY & LIGHT) ====== */
const I=src=>{const i=new Image(); i.src=src; return i;};
const IMG={
  player:I("PIZZA-KHOOR.png"),
  playerAlt:I("pizzakhoor.png"),
  red:I("pizza1.png"),
  green:I("DRUG.png"),
  blue:I("weed.webp"),
  shit:I("shit.webp"),
  bullet:I("bullet.png"),
  bulletAlt:I("AMMO1.PNG"),
  speed:I("speed.png"),
  gun:I("gun.png")
};
player.img=IMG.player;

/* ====== CANVAS ====== */
function resize(){
  W=innerWidth; H=innerHeight; isMobile=W<600; r=devicePixelRatio||1;
  canvas.style.width=W+"px"; canvas.style.height=H+"px";
  canvas.width=Math.round(W*r); canvas.height=Math.round(H*r);
  ctx.setTransform(r,0,0,r,0,0);
  const s=Math.max(60,Math.min(W*(isMobile?0.26:0.22),H*0.24));
  player.w=player.h=s; player.x=(W-s)/2; player.y=H-s; // بچسبه به پایین
  item=Math.floor(s*0.55); bullet=Math.floor(s*0.22);
}
resize(); addEventListener("resize",resize);

/* ====== INPUT ====== */
function move(mx){ player.x=Math.max(0,Math.min(mx-player.w/2,W-player.w)); }
canvas.addEventListener("mousemove",e=>move(e.clientX-canvas.getBoundingClientRect().left));
canvas.addEventListener("touchmove",e=>move(e.touches[0].clientX-canvas.getBoundingClientRect().left),{passive:true});

let taps=0,lastTap=0;
canvas.addEventListener("touchstart",()=>{
  if(!started){started=true;return;}
  if(gameOver){reset();return;}
  shooting=true;
  const now=Date.now(); if(now-lastTap>1000) taps=0; lastTap=now; taps++;
  if(taps===3){ shootOnce(); taps=0; }
},{passive:true});
canvas.addEventListener("touchend",()=>shooting=false,{passive:true});

addEventListener("keydown",e=>{
  if(e.code==="Space"){
    if(!started) started=true;
    else if(gameOver) reset();
    else { shooting=true; shootOnce(); }
  }
});
addEventListener("keyup",e=>{ if(e.code==="Space") shooting=false; });

/* ====== GAME HELPERS ====== */
const R=x=>Math.random()*x;
const collide=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function addScore(p){ score+=p; if(score>highScore){highScore=score; localStorage.setItem("highScore",highScore);} }
function clamp(v,min,max){ return Math.max(min,Math.min(v,max)); }
function reset(){
  reds=[]; obstacles=[]; greens=[]; blues=[]; bullets=[]; buffs=[];
  score=0; ammo=0; pizzaProb=0.3; gameOver=false; hunger=0; pizzaCount=0;
  player.img=IMG.player; shooting=false;
}

/* ====== SPAWN (OPTIMIZED INTERVALS) ====== */
setInterval(()=>started&&Math.random()<pizzaProb&&reds.push({x:R(W-item),y:-item,w:item,h:item,img:IMG.red,s:2}),1000);
setInterval(()=>started&&obstacles.push({x:R(W-item*0.8),y:-item,w:item*0.8,h:item*0.8,img:IMG.shit,s:2.2}),1500); // shit کوچیک‌تر
setInterval(()=>started&&Math.random()<0.22&&greens.push({x:R(W-item),y:-item,w:item,h:item,img:IMG.green,s:1.8}),2200);
setInterval(()=>started&&Math.random()<0.22&&blues.push({x:R(W-item),y:-item,w:item,h:item,img:IMG.blue,s:1.6}),2500);

/* ====== SHOOTING ====== */
function shootOnce(){
  if(ammo>0){
    ammo--;
    bullets.push({x:player.x+player.w/2-bullet/2,y:player.y-6,w:bullet,h:bullet*2,img:IMG.bullet,s:14});
  }
}
let lastAuto=0;
function autoShoot(){
  const now=Date.now();
  if(now-lastAuto>90){
    bullets.push({x:player.x+player.w/2-bullet/2,y:player.y-6,w:bullet,h:bullet*2,img:IMG.bullet,s:16});
    lastAuto=now;
  }
}

/* ====== UPDATE ====== */
function update(){
  if(!started||gameOver) return;

  // سرعت کلی (ساده و سبک)
  gameSpeed=1+score/45;

  // شلیک نگه‌داشتن (فقط معمولی، بی‌نهایت نداریم مگر ammo>0)
  if(shooting) autoShoot();

  // حرکت پایین‌رو آیتم‌ها
  const fall=arr=>{
    for(let i=arr.length-1;i>=0;i--){
      const o=arr[i]; o.y+=o.s*gameSpeed; if(o.y>H) arr.splice(i,1);
    }
  };
  fall(reds); fall(obstacles); fall(greens); fall(blues);

  // گلوله‌ها به سمت بالا
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.y-=b.s; if(b.y+b.h<0) bullets.splice(i,1);
  }

  // برخورد پلیر با پیتزا: شمارش، هر 2 پیتزا = 1 تیر معمولی
  for(let i=reds.length-1;i>=0;i--){
    const r=reds[i];
    if(collide(player,r)){
      pizzaCount++; addScore(3);
      if(pizzaCount%2===0) ammo=clamp(ammo+1,0,99);
      reds.splice(i,1);
      if(pizzaCount>=3){ gameOver=true; } // سه پیتزا حد از دست دادنه
    }
  }

  // برخورد پلیر با قرص (drug): فقط شمارش و اثر روی hunger و پیتزا
  for(let i=greens.length-1;i>=0;i--){
    const g=greens[i];
    if(collide(player,g)){
      hunger=clamp(hunger-15,0,100); // قرص 15 تا کم
      pizzaCount=clamp(pizzaCount-1,0,3); // drug باید تعداد پیتزا رو کم کنه
      greens.splice(i,1);
    }
  }

  // برخورد پلیر با weed: فقط شمارش hunger
  for(let i=blues.length-1;i>=0;i--){
    const b=blues[i];
    if(collide(player,b)){
      hunger=clamp(hunger+10,0,100); // weed 10 تا اضافه
      blues.splice(i,1);
    }
  }

  // برخورد گلوله با مانع
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; let hit=false;
    for(let j=obstacles.length-1;j>=0;j--){
      const o=obstacles[j];
      if(collide(b,o)){ obstacles.splice(j,1); addScore(2); hit=true; break; }
    }
    if(hit) bullets.splice(i,1);
  }
}

/* ====== DRAW (CLEAN & FAST) ====== */
function draw(){
  ctx.clearRect(0,0,W,H);

  if(!started){
    ctx.fillStyle="#111"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="bold 26px Arial"; ctx.fillText("شروع: لمس یا Space", W/2, H/2-20);
    ctx.font="16px Arial"; ctx.fillText("سه پیتزا = باخت | هر 2 پیتزا = 1 تیر", W/2, H/2+20);
    ctx.fillText("رکورد: "+highScore, W/2, H/2+50);
    return;
  }

  // پلیر
  ctx.drawImage(player.img, player.x, player.y, player.w, player.h);

  // آبجکت‌ها
  const drawArr=a=>{ for(const o of a) ctx.drawImage(o.img,o.x,o.y,o.w,o.h); };
  drawArr(reds); drawArr(greens); drawArr(blues); drawArr(obstacles);

  // گلوله‌ها
  for(const b of bullets) ctx.drawImage(b.img,b.x,b.y,b.w,b.h);

  // HUD
  ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.fillRect(0,0,W,40);
  ctx.fillStyle="#fff"; ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.font="15px Arial";
  ctx.fillText("امتیاز: "+score,12,20);
  ctx.fillText("رکورد: "+highScore,110,20);
  ctx.fillText("مهمات: "+ammo,210,20);
  ctx.fillText("پیتزا: "+pizzaCount+"/3",300,20);
  ctx.fillText("درصد گشنگی: "+hunger+"%",390,20);

  if(gameOver){
    ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font="40px Arial"; ctx.fillText("Game Over!",W/2,H/2-20);
    ctx.font="20px Arial"; ctx.fillText("Tap یا Space برای Restart",W/2,H/2+20);
    ctx.fillText("High Score: "+highScore, W/2, H/2+60);
  }
}

/* ====== LOOP (rAF فقط) ====== */
(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
