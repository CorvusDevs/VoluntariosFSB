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
  it('separa la web de las herramientas de organización', () => {
    expect(GRUPOS_NAVEGACION_CMS.paginaWeb).toEqual(['cms-pagina-web'])
    expect(GRUPOS_NAVEGACION_CMS.comunicacionVisual).toEqual(['cms-comunicacion-visual'])
    expect(GRUPOS_NAVEGACION_CMS.organizacion).toEqual(['cms-areas', 'cms-formularios', 'cms-biblioteca'])
    expect(GRUPOS_NAVEGACION_CMS.administracion).toEqual(['cms-privacidad', 'accesos', 'registro-institucional'])
    expect(TITULOS_GRUPOS_NAVEGACION_CMS.comunicacionVisual).toBe('Comunicación visual')
    expect(TITULOS_GRUPOS_NAVEGACION_CMS.organizacion).toBe('Organización')
    expect(ETIQUETAS_NAVEGACION_CMS['cms-pagina-web']).toBe('Contenido')
    expect(ETIQUETAS_NAVEGACION_CMS['cms-privacidad']).toBe('Solicitudes de privacidad')
  })

  it('separa el estado recordado por cuenta', () => {
    expect(clavePreferenciasNavegacion({ correo: 'Claudia@Aletea.org' })).toContain('claudia@aletea.org')
    expect(clavePreferenciasNavegacion({ correo: 'otra@aletea.org' })).not.toBe(clavePreferenciasNavegacion({ correo: 'Claudia@Aletea.org' }))
  })

  it('guarda y recupera los grupos colapsados entre sesiones', () => {
    const almacen = crearAlmacen()
    const sesion = { correo: 'claudia@aletea.org' }
    guardarPreferenciaNavegacion('paginaWeb', true, sesion, almacen)
    guardarPreferenciaNavegacion('organizacion', true, sesion, almacen)
    guardarPreferenciaNavegacion('equipos', false, sesion, almacen)
    expect(leerPreferenciasNavegacion(sesion, almacen)).toEqual({ paginaWeb: true, organizacion: true, equipos: false })
  })

  it('abre siempre el grupo de la pantalla activa', () => {
    expect(grupoActivoNavegacion('cms-biblioteca')).toBe('organizacion')
    expect(grupoActivoNavegacion('cms-areas')).toBe('organizacion')
    expect(grupoActivoNavegacion('cms-formularios')).toBe('organizacion')
    expect(grupoActivoNavegacion('cms-comunicacion-visual')).toBe('comunicacionVisual')
    expect(grupoActivoNavegacion('cms-privacidad')).toBe('administracion')
    expect(grupoDebeEstarAbierto('organizacion', 'cms-biblioteca', { organizacion: false })).toBe(true)
    expect(grupoDebeEstarAbierto('paginaWeb', 'cms-biblioteca', { paginaWeb: false })).toBe(false)
    expect(grupoDebeEstarAbierto('equipos', 'cms-biblioteca', { equipos: false })).toBe(false)
  })

  it('continúa con valores seguros si el almacenamiento falla', () => {
    const almacen = { getItem: () => { throw new Error('sin acceso') } }
    expect(leerPreferenciasNavegacion({}, almacen)).toEqual({})
    expect(grupoDebeEstarAbierto('trabajo', 'cms-pagina-web', {})).toBe(true)
    expect(grupoDebeEstarAbierto('paginaWeb', 'cms-pagina-web', {})).toBe(true)
  })
})
