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
})
