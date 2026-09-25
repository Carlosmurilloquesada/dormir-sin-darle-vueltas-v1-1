/* =========================================================
   Dormir Sin Darle Vueltas a Todo — aplicación
   ========================================================= */
(async function () {
  const { repo, SCENES, SCENE_ORDER, ATMOS, RITUAL, FEEL, NOISE_LBL, READINGS, BREATH, AFTER, SLEEP, WAKES, ICON, svg, FX, Sound } = DSV;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = () => new Date().toISOString();
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- Fechas: una "noche" va de las 06:00 a las 05:59 del día siguiente ---------- */
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseYmd = id => { const [y, m, d] = id.split('-').map(Number); return new Date(y, m - 1, d); };
  function nightKey(d = new Date()) { const x = new Date(d); if (x.getHours() < DSV.config.nightRolloverHour) x.setDate(x.getDate() - 1); return ymd(x); }
  function shiftDay(id, n) { const d = parseYmd(id); d.setDate(d.getDate() + n); return ymd(d); }
  const longDate = id => parseYmd(id).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  /* =========================================================
     Estado (en memoria, reflejo de lo persistido)
     ========================================================= */
  const S = {
    name: '', prefs: { scene: 'lluvia', sceneChosen: false, volume: .6, timerMin: 30, fontSize: 20 },
    night: null, tonightThoughts: [], resume: null,
    solo: false, playing: false, timerEnd: 0, history: [], draft: ''
  };
  let current = null;

  await repo.ready;
  {
    const [profile, prefs, session] = await Promise.all([repo.getProfile(), repo.getPrefs(), repo.getSession()]);
    S.name = profile.name || '';
    Object.assign(S.prefs, prefs);
    if (!SCENES[S.prefs.scene]) S.prefs.scene = 'lluvia';
    S.draft = (session && session.draft) || '';
  }

  /* ---------- Noche actual ---------- */
  async function loadNight(id = nightKey()) {
    S.night = (await repo.getNight(id)) || { id, startedAt: null, steps: {}, readings: [], scenesPlayed: [] };
    S.tonightThoughts = await repo.listThoughts({ nightId: S.night.id });
    return S.night;
  }
  async function patchNight(patch) {
    if (!S.night) await loadNight();
    S.night = { ...S.night, ...patch };
    return repo.saveNight(S.night);
  }
  function markStep(step) {
    if (S.solo || !S.night || (S.night.steps && S.night.steps[step])) return;
    patchNight({ steps: { ...(S.night.steps || {}), [step]: iso() } });
  }
  const savePrefs = patch => { Object.assign(S.prefs, patch); return repo.savePrefs(patch); };
  const saveVolume = debounce(v => repo.savePrefs({ volume: v }), 400);

  /* =========================================================
     Atmósfera (fondos, velo, efectos)
     ========================================================= */
  const bgA = $('#bgA'), bgB = $('#bgB');
  let frontBg = bgA, currentImgKey = null, currentBlur = 0;
  const applyBlur = (img, b) => { img.style.filter = (img.dataset.filter || '') + (b ? ` blur(${b}px)` : ''); };

  function setBackground(spec, motion) {
    const key = spec ? spec.key + '|' + (motion || '') : 'none';
    if (key === currentImgKey) return;
    currentImgKey = key;
    const back = frontBg === bgA ? bgB : bgA;
    const img = back.querySelector('img'), lq = back.querySelector('.lqip');
    back.className = 'bg' + (motion && motion !== 'still' ? ' m-' + motion : '');
    lq.classList.remove('on'); lq.style.backgroundImage = '';
    if (spec) {
      back.querySelector('.fallback').style.background = spec.fb || '#070708';
      img.style.setProperty('--pos', spec.pos || '50% 50%'); img.style.setProperty('--pos-m', spec.posM || spec.pos || '50% 50%');
      img.dataset.filter = spec.filter || '';
      applyBlur(img, currentBlur);
      const r = DSV.imgMount(back.querySelector('picture'), spec.key, { sizes: '100vw' });
      if (r && r.lqip) { lq.style.backgroundImage = `url("${r.lqip}")`; lq.style.setProperty('--pos', spec.pos || 'center'); lq.style.setProperty('--pos-m', spec.posM || spec.pos || 'center'); lq.classList.add('on'); }
    } else {
      back.querySelector('.fallback').style.background = '#060608';
      DSV.imgMount(back.querySelector('picture'), null);
    }
    requestAnimationFrame(() => { back.classList.add('on'); frontBg.classList.remove('on'); frontBg = back; });
  }

  let restFadeT = 0;
  function atmosphere(screen) {
    const a = ATMOS[screen];
    currentBlur = a.blur || 0;
    let veil = a.veil, spec = a.img, motion = null, fx = [];
    if (a.scene) {
      const sc = SCENES[S.prefs.scene];
      spec = { key: S.prefs.scene, pos: sc.pos, posM: sc.posM, filter: sc.filter, fb: sc.fb };
      motion = sc.motion; fx = sc.fx; veil = sc.veil;
    }
    setBackground(spec, motion);
    applyBlur(frontBg.querySelector('img'), currentBlur);
    const v = $('#veil');
    $('#shade').style.opacity = a.shade;
    $('#lamp').style.opacity = a.lamp;
    $('#ambient').style.opacity = a.ambient || 0;
    FX.set(a.rest ? fx.filter(f => f !== 'lightning') : fx, !!a.rest);
    clearTimeout(restFadeT);
    if (a.rest) {
      // En descanso la imagen se disuelve poco a poco hasta casi negro.
      v.style.transition = 'opacity 3s var(--ease-io)';
      v.style.opacity = Math.max(veil, .55);
      restFadeT = setTimeout(() => { if (current === 'descanso') { v.style.transition = 'opacity 28s linear'; v.style.opacity = .985; } }, 2200);
    } else {
      v.style.transition = '';
      v.style.opacity = veil;
    }
  }

  /* =========================================================
     Navegación (con soporte del botón "atrás" del sistema)
     ========================================================= */
  const ENTER = {}, LEAVE = {};
  function go(id, { push = true } = {}) {
    if (id === current || !document.getElementById(id)) return;
    const prev = current;
    if (push && prev) { S.history.push(prev); try { history.pushState({ dsv: id }, ''); } catch (e) {} }
    const next = document.getElementById(id);
    if (next.scrollTop) next.scrollTop = 0;   // cada pantalla empieza arriba
    $$('.screen').forEach(s => { const on = s.id === id; s.classList.toggle('active', on); s.inert = !on; });
    current = id;
    atmosphere(id);
    renderTicks();
    // Un paso del ritual cuenta como completado al avanzar desde él.
    const pi = RITUAL.indexOf(prev), ni = RITUAL.indexOf(id);
    if (!S.solo && pi >= 0 && ni > pi) markStep(prev);
    if (!S.solo && ni >= 0) repo.saveSession({ nightId: S.night && S.night.id, screen: id, solo: false });
    if (prev && LEAVE[prev]) LEAVE[prev](id);
    ENTER[id] && ENTER[id](prev);
    const first = document.getElementById(id).querySelector('h1,h2');
    if (first) { first.setAttribute('tabindex', '-1'); setTimeout(() => { if (current === id && !document.activeElement.closest('#' + id)) first.focus({ preventScroll: true }); }, 400); }
  }
  function back() { const p = S.history.pop(); go(p || 'home', { push: false }); }
  try { history.replaceState({ dsv: 'root' }, ''); } catch (e) {}
  addEventListener('popstate', () => { if (current !== 'home') back(); });

  function renderTicks() {
    const idx = RITUAL.indexOf(current);
    $$('.ticks').forEach(t => {
      t.innerHTML = S.solo || idx < 0 ? '' : RITUAL.map((_, i) => `<i class="${i < idx ? 'done' : i === idx ? 'now' : ''}"></i>`).join('');
    });
  }

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g && !g.disabled) {
      if (g.dataset.solo) S.solo = true;
      go(g.dataset.go);
      return;
    }
    if (e.target.closest('[data-back]')) {
      if (history.state && history.state.dsv && history.state.dsv !== 'root') history.back(); else back();
    }
  });

  /* =========================================================
     HOME
     ========================================================= */
  function greet() {
    const h = new Date().getHours();
    const g = h >= 6 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches';
    $('#greeting').innerHTML = S.name ? `${g}, <span class="name">${esc(S.name)}</span>.` : `${g}.`;
  }
  function clock() {
    const t = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    $('#homeClock').textContent = t; $('#restClock').textContent = t;
  }
  setInterval(clock, 15000); clock();

  const saveName = debounce(n => repo.saveProfile({ name: n }), 350);
  $('#nameInput').value = S.name;
  $('#nameBtn').onclick = () => { const f = $('#nameField'); f.classList.toggle('show'); if (f.classList.contains('show')) $('#nameInput').focus(); };
  $('#nameInput').addEventListener('input', e => { S.name = e.target.value.trim(); greet(); saveName(S.name); });
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.target.blur(); $('#nameField').classList.remove('show'); } });

  let homeTarget = null;   // noche a registrar por la mañana
  async function refreshHome() {
    const [session, nights, pending] = await Promise.all([repo.getSession(), repo.listNights(), repo.listThoughts({ status: 'pending' })]);
    const hour = new Date().getHours(), today = nightKey();

    // ¿Hay un ritual a medias que se pueda continuar?
    S.resume = null;
    if (session && session.screen && !session.solo && RITUAL.includes(session.screen) && session.nightId) {
      const n = nights.find(x => x.id === session.nightId);
      const age = (Date.now() - new Date(session.updatedAt).getTime()) / 36e5;
      if (n && !n.completedAt && age < DSV.config.resumeWindowHours) S.resume = session;
    }
    $('#startTxt').textContent = S.resume ? 'Continuar mi ritual' : 'Comenzar mi ritual';
    $('#restartBtn').hidden = !S.resume;

    // Por la mañana/tarde: registro de la noche anterior.
    homeTarget = null;
    const last = nights.find(n => n.id === shiftDay(today, -1));
    if (hour >= DSV.config.nightRolloverHour && hour < 19 && last && (last.completedAt || last.startedAt) && !last.sleep) homeTarget = last.id;
    $('#morningPrompt').hidden = !homeTarget;

    // Pendientes de noches anteriores: solo de día (de noche no los traemos de vuelta).
    const older = pending.filter(t => t.nightId < today);
    const showPending = hour >= DSV.config.nightRolloverHour && hour < 19 && older.length;
    $('#pendingNote').hidden = !showPending;
    if (showPending) $('#pendingTxt').textContent = older.length === 1 ? 'Tienes 1 pensamiento que dejaste para hoy' : `Tienes ${older.length} pensamientos que dejaste para hoy`;

    $('#progLink').hidden = !nights.length;
  }
  ENTER.home = () => { greet(); S.history = []; S.solo = false; refreshHome(); };

  async function startRitual({ fresh }) {
    S.solo = false;
    if (!fresh && S.resume) {
      await loadNight(S.resume.nightId);
      const idx = RITUAL.indexOf(S.resume.screen);
      S.history = ['home', ...RITUAL.slice(0, idx)];
      restoreCheckin();
      go(S.resume.screen, { push: false });
      try { history.pushState({ dsv: S.resume.screen }, ''); } catch (e) {}
      return;
    }
    await loadNight(nightKey());
    if (!S.night.startedAt || S.night.completedAt) await patchNight({ startedAt: S.night.startedAt || iso(), completedAt: null, restartedAt: S.night.completedAt ? iso() : undefined });
    else await patchNight({});
    restoreCheckin();
    go('checkin');
  }
  $('#startBtn').onclick = () => startRitual({ fresh: false });
  $('#restartBtn').onclick = async () => { await repo.clearSession(); S.resume = null; startRitual({ fresh: true }); };

  /* =========================================================
     CHECK-IN
     ========================================================= */
  function restoreCheckin() {
    const f = S.night && S.night.feel, n = S.night && S.night.noise;
    $$('#feelings button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.f === f)));
    $$('#noiseDots button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === n)));
    $('#noiseLbl').textContent = n ? NOISE_LBL[n] : '—';
    const r = $('#checkResp');
    if (f) { r.textContent = FEEL[f].resp; r.classList.add('show'); } else { r.textContent = ''; r.classList.remove('show'); }
    updateCheckCta();
  }
  $('#feelings').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#feelings button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const feel = b.dataset.f;
    patchNight({ feel }).then(updateCheckCta); updateCheckCta();
    const r = $('#checkResp'); r.classList.remove('show');
    setTimeout(() => { r.textContent = FEEL[feel].resp; r.classList.add('show'); }, 350);
    updateCheckCta();
  });
  $('#noiseDots').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const noise = +b.dataset.n;
    $$('#noiseDots button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === noise)));
    $('#noiseLbl').textContent = NOISE_LBL[noise];
    patchNight({ noise }).then(updateCheckCta); updateCheckCta();
  });
  function updateCheckCta() {
    const f = S.night && S.night.feel, n = S.night && S.night.noise;
    $('#checkNext').disabled = !(f && n);
    $('#checkHint').textContent = f && n ? '' : !f && !n ? 'Elige cómo llegas y tu ruido mental' : !f ? 'Falta elegir cómo llegas' : 'Falta tu nivel de ruido mental';
  }
  ENTER.checkin = restoreCheckin;

  /* =========================================================
     DESCARGA MENTAL
     ========================================================= */
  const ta = $('#thought');
  const saveDraft = debounce(v => repo.saveSession({ draft: v }), 400);
  function sheetMeta() {
    const n = S.tonightThoughts.length;
    $('#sheetDate').textContent = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#sheetCount').textContent = n ? `${n} guardado${n > 1 ? 's' : ''}` : '';
  }
  ta.addEventListener('input', () => { $('#releaseBtn').disabled = !ta.value.trim(); S.draft = ta.value; saveDraft(ta.value); });
  $('#releaseBtn').onclick = async () => {
    const text = ta.value.trim(); if (!text) return;
    if (!S.night) await loadNight();
    const t = await repo.addThought({ text, nightId: S.night.id });
    S.tonightThoughts.unshift(t);
    S.draft = ''; repo.saveSession({ draft: '' });
    const ghost = $('#ghost');
    ghost.style.top = (44 - ta.scrollTop) + 'px';
    ghost.textContent = ta.value;
    ghost.classList.remove('release'); void ghost.offsetWidth; ghost.classList.add('release');
    ta.value = ''; ta.style.opacity = 0; ta.blur();
    $('#releaseBtn').disabled = true;
    $('#sheet').classList.add('resting');
    $('#kept').classList.remove('show');
    setTimeout(() => {
      const n = S.tonightThoughts.length;
      $('#keptTxt').textContent = n === 1 ? 'Guardado para mañana. Puedes escribir otro, o seguir.' : `${n} pensamientos guardados para mañana.`;
      $('#kept').classList.add('show'); sheetMeta();
    }, 1600);
    setTimeout(() => {
      $('#sheet').classList.remove('resting');
      ta.style.transition = 'opacity 1.8s var(--ease)'; ta.style.opacity = 1;
      ta.placeholder = '¿Algo más? Si no, está bien así.';
    }, 3000);
  };
  ENTER.descarga = () => {
    sheetMeta();
    ta.value = S.draft || '';
    $('#releaseBtn').disabled = !ta.value.trim();
    const n = S.tonightThoughts.length;
    $('#kept').classList.toggle('show', n > 0);
    if (n) $('#keptTxt').textContent = n === 1 ? 'Ya guardaste 1 pensamiento esta noche.' : `Ya guardaste ${n} pensamientos esta noche.`;
    ta.placeholder = n ? '¿Algo más? Si no, está bien así.' : 'Lo que tengo pendiente, lo que no dije, lo que me preocupa de mañana…';
    $('#dlSkip').hidden = n > 0;
  };

  /* =========================================================
     RITUAL PERSONALIZADO
     ========================================================= */
  function buildPlan() {
    const f = S.night.feel, n = S.night.noise || (f === 'tranquila' ? 2 : 3), basis = `${f}|${n}`;
    const old = S.night.plan;
    if (old && old.basis === basis) {
      if (S.prefs.sceneChosen && old.scene !== S.prefs.scene) return { ...old, scene: S.prefs.scene };
      return old;
    }
    const breath = (n >= 4 || f === 'acelerada' || f === 'preocupada') ? 'larga'
      : (n <= 2 && (f === 'tranquila' || f === 'cansada')) ? 'breve' : 'lenta';
    return {
      basis, breath,
      reading: f ? FEEL[f].read : 0,
      scene: S.prefs.sceneChosen ? S.prefs.scene : (f ? FEEL[f].scene : S.prefs.scene)
    };
  }
  function ritualLede() {
    const f = S.night.feel, n = S.night.noise || 0, k = S.tonightThoughts.length;
    let s = n >= 4 ? 'Llegas con bastante ruido. Vamos a alargar cada exhalación para que el cuerpo marque el ritmo.'
      : f === 'triste' ? 'Esta noche vamos con suavidad: nada que resolver, solo acompañarte.'
      : f === 'tranquila' ? (buildPlan().breath === 'breve' ? 'Llegas en calma. El ritual será breve, para cuidarla.' : 'Llegas en calma. Vamos a cuidarla hasta que llegue el sueño.')
      : f === 'cansada' ? 'Tu cuerpo ya está cansado. Solo falta que la mente lo siga.'
      : 'Cuatro pasos sencillos, pensados para cómo llegas hoy.';
    if (k) s += k === 1 ? ' Lo que escribiste ya está guardado.' : ` Tus ${k} pensamientos ya están guardados.`;
    return s;
  }
  ENTER.ritual = async () => {
    if (!S.night) await loadNight();
    const plan = buildPlan();
    if (JSON.stringify(plan) !== JSON.stringify(S.night.plan)) await patchNight({ plan });
    if (!S.prefs.sceneChosen && S.prefs.scene !== plan.scene) savePrefs({ scene: plan.scene });
    const B = BREATH[plan.breath], mins = Math.max(1, Math.round((B.in + B.hold + B.out) * B.cycles / 60));
    $('#ritualLede').textContent = ritualLede();
    const rows = [
      ['Respirar', `${B.name} · inhala ${B.in}, sostén ${B.hold}, exhala ${B.out} · ${mins} min`],
      ['Leer', `«${READINGS[plan.reading].t}» · 2 min`],
      ['Escuchar', `${SCENES[plan.scene].name} · puedes cambiarlo cuando quieras`],
      ['Cerrar el día', 'Un momento para soltar y pasar a modo descanso']
    ];
    const el = $('#plan'); el.classList.remove('show');
    el.innerHTML = rows.map(([a, b], i) => `<li style="transition-delay:${.25 + i * .18}s"><b>${a}</b><span>${b}</span></li>`).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  };

  /* =========================================================
     RESPIRACIÓN
     ========================================================= */
  const Breath = (() => {
    let raf = 0, t0 = 0, running = false, P = BREATH.lenta, best = 0, lateT = 0;
    const orb = $('#orb'), halo = orb.querySelector('.halo'), core = orb.querySelector('.core');
    const ease = x => .5 - .5 * Math.cos(Math.PI * x);
    let shown = null;
    function show(k) { if (shown === k) return; shown = k; ['bt0', 'bt1', 'bt2', 'bt3'].forEach(id => $('#' + id).classList.toggle('on', id === k)); }
    function frame(now) {
      if (!running) return;
      const el = now - t0;
      if (el < 2600) { raf = requestAnimationFrame(frame); return; }
      const I = P.in * 1000, H = P.hold * 1000, O = P.out * 1000, total = I + H + O;
      const t = el - 2600, cyc = Math.floor(t / total), p = t % total;
      let s, k;
      if (p < I) { s = ease(p / I); k = 'bt1'; }
      else if (p < I + H) { s = 1 + Math.sin((p - I) / H * Math.PI) * .012; k = 'bt2'; }
      else { s = 1 - ease((p - I - H) / O); k = 'bt3'; }
      orb.style.transform = `scale(${.62 + s * .38})`;
      halo.style.opacity = .45 + s * .55;
      core.style.opacity = .55 + s * .45;
      show(k);
      if (cyc > best) {
        best = cyc;
        if (!S.solo && S.night && best > (S.night.breathCycles || 0)) patchNight({ breathCycles: Math.min(best, P.cycles) });
      }
      $('#breathMeta').textContent = cyc >= P.cycles ? 'Puedes seguir así o continuar' : `${Math.min(cyc + 1, P.cycles)} de ${P.cycles}`;
      if (cyc >= 1) $('#breathNext').classList.add('show');
      raf = requestAnimationFrame(frame);
    }
    return {
      start(plan) {
        P = BREATH[plan] || BREATH.lenta; best = 0; running = true; t0 = performance.now(); shown = null; show('bt0');
        orb.style.transform = 'scale(.62)';
        $('#breathMeta').textContent = `Inhala ${P.in} · sostén ${P.hold} · exhala ${P.out}`;
        $('#breathNext').classList.remove('show');
        clearTimeout(lateT); lateT = setTimeout(() => $('#breathNext').classList.add('show'), 30000);
        raf = requestAnimationFrame(frame);
      },
      stop() { running = false; cancelAnimationFrame(raf); clearTimeout(lateT); }
    };
  })();
  ENTER.respira = () => Breath.start(S.night && S.night.plan ? S.night.plan.breath : 'lenta');
  LEAVE.respira = () => Breath.stop();

  /* =========================================================
     LECTURA
     ========================================================= */
  const readingIndex = () => (S.night && S.night.plan ? S.night.plan.reading : 0) % READINGS.length;
  function applyFont() { $('#reader').style.setProperty('--rs', S.prefs.fontSize + 'px'); }
  function renderReading() {
    const r = READINGS[readingIndex()];
    $('#reading').innerHTML = `<p class="eyebrow">Lectura · 2 minutos</p><h2>${r.t}</h2>` + r.p.map(x => `<p>${x}</p>`).join('') + '<span class="end"></span>';
    $('#reader').scrollTop = 0;
  }
  $('#fsMinus').onclick = () => { savePrefs({ fontSize: Math.max(17, S.prefs.fontSize - 1.5) }); applyFont(); };
  $('#fsPlus').onclick = () => { savePrefs({ fontSize: Math.min(26, S.prefs.fontSize + 1.5) }); applyFont(); };
  $('#otherRead').onclick = () => {
    const a = $('#reading'); a.style.transition = 'opacity .9s var(--ease)'; a.style.opacity = 0;
    setTimeout(() => {
      const next = (readingIndex() + 1) % READINGS.length;
      if (S.night) patchNight({ plan: { ...(S.night.plan || {}), reading: next }, readings: [...new Set([...(S.night.readings || []), next])] });
      renderReading(); a.style.opacity = 1;
    }, 900);
  };
  ENTER.lectura = () => {
    applyFont(); renderReading();
    if (S.night) patchNight({ readings: [...new Set([...(S.night.readings || []), readingIndex()])] });
  };

  /* =========================================================
     SONIDOS
     ========================================================= */
  const PLAY = svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>');
  const PAUSE = svg('<path d="M8.5 5.5v13M15.5 5.5v13"/>', 2.2);
  function buildStrip() {
    $('#strip').innerHTML = SCENE_ORDER.map(k => `<button class="tile" role="listitem" data-scene="${k}" aria-pressed="false" aria-label="${SCENES[k].name}">
      <div class="fb" style="background:${SCENES[k].fb}"></div><picture><img alt=""></picture>
      <span class="lbl">${svg(ICON[k])}<b>${SCENES[k].name}</b></span></button>`).join('');
    $$('#strip .tile').forEach(t => {
      const img = t.querySelector('img'); img.style.objectPosition = SCENES[t.dataset.scene].posM;
      DSV.imgMount(t.querySelector('picture'), t.dataset.scene, { sizes: '(min-width:900px) 150px, 118px', maxWidth: 640, lazy: true });
    });
  }
  function renderScene(fade) {
    const s = SCENES[S.prefs.scene];
    const apply = () => { $('#sceneName').textContent = s.name; $('#sceneDesc').textContent = s.desc; $('#sceneName').style.opacity = 1; $('#sceneDesc').style.opacity = 1; };
    if (fade) { $('#sceneName').style.opacity = 0; $('#sceneDesc').style.opacity = 0; setTimeout(apply, 700); } else apply();
    $$('#strip .tile').forEach(t => t.setAttribute('aria-pressed', String(t.dataset.scene === S.prefs.scene)));
  }
  function renderPlay() {
    $('#playBtn').innerHTML = S.playing ? PAUSE : PLAY;
    $('#playBtn').setAttribute('aria-label', S.playing ? 'Pausar' : 'Reproducir');
    $('#restPlay').innerHTML = S.playing ? svg('<path d="M9 6v12M15 6v12"/>', 1.6) : svg('<path d="M8.5 6v12l9.5-6z"/>', 1.4);
    $('#restPlay').setAttribute('aria-label', S.playing ? 'Pausar sonido' : 'Reanudar sonido');
  }
  function renderTimer() { $$('#timer button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.t === S.prefs.timerMin))); }
  let timerId = 0, timerStopId = 0;
  function armTimer() {
    clearTimeout(timerId); clearTimeout(timerStopId); S.timerEnd = 0;
    if (!S.playing || !S.prefs.timerMin) return;
    const ms = S.prefs.timerMin * 60000;
    S.timerEnd = Date.now() + ms;
    timerId = setTimeout(() => {
      Sound.fadeOut(45);
      timerStopId = setTimeout(() => { Sound.stop(.5); S.playing = false; S.timerEnd = 0; renderPlay(); restNote(); }, 46000);
    }, Math.max(0, ms - 45000));
  }
  function play() {
    if (!Sound.supported) return;
    Sound.start(S.prefs.scene, S.prefs.volume); S.playing = true; renderPlay(); armTimer();
    if (!S.solo && S.night) patchNight({ scenesPlayed: [...new Set([...(S.night.scenesPlayed || []), S.prefs.scene])] });
  }
  function pause() { Sound.stop(); S.playing = false; renderPlay(); clearTimeout(timerId); clearTimeout(timerStopId); S.timerEnd = 0; }
  $('#playBtn').onclick = () => (S.playing ? pause() : play());
  $('#strip').addEventListener('click', e => {
    const t = e.target.closest('.tile'); if (!t) return;
    if (t.dataset.scene === S.prefs.scene && S.playing) return;
    savePrefs({ scene: t.dataset.scene, sceneChosen: true });
    if (!S.solo && S.night && S.night.plan) patchNight({ plan: { ...S.night.plan, scene: t.dataset.scene } });
    renderScene(true); atmosphere('sonidos');
    play();
  });
  const vol = $('#vol');
  vol.addEventListener('input', () => {
    S.prefs.volume = vol.value / 100; vol.style.setProperty('--p', vol.value + '%');
    Sound.volume(S.prefs.volume); saveVolume(S.prefs.volume);
  });
  $('#timer').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    savePrefs({ timerMin: +b.dataset.t }); renderTimer(); armTimer();
  });
  ENTER.sonidos = () => {
    if (!S.solo && S.night && S.night.plan && !S.prefs.sceneChosen) S.prefs.scene = S.night.plan.scene;
    atmosphere('sonidos');
    renderScene(false); renderTimer();
    $('#sonNextTxt').textContent = S.solo ? 'Modo descanso' : 'Seguir';
    $('#sonNext').dataset.go = S.solo ? 'descanso' : 'cierre';
    $('#sonidosLbl').textContent = S.solo ? 'Ambiente' : 'Escuchar';
    const gestured = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (!S.playing && gestured) play();
  };

  /* =========================================================
     CIERRE + registro de cómo se va a la cama
     ========================================================= */
  $('#afterChoices').innerHTML = AFTER.map(a => `<button data-a="${a.k}" aria-pressed="false">${a.txt}</button>`).join('');
  $('#afterChoices').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#afterChoices button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    patchNight({ after: b.dataset.a });
  });
  ENTER.cierre = () => {
    const n = S.tonightThoughts.length;
    $('#closeLede').textContent = n
      ? 'Lo que escribiste queda guardado para mañana. Tu cuerpo ya sabe qué hacer ahora.'
      : 'No hay nada más que resolver hoy. Tu cuerpo ya sabe qué hacer ahora.';
    const rows = [];
    if (S.night && S.night.feel) rows.push(['Llegaste', FEEL[S.night.feel].txt.toLowerCase()]);
    rows.push(['Para mañana', n ? `${n} pensamiento${n > 1 ? 's' : ''}` : 'nada pendiente']);
    rows.push(['Te acompaña', S.playing ? `${SCENES[S.prefs.scene].name}${S.prefs.timerMin ? ` · ${S.prefs.timerMin} min` : ''}` : 'silencio']);
    $('#summary').innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><b>${esc(b)}</b></li>`).join('');
    const after = S.night && S.night.after;
    $$('#afterChoices button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.a === after)));
  };

  /* =========================================================
     MODO DESCANSO
     ========================================================= */
  let idleT = 0, restTick = 0;
  function wake() {
    const d = $('#descanso'); d.classList.remove('idle');
    clearTimeout(idleT); idleT = setTimeout(() => d.classList.add('idle'), 6000);
  }
  function restNote() {
    if (S.playing && S.timerEnd) { const m = Math.max(0, Math.ceil((S.timerEnd - Date.now()) / 60000)); $('#restNote').textContent = `se apaga en ${m} min`; }
    else $('#restNote').textContent = S.playing ? 'sin temporizador' : 'en silencio';
    $('#restScene').textContent = S.playing ? SCENES[S.prefs.scene].name : '';
  }
  ENTER.descanso = (prev) => {
    if (!S.solo && S.night && S.night.startedAt) {
      const steps = { ...(S.night.steps || {}) };
      if (prev === 'cierre' && !steps.cierre) steps.cierre = iso();
      patchNight({ completedAt: S.night.completedAt || iso(), steps });
      repo.clearSession(); S.resume = null;
    }
    renderPlay(); restNote(); wake();
    clearInterval(restTick); restTick = setInterval(restNote, 20000);
    try { if (document.documentElement.requestFullscreen && matchMedia('(pointer:coarse)').matches) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
  };
  LEAVE.descanso = () => { clearInterval(restTick); clearTimeout(idleT); $('#descanso').classList.remove('idle'); try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {} };
  ['pointerdown', 'keydown'].forEach(ev => $('#descanso').addEventListener(ev, () => { if (current === 'descanso') wake(); }));
  $('#restPlay').onclick = () => { S.playing ? pause() : play(); restNote(); };
  $('#restDim').onclick = e => { e.stopPropagation(); clearTimeout(idleT); setTimeout(() => $('#descanso').classList.add('idle'), 50); };
  $('#restExit').onclick = () => { S.solo = false; go('home', { push: false }); };

  /* =========================================================
     REGISTRO DE LA NOCHE (por la mañana)
     ========================================================= */
  const REG = { quality: 0, wakes: null, id: null };
  $('#sleepQ').innerHTML = SLEEP.map(s => `<li><button data-q="${s.q}" aria-pressed="false">${s.txt}</button></li>`).join('');
  $('#wakesQ').innerHTML = WAKES.map(w => `<button data-w="${w.k}" aria-pressed="false">${w.txt}</button>`).join('');
  $('#sleepQ').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    REG.quality = +b.dataset.q;
    $$('#sleepQ button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#regSave').disabled = false;
  });
  $('#wakesQ').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    REG.wakes = +b.dataset.w;
    $$('#wakesQ button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('#regSave').onclick = async () => {
    if (!REG.id || !REG.quality) return;
    const n = await repo.getNight(REG.id);
    await repo.saveNight({ ...(n || { id: REG.id, steps: {} }), sleep: { quality: REG.quality, wakes: REG.wakes, note: $('#regNote').value.trim(), loggedAt: iso() } });
    if (S.night && S.night.id === REG.id) S.night = await repo.getNight(REG.id);
    S.history = ['home'];
    go('progreso', { push: false });
  };
  ENTER.registro = async () => {
    REG.id = homeTarget || shiftDay(nightKey(), -1);
    const n = await repo.getNight(REG.id);
    const s = (n && n.sleep) || {};
    REG.quality = s.quality || 0; REG.wakes = s.wakes == null ? null : s.wakes;
    $('#regDate').textContent = 'Noche del ' + longDate(REG.id);
    $$('#sleepQ button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.q === REG.quality)));
    $$('#wakesQ button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.w === REG.wakes)));
    $('#regNote').value = s.note || '';
    $('#regSave').disabled = !REG.quality;
  };
  $('#regNote').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

  /* =========================================================
     PROGRESO
     ========================================================= */
  async function renderProgress() {
    const [nights, thoughts] = await Promise.all([repo.listNights(), repo.listThoughts()]);
    const byId = Object.fromEntries(nights.map(n => [n.id, n]));
    const today = nightKey();
    const done = nights.filter(n => n.completedAt);

    // Racha: noches seguidas con ritual completo, terminando hoy o ayer.
    let streak = 0, d = byId[today] && byId[today].completedAt ? today : shiftDay(today, -1);
    while (byId[d] && byId[d].completedAt) { streak++; d = shiftDay(d, -1); }

    const resolved = thoughts.filter(t => t.status !== 'pending').length;
    $('#stats').innerHTML = [
      [done.length, done.length === 1 ? 'noche con ritual' : 'noches con ritual'],
      [streak, streak === 1 ? 'noche seguida' : 'noches seguidas'],
      [`${resolved}<small style="font-size:.5em;color:var(--ink-3)">/${thoughts.length}</small>`, 'pensamientos resueltos']
    ].map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('');

    const withAfter = done.filter(n => n.after);
    const calmer = withAfter.filter(n => n.after === 'calma').length;
    const slept = nights.filter(n => n.sleep);
    const avg = slept.length ? slept.reduce((s, n) => s + n.sleep.quality, 0) / slept.length : 0;
    $('#progLede').textContent = !nights.length ? 'Aquí verás tus noches a medida que las vivas. No hay nada que cumplir: solo un lugar para mirar atrás.'
      : withAfter.length >= 2 ? `En ${calmer} de ${withAfter.length} noches te fuiste a la cama más en calma de como llegaste.`
      : slept.length >= 2 ? `Tu sueño, en promedio: ${SLEEP.find(s => s.q === Math.round(avg)).txt.toLowerCase()}.`
      : 'Cada noche que completas queda registrada aquí.';

    const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13));
    $('#nightsRow').innerHTML = days.map(id => {
      const n = byId[id], cls = n && n.completedAt ? 'done' : n && n.startedAt ? 'part' : '';
      const q = n && n.sleep ? n.sleep.quality : 0;
      const h = cls === 'done' ? 34 + q * 12 : cls === 'part' ? 30 : 10;
      const label = `${longDate(id)}: ${cls === 'done' ? 'ritual completo' : cls === 'part' ? 'ritual empezado' : 'sin ritual'}${q ? ', durmió ' + SLEEP.find(s => s.q === q).txt.toLowerCase() : ''}`;
      return `<div class="n${id === today ? ' today' : ''}" title="${label}"><span class="bar ${cls}" style="height:${h}%"></span><span class="sleep${q ? ' q' : ''}" style="opacity:${q ? .35 + q * .13 : 0}"></span><span class="d">${parseYmd(id).getDate()}</span></div>`;
    }).join('');
    $('#nightsRow').setAttribute('aria-label', `Últimas dos semanas: ${days.filter(id => byId[id] && byId[id].completedAt).length} noches con ritual completo`);

    const pending = thoughts.filter(t => t.status === 'pending');
    $('#thoughtsList').innerHTML = pending.length ? pending.map(t => `<li data-id="${t.id}"><p>${esc(t.text)}</p>
      <div class="meta"><span>${t.nightId === today ? 'Esta noche' : 'Noche del ' + longDate(t.nightId)}</span>
      <div><button data-act="done">Atendido</button><button data-act="released">Soltar</button></div></div></li>`).join('')
      : '<li class="empty">Nada pendiente. Lo que escribas en la descarga te esperará aquí al día siguiente.</li>';

    $('#storageNote').textContent = repo.persistent
      ? 'Tus datos se guardan solo en este dispositivo y en este navegador.'
      : 'Este navegador no permite guardar datos: lo que registres se perderá al cerrar la página.';
  }
  $('#thoughtsList').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const li = b.closest('li'); li.classList.add('leaving');
    await repo.updateThought(li.dataset.id, { status: b.dataset.act, resolvedAt: iso() });
    S.tonightThoughts = S.night ? await repo.listThoughts({ nightId: S.night.id }) : [];
    setTimeout(renderProgress, 700);
  });
  $('#exportBtn').onclick = async () => {
    const data = await repo.exportAll();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `dormir-mis-datos-${ymd(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#wipeBtn').onclick = () => { $('#wipeConfirm').hidden = false; $('#wipeBtn').hidden = true; };
  $('#wipeNo').onclick = () => { $('#wipeConfirm').hidden = true; $('#wipeBtn').hidden = false; };
  $('#wipeYes').onclick = async () => {
    pause();
    await repo.clearAll();
    Object.assign(S, { name: '', night: null, tonightThoughts: [], resume: null, draft: '', solo: false, history: [] });
    Object.assign(S.prefs, { scene: 'lluvia', sceneChosen: false, volume: .6, timerMin: 30, fontSize: 20 });
    $('#nameInput').value = ''; vol.value = 60; vol.style.setProperty('--p', '60%');
    $('#wipeConfirm').hidden = true; $('#wipeBtn').hidden = false;
    go('home', { push: false });
  };
  ENTER.progreso = () => { $('#wipeConfirm').hidden = true; $('#wipeBtn').hidden = false; $('#progreso .scrollarea').scrollTop = 0; renderProgress(); };

  /* Teclado en pantalla: mientras se escribe, los CTA fijos no tapan el campo. */
  const coarse = matchMedia('(pointer: coarse)');
  document.addEventListener('focusin', e => { if (coarse.matches && e.target.matches('textarea, input[type=text]')) document.documentElement.classList.add('typing'); });
  document.addEventListener('focusout', e => { if (e.target.matches('textarea, input[type=text]')) document.documentElement.classList.remove('typing'); });

  /* =========================================================
     Inicio
     ========================================================= */
  if (!Sound.supported) $('#playBtn').disabled = true;
  vol.value = Math.round(S.prefs.volume * 100); vol.style.setProperty('--p', vol.value + '%');
  buildStrip(); renderPlay(); renderTimer(); greet(); applyFont();
  await loadNight(nightKey());
  go('home', { push: false });
  document.documentElement.classList.add('ready');
})().catch(err => {
  console.error('[dsv] Error al iniciar:', err);
});
