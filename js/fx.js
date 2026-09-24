/* Efectos atmosféricos: lluvia sobre cristal, brillo de fuego, relámpago lejano */
(function(){
const $ = s => document.querySelector(s);
/* ---- efectos: lluvia en cristal, brillo de fuego, relámpago lejano ---- */
DSV.FX = (() => {
  const cv = $('#rain'); let ctx = cv.getContext('2d');
  let drops = [], beads = [], beadCv = document.createElement('canvas'), raf = 0, active = new Set(), w=0, h=0, dpr=1, fireRaf=0, restMode=false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){ dpr = Math.min(devicePixelRatio||1, 2); w = innerWidth; h = innerHeight; cv.width = w*dpr; cv.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); seed(); }
  function seed(){
    const area = w*h/10000;
    beads = Array.from({length:Math.round(area*1.6)}, () => ({x:Math.random()*w, y:Math.random()*h, r:Math.random()*1.6+.4, a:Math.random()*.5+.15}));
    beadCv.width = w*dpr; beadCv.height = h*dpr; const bc = beadCv.getContext('2d'); bc.setTransform(dpr,0,0,dpr,0,0);
    const main = ctx; ctx = bc; for (const b of beads) bead(b.x,b.y,b.r,b.a*.55); ctx = main;
    drops = Array.from({length:Math.max(6, Math.round(area*.09))}, newDrop);
  }
  function newDrop(){ return {x:Math.random()*w, y:-20-Math.random()*h*.6, r:Math.random()*2.2+1.6, v:0, wait:Math.random()*240, wob:Math.random()*10, trail:[]}; }
  function bead(x,y,r,a){
    const g = ctx.createRadialGradient(x - r*.35, y - r*.4, 0, x, y, r*1.25);
    g.addColorStop(0, `rgba(255,250,240,${a})`);
    g.addColorStop(.45, `rgba(200,210,225,${a*.35})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r*1.25,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(0,0,0,${a*.35})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(x+.3,y+.5,r,0.2*Math.PI,.9*Math.PI); ctx.stroke();
  }
  function frame(){
    ctx.clearRect(0,0,w,h);
    ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(beadCv,0,0); ctx.setTransform(dpr,0,0,dpr,0,0);
    for (const d of drops){
      if (d.wait > 0){ d.wait--; continue; }
      // gotas que se detienen y siguen, como en un vidrio real
      d.v += (Math.random() < .02 ? -d.v*.9 : .012*d.r);
      d.v = Math.min(d.v, 2.2);
      d.y += d.v; d.wob += .05; d.x += Math.sin(d.wob)*.12;
      d.trail.push({x:d.x, y:d.y}); if (d.trail.length > 70) d.trail.shift();
      ctx.strokeStyle = 'rgba(220,228,240,.07)'; ctx.lineWidth = d.r*.7; ctx.lineCap='round';
      ctx.beginPath(); d.trail.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke();
      bead(d.x, d.y, d.r, .5);
      if (d.y > h + 20) Object.assign(d, newDrop(), {y:-10});
    }
    raf = requestAnimationFrame(frame);
  }
  function fire(){
    const el = $('#fireglow'); let t = 0, v = .8;
    (function loop(){
      t += 1; v += (Math.random()-.5)*.08; v = Math.min(1, Math.max(.55, v + (.8-v)*.05));
      el.style.opacity = active.has('fire') ? (restMode? v*.25 : v) : 0;
      fireRaf = active.has('fire') ? setTimeout(loop, 90) : 0;
    })();
  }
  function lightning(strength=1){
    if (!active.has('lightning') || reduce) return;
    const f = $('#flash');
    f.animate([{opacity:0},{opacity:.55*strength,offset:.08},{opacity:.1,offset:.2},{opacity:.35*strength,offset:.3},{opacity:0}], {duration:1800, easing:'ease-out'});
  }
  addEventListener('resize', ()=>{ if (raf) resize(); });
  return {
    set(list, rest){
      restMode = rest;
      active = new Set(list);
      const wantRain = active.has('rain') && !reduce;
      cv.style.opacity = wantRain ? (rest ? .15 : .9) : 0;
      if (wantRain && !raf){ resize(); frame(); }
      if (!wantRain && raf){ setTimeout(()=>{ if(!active.has('rain')){ cancelAnimationFrame(raf); raf=0; ctx.clearRect(0,0,w,h);} }, 3200); }
      if (active.has('fire') && !fireRaf) fire();
      if (!active.has('fire')) $('#fireglow').style.opacity = 0;
    },
    lightning
  };
})();

})();
