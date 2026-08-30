import { beforeEach, describe, expect, it } from 'vitest'
import { crearAvisoNovedades, crearPantallaCambios } from '../../js/ui/pantalla-cambios.js'
import { CLAVE_NOVEDADES_VISTAS, compararVersiones, novedadesPendientes, VERSION_NOVEDADES } from '../../js/ui/novedades.js'

describe('cambios del sistema', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="raiz"></div>' })

  it('muestra el historial de versiones, sus tres clases de cambios y su autor', () => {
    const raiz = document.getElementById('raiz')
    crearPantallaCambios(raiz)
    expect(raiz.textContent).toContain('Versión 1.6.6')
    expect(raiz.textContent).toContain('Ayuda abre con recorridos frecuentes')
    expect(raiz.textContent).toContain('Finanzas reúne las acciones de cobranza')
    expect(raiz.textContent).toContain('Versión 1.5.1')
    expect(raiz.textContent).toContain('Versión 1.5.0')
    expect(raiz.textContent).toContain('Versión 1.4.2')
    expect(raiz.textContent).toContain('Versión 1.4.0')
    expect(raiz.textContent).toContain('Versión 1.3.0')
    expect(raiz.textContent).toContain('Versión 1.2.0')
    expect(raiz.textContent).toContain('Versión 1.1.0')
    expect(raiz.textContent).toContain('Versión 0.3.0')
    expect(raiz.textContent).toContain('Actualizaciones')
    expect(raiz.textContent).toContain('Adiciones')
    expect(raiz.textContent).toContain('Arreglos')
    expect(raiz.textContent).toContain('Alejandro Estol')
  })

  it('usa fechas y commits reales y refleja el estado publicado', () => {
    const raiz = document.getElementById('raiz')
    crearPantallaCambios(raiz)
    expect(raiz.textContent).toContain('16 de agosto de 2026 · Commit 4b701d4')
    expect(raiz.textContent).toContain('Publicada el 27 de agosto de 2026')
  })

  it('resume solo la versión actual aunque haya muchas novedades pendientes', () => {
    const datos = new Map([[CLAVE_NOVEDADES_VISTAS, '1.0.0']])
    const almacen = { getItem: (clave) => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, valor) }
    const pendientes = novedadesPendientes(almacen)
    expect(pendientes[0].version).toBe(VERSION_NOVEDADES)
    expect(pendientes.at(-1).version).toBe('1.1.0')
    const raiz = document.getElementById('raiz')
    raiz.appendChild(document.createElement('main'))
    crearAvisoNovedades(raiz, { novedades: pendientes, almacenNovedades: almacen })
    expect(raiz.textContent).toContain(`Novedades de la versión ${VERSION_NOVEDADES}`)
    expect(raiz.querySelectorAll('.novedades-resumen li')).toHaveLength(3)
    expect(raiz.textContent).not.toContain('Permisos guiados en cualquier sección')
    expect(raiz.querySelector('.novedades-enlace').getAttribute('href')).toBe('/cambios')
    expect(raiz.querySelector('.novedades-enlace').tagName).toBe('A')
    expect(raiz.textContent).toContain('Seguir trabajando')
  })

  it('no intercepta el clic modificado del enlace al historial', () => {
    const raiz = document.createElement('div')
    raiz.appendChild(document.createElement('main'))
    let abrioCambios = false
    crearAvisoNovedades(raiz, { novedades: novedadesPendientes({ getItem: () => '1.6.9', setItem: () => {} }), alVerCambios: () => { abrioCambios = true } })
    const evento = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })
    raiz.querySelector('.novedades-enlace').dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)
    expect(abrioCambios).toBe(false)
  })

  it('identifica los cambios que incluyen la página pública', () => {
    const raiz = document.createElement('div')
    crearPantallaCambios(raiz)
    expect(raiz.querySelector('[data-version="1.7.0"] .cambio-version-ambitos').textContent).toContain('Página pública')
    expect(raiz.querySelector('[data-version="1.8.2"] .cambio-version-ambitos').textContent).toContain('Página pública')
    expect(raiz.querySelector('[data-version="1.8.3"] .cambio-version-ambitos').textContent).toContain('Página pública')
    expect(raiz.textContent).toContain('WordPress institucional incorpora metadatos sociales')
  })

  it('recuerda el aviso y conserva la pantalla al seguir trabajando', () => {
    const datos = new Map()
    const almacen = { getItem: (clave) => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, valor) }
    const raiz = document.getElementById('raiz')
    const fondo = document.createElement('main')
    raiz.appendChild(fondo)
    let continuo = false
    crearAvisoNovedades(raiz, { novedades: novedadesPendientes(almacen), almacenNovedades: almacen, alContinuar: () => { continuo = true } })
    expect(fondo.hasAttribute('inert')).toBe(true)
    raiz.querySelector('.novedades-popout button').click()
    expect(datos.get(CLAVE_NOVEDADES_VISTAS)).toBe(VERSION_NOVEDADES)
    expect(continuo).toBe(true)
    expect(fondo.hasAttribute('inert')).toBe(false)
    expect(raiz.querySelector('.novedades-superposicion')).toBeNull()
  })

  it('abre el historial completo solo cuando la persona lo elige', () => {
    const datos = new Map()
    const almacen = { getItem: (clave) => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, valor) }
    const raiz = document.getElementById('raiz')
    let abrioCambios = false
    crearAvisoNovedades(raiz, { novedades: novedadesPendientes(almacen), almacenNovedades: almacen, alVerCambios: () => { abrioCambios = true } })
    raiz.querySelector('.novedades-enlace').click()
    expect(abrioCambios).toBe(true)
    expect(datos.get(CLAVE_NOVEDADES_VISTAS)).toBe(VERSION_NOVEDADES)
  })

  it('muestra solo la version actual en la primera visita', () => {
    const almacen = { getItem: () => null, setItem: () => {} }
    expect(novedadesPendientes(almacen).map((entrada) => entrada.version)).toEqual([VERSION_NOVEDADES])
  })

  it('compara versiones numéricas por componentes', () => {
    expect(compararVersiones('1.10.0', '1.9.0')).toBe(1)
    expect(compararVersiones('1.0', '1.0.0')).toBe(0)
  })
})
