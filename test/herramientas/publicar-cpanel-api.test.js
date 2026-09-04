import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { asegurarDependenciasPassenger, comandosValidacionWeb, hostCpanel, huellaFuentesGestor, huellaFuentesPagina, huellaPaginaConContenido, opcionesDesde, prepararPaquetes, puertoPruebasPublicacion, rutaRelativaCuenta, _pruebas } from '../../herramientas/publicar-cpanel-api.mjs'
import { CpanelApi } from '../../herramientas/cpanel-api.mjs'
import { entradasZip } from '../../herramientas/publicacion-cpanel-recibo.mjs'

describe('publicación automatizada de cPanel', () => {
  it('interpreta el modo seguro y la ruta de la página', () => {
    expect(opcionesDesde(['--simular', '--sin-construir', '--web-root', '/sitio'])).toEqual({
      simular: true, sinConstruir: true, webRoot: '/sitio', recibo: '', forzarTodo: false, filtroAceptacion: '',
    })
  })

  it('interpreta un recibo exacto y el reemplazo completo explícito', () => {
    expect(opcionesDesde(['--recibo', '/artefactos/recibo.json', '--forzar-todo'])).toEqual({
      simular: false, sinConstruir: false, webRoot: '', recibo: '/artefactos/recibo.json', forzarTodo: true, filtroAceptacion: '',
    })
  })

  it('admite una prueba enfocada concreta y rechaza combinaciones ambiguas', () => {
    expect(opcionesDesde(['--filtro-aceptacion', 'recorrido electoral']).filtroAceptacion).toBe('recorrido electoral')
    expect(() => opcionesDesde(['--filtro-aceptacion', 'x'])).toThrow('3 y 120')
    expect(() => opcionesDesde(['--forzar-todo', '--filtro-aceptacion', 'recorrido electoral'])).toThrow('no se puede combinar')
    expect(() => opcionesDesde(['--recibo', '/recibo.json', '--filtro-aceptacion', 'recorrido electoral'])).toThrow('no acepta otro filtro')
  })

  it('solo permite operar dentro de la cuenta esperada', () => {
    expect(rutaRelativaCuenta('/home/aleteaor/gestor.aletea.org/paquete.zip', 'aleteaor')).toBe('gestor.aletea.org/paquete.zip')
    expect(() => rutaRelativaCuenta('/home/otra/archivo.zip', 'aleteaor')).toThrow('/home/aleteaor/')
  })

  it('rechaza opciones desconocidas para evitar publicaciones ambiguas', () => {
    expect(() => opcionesDesde(['--publicar-produccion'])).toThrow('Opción desconocida')
  })

  it('no permite saltar la construcción sin un recibo inmutable', async () => {
    await expect(_pruebas.planPreparado({ sinConstruir: true, recibo: '' }, '/sitio', '/etapa')).rejects.toThrow('--recibo')
  })

  it('usa un puerto aislado por ejecución y respeta una selección explícita', () => {
    expect(puertoPruebasPublicacion(33050, '')).toBe('47050')
    expect(puertoPruebasPublicacion(33050, '49876')).toBe('49876')
  })

  it('mantiene separados el host API y el host SFTP', () => {
    expect(hostCpanel({ sshHost: 'servidor.example' }, {})).toBe('cpanel.aletea.org')
    expect(hostCpanel({ sshHost: 'servidor.example' }, { CPANEL_HOST: 'api.example' })).toBe('api.example')
  })

  it('la huella de la página ignora salidas generadas pero cambia con sus fuentes', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-web-huella-test-'))
    await mkdir(join(raiz, 'src'), { recursive: true })
    await mkdir(join(raiz, 'dist'), { recursive: true })
    await writeFile(join(raiz, 'src', 'pagina.ts'), 'export const titulo = "A"\n')
    await writeFile(join(raiz, 'dist', 'index.html'), '<p>primero</p>')
    const inicial = await huellaFuentesPagina(raiz)
    await writeFile(join(raiz, 'dist', 'index.html'), '<p>segundo</p>')
    expect(await huellaFuentesPagina(raiz)).toBe(inicial)
    await writeFile(join(raiz, 'src', 'pagina.ts'), 'export const titulo = "B"\n')
    expect(await huellaFuentesPagina(raiz)).not.toBe(inicial)
  })

  it('la huella del gestor ignora salidas, pruebas, documentación y sellos generados', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-gestor-huella-test-'))
    await mkdir(join(raiz, 'js'), { recursive: true })
    await mkdir(join(raiz, 'dist'), { recursive: true })
    await mkdir(join(raiz, 'test'), { recursive: true })
    await mkdir(join(raiz, 'docs'), { recursive: true })
    await writeFile(join(raiz, 'index.html'), '<script src="app.js?v=primero"></script>')
    await writeFile(join(raiz, 'js', 'version.js'), "export const VERSION = 'primero'\n")
    await writeFile(join(raiz, 'js', 'app.js'), 'export const titulo = "A"\n')
    const inicial = await huellaFuentesGestor(raiz)
    await writeFile(join(raiz, 'index.html'), '<script src="app.js?v=segundo"></script>')
    await writeFile(join(raiz, 'js', 'version.js'), "export const VERSION = 'segundo'\n")
    await writeFile(join(raiz, 'dist', 'app.js'), 'generado')
    await writeFile(join(raiz, 'test', 'app.test.js'), 'prueba')
    await writeFile(join(raiz, 'docs', 'flujo.md'), 'documentación')
    expect(await huellaFuentesGestor(raiz)).toBe(inicial)
    await writeFile(join(raiz, 'js', 'app.js'), 'export const titulo = "B"\n')
    expect(await huellaFuentesGestor(raiz)).not.toBe(inicial)
  })

  it('reduce solo la aceptación en modo enfocado y conserva unitarias y build completo', () => {
    expect(comandosValidacionWeb('recorrido electoral')).toEqual([
      ['npm', ['test']],
      ['npm', ['run', 'test:acceptance', '--', '--grep', 'recorrido electoral']],
      ['npm', ['run', 'build:staging']],
    ])
    expect(comandosValidacionWeb('')).toEqual([['npm', ['run', 'release:staging']]])
  })

  it('invalida el paquete web cuando cambia el contenido publicado del CMS', () => {
    const fuente = 'misma-fuente'
    expect(huellaPaginaConContenido(fuente, '{"revision":1}'))
      .not.toBe(huellaPaginaConContenido(fuente, '{"revision":2}'))
    expect(huellaPaginaConContenido(fuente, '{"revision":2}'))
      .toBe(huellaPaginaConContenido(fuente, '{"revision":2}'))
  })

  it('delega la instalación npm en Application Manager', async () => {
    const llamadas = []
    await asegurarDependenciasPassenger({ uapi: async (...argumentos) => llamadas.push(argumentos) })
    expect(llamadas).toEqual([['PassengerApps', 'ensure_deps', {
      type: 'npm', app_path: 'gestor.aletea.org',
    }]])
  })

  it('reintenta una lectura viva transitoria antes de abortar la publicación', async () => {
    let llamadas = 0
    const respuesta = await _pruebas.obtener('https://gestor.example.com/version.json', {}, {
      intentos: 3,
      pausaMs: 0,
      esperar: async () => {},
      fetchImpl: async () => {
        llamadas += 1
        if (llamadas === 1) throw new Error('The operation was aborted due to timeout')
        return new Response('{"version":"correcta"}', { status: 200 })
      },
    })
    expect(llamadas).toBe(2)
    expect(respuesta.cuerpo.toString('utf8')).toContain('correcta')
  })

  it('reintenta respuestas 5xx pero conserva un 404 protegido como respuesta válida', async () => {
    let llamadas = 0
    const transitoria = await _pruebas.obtener('https://gestor.example.com/health', {}, {
      intentos: 3,
      pausaMs: 0,
      esperar: async () => {},
      fetchImpl: async () => {
        llamadas += 1
        return new Response('', { status: llamadas === 1 ? 503 : 200 })
      },
    })
    expect(llamadas).toBe(2)
    expect(transitoria.respuesta.status).toBe(200)

    const protegida = await _pruebas.obtener('https://gestor.example.com/.env', {}, {
      fetchImpl: async () => new Response('', { status: 404 }),
    })
    expect(protegida.respuesta.status).toBe(404)
  })

  it('excluye .htaccess también del paquete de la página de prueba', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'aletea-web-paquete-test-'))
    const etapa = await mkdtemp(join(tmpdir(), 'aletea-paquete-etapa-test-'))
    await mkdir(join(raiz, 'dist'))
    await writeFile(join(raiz, 'package.json'), '{}')
    await writeFile(join(raiz, 'dist', 'index.html'), '<p>Prueba</p>')
    await writeFile(join(raiz, 'dist', 'version.json'), JSON.stringify({ version: '0.5.3', build: '2026-09-01.1800' }))
    await writeFile(join(raiz, 'dist', '.htaccess'), 'Options -Indexes\n')
    const plan = await prepararPaquetes({ sinConstruir: true, webRoot: raiz, etapa })
    const pagina = plan.paquetes.find((paquete) => paquete.clave === 'pagina-prueba')
    expect(entradasZip(pagina.local)).not.toContain('.htaccess')
  })

  it('repite parámetros UAPI cuando cPanel requiere listas alineadas', async () => {
    let urlSolicitada
    const api = new CpanelApi({
      host: 'cpanel.example.com', usuario: 'usuario', token: 'token',
      fetchImpl: async (url) => {
        urlSolicitada = new URL(url)
        return new Response(JSON.stringify({ result: { status: 1, data: null } }))
      },
    })
    await api.uapi('PassengerApps', 'edit_application', {
      envvar_name: ['UNO', 'DOS'], envvar_value: ['1', '2'],
    })
    expect(urlSolicitada.searchParams.getAll('envvar_name')).toEqual(['UNO', 'DOS'])
    expect(urlSolicitada.searchParams.getAll('envvar_value')).toEqual(['1', '2'])
  })
})
