# Security Baseline

**Fecha:** 2026-10-28
**Rama:** `chore/security-baseline`
**Último commit de aplicación/CI conocido:** `0b9757d`

## 1. Validaciones

- TypeScript móvil: pasó localmente.
- Lint web: pasó localmente.
- Build de producción web: pasó localmente.
- Workflow `.github/workflows/ci.yml`: creado y enviado a GitHub.
- Ejecución del workflow en GitHub: pendiente de confirmación.
- Estado de Git en la última comprobación: limpio y sincronizado.

## 2. Riesgos pendientes

### Dependencias
La auditoría previa de npm informó 8 vulnerabilidades: 5 bajas y 3 altas.
Se debe volver a ejecutar `npm audit` y evaluar las versiones afectadas y las correcciones compatibles.
No ejecutar `npm audit fix --force` sin analizar el impacto y los cambios de versión.

### Backend y base de datos
`packages/api-client/src/index.ts` contiene únicamente `export {}`.
No se encontraron referencias activas a Supabase en los archivos revisados.
No se encontraron migraciones SQL ni políticas RLS en la revisión realizada.
La autenticación, el esquema de base de datos y las políticas de autorización están pendientes.

### Variables de entorno
`.env.example` declara:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

`.gitignore` contiene reglas para ignorar archivos `.env` y permite `.env.example`.
Las variables `EXPO_PUBLIC_*` son accesibles desde el cliente. Nunca incluir claves `service_role`, contraseñas ni secretos privados en ellas.

### Credenciales
Una búsqueda básica no detectó coincidencias con algunos patrones de credenciales conocidas.
Esto no demuestra que el repositorio esté libre de secretos.

## 3. Criterios para cerrar la baseline

- Confirmar que el workflow de GitHub Actions finaliza correctamente.
- Volver a evaluar las vulnerabilidades y documentar su resolución o aceptación temporal.
- Mantener el repositorio limpio y sincronizado.
- No considerar auditado el backend hasta implementar y probar autenticación, autorización y RLS.
