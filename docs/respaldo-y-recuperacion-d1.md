# Respaldo y recuperación de Aletea

## Objetivo

Conservar una exportación verificable de Cloudflare D1 y comprobar que puede restaurarse antes de necesitarla. El respaldo contiene información institucional y debe guardarse en almacenamiento cifrado con acceso restringido.

## Frecuencia recomendada

- Respaldo diario mientras el gestor tenga actividad.
- Respaldo adicional antes de cada migración o publicación que cambie la base.
- Retención sugerida: 14 copias diarias, 8 semanales y 12 mensuales.
- Objetivo de pérdida máxima: 24 horas.
- Objetivo de recuperación: 4 horas desde que se autoriza la restauración.

## Crear y verificar

La exportación remota requiere autorización explícita, una sesión válida de Wrangler y una frase secreta de al menos 16 caracteres. La frase no se escribe en archivos ni se muestra en la salida:

```sh
export ALETEA_BACKUP_PASSPHRASE='frase-larga-guardada-en-un-gestor-seguro'
npm run respaldo:crear -- --confirmar-remoto
npm run respaldo:verificar -- respaldos/AAAA-MM-DD_hh-mm-ss
```

Cada carpeta incluye el SQL cifrado con AES-256-GCM y scrypt, además de `manifest.json`, con fecha, tamaño y SHA-256. El SQL sin cifrar se elimina apenas termina el cifrado. La verificación descifra en memoria, restaura el SQL en una base temporal, ejecuta la comprobación de integridad y revisa las claves foráneas. No modifica D1.

## Ensayo de recuperación

Crear primero una base D1 vacía y usar su nombre como destino:

```sh
npm run respaldo:preparar-recuperacion -- respaldos/AAAA-MM-DD_hh-mm-ss nombre-base-vacia
```

El asistente verifica el respaldo, crea un SQL temporal con permisos exclusivos para el usuario y muestra el comando de Wrangler, pero no lo ejecuta. Antes de ejecutar ese comando hay que confirmar que el destino está vacío, conservar la base original y obtener autorización específica para la escritura remota. El SQL temporal debe eliminarse apenas termina el ensayo.

Después de importar, comprobar las tablas principales, una cuenta de prueba, la agenda, tareas, formularios y registro institucional. Recién entonces cambiar el binding de Pages si la recuperación reemplazará a la base anterior.
