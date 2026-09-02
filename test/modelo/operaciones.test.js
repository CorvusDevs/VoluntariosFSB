import { describe, expect, it } from 'vitest'
import { controlOperativoDesde, controlesOperativosConEstado, estadoTrabajoCorreo, resumenOperativo } from '../../js/modelo/operaciones.js'

describe('modelo del centro de operaciones', () => {
  it('mantiene visibles los controles todavía no configurados', () => {
    const controles = controlesOperativosConEstado([{ clave: 'correo_dmarc', estado: 'confirmado', evidencia: 'Registro TXT verificado' }])
    expect(controles).toHaveLength(6)
    expect(controles.find((control) => control.clave === 'correo_dmarc')?.estado).toBe('confirmado')
    expect(controles.find((control) => control.clave === 'publicacion_sftp')?.estado).toBe('pendiente')
  })

  it('exige evidencia para confirmar y explicación para bloquear', () => {
    expect(controlOperativoDesde({ estado: 'confirmado', evidencia: '' }, 'correo_dmarc').error).toMatch(/evidencia/i)
    expect(controlOperativoDesde({ estado: 'bloqueado', detalle: '' }, 'correo_dmarc').error).toMatch(/impide/i)
    expect(controlOperativoDesde({ estado: 'confirmado', evidencia: 'Validado en cPanel' }, 'correo_dmarc').control.estado).toBe('confirmado')
  })

  it('alerta si hay cola pendiente y el cron no ejecutó', () => {
    expect(estadoTrabajoCorreo({ smtpConfigurado: true, pendientes: 4 }).estado).toBe('critico')
    expect(estadoTrabajoCorreo({ smtpConfigurado: false, pendientes: 4 }).estado).toBe('pendiente')
  })

  it('resume incidentes, cola y controles sin ocultar pendientes', () => {
    expect(resumenOperativo({
      integraciones: [{ estado: 'saludable' }, { estado: 'advertencia' }],
      incidentes: [{ estado: 'abierto' }, { estado: 'resuelto' }],
      controles: [{ estado: 'confirmado' }, { estado: 'pendiente' }],
      cola: [{ estado: 'pendiente', cantidad: 3 }, { estado: 'fallido', cantidad: 2 }],
    })).toEqual({ pendientesCola: 3, fallidosCola: 2, incidentesAbiertos: 1, controlesPendientes: 1, integracionesConAtencion: 1 })
  })
})
