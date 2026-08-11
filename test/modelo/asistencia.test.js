import { describe, it, expect } from 'vitest'
import { estadoDeSabado, VINO, FALTO, NO_ESTABA } from '../../js/modelo/asistencia.js'

const ROSTER = {
  version: 1,
  participantes: [
    { id: 'p1', nombre: 'Gaia', grupo: 1, activo: true },
    { id: 'p2', nombre: 'Santiago', grupo: 1, activo: true },
    { id: 'p3', nombre: 'Nikita', grupo: 2, activo: true },
  ],
  voluntarios: [
    { id: 'v1', nombre: 'Abi', activo: true },
    { id: 'v2', nombre: 'Vicky', activo: true },
    { id: 'v3', nombre: 'Martin', activo: true },
  ],
}

const LISTA = {
  version: 1,
  fecha: '2026-08-15',
  ausentes: ['p2'],
  grupos: [
    { numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: ['v2'] },
    { numero: 2, filas: [{ participantes: ['p3'], voluntarios: [] }], apoyo: [] },
  ],
}

describe('estadoDeSabado', () => {
  it('el participante que esta en un grupo vino', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('p1')).toBe(VINO)
  })

  it('el participante que esta en ausentes falto', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('p2')).toBe(FALTO)
  })

  it('el participante que no figura de ningun modo todavia no estaba', () => {
    const roster = {
      ...ROSTER,
      participantes: [...ROSTER.participantes, { id: 'p9', nombre: 'Sofi', grupo: 1, activo: true }],
    }
    expect(estadoDeSabado(LISTA, roster).get('p9')).toBe(NO_ESTABA)
  })

  it('el voluntario que acompaña a alguien vino', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('v1')).toBe(VINO)
  })

  it('el voluntario que esta en apoyo vino', () => {
    // Apoyo es del grupo entero y no acompaña a nadie en particular, pero estuvo.
    expect(estadoDeSabado(LISTA, ROSTER).get('v2')).toBe(VINO)
  })

  it('el voluntario que no aparece en la planilla falto', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('v3')).toBe(FALTO)
  })

  it('no inventa gente que no esta en el roster', () => {
    expect(estadoDeSabado(LISTA, ROSTER).size).toBe(6)
  })

  it('tolera una planilla vieja sin apoyo ni ausentes', () => {
    const vieja = { fecha: '2026-01-04', grupos: [{ numero: 1, filas: [] }, { numero: 2, filas: [] }] }
    const estado = estadoDeSabado(vieja, ROSTER)
    expect(estado.get('p1')).toBe(NO_ESTABA)
    expect(estado.get('v1')).toBe(FALTO)
  })
})
