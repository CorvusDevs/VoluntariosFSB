import { describe, it, expect } from 'vitest'
import { iniciales, sinAcentos, coincide, ordenarPorNombre } from '../../js/util/nombres.js'

describe('iniciales', () => {
  it('toma las dos primeras letras de un nombre simple', () => {
    expect(iniciales('Gonzalo')).toBe('GO')
  })

  it('toma la inicial de cada palabra cuando hay dos', () => {
    expect(iniciales('Francisco Paiva')).toBe('FP')
  })

  it('ignora palabras vacias por espacios de mas', () => {
    expect(iniciales('  Ana   Lucia  ')).toBe('AL')
  })

  it('conserva el acento en la letra', () => {
    expect(iniciales('Ángel')).toBe('ÁN')
  })

  it('devuelve cadena vacia si no hay nombre', () => {
    expect(iniciales('')).toBe('')
    expect(iniciales(null)).toBe('')
  })
})

describe('sinAcentos', () => {
  it('quita tildes y pasa a minuscula', () => {
    expect(sinAcentos('Ángel')).toBe('angel')
    expect(sinAcentos('ROCÍO')).toBe('rocio')
    expect(sinAcentos('Julián')).toBe('julian')
  })

  it('conserva la enie como letra propia', () => {
    expect(sinAcentos('Begoña')).toBe('begoña')
  })
})

describe('coincide', () => {
  it('busca sin importar acentos ni mayusculas', () => {
    expect(coincide('Rocío', 'roci')).toBe(true)
    expect(coincide('Rocío', 'ROCIO')).toBe(true)
    expect(coincide('Rocío', 'xyz')).toBe(false)
  })

  it('una busqueda vacia coincide con todo', () => {
    expect(coincide('Rocío', '')).toBe(true)
  })
})

describe('ordenarPorNombre', () => {
  it('ordena alfabeticamente ignorando acentos', () => {
    const gente = [{ nombre: 'Rocío' }, { nombre: 'Ángel' }, { nombre: 'Beto' }]
    expect(ordenarPorNombre(gente).map((p) => p.nombre)).toEqual(['Ángel', 'Beto', 'Rocío'])
  })

  it('no modifica el arreglo original', () => {
    const gente = [{ nombre: 'Rocío' }, { nombre: 'Ángel' }]
    ordenarPorNombre(gente)
    expect(gente[0].nombre).toBe('Rocío')
  })
})
