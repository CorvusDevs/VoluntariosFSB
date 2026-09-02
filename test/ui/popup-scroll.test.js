import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'

const estilos = readFileSync('css/estilos.css', 'utf8')

function agregarEstilos() {
  const hoja = document.createElement('style')
  hoja.textContent = estilos
  document.head.appendChild(hoja)
}

describe('desplazamiento de popups', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('no reserva barras ni habilita desplazamiento horizontal en el popup del gestor', () => {
    agregarEstilos()
    const raiz = document.createElement('section')
    raiz.className = 'cms cms-con-panel'
    raiz.innerHTML = `
      <section class="cms-captura cms-captura-con-acciones-fijas">
        <div class="cms-captura-contenido">
          <div class="cms-unidad-pestanas"></div>
        </div>
        <div class="cms-captura-acciones"></div>
      </section>`
    document.body.appendChild(raiz)

    const panel = raiz.querySelector('.cms-captura')
    const contenido = raiz.querySelector('.cms-captura-contenido')
    const pestanas = raiz.querySelector('.cms-unidad-pestanas')

    expect(getComputedStyle(panel).overflowX).toBe('hidden')
    expect(getComputedStyle(contenido).overflowX).toBe('hidden')
    expect(getComputedStyle(contenido).overflowY).toBe('auto')
    expect(getComputedStyle(contenido).touchAction).toBe('pan-y')
    expect(getComputedStyle(contenido).overscrollBehaviorY).toBe('contain')
    expect(getComputedStyle(contenido).scrollbarGutter).toBe('auto')
    expect(getComputedStyle(pestanas).marginInline).toBe('0px')
    expect(getComputedStyle(pestanas).maxWidth).toBe('100%')
  })

  it('limita la ficha compacta a la pantalla y deja su contenido desplazable en celular', () => {
    agregarEstilos()
    const raiz = document.createElement('section')
    raiz.className = 'cms cms-con-panel'
    raiz.innerHTML = `
      <section class="cms-captura cms-captura-con-acciones-fijas cms-captura-resumen-compacto">
        <div class="cms-captura-contenido"><div style="height: 1400px"></div></div>
        <div class="cms-captura-acciones"></div>
      </section>`
    document.body.appendChild(raiz)
    const contenido = raiz.querySelector('.cms-captura-contenido')
    expect(getComputedStyle(contenido).overflowY).toBe('auto')
    expect(getComputedStyle(contenido).minHeight).toBe('0px')
    expect(getComputedStyle(contenido).touchAction).toBe('pan-y')
  })

  it.each([
    'persona-editor',
    'personas-personalizacion',
    'novedades-superposicion',
    'capa-editor',
    'vista-permisos-superposicion',
    'vista-permisos-panel',
  ])('evita una barra horizontal accidental en %s', (clase) => {
    agregarEstilos()
    const popup = document.createElement('section')
    popup.className = clase
    document.body.appendChild(popup)

    expect(getComputedStyle(popup).overflowX).toBe('hidden')
  })
})
