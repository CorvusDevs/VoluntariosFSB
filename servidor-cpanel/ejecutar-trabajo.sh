#!/bin/sh
set -eu

RAIZ=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TRABAJO=${1:-}

case "$TRABAJO" in
  correos) ARCHIVO="$RAIZ/servidor-cpanel/procesar-cola-correos.mjs" ;;
  mantenimiento) ARCHIVO="$RAIZ/servidor-cpanel/mantenimiento-sistema.mjs" ;;
  *)
    echo "Trabajo desconocido. Usá correos o mantenimiento." >&2
    exit 64
    ;;
esac

NODE_ENCONTRADO=${NODE_BIN:-}
if [ -n "$NODE_ENCONTRADO" ] && [ ! -x "$NODE_ENCONTRADO" ]; then
  echo "NODE_BIN no apunta a un ejecutable." >&2
  exit 69
fi

if [ -z "$NODE_ENCONTRADO" ] && [ -r "$RAIZ/.htaccess" ]; then
  CANDIDATO_HTACCESS=$(awk '$1 == "PassengerNodejs" { print $2; exit }' "$RAIZ/.htaccess")
  if [ -n "$CANDIDATO_HTACCESS" ] && [ -x "$CANDIDATO_HTACCESS" ]; then
    NODE_ENCONTRADO=$CANDIDATO_HTACCESS
  fi
fi

if [ -z "$NODE_ENCONTRADO" ]; then
  for CANDIDATO in \
    /etc/cpanel/ea4/passenger.nodejs \
    /opt/alt/alt-nodejs22/root/usr/bin/node \
    /opt/alt/alt-nodejs20/root/usr/bin/node \
    /opt/alt/alt-nodejs18/root/usr/bin/node \
    /opt/cpanel/ea-nodejs22/bin/node \
    /opt/cpanel/ea-nodejs20/bin/node \
    /opt/cpanel/ea-nodejs18/bin/node
  do
    if [ -x "$CANDIDATO" ]; then
      NODE_ENCONTRADO=$CANDIDATO
      break
    fi
  done
fi

if [ -z "$NODE_ENCONTRADO" ] && command -v node >/dev/null 2>&1; then
  NODE_ENCONTRADO=$(command -v node)
fi

if [ -z "$NODE_ENCONTRADO" ]; then
  echo "No se encontró el runtime de Node de Passenger. Definí NODE_BIN con su ruta absoluta." >&2
  exit 69
fi

cd "$RAIZ"
exec "$NODE_ENCONTRADO" "$ARCHIVO"
