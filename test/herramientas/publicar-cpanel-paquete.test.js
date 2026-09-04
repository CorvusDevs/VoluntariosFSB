import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { opcionesDesde, prepararBundle } from '../../herramientas/publicar-cpanel-paquete.mjs'

async function zipSimple(carpeta, nombre, archivos) {
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

describe('publicación por paquete único', () => {
  it('exige un recibo validado y limita el tiempo de espera', () => {
    expect(() => opcionesDesde([])).toThrow(/requiere --recibo/)
    expect(() => opcionesDesde(['--recibo', 'r.json', '--timeout-segundos', '10'])).toThrow(/entre 30 y 900/)
    expect(opcionesDesde(['--recibo', 'r.json', '--simular']).simular).toBe(true)
  })

  it('construye un único ZIP con manifiesto y las tres capas', async () => {
    const etapa = await mkdtemp(join(tmpdir(), 'aletea-bundle-test-'))
    const paquetes = []
    for (const clave of ['gestor-root', 'gestor-dist', 'pagina-prueba']) {
      const local = await zipSimple(etapa, clave, { 'version.json': '{}', 'index.html': clave })
      const contenido = await readFile(local)
      paquetes.push({
        clave, local, remoto: clave, bytes: contenido.length,
        sha256: createHash('sha256').update(contenido).digest('hex'),
        entradas: ['index.html', 'version.json'], entradasSuperiores: ['index.html', 'version.json'], versionesInmutables: [],
      })
    }
    const preparado = await prepararBundle({
      versionGestor: '2026-09-03.test', versionPagina: { build: 'pagina-test' }, packageLockSha256: 'a'.repeat(64),
      validacion: { modo: 'web-enfocada', filtro_aceptacion: 'recorrido electoral' }, paquetes,
    }, etapa)
    expect(execFileSync('unzip', ['-Z1', preparado.bundle], { encoding: 'utf8' })).toContain('manifest.json')
    expect(preparado.manifiesto.paquetes).toHaveLength(3)
    expect(preparado.manifiesto.validacion).toEqual({ modo: 'web-enfocada', filtro_aceptacion: 'recorrido electoral' })
    expect(preparado.bytes).toBeGreaterThan(0)
    expect(preparado.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
