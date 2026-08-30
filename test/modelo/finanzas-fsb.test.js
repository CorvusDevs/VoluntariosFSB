import { describe, expect, it } from 'vitest'
import { cierreMensualFsb, dineroFsb, estadoCompromisoFsb, estadoCuentaMensualFsb, exportarFinanzasFsb, importeCentavosFsb, prepararCuotasFsb, prepararRecargosFsb, recargoFsb, resumenFinanzasFsb, signoMovimientoFsb, textoRecordatorioFsb } from '../../js/modelo/finanzas-fsb.js'

describe('cuentas corrientes de Fútbol sin Barreras', () => {
  it('convierte importes sin errores de redondeo', () => {
    expect(importeCentavosFsb('1.250,50')).toBeNull()
    expect(importeCentavosFsb('1250,50')).toBe(125050)
    expect(importeCentavosFsb('1250.5')).toBe(125050)
    expect(dineroFsb(125050)).toContain('1.250,5')
    expect(signoMovimientoFsb('cargo')).toBe(1)
    expect(signoMovimientoFsb('pago')).toBe(-1)
    expect(recargoFsb('800')).toBe(8000)
    expect(recargoFsb('', 10)).toBeNull()
  })

  it('exporta el estado mensual y conserva conceptos propios del Excel', () => {
    const csv = exportarFinanzasFsb([{ id: 'c1', nombre: 'Camila, Pérez', grupo: 1, condicion: 'regular', estado_pago: 'pendiente', saldo_centavos: 158000, movimientos: [
      { concepto: 'Equipo de verano', tipo: 'cargo', periodo: '2026-07', fecha: '2026-07-22', importe_centavos: 150000, notas: 'Entrega completa' },
      { concepto: 'Recargo 10%', tipo: 'recargo', periodo: '2026-07', fecha: '2026-07-22', importe_centavos: 8000 },
    ] }], '2026-07')

    expect(csv).toContain('Equipo de verano')
    expect(csv).toContain('Recargo 10%')
    expect(csv).toContain('"Camila, Pérez"')
    expect(csv).not.toContain('undefined')
  })

  it('calcula saldo, vencimiento y pagos del mes por cuenta', () => {
    const resumen = resumenFinanzasFsb([
      { id: 'c1', nombre: 'Camila' },
      { id: 'c2', nombre: 'Martín' },
    ], [
      { id: 'm1', cuenta_id: 'c1', tipo: 'cargo', fecha: '2026-08-01', vencimiento: '2026-08-10', importe_centavos: 300000 },
      { id: 'm2', cuenta_id: 'c1', tipo: 'pago', fecha: '2026-08-15', importe_centavos: -100000 },
      { id: 'm3', cuenta_id: 'c2', tipo: 'pago', fecha: '2026-08-02', importe_centavos: -5000 },
      { id: 'm4', cuenta_id: 'c1', tipo: 'pago', fecha: '2026-08-20', importe_centavos: -900000, anulado_en: '2026-08-21' },
    ], '2026-08-25')

    expect(resumen.total_pendiente_centavos).toBe(200000)
    expect(resumen.total_a_favor_centavos).toBe(5000)
    expect(resumen.cuentas_pendientes).toBe(1)
    expect(resumen.cuentas_vencidas).toBe(1)
    expect(resumen.pagos_mes_centavos).toBe(105000)
    expect(resumen.cuentas.find((cuenta) => cuenta.id === 'c1')).toMatchObject({ estado_pago: 'vencido', saldo_centavos: 200000, vencido_centavos: 200000 })
    expect(resumen.cuentas.find((cuenta) => cuenta.id === 'c2')).toMatchObject({ estado_pago: 'a_favor', saldo_centavos: -5000 })
    expect(resumen.cuentas.find((cuenta) => cuenta.id === 'c1').movimientos).toHaveLength(3)
    expect(resumen.cuentas.find((cuenta) => cuenta.id === 'c1').movimientos.find((movimiento) => movimiento.id === 'm4').anulado_en).toBeTruthy()
  })

  it('prepara cuotas por grupo, aplica becas y evita duplicarlas', () => {
    const resultado = prepararCuotasFsb([
      { id: 'c1', nombre: 'Camila', grupo: 1, condicion: 'regular', activa: 1 },
      { id: 'c2', nombre: 'Martín', grupo: 2, condicion: 'beca', beca_porcentaje: 50, activa: 1 },
      { id: 'c3', nombre: 'Sofía', grupo: 1, condicion: 'voluntariado', activa: 1 },
      { id: 'c4', nombre: 'Lucía', grupo: 2, condicion: 'regular', activa: 0 },
    ], [{ clave_operacion: 'cuota:2026-09:c1', anulado_en: null }], {
      periodo: '2026-09', concepto: 'Cuota mensual', grupo_1: '2500', grupo_2: '3000', fecha: '2026-09-01', vencimiento: '2026-09-10',
    })

    expect(resultado.cuotas).toHaveLength(2)
    expect(resultado.nuevas).toHaveLength(1)
    expect(resultado.cuotas.find((cuota) => cuota.cuenta_id === 'c1').ya_generada).toBe(true)
    expect(resultado.nuevas[0]).toMatchObject({ cuenta_id: 'c2', importe_base_centavos: 300000, importe_centavos: 150000, beca_porcentaje: 50 })
    expect(resultado.total_centavos).toBe(150000)
    expect(resultado.exclusiones).toEqual(expect.arrayContaining([
      expect.objectContaining({ nombre: 'Sofía', razon: expect.stringContaining('Voluntariado') }),
      expect.objectContaining({ nombre: 'Lucía', razon: expect.stringContaining('inactivo') }),
    ]))
    expect(prepararCuotasFsb([], [], { periodo: '2026-13' }).error).toContain('mes')
  })

  it('aplica una sola vez el recargo del 10 por ciento desde el día 16 solo a cuotas comunes pendientes', () => {
    const cuentas = [
      { id: 'regular', activa: 1, condicion: 'regular' },
      { id: 'beca', activa: 1, condicion: 'beca', beca_porcentaje: 50 },
      { id: 'paga', activa: 1, condicion: 'regular' },
    ]
    const movimientos = [
      { cuenta_id: 'regular', fecha: '2026-08-01', importe_centavos: 80000, clave_operacion: 'cuota:2026-08:regular' },
      { cuenta_id: 'beca', fecha: '2026-08-01', importe_centavos: 40000, clave_operacion: 'cuota:2026-08:beca' },
      { cuenta_id: 'paga', fecha: '2026-08-01', importe_centavos: 80000, clave_operacion: 'cuota:2026-08:paga' },
      { cuenta_id: 'paga', fecha: '2026-08-15', importe_centavos: -80000, tipo: 'pago' },
    ]
    expect(prepararRecargosFsb(cuentas, movimientos, '2026-08-15')).toEqual([])
    const recargos = prepararRecargosFsb(cuentas, movimientos, '2026-08-16')
    expect(recargos).toEqual([expect.objectContaining({ cuenta_id: 'regular', importe_centavos: 8000, clave_operacion: 'recargo:2026-08:regular' })])
    expect(prepararRecargosFsb(cuentas, [...movimientos, ...recargos], '2026-08-20')).toEqual([])
  })

  it('concilia un estado mensual sin contar movimientos anulados', () => {
    const estado = estadoCuentaMensualFsb({ movimientos: [
      { tipo: 'cargo', periodo: '2026-07', fecha: '2026-07-01', importe_centavos: 200000 },
      { tipo: 'cargo', periodo: '2026-08', fecha: '2026-08-01', importe_centavos: 300000 },
      { tipo: 'pago', periodo: '2026-08', fecha: '2026-08-12', importe_centavos: -150000 },
      { tipo: 'pago', periodo: '2026-08', fecha: '2026-08-14', importe_centavos: -999999, anulado_en: '2026-08-15' },
    ] }, '2026-08')

    expect(estado).toMatchObject({ saldo_inicial_centavos: 200000, cargos_centavos: 300000, pagos_centavos: 150000, saldo_final_centavos: 350000 })
    expect(estado.movimientos).toHaveLength(2)
  })

  it('resume el cierre mensual por fecha de cobro sin contar anulaciones ni compromisos como pagos', () => {
    const cierre = cierreMensualFsb([{ id: 'c1', nombre: 'Camila', compromiso_activo: { id: 'co1' }, movimientos: [
      { tipo: 'cargo', periodo: '2026-07', fecha: '2026-07-01', importe_centavos: 100000 },
      { tipo: 'cargo', periodo: '2026-08', fecha: '2026-08-01', importe_centavos: 300000 },
      { tipo: 'pago', periodo: '2026-07', fecha: '2026-08-12', importe_centavos: -150000 },
      { tipo: 'pago', periodo: '2026-08', fecha: '2026-08-14', importe_centavos: -900000, anulado_en: '2026-08-15' },
    ] }, { id: 'c2', nombre: 'Martín', movimientos: [
      { tipo: 'cargo', periodo: '2026-08', fecha: '2026-08-01', importe_centavos: 200000 },
      { tipo: 'pago', periodo: '2026-08', fecha: '2026-08-20', importe_centavos: -200000 },
    ] }], '2026-08')

    expect(cierre).toMatchObject({ cargos_centavos: 500000, pagos_centavos: 350000, por_cobrar_centavos: 600000, pendiente_centavos: 250000, tasa_cobro: 58, cuentas_con_pago: 2, cuentas_pendientes: 1 })
    expect(cierre.seguimiento[0]).toMatchObject({ id: 'c1', saldo_cierre_centavos: 250000, compromiso_activo: { id: 'co1' } })
    expect(cierreMensualFsb([], '2026-13').error).toContain('mes')
  })

  it('marca compromisos vencidos y prepara un recordatorio manual prudente', () => {
    expect(estadoCompromisoFsb({ estado: 'vigente', fecha_prevista: '2026-08-20' }, '2026-08-25')).toBe('vencido')
    expect(estadoCompromisoFsb({ estado: 'cumplido', fecha_prevista: '2026-08-20' }, '2026-08-25')).toBe('cumplido')
    const cuenta = { nombre: 'Camila Pérez', saldo_centavos: 250000 }
    expect(textoRecordatorioFsb(cuenta)).toContain('Hola Camila')
    expect(textoRecordatorioFsb(cuenta)).not.toContain('$')
    expect(textoRecordatorioFsb(cuenta, { incluirImporte: true })).toContain('2.500')
  })
})
