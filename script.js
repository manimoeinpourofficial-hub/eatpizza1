const c=document.getElementById("gameCanvas"),x=c.getContext("2d");
let W=innerWidth,H=innerHeight,p={x:0,y:0,w:0,h:0},reds=[],obs=[],greens=[],blues=[],bullets=[],buffs=[];
let score=0,ammo=0,go=false,start=false,prob=0.3,item=40,bs=20,hs=+localStorage.getItem("hs")||0;
let hunger=0,miss=0,gun=false,gunUntil=0,shooting=false,lastShot=0,pizzaCount=0,speedBoostUntil=0;

function R(){const r=devicePixelRatio||1;W=innerWidth;H=innerHeight;c.width=W*r;c.height=H*r;x.setTransform(r,0,0,r,0,0);
 let s=Math.max(60,Math.min(W*0.25,H*0.25));p.w=p.h=s;p.x=(W-s)/2;p.y=H-s;item=s*0.6;bs=s*0.25;}
R();addEventListener("resize",R);

const I=s=>{let i=new Image();i.src=s;return i},img={
 p:I("PIZZA-KHOOR.png"),pg:I("pizzakhoor.png"),r:I("pizza1.png"),
 g:I("DRUG.png"),b:I("weed.webp"),o:I("shit.webp"),
 bu:I("bullet.png"),bi:I("AMMO1.PNG"),
 s:I("speed.png"),gun:I("gun.png")
};

function move(mx){p.x=Math.max(0,Math.min(mx-p.w/2,W-p.w));}
c.addEventListener("mousemove",e=>move(e.clientX-c.getBoundingClientRect().left));
c.addEventListener("touchmove",e=>move(e.touches[0].clientX-c.getBoundingClientRect().left),{passive:true});

let tc=0,lt=0;
c.addEventListener("touchstart",()=>{
 if(!start){start=true;return;}
 if(go){reset();return;}
 const n=Date.now();if(n-lt>1000)tc=0;lt=n;tc++;
 if(gun)shooting=true;else if(tc===3){shoot();tc=0;}
},{passive:true});
c.addEventListener("touchend",()=>shooting=false,{passive:true});

addEventListener("keydown",e=>{
 if(e.code==="Space"){
   if(!start)start=true;
   else if(go)reset();
   else {if(gun)shooting=true;else shoot();}
 }});
addEventListener("keyup",e=>{if(e.code==="Space")shooting=false;});

function shoot(){if(ammo>0){ammo--;bullets.push({x:p.x+p.w/2-bs/2,y:p.y-6,w:bs,h:bs*2,s:12,img:img.bu});}}
function auto(){const n=Date.now();if(n-lastShot>90){bullets.push({x:p.x+p.w/2-bs/2,y:p.y-6,w:bs,h:bs*2,s:14,img:img.bi});lastShot=n;}}
const coll=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

function reset(){reds=[];obs=[];greens=[];blues=[];bullets=[];buffs=[];
 score=ammo=0;prob=0.3;go=false;hunger=miss=0;gun=false;shooting=false;pizzaCount=0;}

setInterval(()=>start&&Math.random()<prob&&reds.push({x:Math.random()*(W-item),y:-item,w:item,h:item}),1500);
setInterval(()=>start&&obs.push({x:Math.random()*(W-item*0.8),y:-item,w:item*0.8,h:item*0.8}),3000);
setInterval(()=>start&&Math.random()<0.2&&greens.push({x:Math.random()*(W-item),y:-item,w:item,h:item}),5000);
setInterval(()=>start&&Math.random()<0.2&&blues.push({x:Math.random()*(W-item),y:-item,w:item,h:item}),7000);
setInterval(()=>start&&Math.random()<0.15&&buffs.push({x:Math.random()*(W-item),y:-item,w:item,h:item,t:"s"}),8000);
setInterval(()=>start&&Math.random()<0.12&&buffs.push({x:Math.random()*(W-item),y:-item,w:item,h:item,t:"g"}),9000);

function upd(){
 if(!start||go)return;
 let sp=1;if(Date.now()<speedBoostUntil)sp=1.8;

 reds.forEach((r,i)=>{
   r.y+=2*sp;
   if(coll(p,r)){
     score+=5;if(score>hs){hs=score;localStorage.setItem("hs",hs);}
     pizzaCount++;if(pizzaCount%2===0)ammo++;
     reds.splice(i,1);
   }else if(r.y>H){
     reds.splice(i,1);miss++;if(miss>=3)go=true;
   }
 });

 obs.forEach((o,i)=>{o.y+=2.2*sp;if(coll(p,o)){go=true;}else if(o.y>H)obs.splice(i,1);});

 greens.forEach((g,i)=>{
   g.y+=1.8*sp;
   if(coll(p,g)){hunger=Math.max(0,hunger-15);prob=Math.max(0,prob*0.85);greens.splice(i,1);}
 });

 blues.forEach((b,i)=>{
   b.y+=1.6*sp;
   if(coll(p,b)){hunger=Math.min(100,hunger+10);prob=Math.min(1,prob*1.1);blues.splice(i,1);}
 });

 buffs.forEach((bf,i)=>{
   bf.y+=2*sp;
   if(coll(p,bf)){
     if(bf.t==="s"){speedBoostUntil=Date.now()+10000;if(miss>0)miss--;}
     if(bf.t==="g"){gun=true;gunUntil=Date.now()+10000;}
     buffs.splice(i,1);
   }else if(bf.y>H)buffs.splice(i,1);
 });

 bullets.forEach((b,i)=>{
   b.y-=b.s;if(b.y+b.h<0)bullets.splice(i,1);
   obs.forEach((o,j)=>{if(coll(b,o)){obs.splice(j,1);score+=3;bullets.splice(i,1);}});
 });

 if(gun){if(Date.now()>gunUntil)gun=false;else if(shooting)auto();}
}

function draw(){
 x.clearRect(0,0,W,H);
 if(!start){
   x.fillStyle="#222";x.fillRect(0,0,W,H);
   x.fillStyle="#fff";x.textAlign="center";x.textBaseline="middle";x.font="26px Arial";
   x.fillText("Start: Tap or Space",W/2,H/2-20);
   x.fillText("Missed pizzas: lose",W/2,H/2+20);
   x.fillText("High:"+hs,W/2,H/2+50);
   return;
 }
 x.drawImage(gun?img.pg:img.p,p.x,p.y,p.w,p.h);
 reds.forEach(r=>x.drawImage(img.r,r.x,r.y,r.w,r.h));
 greens.forEach(g=>x.drawImage(img.g,g.x,g.y,g.w,g.h));
 blues.forEach(b=>x.drawImage(img.b,b.x,b.y,b.w,b.h));
 obs.forEach(o=>x.drawImage(img.o,o.x,o.y,o.w,o.h));
 buffs.forEach(bf=>x.drawImage(bf.t==="s"?img.s:img.gun,bf.x,bf.y,bf.w,bf.h));
 bullets.forEach(b=>x.drawImage(b.img,b.x,b.y,b.w,b.h));
 x.fillStyle="rgba(0,0,0,0.5)";x.fillRect(0,0,W,40);
 x.fillStyle="#fff";x.textAlign="left";x.textBaseline="middle";x.font="15px Arial";
 x.fillText("Score:"+score,12,20);
 x.fillText("High:"+hs,100,20);
 x.fillText("Ammo:"+(gun?"∞":ammo),200,20);
 x.fillText("Hunger:"+hunger+"%",300,20);
 x.fillText("Missed:"+miss+"/3",420,20);
 if(go){
   x.fillStyle="rgba(0,0,0,0.6)";x.fillRect(0,0,W,H);
   x.fillStyle="#fff";x.textAlign="center";x.textBaseline="
   x.fillStyle="#fff";
   x.textAlign="center";
   x.textBaseline="middle";
   x.font="40px Arial";
   x.fillText("Game Over",W/2,H/2-20);
   x.font="20px Arial";
   x.fillText("Tap/Space Restart",W/2,H/2+20);
   x.fillText("High:"+hs,W/2,H/2+60);
 }
}
(function loop(){upd();draw();requestAnimationFrame(loop)})();
