import { describe, it, expect } from 'vitest'
import { aCSV } from '../../js/reporte/csv.js'

const HISTORIA = {
  fechas: ['2026-08-01', '2026-08-08'],
  participantes: [
    { persona: { id: 'p1', nombre: 'Gaia', grupo: 1 }, estados: ['vino', 'falto'], vino: 1, de: 2 },
    { persona: { id: 'p3', nombre: 'Nikita', grupo: 2 }, estados: ['vino', 'vino'], vino: 2, de: 2 },
    { persona: { id: 'p2', nombre: 'Santiago', grupo: 1 }, estados: ['no-estaba', 'vino'], vino: 1, de: 1 },
  ],
  voluntarios: [
    { persona: { id: 'v1', nombre: 'Abi, la grande' }, estados: ['no-estaba', 'vino'], vino: 1, de: 1 },
  ],
}

const filas = (historia = HISTORIA, titulos = {}) => aCSV(historia, titulos).split('\n')
const columnas = (fila) => fila.replace(/^﻿/, '').split(',')

describe('aCSV', () => {
  it('encabeza con el tipo, el grupo, el nombre y las fechas', () => {
    expect(columnas(filas()[0])).toEqual([
      'Tipo', 'Grupo', 'Nombre', '2026-08-01', '2026-08-08', 'Vino a', 'Podía venir a',
    ])
  })

  it('arranca con el BOM que Excel necesita para los acentos', () => {
    expect(aCSV(HISTORIA).charCodeAt(0)).toBe(0xFEFF)
  })

  it('separa el tipo del grupo en dos columnas', () => {
    // Antes el grupo iba metido adentro de "Tipo". En una planilla de calculo
    // eso impide filtrar por participante y agrupar por grupo a la vez.
    expect(columnas(filas()[1]).slice(0, 3)).toEqual(['Participante', 'Grupo 1', 'Gaia'])
  })

  it('el voluntario no tiene grupo y la casilla queda vacia', () => {
    const fila = filas().find((f) => f.startsWith('Voluntario'))
    expect(columnas(fila).slice(0, 2)).toEqual(['Voluntario', ''])
  })

  it('agrupa a los participantes por grupo, como en la pantalla', () => {
    // Salian en el orden de la lista de personas, asi que el grupo 1 y el 2 se
    // intercalaban a lo largo de toda la planilla y no se podia leer de corrido.
    const grupos = filas().slice(1).map((f) => columnas(f)[1])
    expect(grupos).toEqual(['Grupo 1', 'Grupo 1', 'Grupo 2', ''])
  })

  it('usa el rotulo de grupo que le puso la coordinacion', () => {
    const grupos = filas(HISTORIA, { 1: 'Los grandes' }).slice(1).map((f) => columnas(f)[1])
    expect(grupos[0]).toBe('Los grandes')
  })

  it('dice si vino, si falto y si todavia no estaba', () => {
    // La casilla vacia no se entendia: en una planilla se lee igual que un dato
    // que falta. Ahora cada casilla dice que paso.
    expect(columnas(filas()[1]).slice(3, 5)).toEqual(['Sí', 'No'])
    expect(columnas(filas()[2]).slice(3, 5)).toEqual(['No estaba', 'Sí'])
  })

  it('cuenta a cuantos vino y a cuantos podia venir', () => {
    expect(columnas(filas()[2]).slice(-2)).toEqual(['1', '1'])
  })

  it('entrecomilla el nombre que tiene una coma', () => {
    // Sin esto, "Abi, la grande" se parte en dos columnas y corre todo el resto.
    const fila = filas().find((f) => f.startsWith('Voluntario'))
    expect(fila).toContain('"Abi, la grande"')
  })

  it('duplica la comilla que venga adentro del nombre', () => {
    const historia = {
      ...HISTORIA,
      participantes: [{ persona: { id: 'p1', nombre: 'Juan "Pipa"', grupo: 2 }, estados: ['vino', 'vino'], vino: 2, de: 2 }],
    }
    expect(filas(historia)[1]).toContain('"Juan ""Pipa"""')
  })

  it('un mes sin nadie sigue teniendo encabezado', () => {
    const vacia = { fechas: [], participantes: [], voluntarios: [] }
    expect(aCSV(vacia)).toBe('﻿Tipo,Grupo,Nombre,Vino a,Podía venir a')
  })
})
