import { describe, it, expect } from 'vitest'
import { formatearFechaLarga, formatearFechaCorta, hoyISO, proximoSabado } from '../../js/util/fechas.js'

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

describe('proximoSabado', () => {
  it('desde un viernes devuelve el dia siguiente', () => {
    expect(proximoSabado('2026-08-07')).toBe('2026-08-08')
  })

  it('desde un sabado devuelve el mismo dia', () => {
    expect(proximoSabado('2026-08-08')).toBe('2026-08-08')
  })

  it('desde un domingo devuelve el sabado de esa semana', () => {
    expect(proximoSabado('2026-08-09')).toBe('2026-08-15')
  })

  it('cruza el fin de mes correctamente', () => {
    expect(proximoSabado('2026-08-28')).toBe('2026-08-29')
    expect(proximoSabado('2026-12-31')).toBe('2027-01-02')
  })

  it('sin argumento usa hoy y devuelve un sabado', () => {
    expect(formatearFechaLarga(proximoSabado()).startsWith('Sábado')).toBe(true)
  })
})
