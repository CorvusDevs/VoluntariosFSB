import { describe, it, expect } from 'vitest'
import { estadoDeSabado, historial, VINO, FALTO, NO_ESTABA } from '../../js/modelo/asistencia.js'

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

// Tres sabados. v3 (Martin) no aparece nunca hasta el tercero.
const SABADOS = [
  { fecha: '2026-08-01',
    grupos: [{ numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
             { numero: 2, filas: [], apoyo: [] }],
    ausentes: ['p2'] },
  { fecha: '2026-08-08',
    grupos: [{ numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
             { numero: 2, filas: [], apoyo: [] }],
    ausentes: ['p2'] },
  { fecha: '2026-08-15',
    grupos: [{ numero: 1, filas: [{ participantes: ['p2'], voluntarios: ['v3'] }], apoyo: [] },
             { numero: 2, filas: [], apoyo: [] }],
    ausentes: ['p1'] },
]

describe('historial', () => {
  it('devuelve las fechas ordenadas', () => {
    const h = historial(SABADOS, ROSTER, [])
    expect(h.fechas).toEqual(['2026-08-01', '2026-08-08', '2026-08-15'])
  })

  it('arma una fila por persona del roster', () => {
    const h = historial(SABADOS, ROSTER, [])
    expect(h.participantes.map((f) => f.persona.id)).toEqual(['p1', 'p2', 'p3'])
    expect(h.voluntarios.map((f) => f.persona.id)).toEqual(['v1', 'v2', 'v3'])
  })

  it('el voluntario no acumula faltas antes de su primer sabado', () => {
    // Martin recien aparece el 15. Los dos anteriores no son faltas suyas.
    const martin = historial(SABADOS, ROSTER, []).voluntarios.find((f) => f.persona.id === 'v3')
    expect(martin.estados).toEqual([NO_ESTABA, NO_ESTABA, VINO])
  })

  it('el voluntario que nunca aparece no cuenta ningun sabado', () => {
    const vicky = historial(SABADOS, ROSTER, []).voluntarios.find((f) => f.persona.id === 'v2')
    expect(vicky.estados).toEqual([NO_ESTABA, NO_ESTABA, NO_ESTABA])
  })

  it('la falta del participante vale desde el primer sabado', () => {
    // De el si hay registro explicito: alguien toco "Hoy no viene".
    const p2 = historial(SABADOS, ROSTER, []).participantes.find((f) => f.persona.id === 'p2')
    expect(p2.estados).toEqual([FALTO, FALTO, VINO])
  })

  it('una correccion pisa lo derivado de la planilla', () => {
    const correcciones = [{ fecha: '2026-08-08', persona: 'p1', vino: false }]
    const p1 = historial(SABADOS, ROSTER, correcciones).participantes.find((f) => f.persona.id === 'p1')
    expect(p1.estados).toEqual([VINO, FALTO, FALTO])
  })

  it('una correccion puede devolver a alguien que la planilla daba por ausente', () => {
    const correcciones = [{ fecha: '2026-08-01', persona: 'p2', vino: true }]
    const p2 = historial(SABADOS, ROSTER, correcciones).participantes.find((f) => f.persona.id === 'p2')
    expect(p2.estados[0]).toBe(VINO)
  })

  it('una correccion sobre un sabado sin planilla se ignora', () => {
    const correcciones = [{ fecha: '2026-09-05', persona: 'p1', vino: false }]
    const p1 = historial(SABADOS, ROSTER, correcciones).participantes.find((f) => f.persona.id === 'p1')
    expect(p1.estados).toHaveLength(3)
  })

  it('cuenta a cuantos vino cada uno', () => {
    const p1 = historial(SABADOS, ROSTER, []).participantes.find((f) => f.persona.id === 'p1')
    expect(p1.vino).toBe(2)
    expect(p1.de).toBe(3)
  })

  it('no cuenta como sabado posible uno en el que la persona no estaba', () => {
    const martin = historial(SABADOS, ROSTER, []).voluntarios.find((f) => f.persona.id === 'v3')
    expect(martin.vino).toBe(1)
    expect(martin.de).toBe(1)
  })
})
