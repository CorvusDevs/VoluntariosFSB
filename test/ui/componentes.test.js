import { describe, it, expect } from 'vitest'
import { ficha, boton, enlaceBoton, escapar, elemento } from '../../js/ui/componentes.js'

describe('escapar', () => {
  it('neutraliza los caracteres peligrosos de HTML', () => {
    expect(escapar('<script>')).toBe('&lt;script&gt;')
    expect(escapar('a & b')).toBe('a &amp; b')
    expect(escapar('"x"')).toBe('&quot;x&quot;')
  })
})

describe('elemento', () => {
  it('incorpora controles DOM sin convertirlos en texto', () => {
    const selector = document.createElement('select')
    selector.appendChild(new Option('Toda la organización', 'global'))
    const contenedor = elemento('label', ['cms-campo'], selector)

    expect(contenedor.querySelector('select')).toBe(selector)
    expect(contenedor.textContent).not.toContain('[object HTMLSelectElement]')
  })
})

describe('ficha', () => {
  it('crea un boton con el nombre de la persona', () => {
    const el = ficha({ id: 'p1', nombre: 'Gonzalo' })
    expect(el.tagName).toBe('BUTTON')
    expect(el.textContent).toContain('Gonzalo')
    expect(el.dataset.id).toBe('p1')
  })

  it('un nombre con HTML no se interpreta', () => {
    const el = ficha({ id: 'p1', nombre: '<b>Gonzalo</b>' })
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toContain('<b>Gonzalo</b>')
  })

  it('marca la ficha seleccionada', () => {
    expect(ficha({ id: 'p1', nombre: 'X' }, { seleccionada: true }).getAttribute('aria-pressed')).toBe('true')
    expect(ficha({ id: 'p1', nombre: 'X' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('atenua la ficha asignada sin deshabilitarla', () => {
    const el = ficha({ id: 'v1', nombre: 'Abi' }, { atenuada: true })
    expect(el.classList.contains('atenuada')).toBe(true)
    expect(el.disabled).toBe(false)
  })

  it('muestra la pastilla de nuevo', () => {
    expect(ficha({ id: 'v1', nombre: 'Julián', nuevo: true }).textContent).toContain('nuevo')
  })
})

describe('boton', () => {
  it('crea un boton con etiqueta accesible y ejecuta al hacer clic', () => {
    let veces = 0
    const el = boton('Deshacer', () => { veces += 1 })
    el.click()
    expect(el.textContent).toBe('Deshacer')
    expect(veces).toBe(1)
    expect(el.dataset.ayuda).toBeUndefined()
    expect(el.getAttribute('aria-description')).toBeNull()
  })

  it('agrega un SVG oficial a las acciones conocidas sin cambiar su etiqueta', () => {
    const el = boton('Armar lista', () => {})
    expect(el.querySelector('svg')).not.toBeNull()
    expect(el.textContent).toBe('Armar lista')
    expect(el.classList.contains('boton-con-icono')).toBe(true)
  })

  it('identifica Accesos y Registro institucional con iconos', () => {
    ;['Accesos', 'Registro institucional'].forEach((etiqueta) => {
      expect(boton(etiqueta, () => {}).querySelector('svg')).not.toBeNull()
    })
  })

  it('muestra un icono de edición en Contenido', () => {
    const el = boton('Contenido', () => {})
    expect(el.querySelector('svg')).not.toBeNull()
    expect(el.classList.contains('boton-con-icono')).toBe(true)
  })

  it('muestra un icono en el editor de piezas', () => {
    expect(boton('Editor de piezas', () => {}).querySelector('svg')).not.toBeNull()
  })

  it('explica para qué sirve cada ficha', () => {
    expect(ficha({ id: 'p1', nombre: 'Claudia' }).dataset.ayuda).toBe('Abre la ficha de Claudia.')
  })
})

describe('enlaceBoton', () => {
  it('conserva href y usa la navegación interna en un clic simple', () => {
    let veces = 0
    const enlace = enlaceBoton('Finanzas', '/finanzas', () => { veces += 1 })
    document.body.appendChild(enlace)

    expect(enlace.tagName).toBe('A')
    expect(enlace.getAttribute('href')).toBe('/finanzas')
    expect(enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))).toBe(false)
    expect(veces).toBe(1)
  })

  it('deja el clic central y los modificadores al navegador', () => {
    let veces = 0
    const enlace = enlaceBoton('Biblioteca', '/biblioteca', () => { veces += 1 })
    const delegados = []
    enlace.addEventListener('click', (evento) => {
      delegados.push(!evento.defaultPrevented)
      evento.preventDefault()
    })

    enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 }))
    enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }))
    expect(delegados).toEqual([true, true])
    expect(veces).toBe(0)
  })
})
