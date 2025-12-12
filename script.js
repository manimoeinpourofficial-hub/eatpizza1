const c=document.getElementById("gameCanvas"),x=c.getContext("2d");
let W=innerWidth,H=innerHeight,p={x:0,y:0,w:0,h:0,scale:1},reds=[],obs=[],greens=[],blues=[],bullets=[],buffs=[],particles=[];
let score=0,ammo=0,go=false,start=false,prob=0.3,item=40,bs=20,hs=+localStorage.getItem("hs")||0;
let hunger=0,miss=0,gun=false,gunUntil=0,shooting=false,lastShot=0,pizzaCount=0,speedBoostUntil=0;

// سرعت کلی بازی که کم‌کم زیاد می‌شود
let gameSpeed = 1;

// Combo system
let combo=0,lastPizzaTime=0,comboMultiplier=1,comboText="",comboTextUntil=0;

// screen shake
let shake = 0;

// صداها
const makeAudio=src=>{let a=new Audio(src);a.preload="auto";return a;};
const sounds={
  pizza:[makeAudio("2.mp3"),makeAudio("3.mp3"),makeAudio("5.mp3")],
  drug:makeAudio("1.mp3"),
  weed:makeAudio("weed.mp3"),
  shit:makeAudio("4.mp3"),
  explode:makeAudio("gooz1.mp3"),
  gameOver:makeAudio("gameover.mp3")
};
const bg=makeAudio("background.mp3"); bg.loop=true; bg.volume=0.3;

// سیستم صف صدا + جلوگیری از هم‌زمانی
let queue=[],playing=false,cool={};
function playSound(n){
  if(!start) return;
  if(playing) return;           // اگر در حال پخش است، جدید قبول نکن
  const now=Date.now();
  if(now-(cool[n]||0)<500) return;
  cool[n]=now;
  let s=sounds[n]; if(!s) return;
  let a=(Array.isArray(s)?s[Math.random()*s.length|0]:s).cloneNode();
  queue.push(a); process();
}
function process(){
  if(playing||!queue.length) return;
  const a=queue.shift(); playing=true;
  a.currentTime=0;
  a.play().catch(()=>playing=false);
  a.onended=()=>{playing=false;process();};
}

function R(){
  const r=devicePixelRatio||1;
  W=innerWidth;H=innerHeight;
  c.width=W*r;c.height=H*r;
  x.setTransform(r,0,0,r,0,0);
  let s=Math.max(60,Math.min(W*0.25,H*0.25));
  p.w=p.h=s;p.x=(W-s)/2;p.y=H-s;item=s*0.6;bs=s*0.25;
}
R();addEventListener("resize",R);

const I=s=>{let i=new Image();i.src=s;return i},img={
 p:I("PIZZA-KHOOR.png"),
 pg:I("pizzakhoor.png"),
 r:I("pizza1.png"),
 g:I("DRUG.png"),
 b:I("weed.webp"),
 o:I("shit.webp"),
 bu:I("bullet.png"),
 bi:I("AMMO1.PNG"),
 s:I("speed.png"),
 gun:I("gun.png")
};

// تضمین اینکه هر دو اسکین پلیر با ابعاد p.w,p.h کشیده شوند
img.p.onload = ()=>{};
img.pg.onload = ()=>{};

function move(mx){p.x=Math.max(0,Math.min(mx-p.w/2,W-p.w));}
c.addEventListener("mousemove",e=>move(e.clientX-c.getBoundingClientRect().left));
c.addEventListener("touchmove",e=>move(e.touches[0].clientX-c.getBoundingClientRect().left),{passive:true});

let tc=0,lt=0;
c.addEventListener("touchstart",()=>{
 if(!start){start=true;bg.play();return;}
 if(go){reset();return;}
 const n=Date.now();if(n-lt>1000)tc=0;lt=n;tc++;
 if(gun)shooting=true;else if(tc===3){shoot();tc=0;}
},{passive:true});
c.addEventListener("touchend",()=>shooting=false,{passive:true});

addEventListener("keydown",e=>{
 if(e.code==="Space"){
   if(!start){start=true;bg.play();}
   else if(go)reset();
   else {if(gun)shooting=true;else shoot();}
 }});
addEventListener("keyup",e=>{if(e.code==="Space")shooting=false;});

function shoot(){
 if(ammo>0){
   ammo--;
   bullets.push({x:p.x+p.w/2-bs/2,y:p.y-6,w:bs,h:bs*2,s:12,img:img.bu});
 }
}
function auto(){
 const n=Date.now();
 if(n-lastShot>90){
   bullets.push({x:p.x+p.w/2-bs/2,y:p.y-6,w:bs,h:bs*2,s:14,img:img.bi});
   lastShot=n;
 }
}
const coll=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

// پارتیکل ساده
function spawnParticles(x0,y0,color,count=6){
  for(let i=0;i<count;i++){
    particles.push({
      x:x0,y:y0,
      vx:(Math.random()-0.5)*3,
      vy:(Math.random()-0.5)*3-1,
      life:400,
      color
    });
  }
}

function reset(){
 reds=[];obs=[];greens=[];blues=[];bullets=[];buffs=[];particles=[];
 score=ammo=0;prob=0.3;go=false;hunger=miss=0;gun=false;shooting=false;pizzaCount=0;
 gameSpeed=1;
 combo=0;comboMultiplier=1;comboText="";comboTextUntil=0;
}

setInterval(()=>start&&Math.random()<prob&&reds.push({x:Math.random()*(W-item),y:-item,w:item,h:item,rot:0}),1500);
setInterval(()=>start&&obs.push({x:Math.random()*(W-item*0.8),y:-item,w:item*0.8,h:item*0.8}),3000);
setInterval(()=>start&&Math.random()<0.2&&greens.push({x:Math.random()*(W-item),y:-item,w:item,h:item}),5000);
setInterval(()=>start&&Math.random()<0.2&&blues.push({x:Math.random()*(W-item),y:-item,w:item,h:item}),7000);
setInterval(()=>start&&Math.random()<0.15&&buffs.push({x:Math.random()*(W-item),y:-item,w:item,h:item,t:"s"}),8000);
setInterval(()=>start&&Math.random()<0.12&&buffs.push({x:Math.random()*(W-item),y:-item,w:item,h:item,t:"g"}),9000);

// سخت شدن تدریجی بازی
setInterval(()=>{ if(start && !go) gameSpeed += 0.02; }, 2000);

function handleComboPizzaTake(){
 const now = Date.now();
 if(now - lastPizzaTime < 2000){      // اگر کمتر از ۲ ثانیه بین دو پیتزا باشد، کمبو ادامه دارد
   combo++;
 }else{
   combo=1;
 }
 lastPizzaTime = now;

 // تعیین ضریب امتیاز بر اساس کمبو
 if(combo>=10){ comboMultiplier=3; comboText="MEGA COMBO x3!"; }
 else if(combo>=6){ comboMultiplier=2; comboText="BIG COMBO x2!"; }
 else if(combo>=3){ comboMultiplier=1.5; comboText="COMBO x1.5"; }
 else { comboMultiplier=1; comboText=""; }

 if(comboText) comboTextUntil = now + 1500;
}

function breakCombo(){
 combo=0;comboMultiplier=1;comboText="";comboTextUntil=0;
}

function updParticles(dt){
 for(let i=particles.length-1;i>=0;i--){
   const p0=particles[i];
   p0.x+=p0.vx;
   p0.y+=p0.vy;
   p0.life-=dt;
   p0.vy+=0.05; // کمی گرانش
   if(p0.life<=0)particles.splice(i,1);
 }
}

function upd(){
 if(!start||go)return;

 const now=Date.now();
 let sp = gameSpeed;
 if(now < speedBoostUntil) sp *= 1.8;

 const dt=16; // تقریبی برای پارتیکل‌ها

 // پیتزاهای قرمز
 reds.forEach((r,i)=>{
   r.y+=2*sp;
   r.rot = (r.rot||0) + 0.05*sp; // چرخش پیتزا
   if(coll(p,r)){
     handleComboPizzaTake();
     let gained = 5 * comboMultiplier;
     score+=Math.round(gained);
     if(score>hs){hs=score;localStorage.setItem("hs",hs);}
     pizzaCount++;if(pizzaCount%2===0)ammo++;
     spawnParticles(r.x+r.w/2,r.y+r.h/2,"orange",10);
     p.scale=1.2;setTimeout(()=>p.scale=1,150); // انیمیشن بپر–بخور
     reds.splice(i,1);
     playSound("pizza");
   }else if(r.y>H){
     reds.splice(i,1);
     miss++;
     breakCombo(); // کمبو می‌شکند وقتی پیتزا از دست می‌رود
     if(miss>=3){go=true;playSound("gameOver");shake = 20;}
   }
 });

 // موانع
 obs.forEach((o,i)=>{
   o.y+=2.2*sp;
   if(coll(p,o)){
     go=true;playSound("shit");
     spawnParticles(p.x+p.w/2,p.y+p.h/2,"red",15);
     shake = 20;
   }else if(o.y>H)obs.splice(i,1);
 });

 // سبزها (drug)
 greens.forEach((g,i)=>{
   g.y+=1.8*sp;
   if(coll(p,g)){
     hunger=Math.max(0,hunger-15);
     prob=Math.max(0,prob*0.85);
     greens.splice(i,1);
     spawnParticles(g.x+g.w/2,g.y+g.h/2,"#00ff99",8);
     playSound("drug");
   }
 });

 // آبی‌ها (weed)
 blues.forEach((b,i)=>{
   b.y+=1.6*sp;
   if(coll(p,b)){
     hunger=Math.min(100,hunger+10);
     prob=Math.min(1,prob*1.1);
     blues.splice(i,1);
     spawnParticles(b.x+b.w/2,b.y+b.h/2,"#00ccff",8);
     playSound("weed");
   }
 });

 // باف‌ها
 buffs.forEach((bf,i)=>{
   bf.y+=2*sp;
   if(coll(p,bf)){
     if(bf.t==="s"){
       speedBoostUntil=now+10000;
       if(miss>0)miss--;
       spawnParticles(bf.x+bf.w/2,bf.y+bf.h/2,"yellow",10);
     }
     if(bf.t==="g"){
       gun=true;gunUntil=now+10000;
       spawnParticles(bf.x+bf.w/2,bf.y+bf.h/2,"#ffff00",10);
     }
     buffs.splice(i,1);
   }else if(bf.y>H)buffs.splice(i,1);
 });

 // گلوله‌ها
 bullets.forEach((b,i)=>{
   b.y-=b.s;
   if(b.y+b.h<0){bullets.splice(i,1);return;}
   obs.forEach((o,j)=>{
     if(coll(b,o)){
       obs.splice(j,1);
       score+=3;
       bullets.splice(i,1);
       spawnParticles(o.x+o.w/2,o.y+o.h/2,"#ff6600",12);
       playSound("explode");
       shake = 10;
     }
   });
 });

 // زمان گان و شلیک خودکار
 if(gun){
   if(now>gunUntil) gun=false;
   else if(shooting) auto();
 }

 // پارتیکل‌ها
 updParticles(dt);

 // اگر خیلی زمان از آخرین پیتزا گذشته، کمبو رو بشکن
 if(combo>0 && now-lastPizzaTime>2500) breakCombo();
}

function draw(){
 x.save();
 x.clearRect(0,0,W,H);

 // screen shake
 if(shake>0){
   x.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
   shake *= 0.9;
   if(shake<0.5)shake=0;
 }

 if(!start){
   x.fillStyle="#222";x.fillRect(0,0,W,H);
   x.fillStyle="#fff";x.textAlign="center";x.textBaseline="middle";x.font="26px Arial";
   x.fillText("Eat Pizza - Anfo Arcade",W/2,H/2-50);
   x.fillText("Start: Tap or Space",W/2,H/2-10);
   x.fillText("Missed pizzas: lose",W/2,H/2+20);
   x.fillText("High:"+hs,W/2,H/2+50);
   x.restore();
   return;
 }

 // پلیر با انیمیشن scale
 x.save();
 x.translate(p.x+p.w/2,p.y+p.h/2);
 x.scale(p.scale||1,p.scale||1);
 x.drawImage(gun?img.pg:img.p,-p.w/2,-p.h/2,p.w,p.h);
 x.restore();

 // پیتزاهای چرخان
 reds.forEach(r=>{
   x.save();
   x.translate(r.x+r.w/2,r.y+r.h/2);
   x.rotate(r.rot||0);
   x.drawImage(img.r,-r.w/2,-r.h/2,r.w,r.h);
   x.restore();
 });

 greens.forEach(g=>x.drawImage(img.g,g.x,g.y,g.w,g.h));
 blues.forEach(b=>x.drawImage(img.b,b.x,b.y,b.w,b.h));
 obs.forEach(o=>x.drawImage(img.o,o.x,o.y,o.w,o.h));
 buffs.forEach(bf=>x.drawImage(bf.t==="s"?img.s:img.gun,bf.x,bf.y,bf.w,bf.h));
 bullets.forEach(b=>{
   // خود گلوله
   x.drawImage(b.img,b.x,b.y,b.w,b.h);
   // trail کوچیک
   x.fillStyle="rgba(255,255,0,0.4)";
   x.fillRect(b.x+b.w/4,b.y+b.h,b.w/2,15);
 });

 // پارتیکل‌ها
 particles.forEach(p0=>{
   x.fillStyle=p0.color;
   x.globalAlpha = Math.max(0,p0.life/400);
   x.beginPath();
   x.arc(p0.x,p0.y,4,0,Math.PI*2);
   x.fill();
   x.globalAlpha=1;
 });

 // UI بالا
 x.fillStyle="rgba(0,0,0,0.5)";
 x.fillRect(0,0,W,40);
 x.fillStyle="#fff";
 x.textAlign="left";
 x.textBaseline="middle";
 x.font="15px Arial";
 x.fillText("Score:"+score,12,20);
 x.fillText("High:"+hs,100,20);
 x.fillText("Ammo:"+(gun?"∞":ammo),200,20);
 x.fillText("Hunger:"+hunger+"%",300,20);
 x.fillText("Missed:"+miss+"/3",420,20);
 x.fillText("Speed:"+gameSpeed.toFixed(1),520,20);

 // Combo text
 if(comboText && Date.now()<comboTextUntil){
   x.textAlign="center";
   x.font="24px Arial";
   x.fillStyle="#ffdd33";
   x.fillText(comboText,W/2,70);
 }

 if(go){
   x.fillStyle="rgba(0,0,0,0.6)";
   x.fillRect(0,0,W,H);
   x.fillStyle="#fff";
   x.textAlign="center";
   x.textBaseline="middle";
   x.font="40px Arial";
   x.fillText("Game Over",W/2,H/2-20);
   x.font="20px Arial";
   x.fillText("Tap/Space Restart",W/2,H/2+20);
   x.fillText("High:"+hs,W/2,H/2+60);
 }

 x.restore();
}

(function loop(){upd();draw();requestAnimationFrame(loop)})();
