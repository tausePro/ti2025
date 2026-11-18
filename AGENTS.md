<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Talento Inmobiliario

- Responder y documentar en español. No usar datos simulados.
- Verificación: `npm test` (Vitest, `**/__tests__/**/*.test.ts`), `npm run type-check`, `npm run build`. `npm run lint` global tiene deuda heredada: revisar con `npx eslint <archivos tocados>`.
- Migraciones de Supabase en `supabase/migrations/NNN_*.sql`: aditivas e idempotentes, con su rollback en `supabase/fixes-history/`. Las aplica el propietario en el SQL Editor.
- Archivo histórico de WordPress: importador en `scripts/wp-legacy/migrate.mjs` (uso en su cabecera). Sus datos de trabajo, incluido `mapping.json`, viven fuera del repositorio en `../ti-wp-migration-data/` porque contienen datos personales y el repositorio es público.
