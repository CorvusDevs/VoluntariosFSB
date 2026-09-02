import { describe, expect, it } from 'vitest'
import {
  campoBaseRequerido, campoBaseVisible, configuracionPublicaFormulario, configuracionWhatsAppFamilias,
  correoFormularioValido, MODELO_WHATSAPP_FAMILIAS, textoInvitacionFormulario,
} from '../../js/modelo/formularios.js'

describe('configuración pública de formularios', () => {
  it('preserva el comportamiento de formularios existentes', () => {
    expect(configuracionPublicaFormulario('{}')).toMatchObject({ nombre: 'obligatorio', contacto: 'obligatorio', detalle: 'opcional', requiere_compromiso: false })
  })

  it('prepara el recorrido completo para WhatsApp Familias', () => {
    const configuracion = configuracionPublicaFormulario(configuracionWhatsAppFamilias())
    expect(configuracion).toMatchObject({ modelo: MODELO_WHATSAPP_FAMILIAS, contacto_tipo: 'correo', confirmar_contacto: true, detalle: 'oculto', privacidad_detallada: true, requiere_compromiso: true })
    expect(configuracion.texto_cierre).toContain('confianza y el respeto')
  })

  it('normaliza opciones desconocidas y mantiene tipos seguros', () => {
    expect(configuracionPublicaFormulario({ nombre: 'cualquier-cosa', contacto_tipo: 'telefono', mostrar_logo: 0 })).toMatchObject({ nombre: 'obligatorio', contacto_tipo: 'libre', mostrar_logo: false })
    expect(campoBaseVisible('oculto')).toBe(false)
    expect(campoBaseRequerido('opcional')).toBe(false)
  })

  it('generaliza privacidad y acuerdos sin reutilizar el texto de WhatsApp', () => {
    const inicial = configuracionPublicaFormulario({ privacidad_detallada: true, requiere_compromiso: true })
    expect(inicial.privacidad_contenido.uso).not.toContain('grupos de WhatsApp')
    expect(inicial.compromiso_contenido.titulo).toBe('Acuerdo de participación')
    expect(inicial.privacidad_version).toMatch(/^privacidad-[0-9a-f]{8}$/)
    expect(inicial.compromiso_version).toMatch(/^compromiso-[0-9a-f]{8}$/)
    const editada = configuracionPublicaFormulario({ ...inicial, privacidad_contenido: { ...inicial.privacidad_contenido, uso: 'Usar los datos para coordinar una actividad.' } })
    expect(editada.privacidad_version).not.toBe(inicial.privacidad_version)
  })

  it('valida correos y compone una invitación lista para compartir', () => {
    expect(correoFormularioValido('familia@ejemplo.uy')).toBe(true)
    expect(correoFormularioValido('familia@ejemplo')).toBe(false)
    const formulario = { titulo: 'Ingreso', configuracion_publica_json: JSON.stringify(configuracionWhatsAppFamilias()) }
    expect(textoInvitacionFormulario(formulario, 'https://gestor.aletea.org/formulario.html?id=1')).toContain('registro, privacidad y convivencia')
  })
})
