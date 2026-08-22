# SushiClub Carta — TypeScript build

Rama `type`: frontend propio en TypeScript, tooling de Pages/Handoff en TypeScript/Node y runtime JavaScript generado durante el build.

## Requisitos

- Node.js 22+
- `npm ci`

## Comandos

- `npm run typecheck`: valida TypeScript de browser y tooling.
- `npm run validate`: compila runtime y valida boundaries/contratos de la aplicación.
- `npm run build:pages`: genera `.pages-site`.
- `npm run build:handoff`: genera `handoff/` reproducible.
- `npm run validate:handoff`: valida el handoff generado.
- `npm run ci`: ejecuta el pipeline completo de validación y builds.

Los directorios legacy `js/` y `_js_dev/` se conservan sin migrar. El código propio fuera de esos directorios no debe introducir fuentes `.js`, `.mjs`, `.py`, `.sh` ni `requirements.txt`; esa frontera se verifica con `scripts/validate-source-boundary.ts`.
