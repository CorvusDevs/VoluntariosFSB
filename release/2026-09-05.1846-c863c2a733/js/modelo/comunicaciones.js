export const VERSION_CONSENTIMIENTO_COMUNICACIONES = '2026-08-30-v1'
export const TEXTO_CONSENTIMIENTO_COMUNICACIONES = 'Quiero recibir novedades y actividades de Aletea por correo. Puedo darme de baja cuando quiera.'
export const TEMAS_COMUNICACION = Object.freeze(['novedades', 'actividades', 'familias', 'formacion'])

export function normalizarCorreoComunicacion(valor) {
  return String(valor || '').trim().toLowerCase()
}

export function correoComunicacionValido(valor) {
  const correo = normalizarCorreoComunicacion(valor)
  return correo.length <= 191 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
}

export function temasComunicacionValidos(valores, porDefecto = ['novedades']) {
  const lista = Array.isArray(valores) ? valores : porDefecto
  return [...new Set(lista.map((tema) => String(tema || '').trim().toLowerCase()).filter((tema) => TEMAS_COMUNICACION.includes(tema)))]
}

export function solicitudComunicacionDesde(datos = {}) {
  if (datos.consentimiento_comunicaciones !== true) return { solicitud: null }
  const correo = normalizarCorreoComunicacion(datos.correo_comunicaciones)
  if (!correoComunicacionValido(correo)) return { error: 'Ingresá un correo válido para recibir novedades.' }
  const temas = temasComunicacionValidos(datos.temas_comunicaciones)
  if (!temas.length) return { error: 'Elegí al menos un tipo de novedad.' }
  return {
    solicitud: {
      correo,
      temas,
      finalidad: 'Enviar novedades y actividades de Aletea por correo.',
      texto_version: VERSION_CONSENTIMIENTO_COMUNICACIONES,
      texto_consentimiento: TEXTO_CONSENTIMIENTO_COMUNICACIONES,
    },
  }
}

export function campanaComunicacionDesde(datos = {}, actual = {}) {
  const titulo = String(datos.titulo ?? actual.titulo ?? '').trim().slice(0, 191)
  const asunto = String(datos.asunto ?? actual.asunto ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 191)
  const contenido_texto = String(datos.contenido_texto ?? actual.contenido_texto ?? '').trim().slice(0, 50000)
  const contenido_html = String(datos.contenido_html ?? actual.contenido_html ?? '').trim().slice(0, 100000)
  const temas = temasComunicacionValidos(datos.temas ?? (() => { try { return JSON.parse(actual.temas_json || '[]') } catch { return [] } })())
  if (!titulo) return { error: 'Escribí un nombre interno para la campaña.' }
  if (!asunto) return { error: 'Escribí el asunto que recibirá la audiencia.' }
  if (!contenido_texto) return { error: 'Escribí una versión de texto del mensaje.' }
  if (!temas.length) return { error: 'Elegí al menos un tema para definir la audiencia.' }
  return { campana: { titulo, asunto, contenido_texto, contenido_html, temas_json: JSON.stringify(temas) } }
}
