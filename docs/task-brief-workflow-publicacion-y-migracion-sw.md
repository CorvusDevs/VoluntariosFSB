# Brief: publicación coherente y migración del service worker

## Objetivo

Evitar publicaciones con archivos de versiones distintas y garantizar que una sesión controlada por el service worker anterior pueda salir de esa copia sin perder datos institucionales.

## Alcance

- Reglas locales de publicación y auditoría.
- Sello de build con fecha y huella de contenido.
- Auditoría del paquete `dist/` y de sus referencias.
- Recuperación segura de navegadores controlados por un worker anterior.
- Pruebas automáticas del flujo de recuperación.

No incluye publicar en cPanel ni modificar la base de datos.

## Evidencia mínima

- La auditoría rechaza sellos incoherentes, rutas sin sello y archivos protegidos dentro de `dist/`.
- La recuperación desregistra workers, elimina solamente caches de la aplicación y abre una URL sellada sin control anterior.
- Las pruebas específicas y la suite completa pasan.
- `git diff --check` y la auditoría de guiones no encuentran errores nuevos.

## Condición de cierre

No declarar resuelto si solo coincide `version.json`. Deben coincidir el sello visible, el JavaScript, el CSS y el worker del paquete final. La prueba de migración debe partir de un controlador anterior.

## Esfuerzo

Alto, porque el defecto depende del ciclo de vida del navegador y no solo de archivos estáticos.
