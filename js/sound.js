/* Paisajes sonoros generados en tiempo real con Web Audio (sin archivos de audio) */
(function(){
DSV.gainFor = v => v*v*1.4;
DSV.Sound = (() => {
  let ctx, master, buf = {}, bus = null, timers = [], alive = false, sceneKey = null;
  function init(){
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate * 6;
    ['white','pink','brown'].forEach(t => {
      const b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c=0;c<2;c++){
        const d = b.getChannelData(c); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
        for (let i=0;i<len;i++){
          const wn = Math.random()*2-1;
          if (t==='white') d[i] = wn*.5;
          else if (t==='pink'){ b0=.99886*b0+wn*.0555179;b1=.99332*b1+wn*.0750759;b2=.969*b2+wn*.153852;b3=.8665*b3+wn*.3104856;b4=.55*b4+wn*.5329522;b5=-.7616*b5-wn*.016898; d[i]=(b0+b1+b2+b3+b4+b5+b6+wn*.5362)*.11; b6=wn*.115926; }
          else { last=(last+.02*wn)/1.02; d[i]=last*3.2; }
        }
        // fundido del bucle para evitar clics
        const f = 2048; for (let i=0;i<f;i++){ const k=i/f; d[len-f+i] = d[len-f+i]*(1-k) + d[i]*k; }
      }
      buf[t] = b;
    });
  }
  const T = () => ctx.currentTime;
  function src(type, out, {g=1, lp, hp, bp, q=.7}={}){
    const s = ctx.createBufferSource(); s.buffer = buf[type]; s.loop = true;
    let node = s;
    if (hp){ const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; node.connect(f); node=f; }
    if (lp){ const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=lp; node.connect(f); node=f; }
    if (bp){ const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=bp; f.Q.value=q; node.connect(f); node=f; }
    const gn = ctx.createGain(); gn.gain.value = g; node.connect(gn).connect(out);
    s.start(T(), Math.random()*5);
    return {s, gain:gn, filter: node!==s ? node : null};
  }
  function lfo(param, rate, depth){ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.value=rate; g.gain.value=depth; o.connect(g).connect(param); o.start(); return o; }
  function every(minMs, maxMs, fn){ const tick = () => { if(!alive) return; fn(); timers.push(setTimeout(tick, minMs + Math.random()*(maxMs-minMs))); }; timers.push(setTimeout(tick, Math.random()*maxMs)); }
  function burst(out, {type='white', f=3000, q=1, dur=.03, g=.3, type2='bandpass', pan=0}={}){
    const s = ctx.createBufferSource(); s.buffer = buf[type];
    const fl = ctx.createBiquadFilter(); fl.type=type2; fl.frequency.value=f; fl.Q.value=q;
    const gn = ctx.createGain(); const t=T();
    gn.gain.setValueAtTime(0,t); gn.gain.linearRampToValueAtTime(g,t+.002); gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
    let node = s.connect(fl).connect(gn);
    if (ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=pan; node.connect(p); node=p; }
    node.connect(out); s.start(t, Math.random()*5, dur+.05);
  }
  function rainBed(out, level=1){
    src('pink', out, {g:.55*level, hp:500, lp:7000});
    src('white', out, {g:.08*level, hp:3000, lp:11000});
    src('brown', out, {g:.25*level, lp:400});
    every(25, 160, () => burst(out, {f:2500+Math.random()*4500, q:2, dur:.015+Math.random()*.03, g:.05*level*Math.random(), pan:Math.random()*1.6-.8}));
  }
  const BUILD = {
    lluvia(out){ rainBed(out, 1); },
    chimenea(out){
      src('brown', out, {g:.55, lp:260});
      const hiss = src('pink', out, {g:.05, bp:1800, q:.6}); lfo(hiss.gain.gain, .13, .02);
      every(70, 420, () => burst(out, {f:1800+Math.random()*3500, q:1.2, dur:.01+Math.random()*.04, g:.08+Math.random()*.22, pan:Math.random()*.8-.4}));
      every(1800, 5200, () => { const n = 2+Math.floor(Math.random()*4); for(let i=0;i<n;i++) setTimeout(()=>alive&&burst(out,{f:1200+Math.random()*2000,q:.8,dur:.03+Math.random()*.05,g:.25+Math.random()*.25,pan:Math.random()*.6-.3}), i*(30+Math.random()*90)); });
    },
    bosque(out){
      const wind = src('pink', out, {g:.18, bp:450, q:.5}); lfo(wind.gain.gain, .07, .12); lfo(wind.filter.frequency, .05, 180);
      src('brown', out, {g:.12, lp:300});
      const cricket = (freq, pan) => every(900, 2600, () => {
        const reps = 2 + Math.floor(Math.random()*3);
        for (let i=0;i<reps;i++){
          const o=ctx.createOscillator(), g=ctx.createGain(), t=T()+i*.11; o.frequency.value=freq+Math.random()*60;
          g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.012,t+.01); g.gain.linearRampToValueAtTime(0,t+.06);
          let n=o.connect(g); if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;n.connect(p);n=p;} n.connect(out); o.start(t); o.stop(t+.08);
        }
      });
      cricket(4300, -.6); cricket(4700, .5);
    },
    oceano(out){
      const swell = src('brown', out, {g:.5, lp:520});
      lfo(swell.gain.gain, 1/9, .38);
      const foam = src('pink', out, {g:.12, hp:900, lp:5000});
      lfo(foam.gain.gain, 1/9, .11);
      lfo(swell.filter.frequency, 1/9, 260);
    },
    brisa(out){
      const a = src('pink', out, {g:.3, bp:600, q:.45}); lfo(a.filter.frequency, .045, 320); lfo(a.gain.gain, .06, .18);
      const b = src('brown', out, {g:.2, lp:500}); lfo(b.gain.gain, .035, .12);
    },
    ruido(out){
      src('brown', out, {g:.45, lp:900});
      src('pink', out, {g:.16, lp:2600});
      const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.frequency.value = 96; hg.gain.value = .006; hum.connect(hg).connect(out); hum.start();
    },
    tormenta(out){
      rainBed(out, .85);
      every(16000, 34000, () => {
        DSV.FX.lightning(.5 + Math.random()*.5);
        const delay = 1400 + Math.random()*2600;
        setTimeout(() => {
          if (!alive) return;
          const s = ctx.createBufferSource(); s.buffer = buf.brown;
          const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value = 140 + Math.random()*80;
          const g = ctx.createGain(); const t=T(), d=4.5+Math.random()*3;
          g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.5,t+.9); g.gain.setTargetAtTime(.25,t+1.2,.6); g.gain.exponentialRampToValueAtTime(.0001,t+d);
          s.connect(f).connect(g).connect(out); s.start(t, Math.random()*3, d+.2);
        }, delay);
      });
    },
    cafe(out){
      rainBed(out, .55);
      [320, 620, 1050].forEach((fq, i) => {
        const v = src('pink', out, {g:.03, bp:fq, q:1.4});
        every(400, 1400, () => v.gain.gain.setTargetAtTime(.012 + Math.random()*.05, T(), .25));
      });
      every(7000, 19000, () => {
        const t=T(); [2650, 3970, 5210].forEach((fq,i)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.value=fq*(1+Math.random()*.01); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.012/(i+1),t+.003); g.gain.exponentialRampToValueAtTime(.0001,t+.7); o.connect(g).connect(out); o.start(t); o.stop(t+.8); });
      });
    },
    tren(out){
      src('brown', out, {g:.6, lp:220});
      const r = src('pink', out, {g:.06, bp:700, q:.6}); lfo(r.gain.gain, .5, .02);
      const clack = (at, g) => {
        const s=ctx.createBufferSource(); s.buffer=buf.brown; const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900; const gn=ctx.createGain();
        gn.gain.setValueAtTime(0,at); gn.gain.linearRampToValueAtTime(g,at+.004); gn.gain.exponentialRampToValueAtTime(.0001,at+.12);
        s.connect(f).connect(gn).connect(out); s.start(at, Math.random()*4, .2);
        const o=ctx.createOscillator(), og=ctx.createGain(); o.frequency.value=62; og.gain.setValueAtTime(0,at); og.gain.linearRampToValueAtTime(g*.5,at+.006); og.gain.exponentialRampToValueAtTime(.0001,at+.16); o.connect(og).connect(out); o.start(at); o.stop(at+.2);
      };
      const period = 1.72;
      let next = T() + .3;
      const sched = () => { if(!alive) return; while (next < T() + 2){ const g=.35+Math.random()*.1; clack(next, g); clack(next+.13, g*.8); clack(next+.86, g*.9); clack(next+.99, g*.7); next += period*(1+ (Math.random()-.5)*.01); } timers.push(setTimeout(sched, 500)); };
      sched();
    }
  };
  function start(key, vol){
    init();
    const old = bus; alive = true;
    if (old){ old.gain.setTargetAtTime(0, T(), .6); const oldTimers = timers; timers = []; setTimeout(()=>{ oldTimers.forEach(clearTimeout); try{old.disconnect();}catch(e){} }, 3500); }
    bus = ctx.createGain(); bus.gain.value = 0; bus.connect(master);
    BUILD[key](bus);
    bus.gain.setTargetAtTime(1, T(), .9);
    master.gain.cancelScheduledValues(T());
    master.gain.setTargetAtTime(DSV.gainFor(vol == null ? .6 : vol), T(), .6);
    sceneKey = key;
  }
  function stop(fade=1.2){
    if (!ctx || !bus) return;
    master.gain.cancelScheduledValues(T()); master.gain.setTargetAtTime(0, T(), fade/3);
    const b = bus, tm = timers; bus = null; timers = [];
    setTimeout(()=>{ tm.forEach(clearTimeout); alive = !!bus; try{b.disconnect();}catch(e){} }, fade*1000+600);
    sceneKey = null;
  }
  function volume(v){ if (ctx && bus){ master.gain.cancelScheduledValues(T()); master.gain.setTargetAtTime(DSV.gainFor(v), T(), .15); } }
  function fadeOut(sec){ if (!ctx || !bus) return; master.gain.cancelScheduledValues(T()); master.gain.setValueAtTime(master.gain.value, T()); master.gain.linearRampToValueAtTime(0, T()+sec); }
  return { start, stop, volume, fadeOut, get key(){ return sceneKey; }, get supported(){ return !!(window.AudioContext || window.webkitAudioContext); } };
})();

})();
