import { describe, it, expect } from 'vitest'
import {
  estadoDeSabado, historial, rachasDeFalta, hastaHoy, agruparPorGrupo,
  UMBRAL_ALERTA, VINO, FALTO, NO_ESTABA,
} from '../../js/modelo/asistencia.js'

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

const cuatroSabados = (estadosP1) => estadosP1.map((vino, i) => ({
  fecha: `2026-08-0${i + 1}`,
  grupos: [
    { numero: 1, filas: vino ? [{ participantes: ['p1'], voluntarios: ['v1'] }] : [], apoyo: [] },
    { numero: 2, filas: [], apoyo: [] },
  ],
  ausentes: vino ? [] : ['p1'],
}))

describe('rachasDeFalta', () => {
  it('el umbral es tres faltas seguidas', () => {
    expect(UMBRAL_ALERTA).toBe(3)
  })

  it('con dos faltas seguidas no avisa', () => {
    const h = historial(cuatroSabados([true, true, false, false]), ROSTER, [])
    expect(rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')).toBeUndefined()
  })

  it('con tres faltas seguidas avisa', () => {
    const h = historial(cuatroSabados([true, false, false, false]), ROSTER, [])
    const alerta = rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')
    expect(alerta.faltas).toBe(3)
  })

  it('cuenta solo la racha que llega hasta el ultimo sabado', () => {
    // Falto tres, volvio: el problema se termino.
    const h = historial(cuatroSabados([false, false, false, true]), ROSTER, [])
    expect(rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')).toBeUndefined()
  })

  it('no avisa por quien esta dado de baja', () => {
    const roster = { ...ROSTER, participantes: ROSTER.participantes.map((p) => ({ ...p, activo: false })) }
    const h = historial(cuatroSabados([true, false, false, false]), roster, [])
    expect(rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')).toBeUndefined()
  })

  it('un seguimiento anotado apaga la alerta', () => {
    const h = historial(cuatroSabados([true, false, false, false]), ROSTER, [])
    const seguimientos = [{ persona: 'p1', desde: '2026-08-02', nota: 'Hable con la mama' }]
    expect(rachasDeFalta(h, seguimientos).find((a) => a.persona.id === 'p1')).toBeUndefined()
  })

  it('vuelve a avisar si falto tres veces mas despues de haber vuelto', () => {
    // Silenciada en la racha vieja; despues volvio y arranco otra racha.
    const listas = cuatroSabados([false, false, false, true])
      .concat([4, 5, 6].map((d) => ({
        fecha: `2026-08-0${d + 1}`,
        grupos: [{ numero: 1, filas: [], apoyo: [] }, { numero: 2, filas: [], apoyo: [] }],
        ausentes: ['p1'],
      })))
    const h = historial(listas, ROSTER, [])
    const seguimientos = [{ persona: 'p1', desde: '2026-08-01', nota: 'vieja' }]
    expect(rachasDeFalta(h, seguimientos).find((a) => a.persona.id === 'p1').faltas).toBe(3)
  })

  it('ordena por racha mas larga primero', () => {
    const h = historial(cuatroSabados([false, false, false, false]), ROSTER, [])
    const alertas = rachasDeFalta(h, [])
    expect(alertas[0].faltas).toBeGreaterThanOrEqual(alertas[alertas.length - 1].faltas)
  })
})

describe('hastaHoy', () => {
  it('deja pasar los sabados que ya ocurrieron', () => {
    expect(hastaHoy(['2026-08-01', '2026-08-08'], '2026-08-11')).toEqual(['2026-08-01', '2026-08-08'])
  })

  it('descarta el sabado que todavia no llego', () => {
    // La planilla del sabado que viene es un plan, no evidencia: se crea con
    // todos presentes, y ese "vino" imaginario cortaba toda racha de faltas.
    // Con esto adentro la alerta no saltaba nunca.
    expect(hastaHoy(['2026-08-08', '2026-08-15'], '2026-08-11')).toEqual(['2026-08-08'])
  })

  it('el sabado de hoy si cuenta', () => {
    expect(hastaHoy(['2026-08-15'], '2026-08-15')).toEqual(['2026-08-15'])
  })

  it('devuelve las fechas ordenadas', () => {
    expect(hastaHoy(['2026-08-08', '2026-07-25'], '2026-08-11')).toEqual(['2026-07-25', '2026-08-08'])
  })
})

describe('rachas que llegan al borde de lo que se miro', () => {
  it('avisa cuando la racha ocupa todo lo mirado', () => {
    // app.js solo lee los ultimos sabados. Si el primero que mira ya es falta,
    // la racha puede venir de antes y decir "falto 4" seria afirmar de mas.
    const h = historial(cuatroSabados([false, false, false, false]), ROSTER, [])
    const alerta = rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')
    expect(alerta.faltas).toBe(4)
    expect(alerta.almenos).toBe(true)
  })

  it('no lo marca cuando antes de la racha hubo un sabado que vino', () => {
    const h = historial(cuatroSabados([true, false, false, false]), ROSTER, [])
    const alerta = rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')
    expect(alerta.faltas).toBe(3)
    expect(alerta.almenos).toBe(false)
  })
})

describe('agruparPorGrupo', () => {
  const filas = [
    { persona: { id: 'p1', nombre: 'Gaia', grupo: 1 } },
    { persona: { id: 'p3', nombre: 'Nikita', grupo: 2 } },
    { persona: { id: 'p2', nombre: 'Santiago', grupo: 1 } },
  ]

  it('separa por numero de grupo', () => {
    const bloques = agruparPorGrupo(filas)
    expect(bloques.map((b) => b.numero)).toEqual([1, 2])
    expect(bloques[0].filas.map((f) => f.persona.nombre)).toEqual(['Gaia', 'Santiago'])
    expect(bloques[1].filas.map((f) => f.persona.nombre)).toEqual(['Nikita'])
  })

  it('no devuelve un grupo sin nadie', () => {
    const soloUno = agruparPorGrupo(filas.filter((f) => f.persona.grupo === 1))
    expect(soloUno.map((b) => b.numero)).toEqual([1])
  })

  it('sin nadie devuelve una lista vacia', () => {
    expect(agruparPorGrupo([])).toEqual([])
  })

  it('junta en un bloque aparte a quien no tiene grupo', () => {
    // No deberia pasar, pero perder a alguien del reporte por un dato raro es
    // peor que mostrarlo suelto.
    const bloques = agruparPorGrupo([...filas, { persona: { id: 'pX', nombre: 'Sin grupo' } }])
    expect(bloques.at(-1).filas.map((f) => f.persona.nombre)).toEqual(['Sin grupo'])
  })
})
