import { describe, it, expect } from 'vitest'
import {
  crearLista, asignarVoluntario, quitarVoluntario, fusionarParticipantes,
  separarParticipante, moverAGrupo, agregarApoyo, contarPendientes, filaDe,
} from '../../js/modelo/lista.js'
import { ROSTER } from '../ayudas/datos.js'

describe('crearLista', () => {
  it('crea dos grupos con la fecha dada', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(l.fecha).toBe('2026-08-08')
    expect(l.grupos).toHaveLength(2)
    expect(l.grupos[0].numero).toBe(1)
    expect(l.grupos[1].numero).toBe(2)
  })

  it('pone a cada participante activo en su grupo habitual, sin voluntario', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(l.grupos[0].filas).toHaveLength(3)
    expect(l.grupos[1].filas).toHaveLength(2)
    l.grupos.forEach((g) => g.filas.forEach((f) => expect(f.voluntarios).toEqual([])))
  })

  it('excluye a los inactivos', () => {
    const l = crearLista('2026-08-08', ROSTER)
    const ids = l.grupos.flatMap((g) => g.filas.flatMap((f) => f.participantes))
    expect(ids).not.toContain('p6')
  })

  it('trae los subtitulos y canchas por defecto', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(l.grupos[0].subtitulo).toBe('5 a 9 años')
    expect(l.grupos[1].subtitulo).toBe('10 a 17 años')
    expect(l.grupos[0].cancha).toBe('Cancha 1')
  })
})

describe('asignarVoluntario', () => {
  it('agrega el voluntario a la fila del participante', () => {
    const l = asignarVoluntario(crearLista('2026-08-08', ROSTER), 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1'])
  })

  it('un segundo voluntario se suma a la misma fila', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p1', 'v2')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1', 'v2'])
  })

  it('el mismo voluntario dos veces no se duplica', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1'])
  })

  it('un voluntario puede estar en dos filas a la vez', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p2', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1'])
    expect(filaDe(l, 'p2').voluntarios).toEqual(['v1'])
  })

  it('no modifica la lista original', () => {
    const l = crearLista('2026-08-08', ROSTER)
    asignarVoluntario(l, 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual([])
  })
})

describe('quitarVoluntario', () => {
  it('lo saca dejando la fila valida y vacia', () => {
    let l = asignarVoluntario(crearLista('2026-08-08', ROSTER), 'p1', 'v1')
    l = quitarVoluntario(l, 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual([])
  })
})

describe('fusionarParticipantes', () => {
  it('junta dos participantes en una sola fila', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = fusionarParticipantes(l, 'p1', 'p2')
    expect(filaDe(l, 'p1').participantes).toEqual(['p1', 'p2'])
    expect(l.grupos[0].filas).toHaveLength(2)
  })

  it('conserva los voluntarios de ambas filas sin duplicar', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p2', 'v1')
    l = asignarVoluntario(l, 'p2', 'v2')
    l = fusionarParticipantes(l, 'p1', 'p2')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1', 'v2'])
  })

  it('rechaza fusionar participantes de grupos distintos', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(() => fusionarParticipantes(l, 'p1', 'p4')).toThrow(/grupo/i)
  })
})

describe('separarParticipante', () => {
  it('devuelve al participante a su propia fila', () => {
    let l = fusionarParticipantes(crearLista('2026-08-08', ROSTER), 'p1', 'p2')
    l = separarParticipante(l, 'p2')
    expect(filaDe(l, 'p1').participantes).toEqual(['p1'])
    expect(filaDe(l, 'p2').participantes).toEqual(['p2'])
  })
})

describe('moverAGrupo', () => {
  it('mueve la fila al otro grupo', () => {
    const l = moverAGrupo(crearLista('2026-08-08', ROSTER), 'p1', 2)
    expect(l.grupos[0].filas).toHaveLength(2)
    expect(l.grupos[1].filas.some((f) => f.participantes.includes('p1'))).toBe(true)
  })
})

describe('agregarApoyo', () => {
  it('agrega el voluntario de apoyo al grupo', () => {
    const l = agregarApoyo(crearLista('2026-08-08', ROSTER), 2, 'v5')
    expect(l.grupos[1].apoyo).toEqual(['v5'])
  })
})

describe('contarPendientes', () => {
  it('cuenta participantes sin voluntario y voluntarios sin asignar', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    const c = contarPendientes(l, 1, ROSTER)
    expect(c.participantesSinVoluntario).toBe(2)
    expect(c.voluntariosSinAsignar).toBe(4)
  })
})
