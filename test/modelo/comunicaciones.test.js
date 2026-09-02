import { describe, expect, it } from 'vitest'
import { campanaComunicacionDesde, solicitudComunicacionDesde, temasComunicacionValidos } from '../../js/modelo/comunicaciones.js'

describe('modelo de comunicaciones', () => {
  it('no interpreta un correo operativo como suscripción', () => {
    expect(solicitudComunicacionDesde({ contacto: 'persona@ejemplo.uy' })).toEqual({ solicitud: null })
  })

  it('exige correo válido y temas cuando hay una decisión explícita', () => {
    expect(solicitudComunicacionDesde({ consentimiento_comunicaciones: true, correo_comunicaciones: 'no-es-correo' }).error).toContain('correo válido')
    const resultado = solicitudComunicacionDesde({ consentimiento_comunicaciones: true, correo_comunicaciones: ' Persona@Ejemplo.uy ', temas_comunicaciones: ['familias', 'familias', 'desconocido'] })
    expect(resultado.solicitud).toMatchObject({ correo: 'persona@ejemplo.uy', temas: ['familias'] })
  })

  it('normaliza audiencia y valida el contenido de una campaña', () => {
    expect(temasComunicacionValidos(['NOVEDADES', 'familias', 'otro'])).toEqual(['novedades', 'familias'])
    expect(campanaComunicacionDesde({ titulo: 'Agenda', asunto: 'Próximas actividades', contenido_texto: 'Hola', temas: ['actividades'] }).campana).toMatchObject({ titulo: 'Agenda', temas_json: '["actividades"]' })
    expect(campanaComunicacionDesde({ titulo: '', asunto: 'Asunto', contenido_texto: 'Texto' }).error).toContain('nombre interno')
    expect(campanaComunicacionDesde({ titulo: 'Agenda', asunto: 'Hola\r\nBcc: otra@ejemplo.uy', contenido_texto: 'Texto', temas: ['novedades'] }).campana.asunto)
      .toBe('Hola Bcc: otra@ejemplo.uy')
  })
})
