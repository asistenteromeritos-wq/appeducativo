# Next Sprint: Supabase Backend

## Objetivo
Preparar una integración segura de Supabase con PostgreSQL, Auth y Row Level Security (RLS), compatible con las aplicaciones móvil y web.

## Tareas

1. **Definir requisitos y roles**
   - Identificar tipos de usuario y permisos.
   - Definir qué datos puede consultar, crear, modificar y eliminar cada rol.
   - Confirmar las entidades y relaciones del modelo de datos antes de crear tablas.

2. **Configurar entornos**
   - Definir variables separadas para móvil y web cuando corresponda.
   - Documentar la configuración local sin incluir valores secretos.
   - Mantener las claves privadas fuera del cliente y del repositorio.

3. **Implementar el cliente compartido**
   - Evaluar `@supabase/supabase-js` en `packages/api-client`.
   - Definir cómo se inyecta la configuración para web y móvil.
   - Manejar sesión, errores y cierre de sesión de forma consistente.

4. **Diseñar la base de datos**
   - Crear migraciones SQL versionadas.
   - Definir claves, relaciones, restricciones e índices necesarios.
   - Evitar aplicar cambios manuales no reproducibles en producción.

5. **Implementar Auth y autorización**
   - Definir registro/inicio de sesión y recuperación de acceso según requisitos.
   - Establecer políticas RLS de mínimo privilegio para cada tabla expuesta.
   - No confiar únicamente en validaciones de interfaz o filtros del cliente.

6. **Probar seguridad**
   - Probar accesos permitidos y denegados para cada rol.
   - Verificar que un usuario no pueda leer o modificar datos de otro sin autorización.
   - Probar acceso anónimo, sesión expirada y operaciones no autorizadas.
   - No considerar la implementación terminada sin evidencia de pruebas.

7. **Integrar en CI**
   - Mantener tipado, lint y build.
   - Añadir comprobaciones de migraciones y pruebas de políticas cuando exista una configuración reproducible.
   - Gestionar secretos de CI mediante configuración segura, no mediante archivos versionados.

## Criterios de aceptación

- Esquema y migraciones versionados.
- Autenticación funcional según los requisitos acordados.
- Políticas RLS activas y probadas en las tablas correspondientes.
- Ninguna clave privada incluida en la aplicación cliente.
- Pruebas y workflow de GitHub con resultado satisfactorio.
- Documentación de variables de entorno y pasos de configuración.

## Dependencias y decisiones pendientes

- Confirmar los roles y permisos de negocio.
- Definir el modelo de datos.
- Confirmar el resultado del workflow actual de GitHub Actions.
- Reevaluar las vulnerabilidades de npm antes de cerrar la baseline.
