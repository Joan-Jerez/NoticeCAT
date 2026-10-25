-- NoticeCAT: esquema inicial (Postgres en Supabase)
-- Multi-medio desde el día 1: todo lo que pertenece a un medio lleva org_id.
-- Acceso: row level security en todas las tablas.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- unaccent() no es immutable; este envoltorio permite usarlo en columnas generadas
create or replace function f_unaccent(text) returns text
  language sql immutable parallel safe strict
  as $$ select public.unaccent('public.unaccent', $1) $$;

create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- medios

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  timezone text not null default 'America/Santo_Domingo',
  locale text not null default 'es-DO',
  logo_image_id uuid,                       -- fk añadida tras crear images
  settings jsonb not null default '{}',     -- colores, redes sociales, pie
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table org_domains (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  host text not null unique,                -- 'mimedio.com' o 'mimedio.noticecat.app'
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on org_domains (org_id);
create unique index one_primary_domain on org_domains (org_id) where is_primary;

-- personal del medio (auth.users es de Supabase Auth)
create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','writer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on memberships (user_id);

-- ---------------------------------------------------------------- catálogo

create table images (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  storage_path text not null,               -- bucket 'media/{org_id}/...'
  caption text,
  credit text,
  alt text,
  width int check (width > 0),
  height int check (height > 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on images (org_id, created_at desc);
create index on images (uploaded_by);

alter table organizations
  add constraint organizations_logo_fk
  foreign key (logo_image_id) references images(id) on delete set null;
create index on organizations (logo_image_id);

create table sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  parent_id uuid references sections(id) on delete restrict,  -- no borrar una sección con subsecciones
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  position int not null default 0,
  in_menu boolean not null default true,
  rss_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
-- slug único entre hermanas: /actualidad/nacional y /deportes/nacional pueden convivir
create unique index sections_slug_top on sections (org_id, slug) where parent_id is null;
create unique index sections_slug_child on sections (org_id, parent_id, slug) where parent_id is not null;
create index on sections (org_id, parent_id, position);
create index on sections (parent_id);

create table authors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,  -- columnistas externos no tienen cuenta
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  bio text check (char_length(bio) <= 280),
  photo_image_id uuid references images(id) on delete set null,
  is_columnist boolean not null default false,
  column_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);
create index on authors (user_id);
create index on authors (photo_image_id);
create index on authors (org_id, is_columnist) where is_columnist;

create table tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  kind text not null default 'topic' check (kind in ('topic','place')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);
create index on tags (org_id, kind);

-- ---------------------------------------------------------------- artículos

create table articles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  number bigint generated always as identity,   -- id corto y numérico para la URL
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 300),
  dek text check (char_length(dek) <= 500),     -- bajada
  body jsonb not null default '{}',             -- documento Tiptap (fuente de verdad)
  body_html text not null default '',           -- render guardado al publicar
  body_text text not null default '',           -- texto plano: búsqueda y tiempo de lectura
  reading_minutes int not null default 1 check (reading_minutes >= 1),
  section_id uuid not null references sections(id) on delete restrict,
  author_id uuid references authors(id) on delete set null,
  place_tag_id uuid references tags(id) on delete set null,  -- "Santo Domingo" en la línea de fecha
  cover_image_id uuid references images(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','scheduled','published','archived')),
  published_at timestamptz,
  is_sponsored boolean not null default false,
  is_featured boolean not null default false,   -- candidata a nota destacada de portada
  seo_title text,
  seo_description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('spanish', f_unaccent(coalesce(title,''))), 'A') ||
    setweight(to_tsvector('spanish', f_unaccent(coalesce(dek,''))), 'B') ||
    setweight(to_tsvector('spanish', f_unaccent(coalesce(body_text,''))), 'C')
  ) stored,
  unique (org_id, number),
  -- programada y publicada necesitan fecha; un borrador no
  constraint published_needs_date check (status in ('draft','archived') or published_at is not null)
);
-- listas públicas: siempre "visibles de este medio, más recientes primero"
create index articles_visible on articles (org_id, published_at desc) where status in ('published','scheduled');
create index on articles (section_id, published_at desc);
create index on articles (author_id, published_at desc);
create index on articles (place_tag_id);
create index on articles (cover_image_id);
create index on articles (created_by);
create index on articles (org_id, status, updated_at desc);   -- tabla del dashboard
create index on articles using gin (search);

-- Una nota es pública cuando status es 'published' o 'scheduled' y su hora llegó.
-- Así las programadas salen solas a su hora, sin un job que cambie el estado.
create or replace function article_is_visible(a articles) returns boolean
  language sql stable as $$
  select a.status in ('published','scheduled') and a.published_at <= now()
$$;

create table article_tags (
  article_id uuid not null references articles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  position int not null default 0,
  primary key (article_id, tag_id)
);
create index on article_tags (tag_id);

-- ---------------------------------------------------------------- lectores

-- un mismo email puede ser lector de varios medios; el perfil es por medio
create table readers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on readers (user_id);

create table topic_follows (
  reader_id uuid not null references readers(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reader_id, tag_id)
);
create index on topic_follows (tag_id);

-- ---------------------------------------------------------------- encuestas

create table polls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  question text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  requires_login boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index on polls (org_id, starts_at desc);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  position int not null default 0
);
create index on poll_options (poll_id, position);

create table poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  reader_id uuid references readers(id) on delete set null,
  voter_hash text not null,     -- hash(poll_id + reader_id) o hash(poll_id + ip + user agent + sal)
  created_at timestamptz not null default now(),
  unique (poll_id, voter_hash)  -- un voto por persona: el voto doble lo para la base de datos
);
create index on poll_votes (option_id);
create index on poll_votes (reader_id);

-- ---------------------------------------------------------------- facturación del medio (cliente de NoticeCAT)

create table org_billing (
  org_id uuid primary key references organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'trial' check (plan in ('trial','starter','pro','newsroom')),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled','incomplete')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stripe_events (
  id text primary key,          -- event.id de Stripe: un webhook repetido choca aquí
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- updated_at

do $$
declare t text;
begin
  foreach t in array array['organizations','org_domains','memberships','images','sections',
                           'authors','tags','articles','readers','polls','org_billing']
  loop
    execute format('create trigger %I_updated before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- acceso (RLS)

-- security definer: evita que la política de memberships se llame a sí misma
create or replace function has_role(p_org uuid, p_roles text[]) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where org_id = p_org and user_id = auth.uid() and role = any (p_roles)
  )
$$;

alter table organizations  enable row level security;
alter table org_domains    enable row level security;
alter table memberships    enable row level security;
alter table images         enable row level security;
alter table sections       enable row level security;
alter table authors        enable row level security;
alter table tags           enable row level security;
alter table articles       enable row level security;
alter table article_tags   enable row level security;
alter table readers        enable row level security;
alter table topic_follows  enable row level security;
alter table polls          enable row level security;
alter table poll_options   enable row level security;
alter table poll_votes     enable row level security;
alter table org_billing    enable row level security;
alter table stripe_events  enable row level security;   -- sin políticas: solo service role

-- lectura pública del sitio
create policy public_read on organizations for select using (true);
create policy public_read on org_domains   for select using (verified_at is not null);
create policy public_read on images        for select using (true);
create policy public_read on sections      for select using (true);
create policy public_read on authors       for select using (true);
create policy public_read on tags          for select using (true);
create policy public_read on polls         for select using (starts_at <= now());
create policy public_read on poll_options  for select using (true);
create policy public_read on articles      for select
  using (status in ('published','scheduled') and published_at <= now());
create policy public_read on article_tags  for select
  using (exists (select 1 from articles a where a.id = article_id
                 and a.status in ('published','scheduled') and a.published_at <= now()));

-- personal del medio
create policy staff_all on articles for all
  using (has_role(org_id, array['owner','admin','editor']))
  with check (has_role(org_id, array['owner','admin','editor']));
-- redactor: ve y edita sus notas, pero no publica (lo controla la política)
create policy writer_own on articles for all
  using (has_role(org_id, array['writer']) and created_by = auth.uid())
  with check (has_role(org_id, array['writer']) and created_by = auth.uid()
              and status in ('draft','archived'));

create policy staff_all on article_tags for all
  using (exists (select 1 from articles a where a.id = article_id
                 and (has_role(a.org_id, array['owner','admin','editor'])
                      or (has_role(a.org_id, array['writer']) and a.created_by = auth.uid()))))
  with check (exists (select 1 from articles a where a.id = article_id
                 and (has_role(a.org_id, array['owner','admin','editor'])
                      or (has_role(a.org_id, array['writer']) and a.created_by = auth.uid()))));

create policy staff_all on images for all
  using (has_role(org_id, array['owner','admin','editor','writer']))
  with check (has_role(org_id, array['owner','admin','editor','writer']));

create policy staff_all on sections for all
  using (has_role(org_id, array['owner','admin','editor']))
  with check (has_role(org_id, array['owner','admin','editor']));
create policy staff_all on authors for all
  using (has_role(org_id, array['owner','admin','editor']))
  with check (has_role(org_id, array['owner','admin','editor']));
create policy staff_all on tags for all
  using (has_role(org_id, array['owner','admin','editor','writer']))
  with check (has_role(org_id, array['owner','admin','editor','writer']));
create policy staff_all on polls for all
  using (has_role(org_id, array['owner','admin','editor']))
  with check (has_role(org_id, array['owner','admin','editor']));
create policy staff_all on poll_options for all
  using (exists (select 1 from polls p where p.id = poll_id and has_role(p.org_id, array['owner','admin','editor'])))
  with check (exists (select 1 from polls p where p.id = poll_id and has_role(p.org_id, array['owner','admin','editor'])));

-- dueños y admins gestionan el medio
create policy admin_write on organizations for update
  using (has_role(id, array['owner','admin'])) with check (has_role(id, array['owner','admin']));
create policy admin_all on org_domains for all
  using (has_role(org_id, array['owner','admin'])) with check (has_role(org_id, array['owner','admin']));
create policy see_own_org on memberships for select
  using (user_id = auth.uid() or has_role(org_id, array['owner','admin']));
create policy admin_all on memberships for all
  using (has_role(org_id, array['owner'])) with check (has_role(org_id, array['owner']));
create policy owner_read on org_billing for select
  using (has_role(org_id, array['owner']));   -- escrituras: solo el webhook con service role

-- lectores: cada uno ve y toca solo lo suyo
create policy own on readers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on topic_follows for all
  using (exists (select 1 from readers r where r.id = reader_id and r.user_id = auth.uid()))
  with check (exists (select 1 from readers r where r.id = reader_id and r.user_id = auth.uid()));
-- los votos se insertan desde una server action con service role (calcula voter_hash);
-- los conteos se leen con esta vista, nunca los votos individuales
create view poll_results with (security_invoker = false) as
  select option_id, count(*)::int as votes from poll_votes group by option_id;
