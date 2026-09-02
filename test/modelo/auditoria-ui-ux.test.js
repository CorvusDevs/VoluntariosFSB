import { describe, expect, it } from 'vitest'
import { auditarContenidoEditorial, auditarGlosario } from '../../js/modelo/auditoria-ui-ux.js'
import glosario from '../../docs/glosario-institucional.json'
import contenido from '../../assets/pagina-publica-v1.json'

describe('control editorial y glosario institucional', () => {
  it('mantiene un único glosario completo y sin términos duplicados', () => {
    expect(auditarGlosario(glosario)).toEqual([])
  })

  it('evita títulos repetidos, CTA competidores y vocabulario de navegación divergente', () => {
    expect(auditarContenidoEditorial(contenido)).toEqual([])
  })

  it('demuestra que el auditor detecta una regresión editorial', () => {
    const roto = structuredClone(contenido)
    roto.navegacion[0].etiqueta = 'Quiénes somos'
    roto.participacion.acciones.push({ etiqueta: 'Otra acción', enlace: '/contacto/' })
    expect(auditarContenidoEditorial(roto)).toEqual(expect.arrayContaining([
      expect.stringContaining('cinco nombres'),
      expect.stringContaining('CTA competidores'),
    ]))
  })
})
