import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { argumentosSftp, opcionesDesde, _pruebas } from '../../herramientas/publicar-cpanel-sftp.mjs'

describe('publicación SFTP de cPanel', () => {
  it('interpreta simulación y ruta web sin aceptar opciones ambiguas', () => {
    expect(opcionesDesde(['--simular', '--web-root', '/sitio'])).toEqual({ simular: true, sinConstruir: false, webRoot: '/sitio' })
    expect(() => opcionesDesde(['--produccion'])).toThrow('Opción desconocida')
  })

  it('fuerza clave dedicada, host verificado y autenticación no interactiva', () => {
    const argumentos = argumentosSftp({ host: 'host', usuario: 'usuario', puerto: 2200, clave: '/clave', batch: '/batch' })
    expect(argumentos).toContain('-oBatchMode=yes')
    expect(argumentos).toContain('-oIdentitiesOnly=yes')
    expect(argumentos).toContain('-oStrictHostKeyChecking=yes')
    expect(argumentos.at(-1)).toBe('usuario@host')
  })

  it('enumera archivos y crea primero los directorios padres', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-sftp-test-'))
    await mkdir(join(raiz, 'js', 'ui'), { recursive: true })
    await writeFile(join(raiz, 'index.html'), 'ok')
    await writeFile(join(raiz, 'js', 'ui', 'app.js'), 'ok')
    expect(await _pruebas.archivosDe(raiz)).toEqual(['index.html', 'js/ui/app.js'])
    expect(await _pruebas.directoriosDe(['js/ui/app.js'])).toEqual(['js', 'js/ui'])
  })

  it('rechaza rutas que podrían inyectar comandos en el lote SFTP', () => {
    expect(() => _pruebas.escaparSftp('archivo\nrm peligro')).toThrow('saltos de línea')
  })

  it('no intenta respaldar una versión inmutable que todavía no existe', () => {
    expect(_pruebas.requiereRespaldo('release/2026-08-31.2032/js/app.js')).toBe(false)
    expect(_pruebas.requiereRespaldo('js/app.js')).toBe(true)
    expect(_pruebas.requiereRespaldo('version.json')).toBe(true)
  })

  it('sube solamente archivos nuevos o modificados y conserva las versiones inmutables', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-sftp-diferencial-test-'))
    const carpeta = join(raiz, 'nueva')
    const respaldo = join(raiz, 'anterior')
    await mkdir(join(carpeta, 'release', 'v2'), { recursive: true })
    await mkdir(respaldo, { recursive: true })
    await writeFile(join(carpeta, 'igual.txt'), 'igual')
    await writeFile(join(respaldo, 'igual.txt'), 'igual')
    await writeFile(join(carpeta, 'cambio.txt'), 'nuevo')
    await writeFile(join(respaldo, 'cambio.txt'), 'anterior')
    await writeFile(join(carpeta, 'nuevo.txt'), 'nuevo')
    await writeFile(join(carpeta, 'release', 'v2', 'app.js'), 'inmutable')
    const capas = [{ carpeta, respaldo, archivos: ['cambio.txt', 'igual.txt', 'nuevo.txt', 'release/v2/app.js'] }]

    expect(await _pruebas.limitarAArchivosCambiados(capas)).toEqual({ total: 4, cambiados: 3, omitidos: 1 })
    expect(capas[0].archivosPublicacion).toEqual(['cambio.txt', 'nuevo.txt', 'release/v2/app.js'])
  })

  it('usa un manifiesto privado para decidir cambios antes de descargar respaldos', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-sftp-manifiesto-test-'))
    const carpeta = join(raiz, 'nueva')
    await mkdir(carpeta)
    await writeFile(join(carpeta, 'igual.txt'), 'igual')
    await writeFile(join(carpeta, 'cambio.txt'), 'nuevo')
    const capas = [{ clave: 'gestor-root', carpeta, archivos: ['cambio.txt', 'igual.txt'] }]
    const actual = await _pruebas.crearManifiesto(capas)
    const anterior = structuredClone(actual)
    anterior.archivos['gestor-root']['cambio.txt'] = 'huella-anterior'

    expect(await _pruebas.limitarAArchivosCambiados(capas, anterior)).toEqual({ total: 2, cambiados: 1, omitidos: 1 })
    expect(capas[0].archivosPublicacion).toEqual(['cambio.txt'])
  })

  it('solo solicita dependencias cuando cambió el archivo de bloqueo', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-deps-test-'))
    const carpeta = join(raiz, 'nueva')
    const respaldo = join(raiz, 'anterior')
    await mkdir(carpeta)
    await mkdir(respaldo)
    await writeFile(join(carpeta, 'package-lock.json'), '{"lockfileVersion":3}')
    await writeFile(join(respaldo, 'package-lock.json'), '{"lockfileVersion":3}')
    const capas = [{ clave: 'gestor-root', carpeta, respaldo }]
    expect(await _pruebas.cambiaronDependencias(capas)).toBe(false)
    await writeFile(join(carpeta, 'package-lock.json'), '{"lockfileVersion":4}')
    expect(await _pruebas.cambiaronDependencias(capas)).toBe(true)
  })

  it('comprueba las versiones de producción instaladas antes de llamar a cPanel', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-deps-instaladas-test-'))
    const carpeta = join(raiz, 'paquete')
    const instaladas = join(raiz, 'instaladas')
    await mkdir(carpeta)
    await mkdir(join(instaladas, 'mysql2'), { recursive: true })
    await mkdir(join(instaladas, 'nodemailer'), { recursive: true })
    await writeFile(join(carpeta, 'package-lock.json'), JSON.stringify({
      packages: {
        '': { dependencies: { mysql2: '^3.14.5', nodemailer: '^9.0.6' } },
        'node_modules/mysql2': { version: '3.23.4' },
        'node_modules/nodemailer': { version: '9.0.6' },
      },
    }))
    const capas = [{ clave: 'gestor-root', carpeta }]
    const dependencias = await _pruebas.dependenciasProduccion(capas)
    expect(dependencias).toEqual([
      { nombre: 'mysql2', version: '3.23.4' },
      { nombre: 'nodemailer', version: '9.0.6' },
    ])
    await writeFile(join(instaladas, 'mysql2', 'package.json'), JSON.stringify({ version: '3.23.4' }))
    await writeFile(join(instaladas, 'nodemailer', 'package.json'), JSON.stringify({ version: '9.0.6' }))
    expect(await _pruebas.dependenciasInstaladas({ carpeta: instaladas, dependencias })).toBe(true)
    await writeFile(join(instaladas, 'nodemailer', 'package.json'), JSON.stringify({ version: '9.0.5' }))
    expect(await _pruebas.dependenciasInstaladas({ carpeta: instaladas, dependencias })).toBe(false)
  })
})
