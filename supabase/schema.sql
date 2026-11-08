-- Schema del database (Supabase / Postgres) per il menu birre.
-- Tutte le tabelle hanno RLS attivo e nessuna policy: solo il server (Cloudflare Worker,
-- con la chiave segreta) può leggerle e scriverle. Il browser passa sempre da /api.

create table if not exists public.beers (
  id text primary key,
  nome text not null,
  birrificio text not null default '',
  stile text not null default '',
  abv double precision not null default 0,
  prezzo double precision not null default 0,
  descrizione text not null default '',
  descrizione_en text not null default '',
  descrizione_de text not null default '',
  descrizione_fr text not null default '',
  descrizione_es text not null default '',
  abbinamento text not null default '',
  abbinamento_en text not null default '',
  abbinamento_de text not null default '',
  abbinamento_fr text not null default '',
  abbinamento_es text not null default '',
  formati jsonb not null default '[]'::jsonb,
  posizione text not null check (posizione in ('spina', 'frigo', 'cantina')),
  disponibile boolean not null default true,
  in_evidenza boolean not null default false,
  in_arrivo boolean not null default false,
  senza_glutine boolean not null default false,
  analcolica boolean not null default false,
  cask boolean not null default false,
  annata integer,
  spina_n integer,
  archiviata boolean not null default false,
  archiviata_il timestamptz,
  foto_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists beers_posizione_nome on public.beers (posizione, nome);

-- Info locale: una sola riga (id = 'main') con i dati in JSON.
create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.ratings (
  beer_id text not null,
  device text not null,
  stars integer not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (beer_id, device)
);
create index if not exists ratings_device on public.ratings (device);

create table if not exists public.subscriptions (
  token text primary key,
  beer_id text not null,
  email text not null,
  lang text not null default 'it',
  created_at timestamptz not null default now(),
  unique (beer_id, email)
);

create table if not exists public.sessions (
  token text primary key,
  expires_at timestamptz not null
);

create table if not exists public.backups (
  id text primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('daily', 'manual', 'pre-restore')),
  beer_count integer not null default 0,
  data jsonb not null
);
create index if not exists backups_created on public.backups (created_at desc);

-- Immagini (logo, icone dell'app, foto birre): bucket pubblico "images" dello Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/png','image/webp','image/jpeg'])
on conflict (id) do nothing;

-- PIN amministratore (hash) quando viene cambiato dalla dashboard.
create table if not exists public.admin (
  id text primary key,
  hash text not null,
  salt text not null
);

-- Contatori anti-abuso (tentativi PIN sbagliati, iscrizioni "avvisami").
create table if not exists public.rate_hits (
  id bigserial primary key,
  kind text not null,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_kind_ip_at on public.rate_hits (kind, ip, at);

alter table public.beers enable row level security;
alter table public.settings enable row level security;
alter table public.ratings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sessions enable row level security;
alter table public.backups enable row level security;
alter table public.admin enable row level security;
alter table public.rate_hits enable row level security;

-- Statistiche voti per la dashboard (media e numero per birra).
create or replace function public.rating_stats()
returns table (beer_id text, avg double precision, count bigint)
language sql stable security invoker set search_path = public
as $$
  select beer_id, round(avg(stars)::numeric, 2)::double precision, count(*)
  from public.ratings group by beer_id
$$;
revoke execute on function public.rating_stats() from public, anon, authenticated;
grant execute on function public.rating_stats() to service_role;

-- Backup completo di birre + info locale + voti.
create or replace function public.create_backup(p_kind text)
returns table (id text, created_at timestamptz, kind text, beer_count integer)
language plpgsql security invoker set search_path = public
as $$
declare
  v_beers jsonb;
  v_id text := gen_random_uuid()::text;
begin
  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) into v_beers from public.beers b;
  insert into public.backups (id, created_at, kind, beer_count, data)
  values (
    v_id, now(), p_kind, jsonb_array_length(v_beers),
    jsonb_build_object(
      'beers', v_beers,
      'settings', (select s.data from public.settings s where s.id = 'main'),
      'ratings', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.ratings r)
    )
  );
  return query select bk.id, bk.created_at, bk.kind, bk.beer_count from public.backups bk where bk.id = v_id;
end;
$$;

-- Sostituisce birre/info/voti con una copia, dopo un backup di sicurezza "pre-restore".
create or replace function public.apply_snapshot(p_snap jsonb)
returns text
language plpgsql security invoker set search_path = public
as $$
declare
  v_safety text;
begin
  select cb.id into v_safety from public.create_backup('pre-restore') cb;
  delete from public.beers where true;
  insert into public.beers
    select * from jsonb_populate_recordset(null::public.beers, coalesce(p_snap->'beers', '[]'::jsonb));
  if p_snap->'settings' is not null and jsonb_typeof(p_snap->'settings') = 'object' then
    insert into public.settings (id, data) values ('main', (p_snap->'settings') - 'id')
    on conflict (id) do update set data = excluded.data;
  end if;
  delete from public.ratings where true;
  insert into public.ratings
    select * from jsonb_populate_recordset(null::public.ratings, coalesce(p_snap->'ratings', '[]'::jsonb));
  delete from public.subscriptions s where not exists (select 1 from public.beers b where b.id = s.beer_id);
  return v_safety;
end;
$$;

create or replace function public.restore_backup(p_id text)
returns text
language plpgsql security invoker set search_path = public
as $$
declare
  v_snap jsonb;
begin
  select data into v_snap from public.backups where id = p_id;
  if v_snap is null then
    return null;
  end if;
  return public.apply_snapshot(v_snap);
end;
$$;

-- Cancella i backup più vecchi di 30 giorni; restituisce le foto non più usate da nessuno.
create or replace function public.prune_backups()
returns table (beer_id text)
language plpgsql security definer set search_path = public, storage
as $$
begin
  delete from public.backups where created_at < now() - interval '30 days';
  return query
    select substring(o.name from 7) as beer_id
    from storage.objects o
    where o.bucket_id = 'images' and o.name like 'beers/%'
      and not exists (select 1 from public.beers b where b.id = substring(o.name from 7))
      and not exists (
        select 1 from public.backups bk, jsonb_array_elements(bk.data->'beers') e
        where e->>'id' = substring(o.name from 7)
      );
end;
$$;

revoke execute on function public.create_backup(text) from public, anon, authenticated;
revoke execute on function public.apply_snapshot(jsonb) from public, anon, authenticated;
revoke execute on function public.restore_backup(text) from public, anon, authenticated;
revoke execute on function public.prune_backups() from public, anon, authenticated;
grant execute on function public.create_backup(text) to service_role;
grant execute on function public.apply_snapshot(jsonb) to service_role;
grant execute on function public.restore_backup(text) to service_role;
grant execute on function public.prune_backups() to service_role;
