# NoticeCAT (web)

Plataforma de noticias para varios medios: Next.js 15 + Supabase.

## Arrancar

```bash
npm install
npm run dev          # http://localhost:3000  (panel: /admin)
```

Sin `.env.local`, la app usa datos de prueba locales (`.data/db.json`; bórralo para reiniciarlos).
En ese modo, `?org=costa` cambia de medio y `?como=user-redactor` cambia el usuario del panel.

## Con Supabase

1. `cp .env.example .env.local` y rellena las claves de tu proyecto.
2. `npx supabase login`, `npx supabase link --project-ref <ref>`, `npm run db:push`.
3. `npm run db:seed -- --remoto` (datos y usuarios de prueba) y `npm run db:test-rls` (comprueba las reglas de acceso).

Pasos completos y checklist de seguridad: `../replica/backend.md`.

## Scripts

| script | hace |
| --- | --- |
| `dev`, `build`, `start` | Next.js |
| `typecheck`, `lint`, `test:e2e` | comprobaciones (e2e con Playwright y Edge) |
| `db:push` | aplica `supabase/migrations` al proyecto enlazado |
| `db:seed` | carga los dos medios de prueba (`--remoto` para un proyecto en la nube) |
| `db:test-rls` | prueba RLS con cuatro identidades |
| `db:start`, `db:stop`, `db:reset` | Supabase local (requiere Docker con virtualización) |
