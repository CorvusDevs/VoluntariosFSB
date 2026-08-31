import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  sello, versionPublicada, hayQueActualizar, recargarVersion, vigilarVersion,
} from '../../js/ui/aviso-version.js'
import { VERSION } from '../../js/version.js'

describe('sello de version', () => {
  it('version.js y version.json dicen lo mismo', () => {
    // Si se desincronizan, el aviso de version nueva aparece para siempre o no
    // aparece nunca. Las dos fallas son peores que no tener aviso.
    // Ruta desde la raiz del repo: en jsdom, import.meta.url es una URL http.
    const publicado = JSON.parse(readFileSync('version.json', 'utf8'))
    expect(publicado.version).toBe(VERSION)
  })

  it('versiona la hoja de estilos y los modulos de entrada', () => {
    const publicada = JSON.parse(readFileSync('version.json', 'utf8')).version
    for (const nombre of ['index.html', 'formulario.html']) {
      const html = readFileSync(nombre, 'utf8')
      expect(html).toContain(`css/estilos.css?v=${publicada}`)
      expect(html).toContain(`.js?v=${publicada}`)
    }
  })

  it('sella la pagina de recuperacion que descarta trabajadores anteriores', () => {
    const publicada = JSON.parse(readFileSync('version.json', 'utf8')).version
    const html = readFileSync('actualizar.html', 'utf8')
    expect(html).toContain(`const version = '${publicada}'`)
    expect(html).toContain('serviceWorker.getRegistrations()')
    expect(html).toContain('registro.unregister()')
    expect(html).toContain("nombre.startsWith('voluntarios-fsb-')")
    expect(html).toContain('caches.delete(nombre)')
    expect(html).toContain("destino.searchParams.set('v', version)")
  })

  it('reserva el ancho del panel lateral para el aviso en el gestor', () => {
    const css = readFileSync('css/estilos.css', 'utf8')
    expect(css).toContain('.app-cms > .aviso-version')
    expect(css).toContain('width: calc(100% - 256px)')
    expect(css).toContain('margin-left: 256px')
  })

  it('escribe la version en la pantalla', () => {
    const pie = sello()
    expect(pie.textContent).toContain(VERSION)
    expect(pie.textContent).toContain('Sistema de Gestión Institucional desarrollado por CorvusDevs')
    expect(pie.querySelector('a').href).toBe('https://corvusdevs.github.io/')
  })
})

describe('deteccion de version nueva', () => {
  const respuesta = (cuerpo, ok = true) => async () => ({ ok, json: async () => cuerpo })

  it('lee la version publicada sin usar la cache', async () => {
    let opciones = null
    const pedir = async (ruta, o) => { opciones = o; return { ok: true, json: async () => ({ version: 'X' }) } }
    expect(await versionPublicada(pedir)).toBe('X')
    // Sin esto leeriamos la misma copia vieja que estamos tratando de detectar.
    expect(opciones.cache).toBe('no-store')
  })

  it('no rompe nada si no se puede averiguar', async () => {
    expect(await versionPublicada(async () => { throw new Error('sin red') })).toBeNull()
    expect(await versionPublicada(respuesta({}, false))).toBeNull()
    expect(await versionPublicada(respuesta({ version: 7 }))).toBeNull()
  })

  it('solo avisa cuando la publicada es distinta de la cargada', () => {
    expect(hayQueActualizar('otra', 'esta')).toBe(true)
    expect(hayQueActualizar('esta', 'esta')).toBe(false)
    expect(hayQueActualizar(null, 'esta')).toBe(false)
  })
})

describe('barra de actualizacion', () => {
  let raiz
  beforeEach(() => {
    document.body.innerHTML = '<div id="raiz"></div>'
    raiz = document.getElementById('raiz')
  })

  it('no aparece cuando la version es la misma', async () => {
    vigilarVersion(raiz, { pedir: async () => ({ ok: true, json: async () => ({ version: VERSION }) }) })
    await new Promise((r) => setTimeout(r, 0))
    expect(raiz.querySelector('.aviso-version')).toBeNull()
  })

  it('abre la recuperación sin esperar al trabajador y solo limpia caches propias', async () => {
    const pasos = []
    let resolverRegistros
    recargarVersion({
      almacen: {
        keys: async () => ['voluntarios-fsb-anterior', 'cache-de-otra-aplicacion'],
        delete: async (nombre) => { pasos.push(`borrar:${nombre}`) },
      },
      navegador: {
        serviceWorker: {
          getRegistrations: () => new Promise((resolver) => { resolverRegistros = resolver }),
        },
      },
      recargar: () => { pasos.push('recargar') },
    })
    expect(pasos).toEqual(['recargar'])
    await new Promise((resolver) => setTimeout(resolver, 0))
    expect(pasos).toEqual(['recargar', 'borrar:voluntarios-fsb-anterior'])
    resolverRegistros([])
    await new Promise((resolver) => setTimeout(resolver, 0))
  })

  it('aparece arriba de todo cuando hay una nueva, y recarga al tocarla', async () => {
    let recargo = false
    vigilarVersion(raiz, {
      pedir: async () => ({ ok: true, json: async () => ({ version: 'mas-nueva' }) }),
      recargar: () => { recargo = true },
    })
    await new Promise((r) => setTimeout(r, 0))
    const aviso = raiz.querySelector('.aviso-version')
    expect(aviso).not.toBeNull()
    expect(aviso.textContent).toContain('versión nueva del gestor')
    expect(aviso.textContent).toContain('cambios de contenido de la página web no activan este aviso')
    expect(raiz.firstElementChild).toBe(aviso)
    raiz.querySelector('[data-accion="actualizar-version"]').click()
    expect(recargo).toBe(true)
    expect(aviso.dataset.estado).toBe('actualizando')
    expect(aviso.textContent).toContain('Preparando la versión nueva')
  })

  it('muestra una recuperación clara cuando actualizar falla', async () => {
    vigilarVersion(raiz, {
      pedir: async () => ({ ok: true, json: async () => ({ version: 'mas-nueva' }) }),
      recargar: async () => { throw new Error('sin conexión') },
    })
    await new Promise((r) => setTimeout(r, 0))
    const boton = raiz.querySelector('[data-accion="actualizar-version"]')
    boton.click()
    await new Promise((r) => setTimeout(r, 0))
    expect(raiz.querySelector('.aviso-version').dataset.estado).toBe('error')
    expect(boton.textContent).toBe('Intentar de nuevo')
  })
})
