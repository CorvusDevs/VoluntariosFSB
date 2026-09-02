import { describe, expect, it } from 'vitest'
import {
  CAPACIDAD_CREAR_TAREAS, perfilAccesoInstitucional, permisoCrearTareasEfectivo, puedeCrearCartaMembretada, puedeGestionarPaginaWeb,
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

  it('resuelve crear tareas por persona, equipo, perfil y valor predeterminado', () => {
    const cuenta = { correo: 'coord@aletea.org', perfil_acceso: 'coordinacion' }
    expect(permisoCrearTareasEfectivo(cuenta, 'familias')).toMatchObject({ permitido: false, fuente: 'Predeterminado institucional' })
    expect(permisoCrearTareasEfectivo({ perfil_acceso: 'administracion' }, null)).toMatchObject({ permitido: true })
    const politicas = [
      { capacidad: CAPACIDAD_CREAR_TAREAS, alcance_tipo: 'perfil', alcance_id: 'coordinacion', efecto: 'permitir' },
      { capacidad: CAPACIDAD_CREAR_TAREAS, alcance_tipo: 'equipo', alcance_id: 'familias', efecto: 'bloquear' },
      { capacidad: CAPACIDAD_CREAR_TAREAS, alcance_tipo: 'usuario', alcance_id: 'coord@aletea.org', efecto: 'permitir' },
    ]
    expect(permisoCrearTareasEfectivo(cuenta, 'familias', politicas)).toMatchObject({ permitido: true, fuente: 'Excepción individual' })
    expect(permisoCrearTareasEfectivo({ correo: 'otra@aletea.org', perfil_acceso: 'coordinacion' }, 'familias', politicas)).toMatchObject({ permitido: false, fuente: 'Regla del equipo' })
    expect(permisoCrearTareasEfectivo({ correo: 'otra@aletea.org', perfil_acceso: 'coordinacion' }, 'deportes', politicas)).toMatchObject({ permitido: true, fuente: 'Regla del perfil' })
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
