import { describe, expect, it } from 'vitest'
import { agregarEvento, cumpleanosProximos, quitarEvento } from '../../js/modelo/agenda.js'

const ROSTER = { version: 1, participantes: [
  { id: 'p1', nombre: 'Ana', activo: true, perfil: { anioNacimiento: '2016-08-20' } },
  { id: 'p2', nombre: 'Beto', activo: true, perfil: { anioNacimiento: '2015-12-15' } },
] , voluntarios: [] }

describe('agenda', () => {
  it('encuentra cumpleaños próximos aunque el año de nacimiento sea anterior', () => {
    const proximos = cumpleanosProximos(ROSTER, new Date('2026-08-15T12:00:00'), 45)
    expect(proximos).toHaveLength(1)
    expect(proximos[0].persona.nombre).toBe('Ana')
    expect(proximos[0].fecha).toBe('2026-08-20')
  })

  it('agrega y quita un evento manual sin tocar los cumpleaños', () => {
    const conEvento = agregarEvento(ROSTER, { fecha: '2026-08-22', titulo: 'Reunión' })
    expect(conEvento.agenda.eventos).toHaveLength(1)
    expect(quitarEvento(conEvento, conEvento.agenda.eventos[0].id).agenda.eventos).toHaveLength(0)
  })
})
