import { describe, expect, it } from 'vitest'
import { contextoParaResolver, requisitoDatosPersonales, requisitoEquipo, requisitoPerfil } from '../../js/acceso/requisitos-acceso.js'

describe('requisitos de acceso reutilizables', () => {
  it('compara niveles de datos sin depender de una sección', () => {
    expect(requisitoDatosPersonales('operativo', 'operativo').cumplido).toBe(true)
    expect(requisitoDatosPersonales('operativo', 'sensible').cumplido).toBe(false)
    expect(requisitoDatosPersonales('sensible', 'operativo').cumplido).toBe(true)
  })

  it('describe equipos y perfiles con el mismo contrato', () => {
    expect(requisitoEquipo({ clave: 'familias', nombre: 'Familias' })).toMatchObject({
      id: 'equipo:familias', tipo: 'equipo', cumplido: false,
      resolver: { tipo: 'equipo', equipo_clave: 'familias', usuario: 'yo' },
    })
    expect(requisitoPerfil('coordinacion', 'administracion')).toMatchObject({ id: 'perfil:administracion', cumplido: false })
  })

  it('conserva el regreso y el requisito sin poner correos en la ruta', () => {
    const requisito = requisitoDatosPersonales('ninguno', 'sensible')
    expect(contextoParaResolver(requisito, { seccion: 'Una sección futura', regreso: 'cms-futura' })).toEqual({
      resolucionAcceso: { requisito, seccion: 'Una sección futura', regreso: 'cms-futura' },
    })
    expect(JSON.stringify(contextoParaResolver(requisito))).not.toContain('@')
  })
})
