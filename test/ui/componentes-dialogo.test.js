import { describe, expect, it, vi } from 'vitest'
import { manejarTecladoDialogo } from '../../js/ui/componentes.js'

describe('contrato de teclado de los diálogos', () => {
  it('cierra con Escape y devuelve la decisión al diálogo', () => {
    const dialogo = document.createElement('section')
    const cerrar = vi.fn()
    const evento = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    expect(manejarTecladoDialogo(evento, dialogo, cerrar)).toBe(true)
    expect(cerrar).toHaveBeenCalledOnce()
    expect(evento.defaultPrevented).toBe(true)
  })

  it('envuelve el foco con Tab y Mayúsculas Tab', () => {
    const dialogo = document.createElement('section')
    const primero = document.createElement('button')
    const ultimo = document.createElement('button')
    dialogo.append(primero, ultimo)
    document.body.appendChild(dialogo)
    ultimo.focus()
    const adelante = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    manejarTecladoDialogo(adelante, dialogo)
    expect(document.activeElement).toBe(primero)
    const atras = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
    manejarTecladoDialogo(atras, dialogo)
    expect(document.activeElement).toBe(ultimo)
    dialogo.remove()
  })
})
