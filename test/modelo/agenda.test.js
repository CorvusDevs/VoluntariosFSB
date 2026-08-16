import { describe, expect, it } from 'vitest'
import { agregarEvento, cumpleanosProximos, efemeridesUruguay, quitarEvento, recordatoriosDe } from '../../js/modelo/agenda.js'

const ROSTER = { version: 1, participantes: [
  { id: 'p1', nombre: 'Ana', activo: true, perfil: { anioNacimiento: '2016-08-20' } },
  { id: 'p2', nombre: 'Beto', activo: true, perfil: { anioNacimiento: '2015-12-15' } },
] , voluntarios: [
  { id: 'v1', nombre: 'Laura', activo: true, perfil: { anioNacimiento: '1994-08-22' } },
] }

describe('agenda', () => {
  it('encuentra cumpleaños próximos aunque el año de nacimiento sea anterior', () => {
    const proximos = cumpleanosProximos(ROSTER, new Date('2026-08-15T12:00:00'), 45)
    expect(proximos).toHaveLength(2)
    expect(proximos[0].persona.nombre).toBe('Ana')
    expect(proximos[0].fecha).toBe('2026-08-20')
    expect(proximos[1]).toMatchObject({ persona: { nombre: 'Laura' }, rol: 'voluntario', fecha: '2026-08-22' })
  })

  it('agrega y quita un evento manual sin tocar los cumpleaños', () => {
    const conEvento = agregarEvento(ROSTER, { fecha: '2026-08-22', titulo: 'Reunión' })
    expect(conEvento.agenda.eventos).toHaveLength(1)
    expect(quitarEvento(conEvento, conEvento.agenda.eventos[0].id).agenda.eventos).toHaveLength(0)
  })

  it('incluye efemérides inclusivas de Uruguay y las fechas móviles familiares', () => {
    const eventos = efemeridesUruguay([2026])
    expect(eventos).toEqual(expect.arrayContaining([
      expect.objectContaining({ fecha: '2026-04-02', titulo: 'Día Nacional de las Personas con TEA' }),
      expect.objectContaining({ fecha: '2026-05-10', titulo: 'Día de la Madre' }),
      expect.objectContaining({ fecha: '2026-08-09', titulo: 'Día de la Niñez' }),
      expect.objectContaining({ fecha: '2026-10-12', titulo: 'Día de la Diversidad Cultural' }),
      expect.objectContaining({ fecha: '2026-12-03', titulo: 'Día Internacional de las Personas con Discapacidad' }),
    ]))
  })

  it('activa el recordatorio de un evento manual cuando entra en su plazo', () => {
    const conEvento = agregarEvento(ROSTER, { fecha: '2026-08-22', titulo: 'Reunión', recordatorio: 7 })
    expect(recordatoriosDe(conEvento, new Date('2026-08-16T12:00:00')))
      .toEqual([expect.objectContaining({ titulo: 'Reunión', faltan: 6, recordatorio: 7 })])
  })
})
