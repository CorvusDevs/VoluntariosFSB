import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'

const salida = new URL('../dist/', import.meta.url)
const raiz = new URL('../', import.meta.url)

await rm(salida, { recursive: true, force: true })
await mkdir(salida, { recursive: true })

for (const nombre of ['assets', 'css', 'js']) {
  await cp(new URL(`${nombre}/`, raiz), new URL(`${nombre}/`, salida), { recursive: true })
}

for (const nombre of ['index.html', 'formulario.html', 'actualizar.html', 'sw.js', 'version.json']) {
  await cp(new URL(nombre, raiz), new URL(nombre, salida))
}

// Cada publicacion usa un directorio propio. LiteSpeed puede conservar una
// ruta estatica anterior aunque el archivo haya cambiado; una ruta nueva evita
// mezclar JavaScript o CSS de dos versiones sin depender de una purga manual.
const { version } = JSON.parse(await readFile(new URL('version.json', raiz), 'utf8'))
const lanzamiento = new URL(`release/${version}/`, salida)
for (const nombre of ['assets', 'css', 'js']) {
  await cp(new URL(`${nombre}/`, raiz), new URL(`${nombre}/`, lanzamiento), { recursive: true })
}

for (const nombre of ['index.html', 'formulario.html']) {
  const archivo = new URL(nombre, salida)
  const html = (await readFile(archivo, 'utf8'))
    .replace(/(?:\.\/)?css\/estilos\.css(?:\?v=[^"']+)?/g, `release/${version}/css/estilos.css`)
    .replace(/(?:\.\/)?js\/app\.js(?:\?v=[^"']+)?/g, `release/${version}/js/app.js`)
    .replace(/(?:\.\/)?js\/formulario-publico\.js(?:\?v=[^"']+)?/g, `release/${version}/js/formulario-publico.js`)
  await writeFile(archivo, html)
}

console.log(`Sitio Cloudflare preparado en dist/ con sello ${version}`)
