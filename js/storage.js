/* =========================================================
   Capa de datos
   ---------------------------------------------------------
   La app NUNCA toca localStorage directamente: solo habla con
   DSV.repo (un "repositorio" con métodos asíncronos).

   Hoy el repositorio usa un adaptador clave-valor sobre localStorage.
   Para migrar a Supabase basta con implementar los mismos métodos
   del repositorio contra tablas (ver docs/SUPABASE.md) y cambiar
   DSV.config.storage. Ninguna pantalla necesita cambiar.

   Modelo:
     profile   { name, createdAt, updatedAt }
     prefs     { scene, sceneChosen, volume, timerMin, fontSize }
     nights    { [id]: Night }          id = 'AAAA-MM-DD' (fecha de la noche)
     thoughts  [ Thought ]
     session   { nightId, screen, solo, updatedAt }

     Night   { id, startedAt, updatedAt, completedAt, feel, noise,
               plan:{ breath, reading, scene }, steps:{ [paso]: timestamp },
               breathCycles, readings:[i], scenesPlayed:[k], after,
               sleep:{ quality, wakes, note, loggedAt } }
     Thought { id, text, nightId, status:'pending'|'done'|'released',
               createdAt, resolvedAt }
   ========================================================= */
(function () {
  const SCHEMA_VERSION = 1;
  const PREFIX = 'dsv:';

  /* ---------- Adaptador clave-valor: localStorage con respaldo en memoria ---------- */
  function createLocalAdapter() {
    const memory = new Map();
    let ls = null;
    try {
      const t = '__dsv_test__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      ls = window.localStorage;
    } catch (e) { ls = null; }   // navegación privada, almacenamiento bloqueado, etc.

    return {
      persistent: !!ls,
      async get(key) {
        try {
          const raw = ls ? ls.getItem(PREFIX + key) : memory.get(key);
          return raw == null ? null : JSON.parse(raw);
        } catch (e) { return null; }
      },
      async set(key, value) {
        const raw = JSON.stringify(value);
        memory.set(key, raw);
        try { if (ls) ls.setItem(PREFIX + key, raw); }
        catch (e) { console.warn('[dsv] No se pudo guardar en el dispositivo:', e && e.name); }
        return value;
      },
      async remove(key) {
        memory.delete(key);
        try { if (ls) ls.removeItem(PREFIX + key); } catch (e) {}
      },
      async keys() {
        if (!ls) return [...memory.keys()];
        const out = [];
        try { for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length)); } } catch (e) {}
        return out;
      }
    };
  }

  const uid = () => (crypto && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const now = () => new Date().toISOString();

  /* ---------- Repositorio sobre un adaptador clave-valor ---------- */
  function createKVRepository(kv) {
    // Cola de escrituras: evita que dos guardados simultáneos se pisen.
    let chain = Promise.resolve();
    const serial = fn => (chain = chain.then(fn, fn));

    async function migrate() {
      const v = await kv.get('schema');
      if (v === SCHEMA_VERSION) return;
      // v1 es la primera versión: aquí se añadirán futuras migraciones.
      await kv.set('schema', SCHEMA_VERSION);
    }

    const repo = {
      persistent: kv.persistent,
      ready: migrate(),

      /* Perfil */
      async getProfile() { return (await kv.get('profile')) || { name: '' }; },
      saveProfile(patch) {
        return serial(async () => {
          const cur = (await kv.get('profile')) || { createdAt: now() };
          return kv.set('profile', { ...cur, ...patch, updatedAt: now() });
        });
      },

      /* Preferencias */
      async getPrefs() { return (await kv.get('prefs')) || {}; },
      savePrefs(patch) {
        return serial(async () => kv.set('prefs', { ...((await kv.get('prefs')) || {}), ...patch }));
      },

      /* Noches */
      async getNight(id) { return ((await kv.get('nights')) || {})[id] || null; },
      async listNights() {
        const all = (await kv.get('nights')) || {};
        return Object.values(all).sort((a, b) => (a.id < b.id ? 1 : -1));
      },
      saveNight(night) {
        return serial(async () => {
          const all = (await kv.get('nights')) || {};
          const merged = { ...(all[night.id] || {}), ...night, updatedAt: now() };
          all[night.id] = merged;
          await kv.set('nights', all);
          return merged;
        });
      },

      /* Pensamientos */
      async listThoughts(filter = {}) {
        let list = (await kv.get('thoughts')) || [];
        if (filter.status) list = list.filter(t => t.status === filter.status);
        if (filter.nightId) list = list.filter(t => t.nightId === filter.nightId);
        return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      },
      addThought({ text, nightId }) {
        return serial(async () => {
          const list = (await kv.get('thoughts')) || [];
          const t = { id: uid(), text, nightId, status: 'pending', createdAt: now(), resolvedAt: null };
          list.push(t);
          await kv.set('thoughts', list);
          return t;
        });
      },
      updateThought(id, patch) {
        return serial(async () => {
          const list = (await kv.get('thoughts')) || [];
          const i = list.findIndex(t => t.id === id);
          if (i < 0) return null;
          list[i] = { ...list[i], ...patch };
          await kv.set('thoughts', list);
          return list[i];
        });
      },

      /* Sesión (para reanudar) */
      async getSession() { return kv.get('session'); },
      saveSession(patch) {
        return serial(async () => kv.set('session', { ...((await kv.get('session')) || {}), ...patch, updatedAt: now() }));
      },
      clearSession() { return serial(() => kv.remove('session')); },

      /* Utilidades */
      async exportAll() {
        return {
          app: 'dormir-sin-darle-vueltas', schema: SCHEMA_VERSION, exportedAt: now(),
          profile: await kv.get('profile'), prefs: await kv.get('prefs'),
          nights: await kv.get('nights'), thoughts: await kv.get('thoughts')
        };
      },
      clearAll() {
        return serial(async () => { for (const k of await kv.keys()) await kv.remove(k); await kv.set('schema', SCHEMA_VERSION); });
      }
    };
    return repo;
  }

  /* ---------- Selección de proveedor ---------- */
  const providers = {
    local: () => createKVRepository(createLocalAdapter())
    // supabase: () => DSV.createSupabaseRepository(supabaseClient)   ← ver docs/SUPABASE.md
  };
  const which = (DSV.config && DSV.config.storage) || 'local';
  DSV.repo = (providers[which] || providers.local)();
  DSV.createKVRepository = createKVRepository;
})();
