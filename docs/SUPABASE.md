# Migrar la persistencia a Supabase

La app solo usa `DSV.repo`. Para pasar a Supabase hay que implementar **los mismos métodos** contra tablas
y registrarlo como proveedor en `js/storage.js`. Ninguna pantalla cambia.

## Métodos del repositorio

| Método | Devuelve |
|---|---|
| `ready` | Promise que se resuelve cuando el almacén está listo |
| `persistent` | `true` si los datos sobreviven al cierre |
| `getProfile()` / `saveProfile(patch)` | `{ name, createdAt, updatedAt }` |
| `getPrefs()` / `savePrefs(patch)` | `{ scene, sceneChosen, volume, timerMin, fontSize }` |
| `getNight(id)` / `saveNight(night)` / `listNights()` | Night (id = `AAAA-MM-DD`), `listNights` ordenado desc. |
| `listThoughts({status?, nightId?})` / `addThought({text, nightId})` / `updateThought(id, patch)` | Thought |
| `getSession()` / `saveSession(patch)` / `clearSession()` | `{ nightId, screen, solo, draft, updatedAt }` |
| `exportAll()` / `clearAll()` | |

`saveNight` y los `save*(patch)` **fusionan** con lo existente (no reemplazan).

## Esquema SQL sugerido

```sql
create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text default '',
  prefs jsonb default '{}'::jsonb,
  session jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table nights (
  user_id uuid references auth.users on delete cascade,
  id date not null,
  data jsonb not null default '{}'::jsonb,   -- feel, noise, plan, steps, breathCycles, after, sleep…
  updated_at timestamptz default now(),
  primary key (user_id, id)
);

create table thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  night_id date not null,
  text text not null,
  status text not null default 'pending' check (status in ('pending','done','released')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table profiles enable row level security;
alter table nights   enable row level security;
alter table thoughts enable row level security;
create policy "own" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on nights   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on thoughts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## Esqueleto (ejemplo, no probado contra un proyecto real)

```js
DSV.createSupabaseRepository = (sb) => {
  const uid = async () => (await sb.auth.getUser()).data.user.id;
  return {
    persistent: true,
    ready: Promise.resolve(),
    async getProfile() { const { data } = await sb.from('profiles').select('name, created_at').maybeSingle(); return data || { name: '' }; },
    async saveProfile(p) { await sb.from('profiles').upsert({ user_id: await uid(), ...p, updated_at: new Date().toISOString() }); },
    async getNight(id) { const { data } = await sb.from('nights').select('id, data').eq('id', id).maybeSingle(); return data && { id: data.id, ...data.data }; },
    async saveNight(n) {
      const cur = (await this.getNight(n.id)) || {};
      const { id, ...rest } = { ...cur, ...n };
      await sb.from('nights').upsert({ user_id: await uid(), id, data: rest, updated_at: new Date().toISOString() });
      return { id, ...rest };
    },
    // …listNights, prefs, thoughts y session siguen el mismo patrón.
  };
};
```

Luego, en `js/storage.js`: `providers.supabase = () => DSV.createSupabaseRepository(client)` y en `js/config.js`: `storage: 'supabase'`.

Para no perder lo que ya hay en el dispositivo: tras el primer inicio de sesión, lee `DSV.createKVRepository(...).exportAll()` y súbelo.
