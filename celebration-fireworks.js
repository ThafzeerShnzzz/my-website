
(function(){
 if(document.getElementById('okpFireworks'))return;
 const canvas=document.createElement('canvas');canvas.id='okpFireworks';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;opacity:.6';
 document.body.appendChild(canvas);const ctx=canvas.getContext('2d');if(!ctx)return;
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let w=0,h=0,particles=[],rockets=[],last=0,next=0,raf=0;
 const colors=['#f5d795','#e7b95d','#ffe9ba','#d49a66'];
 function resize(){w=window.innerWidth;h=window.innerHeight;const d=Math.min(window.devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0)}
 function burst(x,y,c){const count=w<600?60:90;for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=55+Math.random()*105;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1.5+Math.random()*.7,c})}}
 function frame(t){
  if(document.hidden||motion.matches){raf=0;return}
  const dt=Math.min((t-last)/1000||.016,.035);last=t;ctx.clearRect(0,0,w,h);
  if(t>next){const left=Math.random()<.5,x=w*(left?.06+Math.random()*.17:.77+Math.random()*.17);rockets.push({x,y:h,target:60+Math.random()*h*.4,c:colors[Math.floor(Math.random()*colors.length)]});next=t+450+Math.random()*350}
  for(let i=rockets.length-1;i>=0;i--){const r=rockets[i];r.y-=290*dt;ctx.globalAlpha=.65;ctx.strokeStyle=r.c;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(r.x,r.y+25);ctx.lineTo(r.x,r.y);ctx.stroke();if(r.y<=r.target){burst(r.x,r.y,r.c);rockets.splice(i,1)}}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i],px=p.x,py=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.985,dt*60);p.vy+=23*dt;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life/2.2)*.8;ctx.strokeStyle=p.c;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px-p.vx*.045,py-p.vy*.045);ctx.lineTo(p.x,p.y);ctx.stroke();if(p.life<=0)particles.splice(i,1)}
  ctx.globalAlpha=1;raf=requestAnimationFrame(frame);
 }
 function sync(){if(raf)cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,w,h);if(!document.hidden&&!motion.matches){last=performance.now();next=last;raf=requestAnimationFrame(frame)}}
 resize();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);sync();
})();
