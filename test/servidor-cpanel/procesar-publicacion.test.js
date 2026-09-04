import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const homeAnterior = process.env.ALETEA_DEPLOY_HOME
const homePrueba = await mkdtemp(join(tmpdir(), 'aletea-worker-test-'))
process.env.ALETEA_DEPLOY_HOME = homePrueba
const workerUrl = `${new URL('../../servidor-cpanel/procesar-publicacion.mjs', import.meta.url).href}?test=${Date.now()}`
const worker = await import(/* @vite-ignore */ workerUrl)

afterEach(() => {
  if (homeAnterior === undefined) delete process.env.ALETEA_DEPLOY_HOME
  else process.env.ALETEA_DEPLOY_HOME = homeAnterior
})

async function existe(ruta) {
  try { await access(ruta); return true } catch { return false }
}

async function crearZip(carpeta, nombre, archivos) {
  const origen = join(carpeta, `${nombre}-src`)
  await mkdir(origen, { recursive: true })
  for (const [ruta, contenido] of Object.entries(archivos)) {
    const destino = join(origen, ruta)
    await mkdir(join(destino, '..'), { recursive: true })
    await writeFile(destino, contenido)
  }
  const salida = join(carpeta, `${nombre}.zip`)
  execFileSync('zip', ['-qr', salida, '.'], { cwd: origen })
  return salida
}

describe('trabajador de publicación en cPanel', () => {
  it('rechaza rutas y nombres peligrosos', () => {
    expect(() => worker._pruebas.idSeguro('../sitio')).toThrow(/no es seguro/)
    expect(() => worker._pruebas.nombreSeguro('../paquete.zip')).toThrow(/no es seguro/)
    expect(() => worker._pruebas.normalizarEntrada('.env')).toThrow(/protegida/)
    expect(worker._pruebas.entradaSuperiorSegura('.htaccess')).toBe(false)
  })

  it('extrae, activa, conserva .htaccess y deja un recibo', async () => {
    const id = '2026-09-03.worker-test'
    const armado = await mkdtemp(join(tmpdir(), 'aletea-worker-bundle-'))
    await mkdir(worker._pruebas.INBOX, { recursive: true })
    const paquetes = []
    for (const clave of Object.keys(worker._pruebas.DESTINOS)) {
      const destino = worker._pruebas.DESTINOS[clave]
      await mkdir(destino, { recursive: true })
      await writeFile(join(destino, '.htaccess'), 'servidor')
      await writeFile(join(destino, 'index.html'), 'anterior')
      const zip = await crearZip(armado, clave, { 'index.html': `nuevo-${clave}`, 'version.json': '{}' })
      const datos = await readFile(zip)
      const entradas = worker._pruebas.listarZip(zip)
      paquetes.push({
        clave, destino, archivo: `${clave}.zip`, bytes: datos.length,
        sha256: createHash('sha256').update(datos).digest('hex'), entradas,
        entradasSuperiores: ['index.html', 'version.json'], versionesInmutables: [],
      })
    }
    const contenidoBundle = join(armado, 'bundle')
    await mkdir(contenidoBundle)
    for (const paquete of paquetes) {
      await writeFile(join(contenidoBundle, paquete.archivo), await readFile(join(armado, paquete.archivo)))
    }
    await writeFile(join(contenidoBundle, 'manifest.json'), JSON.stringify({
      esquema: 1, id, version_gestor: id, version_pagina: 'pagina-test', paquetes,
    }))
    const bundle = join(worker._pruebas.INBOX, `${id}.zip`)
    execFileSync('zip', ['-qr', bundle, '.'], { cwd: contenidoBundle })
    const marcador = join(worker._pruebas.INBOX, `${id}.ready.json`)
    await writeFile(marcador, JSON.stringify({
      esquema: 1, id, paquete: `${id}.zip`, sha256: await worker._pruebas.sha256(bundle),
    }))

    await worker._pruebas.procesarMarcador(marcador, { reiniciar: async () => {}, verificar: async () => {} })

    for (const [clave, destino] of Object.entries(worker._pruebas.DESTINOS)) {
      expect(await readFile(join(destino, 'index.html'), 'utf8')).toBe(`nuevo-${clave}`)
      expect(await readFile(join(destino, '.htaccess'), 'utf8')).toBe('servidor')
    }
    const recibo = JSON.parse(await readFile(join(worker._pruebas.RECIBOS, `${id}.json`), 'utf8'))
    expect(recibo.estado).toBe('activada')
    expect(await existe(bundle)).toBe(false)
  })
})
