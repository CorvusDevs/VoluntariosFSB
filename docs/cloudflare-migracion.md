# Migración completa a Cloudflare

## Resultado

Cloudflare pasa a ser la plataforma de producción completa:

- Pages sirve la aplicación web.
- La aplicación autentica a coordinadoras y administradoras.
- Pages Functions aplica permisos y registra cada cambio.
- D1 guarda los documentos operativos y las cuentas autorizadas.
- D1 guarda fotos comprimidas junto con los documentos operativos.
- GitHub conserva solamente el código fuente y un archivo histórico opcional.

GitHub Pages y el repositorio `VoluntariosFSB-datos` dejan de participar del funcionamiento diario después del corte.

## Corte seguro

1. Crear D1 y el proyecto Pages sin cambiar el sitio actual.
2. Configurar una clave de sesión y la primera cuenta de administración.
3. Importar `roster.json`, planillas, asistencias, seguimientos y fotos.
4. Comparar cantidades y huellas entre GitHub y Cloudflare.
5. Probar ingreso, lectura, escritura, conflictos, reportes y uso móvil.
6. Poner el sitio Cloudflare en producción.
7. Dejar GitHub Pages en modo informativo durante una ventana breve y luego desactivarlo.

El importador debe poder ejecutarse más de una vez sin duplicar datos. El corte se detiene si falta un archivo, una foto, una persona administradora o una comprobación de seguridad.

## Importación privada

El importador se ejecuta fuera del repositorio público y necesita un token temporal solamente en la variable de entorno `VFSB_GITHUB_TOKEN`.

```sh
node herramientas/importar-datos-cloudflare.mjs --dry-run --out /private/tmp/vfsb-importacion
```

El primer paso descarga y valida los archivos, pero no modifica D1. Revisá `resumen.json` y sus huellas SHA-256. Después, ejecutá cada `lote-*.sql` con `wrangler d1 execute ... --remote --file`. Las fotos se fragmentan para respetar el límite de 100 KB por sentencia de D1. Los lotes son idempotentes: no sustituyen información que ya se haya escrito en D1. Borrá la carpeta temporal al terminar.

## Modelo inicial

La primera migración conserva los documentos JSON actuales en D1. Cada documento tiene una revisión numérica para impedir que dos coordinadoras se pisen. Las fotos JPEG, limitadas a 500 KB, se guardan por clave en D1. Esta forma reduce el riesgo del corte y permite normalizar luego tareas, eventos y equipos en tablas propias.

Las nuevas capacidades organizativas se agregan sobre entidades compartidas:

- personas y equipos
- eventos y asistencias
- tareas, responsables y fechas límite
- documentos y adjuntos
- roles y permisos
- registro de actividad

## Seguridad

El navegador no recibe tokens de GitHub ni secretos de Cloudflare. D1 guarda una sal y un derivado PBKDF2 de cada contraseña, nunca la contraseña. La Function entrega una cookie de sesión firmada, segura y de duración limitada. Las operaciones de administración exigen el rol `admin`. Todos los cambios guardan autor, fecha, acción y recurso.

Los secretos de importación se proporcionan solamente como variables de entorno locales o secretos de Cloudflare. Nunca se guardan en este repositorio.
