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

## 4. Publicar sin mezclar capas

- Conservar el `.htaccess` y la configuración Passenger que ya pertenecen al servidor.
- Generar el paquete de cPanel únicamente con `npm run empaquetar:cpanel`.
- El paquete debe tener `version.json`, `index.html`, `js/` y `css/` en su raíz. La auditoría rechaza un ZIP que conserve `dist/` como carpeta superior.
- La publicación habitual se ejecuta mediante SFTP con una clave dedicada, no desde el Administrador de archivos:

```sh
npm run publicar:cpanel -- --web-root "/ruta/local/a/aletea-web"
```

- Antes de una publicación real se puede preparar y auditar todo sin modificar el servidor:

```sh
npm run publicar:cpanel:simular -- --web-root "/ruta/local/a/aletea-web"
```

- El comando construye tres capas separadas: raíz del gestor, `dist/` de Passenger y página de prueba. Respalda cada archivo que reemplazará, transfiere con nombres temporales, activa cada archivo y reinicia Passenger al final.
- La clave privada nunca vive en cPanel ni en el repositorio. La clave dedicada predeterminada es `~/.ssh/aletea_deploy_ed25519`; cPanel conserva únicamente su parte pública.
- El servidor usa `adriana.servidorlinux11.com`, usuario `aleteaor` y puerto `2200`. La cuenta permite SFTP, aunque el proveedor mantenga deshabilitada la terminal.
- La configuración local opcional vive en `~/.config/aletea/publicacion.json` y puede definir `sshHost`, `sshUser`, `sshPort`, `sshKey` y `webRoot`, pero nunca secretos.
- Si falla la transferencia, el reinicio o la verificación viva, el comando restaura automáticamente los archivos que estaban publicados y vuelve a reiniciar Passenger.
- No armar ni corregir el ZIP manualmente. El empaquetador usa una lista permitida para el código de aplicación y excluye `.htaccess`, secretos y migraciones.
- La interfaz de cPanel queda como vía de recuperación, no como procedimiento normal.
- `npm run publicar:cpanel:api` conserva la vía anterior de API solo como recuperación avanzada.

## 5. Verificación viva

- Comparar SHA-256 local y remoto de `version.json`, `sw.js`, los módulos de entrada y el CSS del lanzamiento.
- Probar `/`, `/tareas`, `/formularios` y `/api/health` dos veces.
- Exigir que `/api/health` responda `200`, `ok: true` y `cache-control: no-store`.
- Confirmar que `.htaccess`, archivos de entorno, migraciones y código privado devuelven 403 o 404.
- Abrir una sesión limpia y otra que haya usado el build anterior.

La publicación termina únicamente cuando ambas sesiones muestran el mismo sello y la misma interfaz.

## 6. Recuperación

`actualizar.html` es una ruta estable y no depende del módulo principal. Desregistra workers y elimina solamente caches propias. También se puede abrir `/?sw=off` para ejecutar la salida de emergencia desde la aplicación.
