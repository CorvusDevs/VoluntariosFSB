import { describe, it, expect } from 'vitest'
import { iniciales, sinAcentos, coincide, ordenarPorNombre, abreviarApellido } from '../../js/util/nombres.js'

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

  it('no parte un par sustituto cuando el nombre empieza con emoji', () => {
    expect(iniciales('🌻 Maria Lucia').isWellFormed()).toBe(true)
    expect(iniciales('😀 😎').isWellFormed()).toBe(true)
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

describe('abreviarApellido', () => {
  it('deja el primer nombre y la inicial del apellido', () => {
    expect(abreviarApellido('Maria Perez')).toBe('Maria P.')
    expect(abreviarApellido('Francisco Planells')).toBe('Francisco P.')
  })

  it('no toca un nombre de una sola palabra', () => {
    expect(abreviarApellido('Ezequiel')).toBe('Ezequiel')
  })

  it('con varios nombres se queda con el primero y el ultimo apellido', () => {
    expect(abreviarApellido('Maria de los Angeles Fernandez')).toBe('Maria F.')
  })

  it('no le pone un segundo punto a lo que ya viene abreviado', () => {
    expect(abreviarApellido('Ana P.')).toBe('Ana P.')
  })

  it('aguanta espacios de mas y texto vacio', () => {
    expect(abreviarApellido('  Juan   Gomez  ')).toBe('Juan G.')
    expect(abreviarApellido('')).toBe('')
    expect(abreviarApellido(null)).toBe('')
  })
})
