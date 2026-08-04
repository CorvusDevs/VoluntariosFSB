#!/bin/bash
# Pone el mismo sello de version en los dos archivos que tienen que coincidir.
# Correr esto ANTES de cada commit que se vaya a publicar: si el sello no cambia,
# el aviso de "hay una version nueva" nunca aparece y volvemos a depurar a ciegas
# un cambio que el telefono todavia no bajo.
set -euo pipefail
cd "$(dirname "$0")/.."
SELLO=$(date +'%Y-%m-%d.%H%M')
cat > js/version.js <<EOF
// Sello de version. GitHub Pages manda cache-control: max-age=600, asi que
// despues de publicar hay hasta 10 minutos donde el telefono sigue corriendo el
// codigo viejo sin pedirlo de nuevo. Sin este sello no habia forma de saber si
// un arreglo ya llego, y se terminaba depurando un problema ya resuelto.
// Lo escribe herramientas/sellar.sh; una prueba falla si se desincroniza de
// version.json.
export const VERSION = '$SELLO'
EOF
printf '{ "version": "%s" }\n' "$SELLO" > version.json
echo "Sello: $SELLO"
