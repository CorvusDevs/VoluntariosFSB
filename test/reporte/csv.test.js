import { describe, it, expect } from 'vitest'
import { aCSV } from '../../js/reporte/csv.js'

const HISTORIA = {
  fechas: ['2026-08-01', '2026-08-08'],
  participantes: [
    { persona: { id: 'p1', nombre: 'Gaia', grupo: 1 }, estados: ['vino', 'falto'], vino: 1, de: 2 },
  ],
  voluntarios: [
    { persona: { id: 'v1', nombre: 'Abi, la grande' }, estados: ['no-estaba', 'vino'], vino: 1, de: 1 },
  ],
}

describe('aCSV', () => {
  it('encabeza con las fechas', () => {
    expect(aCSV(HISTORIA).split('\n')[0]).toBe('﻿Tipo,Nombre,2026-08-01,2026-08-08,Vino,De')
  })

  it('escribe una fila por persona', () => {
    expect(aCSV(HISTORIA).split('\n')[1]).toBe('Grupo 1,Gaia,Si,No,1,2')
  })

  it('entrecomilla el nombre que tiene una coma', () => {
    // Sin esto, "Abi, la grande" se parte en dos columnas y corre todo el resto.
    expect(aCSV(HISTORIA).split('\n')[2]).toBe('Voluntario,"Abi, la grande",,Si,1,1')
  })

  it('duplica la comilla que venga adentro del nombre', () => {
    const historia = {
      ...HISTORIA,
      participantes: [{ persona: { id: 'p1', nombre: 'Juan "Pipa"', grupo: 2 }, estados: ['vino', 'vino'], vino: 2, de: 2 }],
    }
    expect(aCSV(historia).split('\n')[1]).toBe('Grupo 2,"Juan ""Pipa""",Si,Si,2,2')
  })

  it('deja la casilla vacia cuando la persona todavia no estaba', () => {
    expect(aCSV(HISTORIA)).toContain(',,Si,')
  })

  it('arranca con el BOM que Excel necesita para los acentos', () => {
    expect(aCSV(HISTORIA).charCodeAt(0)).toBe(0xFEFF)
  })

  it('un mes sin nadie sigue teniendo encabezado', () => {
    const vacia = { fechas: [], participantes: [], voluntarios: [] }
    expect(aCSV(vacia)).toBe('﻿Tipo,Nombre,Vino,De')
  })
})

describe('el grupo en el CSV', () => {
  it('usa el rotulo que le puso la coordinacion', () => {
    // Los titulos se editan desde Armar lista: escribir "Grupo 1" a mano haria
    // que el CSV y la planilla se contradigan.
    const filas = aCSV(HISTORIA, { 1: 'Los grandes' }).split('\n')
    expect(filas[1].startsWith('Los grandes,')).toBe(true)
  })

  it('sin rotulo cae en el numero de grupo', () => {
    expect(aCSV(HISTORIA).split('\n')[1].startsWith('Grupo 1,')).toBe(true)
  })

  it('el voluntario sigue diciendo Voluntario', () => {
    expect(aCSV(HISTORIA).split('\n')[2].startsWith('Voluntario,')).toBe(true)
  })
})
