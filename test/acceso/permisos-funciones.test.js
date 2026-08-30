import { describe, expect, it } from 'vitest'
import {
  perfilAccesoInstitucional, puedeCrearCartaMembretada, puedeGestionarPaginaWeb,
  puedeUsarComunicacionVisual, puedeVerMetricasPaginaWeb,
} from '../../js/acceso/permisos-funciones.js'

describe('permisos de las funciones institucionales nuevas', () => {
  it('reserva la carta oficial a Dirección y Administración', () => {
    expect(puedeCrearCartaMembretada({ perfil_acceso: 'administracion' })).toBe(true)
    expect(puedeCrearCartaMembretada({ perfil_acceso: 'direccion' })).toBe(true)
    expect(puedeCrearCartaMembretada({ perfil_acceso: 'coordinacion' })).toBe(false)
    expect(puedeCrearCartaMembretada({ perfil_acceso: 'integrante' })).toBe(false)
    expect(puedeCrearCartaMembretada({ perfil_acceso: 'consulta' })).toBe(false)
  })

  it('limita los editores y métricas a quienes gestionan contenido público', () => {
    for (const perfil_acceso of ['administracion', 'direccion', 'coordinacion']) {
      const cuenta = { perfil_acceso }
      expect(puedeGestionarPaginaWeb(cuenta)).toBe(true)
      expect(puedeUsarComunicacionVisual(cuenta)).toBe(true)
      expect(puedeVerMetricasPaginaWeb(cuenta)).toBe(true)
    }
    for (const perfil_acceso of ['integrante', 'consulta']) {
      const cuenta = { perfil_acceso }
      expect(puedeGestionarPaginaWeb(cuenta)).toBe(false)
      expect(puedeUsarComunicacionVisual(cuenta)).toBe(false)
      expect(puedeVerMetricasPaginaWeb(cuenta)).toBe(false)
    }
  })

  it('mantiene la compatibilidad de perfiles históricos sin ampliar cuentas no administrativas', () => {
    expect(perfilAccesoInstitucional({ rol: 'admin' })).toBe('administracion')
    expect(perfilAccesoInstitucional({ rol: 'coordinacion' })).toBe('coordinacion')
  })
})
