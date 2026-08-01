import { describe, it, expect } from 'vitest'
import { ficha, boton, escapar } from '../../js/ui/componentes.js'

describe('escapar', () => {
  it('neutraliza los caracteres peligrosos de HTML', () => {
    expect(escapar('<script>')).toBe('&lt;script&gt;')
    expect(escapar('a & b')).toBe('a &amp; b')
    expect(escapar('"x"')).toBe('&quot;x&quot;')
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
  })
})
