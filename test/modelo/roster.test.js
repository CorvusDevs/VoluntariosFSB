import { describe, it, expect } from 'vitest'
import {
  rosterVacio, agregarParticipante, agregarVoluntario,
  editarPersona, desactivarPersona, activos, buscarPersonas,
} from '../../js/modelo/roster.js'

describe('rosterVacio', () => {
  it('trae las dos colecciones y la version', () => {
    const r = rosterVacio()
    expect(r.version).toBe(1)
    expect(r.participantes).toEqual([])
    expect(r.voluntarios).toEqual([])
  })
})

describe('agregarParticipante', () => {
  it('asigna un id unico con prefijo p', () => {
    const r = agregarParticipante(rosterVacio(), { nombre: 'Gonzalo', grupo: 1 })
    expect(r.participantes).toHaveLength(1)
    expect(r.participantes[0].id).toMatch(/^p_/)
    expect(r.participantes[0].nombre).toBe('Gonzalo')
    expect(r.participantes[0].activo).toBe(true)
  })

  it('no modifica el roster original', () => {
    const original = rosterVacio()
    agregarParticipante(original, { nombre: 'Gonzalo', grupo: 1 })
    expect(original.participantes).toHaveLength(0)
  })

  it('genera ids distintos para nombres iguales', () => {
    let r = agregarParticipante(rosterVacio(), { nombre: 'Francisco', grupo: 2 })
    r = agregarParticipante(r, { nombre: 'Francisco', grupo: 2 })
    expect(r.participantes[0].id).not.toBe(r.participantes[1].id)
  })

  it('rechaza un nombre vacio', () => {
    expect(() => agregarParticipante(rosterVacio(), { nombre: '  ', grupo: 1 })).toThrow(/nombre/i)
  })

  it('rechaza un grupo que no sea 1 ni 2', () => {
    expect(() => agregarParticipante(rosterVacio(), { nombre: 'X', grupo: 3 })).toThrow(/grupo/i)
  })
})

describe('agregarVoluntario', () => {
  it('asigna un id con prefijo v y por defecto no es nuevo', () => {
    const r = agregarVoluntario(rosterVacio(), { nombre: 'Abi' })
    expect(r.voluntarios[0].id).toMatch(/^v_/)
    expect(r.voluntarios[0].nuevo).toBe(false)
  })

  it('acepta la marca de nuevo', () => {
    const r = agregarVoluntario(rosterVacio(), { nombre: 'Julián', nuevo: true })
    expect(r.voluntarios[0].nuevo).toBe(true)
  })
})

describe('editarPersona', () => {
  it('cambia el nombre conservando el id', () => {
    const r = agregarParticipante(rosterVacio(), { nombre: 'Gonza', grupo: 1 })
    const id = r.participantes[0].id
    const r2 = editarPersona(r, id, { nombre: 'Gonzalo' })
    expect(r2.participantes[0].id).toBe(id)
    expect(r2.participantes[0].nombre).toBe('Gonzalo')
  })

  it('falla si el id no existe', () => {
    expect(() => editarPersona(rosterVacio(), 'p_falso', { nombre: 'X' })).toThrow(/p_falso/)
  })
})

describe('desactivarPersona', () => {
  it('marca inactivo sin borrar el registro', () => {
    const r = agregarParticipante(rosterVacio(), { nombre: 'Gonzalo', grupo: 1 })
    const id = r.participantes[0].id
    const r2 = desactivarPersona(r, id)
    expect(r2.participantes).toHaveLength(1)
    expect(r2.participantes[0].activo).toBe(false)
  })
})

describe('activos', () => {
  it('devuelve solo los activos, ordenados por nombre', () => {
    let r = agregarParticipante(rosterVacio(), { nombre: 'Rocío', grupo: 1 })
    r = agregarParticipante(r, { nombre: 'Ángel', grupo: 1 })
    r = agregarParticipante(r, { nombre: 'Zoe', grupo: 1 })
    r = desactivarPersona(r, r.participantes[2].id)
    expect(activos(r.participantes).map((p) => p.nombre)).toEqual(['Ángel', 'Rocío'])
  })
})

describe('buscarPersonas', () => {
  it('filtra ignorando acentos', () => {
    let r = agregarParticipante(rosterVacio(), { nombre: 'Rocío', grupo: 1 })
    r = agregarParticipante(r, { nombre: 'Gonzalo', grupo: 1 })
    expect(buscarPersonas(r.participantes, 'roci').map((p) => p.nombre)).toEqual(['Rocío'])
  })
})
