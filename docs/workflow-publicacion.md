# Workflow de publicación

## 1. Preparar un único build

```sh
npm run preparar:publicacion
```

Este comando genera un sello con fecha y huella de contenido, lo aplica a la aplicación, crea `dist/` y audita el paquete. `version.json`, JavaScript, CSS, HTML y `sw.js` deben salir del mismo proceso.

Los recursos versionados viven en `release/<version>/`. Una publicación nueva agrega una ruta inmutable en lugar de reutilizar archivos de otra versión.

## 2. Puertas obligatorias

```sh
npm run auditar:publicacion
npm test
```

La auditoría debe fallar si:

- Los sellos no coinciden.
- El HTML apunta a recursos de otro build.
- Falta la página estable de recuperación.
- `dist/` contiene `.htaccess`, secretos, archivos de entorno, migraciones, código de servidor o `node_modules`.
- El paquete contiene referencias públicas a rutas de desarrollo.

## 3. Prueba de actualización

Probar dos casos:

1. Navegador sin worker previo.
2. Navegador controlado por el worker del build anterior.

En el segundo caso, la recuperación debe desregistrar el worker, limpiar solo las caches `voluntarios-fsb-*` y abrir `/?actualizada=<version>&v=<version>`. El sello visible después de la recarga debe ser el nuevo.

No alcanza con comprobar que `version.json` cambió. Si la interfaz muestra otro sello, se detiene la revisión funcional y se corrige la migración.

## 4. Preparar un recibo reutilizable

La simulación completa ejecuta las puertas, construye las tres capas y guarda exactamente los ZIP revisados junto con tamaño, SHA-256 del archivo, huella determinista del contenido, listado interno y sellos:

```sh
npm run publicar:cpanel:simular -- --web-root "/ruta/local/a/aletea-web"
```

El recibo queda en `.aletea-publicacion/<sello>/recibo.json`. Esa carpeta es local, está ignorada por Git y no contiene credenciales. El comando informa la ruta exacta que debe usarse para publicar el mismo artefacto sin volver a construir ni repetir la matriz de aceptación.

La página pública tiene además una huella combinada de sus fuentes y del contenido publicado por el CMS. Solo si ninguno cambió, una simulación posterior reutiliza su último ZIP validado y omite sus pruebas y construcción. Un cambio editorial, como activar una red social, invalida automáticamente el paquete anterior. La suite completa, construcción y auditoría del gestor se mantienen porque sí pueden existir cambios allí.

Modificar un ZIP, cambiar su listado o intentar usarlo desde otra carpeta invalida el recibo. `--sin-construir` sin `--recibo` se rechaza para evitar publicar un conjunto que no sea el que pasó las puertas.

## 5. Publicar sin mezclar capas

- Conservar el `.htaccess` y la configuración Passenger que ya pertenecen al servidor.
- Generar el paquete de cPanel únicamente con `npm run empaquetar:cpanel`.
- El paquete debe tener `version.json`, `index.html`, `js/` y `css/` en su raíz. La auditoría rechaza un ZIP que conserve `dist/` como carpeta superior.
- La publicación habitual reutiliza el recibo exacto y opera mediante las API de archivos de cPanel:

```sh
npm run publicar:cpanel -- --recibo "/ruta/al/proyecto/.aletea-publicacion/<sello>/recibo.json" --web-root "/ruta/local/a/aletea-web"
```

- El flujo sube un ZIP por capa a un directorio privado, verifica su tamaño, extrae en staging y compara las entradas y el sello con el recibo antes de activar nada.
- Cada capa se omite cuando su huella determinista de contenido coincide con el último estado confirmado. Esto no depende de fechas u otros metadatos internos del ZIP. El SHA-256 del archivo se conserva para comprobar que el artefacto aprobado no fue alterado. `--forzar-todo` permite un reemplazo completo y explícito cuando se necesita reparar deriva.
- Los elementos administrados se mueven primero a un respaldo privado y los nuevos se promueven por grupos desde staging. Se conservan los dos respaldos más recientes.
- Si falla extracción, dependencias, reinicio, hashes o rutas vivas, el comando restaura las capas anteriores y reinicia Passenger con esa versión.
- `.htaccess` se excluye de las tres capas. El sistema los busca recursivamente y compara la huella de cada archivo activo antes y después, por lo que también detecta un `.htaccess` anidado y revierte cualquier cambio.
- `package-lock.json` se compara mediante SHA-256. Application Manager solamente instala dependencias cuando esa huella cambia y vuelve a resolverlas si resulta necesario restaurar.
- La publicación no descarga ni reemplaza cientos de archivos uno por uno. El estado y los respaldos viven fuera de los documentos públicos, dentro de `.aletea-deploy`.
- Una falla de limpieza posterior no desactiva una versión ya verificada. Los temporales quedan disponibles para revisión y se retiran en la siguiente ejecución.
- No armar ni corregir los ZIP manualmente. El recibo y el empaquetador aplican la lista permitida y excluyen `.htaccess`, secretos, migraciones y `node_modules`.
- El Administrador de archivos queda como vía manual de recuperación, no como procedimiento normal.
- La matriz visual usa dos trabajadores por defecto. Ejecuta todo el comportamiento en escritorio y teléfono de 390 px, y reserva los otros seis tamaños para los casos marcados como responsivos, de accesibilidad y regresión visual. Puede volver temporalmente a un trabajador con `PLAYWRIGHT_WORKERS=1` para diagnosticar una prueba inestable.
- El flujo API usa `cpanel.aletea.org`, que entrega JSON en `/execute/...` y `/json-api/cpanel`. El hostname `adriana.servidorlinux11.com` se reserva para SFTP y no debe reutilizarse como endpoint API.

## 6. Recuperación por SFTP

La ruta anterior se conserva como fallback independiente con clave dedicada, host verificado, respaldo archivo por archivo y rollback automático:

```sh
npm run publicar:cpanel:sftp -- --web-root "/ruta/local/a/aletea-web"
```

- La clave privada nunca vive en cPanel ni en el repositorio. La clave dedicada predeterminada es `~/.ssh/aletea_deploy_ed25519`; cPanel conserva únicamente su parte pública.
- El token de cPanel queda guardado una sola vez en Keychain con el servicio `aletea-cpanel-deploy`; nunca se escribe en archivos ni se envía por SFTP.
- El servidor usa `adriana.servidorlinux11.com`, usuario `aleteaor` y puerto `2200`. La cuenta permite SFTP, aunque el proveedor mantenga deshabilitada la terminal.
- La configuración local opcional vive en `~/.config/aletea/publicacion.json` y puede definir `sshHost`, `sshUser`, `sshPort`, `sshKey` y `webRoot`, pero nunca secretos.

## 7. Verificación viva

- Comparar SHA-256 local y remoto de `version.json`, `sw.js`, los módulos de entrada y el CSS del lanzamiento.
- Probar `/`, `/tareas`, `/formularios` y `/api/health` dos veces.
- Exigir que `/api/health` responda `200`, `ok: true` y `cache-control: no-store`.
- Confirmar que `.htaccess`, archivos de entorno, migraciones y código privado devuelven 403 o 404.
- Abrir una sesión limpia y otra que haya usado el build anterior.

La publicación termina únicamente cuando ambas sesiones muestran el mismo sello y la misma interfaz.

## 8. Recuperación del navegador

`actualizar.html` es una ruta estable y no depende del módulo principal. Desregistra workers y elimina solamente caches propias. También se puede abrir `/?sw=off` para ejecutar la salida de emergencia desde la aplicación.
