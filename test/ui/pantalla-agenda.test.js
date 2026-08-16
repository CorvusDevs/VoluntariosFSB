import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaAgenda } from '../../js/ui/pantalla-agenda.js'

const ROSTER = {
  version: 1,
  participantes: [{ id: 'p1', nombre: 'Gaia', activo: true, perfil: { anioNacimiento: '2018-08-20' } }],
  voluntarios: [],
  agenda: { version: 1, eventos: [] },
}

let raiz, almacen, alCambiar
const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  almacen = { guardarRoster: vi.fn(async () => {}) }
  alCambiar = vi.fn(async () => {})
})

describe('Agenda', () => {
  it('usa íconos SVG accesibles para navegar entre meses', () => {
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar })
    expect(raiz.querySelector('[aria-label="Mes anterior"] svg')).not.toBeNull()
    expect(raiz.querySelector('[aria-label="Mes siguiente"] svg')).not.toBeNull()
  })

  it('aplica una plantilla y conserva su recordatorio al guardar', async () => {
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar })
    const plantilla = raiz.querySelector('[aria-label="Usar una plantilla de evento"]')
    plantilla.value = '0'
    plantilla.dispatchEvent(new Event('change'))
    expect(raiz.querySelector('input[placeholder="Ej: reunión de coordinación"]').value).toBe('Reunión de coordinación')
    expect(raiz.querySelector('[aria-label="Anticipación del recordatorio"]').value).toBe('7')
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(almacen.guardarRoster).toHaveBeenCalledWith(expect.objectContaining({
      agenda: expect.objectContaining({ eventos: [expect.objectContaining({ recordatorio: 7 })] }),
    }), 'Agregar evento: Reunión de coordinación')
    expect(alCambiar).toHaveBeenCalled()
  })
})
