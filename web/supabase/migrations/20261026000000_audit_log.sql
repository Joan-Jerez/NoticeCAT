-- Registro de acciones (auditoría): quién hizo qué, cuándo y en qué medio.
-- Solo lo escribe y lo lee el servidor con service role. RLS activo y sin
-- políticas: anon y authenticated no pueden ni leerlo ni tocarlo.

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,                 -- copia: sigue legible si la cuenta se borra
  org_id uuid references organizations(id) on delete set null,
  action text not null,             -- 'auth.signin', 'article.published', 'platform.user.blocked'…
  target_type text,                 -- 'article', 'user', 'org', 'section', 'domain'…
  target_id text,
  summary text not null default '', -- frase legible para la tabla del panel
  details jsonb not null default '{}',
  ip_hash text                      -- hash con sal, nunca la IP en claro
);

create index on audit_log (at desc);
create index on audit_log (actor_id, at desc);
create index on audit_log (org_id, at desc);
create index on audit_log (action, at desc);

alter table audit_log enable row level security;
revoke all on audit_log from anon, authenticated;
