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

La página pública tiene además una huella combinada de sus fuentes y del contenido publicado por el CMS. El gestor tiene una huella separada de sus fuentes de producción. Si una capa no cambió desde el último recibo válido, se reutiliza exactamente su ZIP anterior y se omiten sus pruebas y construcción. Un cambio editorial, como activar una red social, invalida automáticamente el paquete de la página.

Para una corrección web pequeña y confinada a una sola sección se puede reducir la matriz de aceptación con un filtro que identifique sus pruebas:

```sh
npm run publicar:cpanel:simular -- --web-root "/ruta/local/a/aletea-web" --filtro-aceptacion "recorrido electoral"
```

Este modo siempre ejecuta las pruebas unitarias de la web, las pruebas de aceptación coincidentes y la construcción completa de staging. Solo omite pruebas de aceptación ajenas y la auditoría de enlaces externos. El recibo registra que la validación fue `web-enfocada` y conserva el filtro utilizado.

Usar validación completa, sin filtro, cuando el cambio afecte navegación compartida, estilos globales, accesibilidad transversal, enlaces externos, configuración de Astro o Playwright, dependencias, service worker, contrato del CMS, autenticación, servidor o más de una sección. Ante cualquier duda se usa la validación completa. Si la huella del gestor cambió o todavía no existe un recibo compatible, el comando ignora el modo enfocado y escala automáticamente a la batería completa.

Modificar un ZIP, cambiar su listado o intentar usarlo desde otra carpeta invalida el recibo. `--sin-construir` sin `--recibo` se rechaza para evitar publicar un conjunto que no sea el que pasó las puertas.

## 5. Publicar sin mezclar capas

- Conservar el `.htaccess` y la configuración Passenger que ya pertenecen al servidor.
- Generar el paquete de cPanel únicamente con `npm run empaquetar:cpanel`.
- El paquete debe tener `version.json`, `index.html`, `js/` y `css/` en su raíz. La auditoría rechaza un ZIP que conserve `dist/` como carpeta superior.
- La publicación habitual reutiliza el recibo exacto y envía un solo paquete por SFTP al buzón privado de cPanel:

```sh
npm run publicar:cpanel:paquete -- --recibo "/ruta/al/proyecto/.aletea-publicacion/<sello>/recibo.json" --web-root "/ruta/local/a/aletea-web"
```

- El paquete exterior contiene las tres capas aprobadas y un manifiesto con tamaños, SHA-256, destinos y listados internos.
- El archivo se sube primero con nombre temporal. La solicitud solo queda visible después de renombrar tanto el paquete como su marcador de ejecución única.
- Un Cron por minuto ejecuta `servidor-cpanel/ejecutar-trabajo.sh publicacion`. El trabajador reclama el marcador, verifica todo, extrae en staging y activa localmente en el servidor.
- El trabajador conserva `.htaccess`, archivos de entorno, migraciones, `node_modules`, temporales y registros. Los destinos están limitados a `gestor.aletea.org`, su `dist` y `prueba.aletea.org`.
- Antes de confirmar, crea un respaldo privado, reinicia Passenger y exige que las versiones vivas del gestor y la página coincidan. Ante un fallo restaura las capas anteriores.
- El comando local consulta el recibo privado cada cinco segundos y repite después la verificación completa de hashes y rutas vivas.
- Los elementos administrados se mueven primero a un respaldo privado y los nuevos se promueven por grupos desde staging. Se conservan los dos respaldos más recientes.
- Si falla extracción, dependencias, reinicio, hashes o rutas vivas, el comando restaura las capas anteriores y reinicia Passenger con esa versión.
- `.htaccess` se excluye de las tres capas. El sistema los busca recursivamente y compara la huella de cada archivo activo antes y después, por lo que también detecta un `.htaccess` anidado y revierte cualquier cambio.
- `package-lock.json` se compara mediante SHA-256 antes de subir. Un cambio de dependencias se detiene y usa deliberadamente el flujo de recuperación, que puede resolverlas mediante Application Manager.
- La publicación no descarga ni reemplaza cientos de archivos uno por uno. El estado y los respaldos viven fuera de los documentos públicos, dentro de `.aletea-deploy`.
- Los marcadores son de ejecución única. El trabajador elimina el paquete procesado y conserva su recibo y los dos respaldos más recientes.
- No armar ni corregir los ZIP manualmente. El recibo y el empaquetador aplican la lista permitida y excluyen `.htaccess`, secretos, migraciones y `node_modules`.
- El Administrador de archivos queda como vía manual de recuperación, no como procedimiento normal.
- La matriz visual usa dos trabajadores por defecto. Ejecuta todo el comportamiento en escritorio y teléfono de 390 px, y reserva los otros seis tamaños para los casos marcados como responsivos, de accesibilidad y regresión visual. Puede volver temporalmente a un trabajador con `PLAYWRIGHT_WORKERS=1` para diagnosticar una prueba inestable.
- El flujo API anterior queda disponible como alternativa con `npm run publicar:cpanel:api` cuando el proveedor permita JSON en `/execute/...` y `/json-api/cpanel`. Si la protección frontal devuelve HTML, se usa el paquete único sin degradar a cientos de transferencias.

## 6. Recuperación archivo por archivo

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
