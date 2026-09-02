#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

if [[ "${1:-}" != "--sin-construir" ]]; then
  npm run preparar:publicacion
fi

VERSION="$(node -e "const fs=require('fs'); process.stdout.write(JSON.parse(fs.readFileSync('dist/version.json','utf8')).version)")"
SALIDA="${SALIDA_CPANEL:-/private/tmp/gestor-aletea-root-${VERSION}.zip}"
ETAPA="$(mktemp -d /private/tmp/gestor-cpanel.XXXXXX)"
trap 'rm -rf "$ETAPA"' EXIT

cp -R dist/. "$ETAPA/"
mkdir -p "$ETAPA/functions/api" "$ETAPA/servidor-cpanel" "$ETAPA/js"
cp 'functions/api/[[ruta]].js' "$ETAPA/functions/api/"
cp servidor-cpanel/app.mjs servidor-cpanel/base-mysql.mjs servidor-cpanel/cache-estaticos.mjs \
  servidor-cpanel/cargar-entorno.mjs servidor-cpanel/migraciones.mjs servidor-cpanel/rutas-web.mjs \
  servidor-cpanel/procesar-cola-correos.mjs servidor-cpanel/registro-operaciones.mjs servidor-cpanel/mantenimiento-sistema.mjs \
  servidor-cpanel/ejecutar-trabajo.sh \
  "$ETAPA/servidor-cpanel/"
cp js/rutas-gestor.js "$ETAPA/js/"
cp app.js package.json package-lock.json "$ETAPA/"

test -f "$ETAPA/version.json"
test -f "$ETAPA/index.html"
test -f "$ETAPA/js/app.js"
test -f "$ETAPA/css/estilos.css"
test ! -e "$ETAPA/dist"
test ! -e "$ETAPA/.htaccess"

(cd "$ETAPA" && zip -qr "$SALIDA" .)

LISTA="$(unzip -Z1 "$SALIDA")"
if grep -Eq '(^|/)(\.htaccess|\.env([^/]*)?|node_modules|migrations)(/|$)|^dist/' <<<"$LISTA"; then
  echo "El paquete de cPanel contiene una ruta prohibida." >&2
  exit 1
fi
for REQUERIDO in version.json index.html js/app.js css/estilos.css app.js 'functions/api/[[ruta]].js' servidor-cpanel/app.mjs servidor-cpanel/procesar-cola-correos.mjs servidor-cpanel/registro-operaciones.mjs servidor-cpanel/mantenimiento-sistema.mjs servidor-cpanel/ejecutar-trabajo.sh; do
  grep -Fqx "$REQUERIDO" <<<"$LISTA" || { echo "Falta $REQUERIDO en la raíz del paquete." >&2; exit 1; }
done

echo "Paquete cPanel: $SALIDA"
shasum -a 256 "$SALIDA"
