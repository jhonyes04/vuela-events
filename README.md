# Vuela Events

Calendario de eventos de Puntos Vuela. Acceso solo con cuentas de Google
`@puntosvuela.es`. Roles: `admin`, `dt` y `ail`.

## Stack

- Backend: Node 22 + Express 5 + TypeScript, Prisma 7, PostgreSQL 18.
- Frontend: Vite + React 19 + Tailwind 4 + shadcn/ui.

## Puesta en marcha (desarrollo)

1. Crear la base de datos `vuela_events` y su rol (ver `backend/.env.example`).
2. `backend/.env` a partir de `backend/.env.example`; `frontend/.env` a partir
   de `frontend/.env.example`. Nunca se suben a git.
3. En `backend/` y en `frontend/`: `pnpm install`.
4. En `backend/`: `pnpm db:generate` y `pnpm db:migrate`.
5. Arrancar: `pnpm dev` en `backend/` (puerto 3001) y en `frontend/` (puerto 3000).

## Tests (backend)

- `pnpm test`: unitarios.
- `pnpm test:int`: integración. Usan una base `vuela_events_test` y un
  `backend/.env.test`; se niegan a ejecutarse contra otra base.

## Seguridad

- El servidor verifica el token de Google, el dominio exacto y el nonce.
- La sesión es una cookie `HttpOnly`; el rol se lee de la base de datos en
  cada petición.
- Todo permiso se aplica en el backend; la interfaz solo oculta opciones.
