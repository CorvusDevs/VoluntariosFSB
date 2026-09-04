import { execFileSync } from 'node:child_process'
import { appendFile, mkdir, mkdtemp, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  entradasSuperiores, guardarRecibo, normalizarEntradaZip, patronLiteralUnzip, planDesdeRecibo, sha256, sha256ContenidoZip, versionesInmutables,
} from '../../herramientas/publicacion-cpanel-recibo.mjs'

async function paqueteEn(raiz, nombre, version) {
  const carpeta = join(raiz, `${nombre}-contenido`)
  const salida = join(raiz, `${nombre}.zip`)
  await mkdir(join(carpeta, 'release', version), { recursive: true })
  await writeFile(join(carpeta, 'version.json'), JSON.stringify({ version }))
  await writeFile(join(carpeta, 'release', version, 'app.js'), 'export const ok = true\n')
  execFileSync('zip', ['-qr', salida, '.'], { cwd: carpeta })
  return salida
}

async function planTemporal() {
  const raiz = await mkdtemp(join(tmpdir(), 'aletea-recibo-test-'))
  const version = '2026-09-01.1800-abcdef1234'
  const destinos = {
    'gestor-root': '/home/aleteaor/gestor.aletea.org',
    'gestor-dist': '/home/aleteaor/gestor.aletea.org/dist',
    'pagina-prueba': '/home/aleteaor/prueba.aletea.org',
  }
  const paquetes = []
  for (const clave of Object.keys(destinos)) {
    paquetes.push({ clave, local: await paqueteEn(raiz, clave, version), remoto: destinos[clave] })
  }
  return { raiz, plan: { versionGestor: version, versionPagina: { build: version }, paquetes } }
}

describe('recibo inmutable de publicación', () => {
  it('normaliza rutas y detecta sus entradas superiores e inmutables', () => {
    expect(normalizarEntradaZip('./release/v1/js/app.js')).toBe('release/v1/js/app.js')
    expect(entradasSuperiores(['release/v1/app.js', 'version.json'])).toEqual(['release', 'version.json'])
    expect(versionesInmutables(['release/v1/app.js', 'release/v1/css/app.css'])).toEqual(['v1'])
    expect(patronLiteralUnzip('functions/api/[[ruta]].js')).toBe('functions/api/[[][[]ruta]].js')
  })

  it('rechaza rutas que podrían escapar, romper el lote o tocar archivos protegidos', () => {
    for (const ruta of ['../secreto', '/absoluta', 'uno,dos', '.htaccess', 'carpeta/.env.production', 'node_modules/x.js']) {
      expect(() => normalizarEntradaZip(ruta)).toThrow()
    }
  })

  it('guarda las tres capas y solo las vuelve a abrir si tamaño, huella y listado coinciden', async () => {
    const { raiz, plan } = await planTemporal()
    const guardado = await guardarRecibo(plan, {
      directorio: join(raiz, 'artefactos'), packageLockSha256: 'a'.repeat(64),
      fuenteGestorSha256: 'c'.repeat(64), validacion: { modo: 'web-enfocada', filtro_aceptacion: 'recorrido electoral' },
    })
    const recuperado = await planDesdeRecibo(guardado.ruta)
    expect(recuperado.versionGestor).toBe(plan.versionGestor)
    expect(recuperado.packageLockSha256).toBe('a'.repeat(64))
    expect(recuperado.fuenteGestorSha256).toBe('c'.repeat(64))
    expect(recuperado.validacion).toEqual({ modo: 'web-enfocada', filtro_aceptacion: 'recorrido electoral' })
    expect(recuperado.paquetes.map((paquete) => paquete.clave).sort()).toEqual(['gestor-dist', 'gestor-root', 'pagina-prueba'])
    expect(recuperado.paquetes.every((paquete) => paquete.entradas.includes('version.json'))).toBe(true)
    expect(recuperado.paquetes.every((paquete) => /^[a-f0-9]{64}$/.test(paquete.contenidoSha256))).toBe(true)
  })

  it('distingue la integridad del ZIP de la identidad estable de su contenido', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-contenido-test-'))
    const primero = await paqueteEn(raiz, 'primero', 'v1')
    await utimes(join(raiz, 'primero-contenido', 'version.json'), new Date('2026-09-01T10:00:00Z'), new Date('2026-09-01T10:00:00Z'))
    const segundo = join(raiz, 'segundo.zip')
    execFileSync('zip', ['-qr', segundo, '.'], { cwd: join(raiz, 'primero-contenido') })
    expect(await sha256(primero)).not.toBe(await sha256(segundo))
    expect(sha256ContenidoZip(primero)).toBe(sha256ContenidoZip(segundo))
  })

  it('bloquea un artefacto modificado después de la simulación', async () => {
    const { raiz, plan } = await planTemporal()
    const guardado = await guardarRecibo(plan, {
      directorio: join(raiz, 'artefactos'), packageLockSha256: 'b'.repeat(64), fuenteGestorSha256: 'd'.repeat(64),
    })
    await appendFile(guardado.plan.paquetes[0].local, 'alterado')
    await expect(planDesdeRecibo(guardado.ruta)).rejects.toThrow(/tamaño|SHA-256/)
  })
})
