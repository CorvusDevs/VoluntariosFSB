#!/bin/bash
# Pone el mismo sello de version en los dos archivos que tienen que coincidir.
# Correr esto ANTES de cada commit que se vaya a publicar: si el sello no cambia,
# el aviso de "hay una version nueva" nunca aparece y volvemos a depurar a ciegas
# un cambio que el telefono todavia no bajo.
set -euo pipefail
cd "$(dirname "$0")/.."
FECHA=$(date +'%Y-%m-%d.%H%M')
# La fecha ayuda a soporte y la huella confirma que dos sellos iguales contienen
# exactamente las mismas fuentes. Normalizamos los sellos generados para evitar
# que la huella dependa de si sellar.sh ya se ejecuto una vez.
HUELLA=$(python3 - <<'PY'
import hashlib, pathlib, re

rutas = [pathlib.Path('index.html'), pathlib.Path('formulario.html'), pathlib.Path('actualizar.html'), pathlib.Path('sw.js')]
for carpeta in ('css', 'js'):
    rutas.extend(sorted(p for p in pathlib.Path(carpeta).rglob('*') if p.is_file()))

huella = hashlib.sha256()
for ruta in sorted(rutas, key=lambda p: str(p)):
    texto = ruta.read_text(errors='surrogateescape')
    texto = re.sub(r"(VERSION\s*=\s*')[^']*'", r"\1__BUILD__'", texto)
    texto = re.sub(r"(version\s*=\s*')[^']*'", r"\1__BUILD__'", texto)
    texto = re.sub(r'([?&]v=)[^"&]+', r'\1__BUILD__', texto)
    huella.update(str(ruta).encode())
    huella.update(b'\0')
    huella.update(texto.encode(errors='surrogateescape'))
    huella.update(b'\0')
print(huella.hexdigest()[:10])
PY
)
SELLO="${FECHA}-${HUELLA}"
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
# El nombre de la cache del service worker lleva el sello: sin esto la cache
# vieja sobrevive a la publicacion y el trabajador sirve codigo viejo, que es
# justo lo que vino a evitar.
python3 - "$SELLO" <<'PY'
import pathlib, re, sys
sello = sys.argv[1]
p = pathlib.Path('sw.js')
p.write_text(re.sub(r"const VERSION = '[^']*'", f"const VERSION = '{sello}'", p.read_text()))
for nombre in ('index.html', 'formulario.html'):
    p = pathlib.Path(nombre)
    texto = re.sub(r'([?&]v=)[^"&]+', rf'\g<1>{sello}', p.read_text())
    p.write_text(texto)
p = pathlib.Path('actualizar.html')
p.write_text(re.sub(r"const version = '[^']*'", f"const version = '{sello}'", p.read_text()))
PY
echo "Sello: $SELLO"
