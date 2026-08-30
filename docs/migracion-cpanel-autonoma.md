# Migración autónoma del CMS a cPanel

## Resultado

`gestor.aletea.org` sirve la interfaz, la API y los datos desde el hosting de cPanel. Cloudflare deja de participar del funcionamiento diario. La versión anterior se conserva temporalmente, en modo de solo lectura, hasta completar la verificación y la ventana de reversión.

## Arquitectura

- Phusion Passenger ejecuta `servidor-cpanel/app.mjs` con Node.js.
- MariaDB guarda las 33 tablas institucionales.
- El mismo dominio sirve los archivos de `dist/` y las rutas `/api/`.
- La sesión mantiene cookie `Secure`, `HttpOnly` y `SameSite=Strict`.
- JetBackup protege la cuenta de hosting. Además se conserva una exportación cifrada independiente antes de cada cambio de esquema.

## Preparación local

```sh
npm install
npm run construir:cloudflare
npm run esquema:cpanel
npm test -- --run
```

El nombre `construir:cloudflare` se conserva por compatibilidad, pero el resultado `dist/` es estático y también lo sirve cPanel.

## Preparación en cPanel

1. Crear `gestor.aletea.org` sin alterar `aletea.org`.
2. Crear una base MariaDB y una cuenta exclusiva con permisos solo sobre esa base.
3. Registrar una aplicación de producción en Application Manager, asociada al subdominio y al directorio del CMS.
4. Configurar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECTION_LIMIT`, `SESSION_SECRET` y `NODE_ENV` como variables de la aplicación.
5. Instalar dependencias y generar `dist/` antes de iniciar Passenger.

Los secretos se ingresan en cPanel. No se guardan en Git, archivos públicos ni conversaciones.

## Crear el esquema

Con la base nueva y vacía:

```sh
npm run migraciones:cpanel -- --confirmar
```

El comando se detiene si faltan variables o si no logra crear al menos 25 tablas. El esquema generado actualmente contiene 33.

## Trasladar los datos

1. Crear y verificar un respaldo cifrado de D1.
2. Exportar D1 a un SQL temporal local.
3. Confirmar que la base MariaDB de destino está vacía.
4. Ejecutar:

```sh
npm run importar:cpanel -- /ruta/temporal/exportacion-d1.sql --confirmar
```

El importador no reemplaza tablas con datos. Crea una base SQLite temporal, copia cada tabla dentro de una transacción, compara las cantidades y elimina el archivo temporal. El SQL de origen debe eliminarse inmediatamente después de verificar la migración.

## Verificación antes del corte

- Ingreso y cierre de sesión.
- Usuarios, perfiles, equipos y permisos.
- Documentos, fotos y datos protegidos.
- Agenda, tareas, proyectos, formularios y reportes.
- Escritura concurrente y control de revisiones.
- Conteo de filas por cada tabla.
- HTTPS, cookie segura, límites de carga y respuesta móvil.
- Respaldo y restauración de prueba.

El corte se cancela ante cualquier diferencia de datos, error de permisos, ausencia de una cuenta administradora o fallo de restauración.

## Corte y reversión

1. Poner la versión de Cloudflare en solo lectura.
2. Crear un último respaldo verificado y repetir la importación sobre una base MariaDB nueva y vacía.
3. Validar las funciones críticas en `gestor.aletea.org`.
4. Habilitar el trabajo normal en cPanel.
5. Conservar Cloudflare y el respaldo final sin modificaciones durante la ventana acordada.

Si falla una comprobación, se deshabilita temporalmente la aplicación de cPanel y se vuelve a la versión anterior sin borrar ninguna de las dos bases.
