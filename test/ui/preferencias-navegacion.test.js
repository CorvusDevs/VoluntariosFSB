import { describe, expect, it } from 'vitest'
import {
  ETIQUETAS_NAVEGACION_CMS, GRUPOS_NAVEGACION_CMS, TITULOS_GRUPOS_NAVEGACION_CMS,
  clavePreferenciasNavegacion, grupoActivoNavegacion, grupoDebeEstarAbierto,
  guardarPreferenciaNavegacion, leerPreferenciasNavegacion,
} from '../../js/ui/preferencias-navegacion.js'

function crearAlmacen() {
  const datos = new Map()
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
  }
}

describe('preferencias de navegación del CMS', () => {
  it('agrupa todos los destinos en cinco tareas reconocibles', () => {
    expect(Object.keys(GRUPOS_NAVEGACION_CMS)).toEqual(['trabajo', 'organizacion', 'contenidoPublico', 'comunicacion', 'administracion'])
    expect(GRUPOS_NAVEGACION_CMS.contenidoPublico).toEqual(['cms-pagina-web', 'cms-comunicacion-visual'])
    expect(GRUPOS_NAVEGACION_CMS.organizacion).toEqual(expect.arrayContaining(['cms-areas', 'cms-formularios', 'cms-biblioteca', 'cms-familias']))
    expect(GRUPOS_NAVEGACION_CMS.administracion).toEqual(expect.arrayContaining(['cms-operaciones', 'cms-privacidad', 'accesos', 'registro-institucional', 'ayuda', 'cambios']))
    expect(TITULOS_GRUPOS_NAVEGACION_CMS.contenidoPublico).toBe('Contenido público')
    expect(TITULOS_GRUPOS_NAVEGACION_CMS.organizacion).toBe('Organización')
    expect(ETIQUETAS_NAVEGACION_CMS['cms-pagina-web']).toBe('Página web')
    expect(ETIQUETAS_NAVEGACION_CMS['cms-privacidad']).toBe('Solicitudes de privacidad')
  })

  it('separa el estado recordado por cuenta', () => {
    expect(clavePreferenciasNavegacion({ correo: 'Claudia@Aletea.org' })).toContain('claudia@aletea.org')
    expect(clavePreferenciasNavegacion({ correo: 'otra@aletea.org' })).not.toBe(clavePreferenciasNavegacion({ correo: 'Claudia@Aletea.org' }))
  })

  it('guarda un solo grupo favorito entre sesiones', () => {
    const almacen = crearAlmacen()
    const sesion = { correo: 'claudia@aletea.org' }
    guardarPreferenciaNavegacion('contenidoPublico', true, sesion, almacen)
    guardarPreferenciaNavegacion('organizacion', true, sesion, almacen)
    expect(leerPreferenciasNavegacion(sesion, almacen)).toEqual({ favorito: 'organizacion' })
    guardarPreferenciaNavegacion('organizacion', false, sesion, almacen)
    expect(leerPreferenciasNavegacion(sesion, almacen)).toEqual({})
  })

  it('abre siempre el grupo de la pantalla activa', () => {
    expect(grupoActivoNavegacion('cms-biblioteca')).toBe('organizacion')
    expect(grupoActivoNavegacion('cms-areas')).toBe('organizacion')
    expect(grupoActivoNavegacion('cms-formularios')).toBe('organizacion')
    expect(grupoActivoNavegacion('cms-comunicacion-visual')).toBe('contenidoPublico')
    expect(grupoActivoNavegacion('cms-privacidad')).toBe('administracion')
    expect(grupoDebeEstarAbierto('organizacion', 'cms-biblioteca', { favorito: 'trabajo' })).toBe(true)
    expect(grupoDebeEstarAbierto('contenidoPublico', 'cms-biblioteca', { favorito: 'contenidoPublico' })).toBe(true)
    expect(grupoDebeEstarAbierto('trabajo', 'cms-biblioteca', { favorito: 'contenidoPublico' })).toBe(false)
  })

  it('continúa con valores seguros si el almacenamiento falla', () => {
    const almacen = { getItem: () => { throw new Error('sin acceso') } }
    expect(leerPreferenciasNavegacion({}, almacen)).toEqual({})
    expect(grupoDebeEstarAbierto('trabajo', 'cms-pagina-web', {})).toBe(false)
    expect(grupoDebeEstarAbierto('contenidoPublico', 'cms-pagina-web', {})).toBe(true)
  })
})
