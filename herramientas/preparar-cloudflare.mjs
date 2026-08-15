import { cp, mkdir, rm } from 'node:fs/promises'

const salida = new URL('../dist/', import.meta.url)
const raiz = new URL('../', import.meta.url)

await rm(salida, { recursive: true, force: true })
await mkdir(salida, { recursive: true })

for (const nombre of ['assets', 'css', 'js']) {
  await cp(new URL(`${nombre}/`, raiz), new URL(`${nombre}/`, salida), { recursive: true })
}

for (const nombre of ['index.html', 'sw.js', 'version.json']) {
  await cp(new URL(nombre, raiz), new URL(nombre, salida))
}

console.log('Sitio Cloudflare preparado en dist/')
