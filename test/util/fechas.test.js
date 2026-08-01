import { describe, it, expect } from 'vitest'
import { formatearFechaLarga, formatearFechaCorta, hoyISO } from '../../js/util/fechas.js'

describe('formatearFechaLarga', () => {
  it('devuelve el dia de la semana capitalizado y el mes en minuscula', () => {
    expect(formatearFechaLarga('2026-08-08')).toBe('Sábado 8 de agosto')
  })

  it('no se corre un dia por la zona horaria', () => {
    expect(formatearFechaLarga('2026-01-01')).toBe('Jueves 1 de enero')
    expect(formatearFechaLarga('2026-12-31')).toBe('Jueves 31 de diciembre')
  })

  it('cubre los siete dias de la semana', () => {
    const dias = ['2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
                  '2026-08-06', '2026-08-07', '2026-08-08']
    const esperados = ['Domingo', 'Lunes', 'Martes', 'Miércoles',
                       'Jueves', 'Viernes', 'Sábado']
    dias.forEach((f, i) => {
      expect(formatearFechaLarga(f).split(' ')[0]).toBe(esperados[i])
    })
  })

  it('rechaza una fecha con formato invalido', () => {
    expect(() => formatearFechaLarga('08/08/2026')).toThrow()
    expect(() => formatearFechaLarga('')).toThrow()
  })
})

describe('formatearFechaCorta', () => {
  it('devuelve dia y mes numericos', () => {
    expect(formatearFechaCorta('2026-08-08')).toBe('8/8/2026')
  })
})

describe('hoyISO', () => {
  it('devuelve una cadena AAAA-MM-DD', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
