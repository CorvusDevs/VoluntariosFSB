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

  it('ajusta los formularios cortos a su contenido sin perder el límite de pantalla', () => {
    agregarEstilos()
    const raiz = document.createElement('section')
    raiz.className = 'cms cms-con-panel'
    raiz.innerHTML = `
      <form class="cms-captura cms-captura-con-acciones-fijas">
        <div class="cms-captura-contenido"><input aria-label="Campo"></div>
        <div class="cms-captura-acciones"><button class="boton">Cancelar</button><button class="boton boton-principal">Guardar</button></div>
      </form>`
    document.body.appendChild(raiz)

    const panel = raiz.querySelector('.cms-captura')
    const estilo = getComputedStyle(panel)
    expect(estilo.height).not.toBe('calc(100dvh - 40px)')
    expect(estilo.maxHeight).toBe('calc(100dvh - 40px)')
    expect(estilo.gridTemplateRows).not.toContain('1fr')
    expect(getComputedStyle(raiz.querySelector('.cms-captura-contenido')).maxHeight).toBe('calc(100dvh - 173px)')
  })

  it('reserva en celular un pie compacto y deja el contenido desplazable', () => {
    expect(estilos).toMatch(/@media \(max-width: 899px\) \{[\s\S]*?\.cms-con-panel > \.cms-captura\.cms-captura-con-acciones-fijas > \.cms-captura-contenido \{ max-height: calc\(100dvh - 190px\); \}/)
    expect(estilos).toMatch(/\.cms-con-panel > \.cms-captura > \.cms-captura-acciones \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/)
    expect(estilos).toMatch(/\.cms-con-panel > \.cms-captura > \.cms-captura-acciones \.boton \{ width: 100%; min-width: 0; \}/)
  })

  it('cambia las pestañas por un selector antes de que los botones puedan cortarse', () => {
    expect(estilos).toMatch(/@media \(max-width: 720px\) \{[\s\S]*?\.cms-unidad-selector-pestanas \{ display: block; \}[\s\S]*?\.cms-unidad-pestanas \{ display: none; \}/)
  })

  it('mantiene una sola acción visible y guarda las secundarias en un menú', () => {
    agregarEstilos()
    const acciones = document.createElement('div')
    acciones.className = 'cms-unidad-acciones-modal'
    acciones.innerHTML = '<button class="boton boton-principal">Acción principal</button><details class="cms-unidad-mas-acciones"><summary class="boton">Más acciones</summary><div class="cms-unidad-menu-acciones"><button class="boton">Editar</button></div></details>'
    document.body.appendChild(acciones)

    expect(getComputedStyle(acciones.querySelector('.cms-unidad-mas-acciones')).display).toBe('block')
    expect(estilos).toMatch(/\.cms-unidad-mas-acciones > summary \{ display: flex;/)
    expect(getComputedStyle(acciones.querySelector('.cms-unidad-menu-acciones')).display).toBe('none')
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
    const panel = raiz.querySelector('.cms-captura')
    expect(getComputedStyle(contenido).overflowY).toBe('auto')
    expect(getComputedStyle(contenido).minHeight).toBe('0px')
    expect(getComputedStyle(contenido).touchAction).toBe('pan-y')
    expect(getComputedStyle(panel).gridTemplateRows).toContain('1fr')
  })

  it('mantiene el contenido del popup alineado arriba sin estirar sus secciones', () => {
    agregarEstilos()
    const contenido = document.createElement('div')
    contenido.className = 'cms-captura-contenido'
    contenido.innerHTML = '<header>Encabezado</header><section>Resumen</section><section>Actividad</section>'
    document.body.appendChild(contenido)

    expect(getComputedStyle(contenido).alignContent).toBe('start')
  })

  it('mantiene el fondo de la sección hasta el final de todas sus tarjetas', () => {
    agregarEstilos()
    const seccion = document.createElement('section')
    seccion.className = 'cms-unidad-contenido'
    seccion.innerHTML = '<h4>Actividad reciente</h4>' + '<article class="cms-unidad-elemento">Actividad</article>'.repeat(6)
    document.body.appendChild(seccion)

    const estilo = getComputedStyle(seccion)
    expect(estilo.height).toBe('max-content')
    expect(estilo.alignContent).toBe('start')
    expect(estilos).toMatch(/\.cms-unidad-contenido \{[^}]*background:/)
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
