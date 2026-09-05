export const MODELO_FORMULARIO_GENERAL = 'general'
export const MODELO_WHATSAPP_FAMILIAS = 'whatsapp_familias'
export const VERSION_PRIVACIDAD_WHATSAPP_FAMILIAS = '2026-09-01-v1'
export const VERSION_COMPROMISO_WHATSAPP_FAMILIAS = '2026-09-01-v1'

export const PRIVACIDAD_FORMULARIO_GENERAL = Object.freeze({
  titulo: 'Privacidad y uso de datos personales',
  introduccion: 'Aletea Asociación Civil protege la información que compartís en este formulario y la utiliza solamente para atender la finalidad informada.',
  uso: 'Los datos serán usados para recibir la respuesta, derivarla al equipo correspondiente y realizar el seguimiento necesario.',
  confidencialidad: 'La información se tratará de forma confidencial y no se compartirá con terceros, salvo autorización expresa u obligación legal.',
  derechos: 'Podés solicitar el acceso, la actualización, la rectificación o la supresión de tus datos por los canales institucionales de Aletea.',
  aceptacion: 'Leí cómo se usarán mis datos y acepto enviarlos para esta finalidad.',
})

export const COMPROMISO_FORMULARIO_GENERAL = Object.freeze({
  titulo: 'Acuerdo de participación',
  introduccion: 'Para cuidar este espacio, confirmá los compromisos necesarios antes de enviar el formulario.',
  secciones: Object.freeze([
    Object.freeze({
      titulo: 'Compromisos',
      puntos: Object.freeze([
        'Mantener un trato respetuoso y cuidar la información compartida por otras personas.',
        'Usar este espacio solamente para la finalidad informada.',
        'Aceptar las indicaciones del equipo responsable cuando sean necesarias para cuidar la convivencia.',
      ]),
    }),
  ]),
  aceptacion: 'Acepto este acuerdo de participación.',
  cierre: '',
})

export const PRIVACIDAD_WHATSAPP_FAMILIAS = Object.freeze({
  titulo: 'Privacidad y uso de datos personales',
  introduccion: 'Aletea Asociación Civil se compromete a proteger la privacidad de las familias, de acuerdo con la Ley N.º 18.331 de Protección de Datos Personales y su normativa vigente.',
  uso: 'Los datos proporcionados en este formulario serán utilizados para gestionar el ingreso y la participación en los grupos de WhatsApp de familias de Aletea, así como para mantener una comunicación adecuada con sus integrantes.',
  confidencialidad: 'La información será tratada de forma confidencial, utilizada únicamente para las finalidades informadas y no será compartida con terceros, salvo autorización expresa o cuando exista una obligación legal.',
  derechos: 'Podés solicitar el acceso, la actualización, la rectificación o la supresión de tus datos, de acuerdo con la normativa vigente.',
  aceptacion: 'Autorizo a Aletea Asociación Civil a utilizar mis datos para gestionar mi ingreso y participación en los grupos de WhatsApp de familias.',
})

export const COMPROMISO_WHATSAPP_FAMILIAS = Object.freeze({
  titulo: 'Compromiso de confidencialidad y convivencia',
  introduccion: 'Aletea promueve espacios de intercambio entre madres, padres y referentes de personas autistas basados en el respeto, la empatía y la confianza mutua. Para cuidar estos espacios, cada participante acepta los siguientes compromisos.',
  secciones: Object.freeze([
    Object.freeze({
      titulo: 'Confidencialidad',
      puntos: Object.freeze([
        'No divulgar fuera del grupo información, mensajes, imágenes o comentarios compartidos por otras familias o por el equipo de Aletea.',
        'Reconocer que los grupos son espacios privados y de confianza, destinados al apoyo mutuo y no a la difusión pública.',
        'No compartir capturas de pantalla, audios ni textos del grupo en redes sociales u otros espacios de comunicación.',
      ]),
    }),
    Object.freeze({
      titulo: 'Respeto y convivencia',
      puntos: Object.freeze([
        'Mantener un trato respetuoso y empático, evitando discusiones personales, mensajes ofensivos o juicios de valor.',
        'Comprender que los grupos de Aletea no son espacios políticos ni religiosos y expresar las opiniones con cuidado y consideración.',
        'Aceptar las intervenciones de moderadores o referentes cuando sea necesario cuidar el clima del grupo o el cumplimiento de estas pautas.',
      ]),
    }),
    Object.freeze({
      titulo: 'Uso adecuado del grupo',
      puntos: Object.freeze([
        'Usar el grupo para temas vinculados al acompañamiento familiar y al apoyo mutuo entre familias de personas autistas.',
        'Evitar cadenas, publicidad o mensajes ajenos a estos fines.',
      ]),
    }),
    Object.freeze({
      titulo: 'Consecuencias ante incumplimientos',
      puntos: Object.freeze([
        'Entender que Aletea podrá retirar del grupo a quien incumpla este compromiso, para preservar el bienestar y la seguridad de sus integrantes.',
        'Aletea podrá tomar las medidas necesarias ante situaciones de acoso, difamación o filtración de información.',
      ]),
    }),
  ]),
  aceptacion: 'Acepto el compromiso de confidencialidad y convivencia.',
  cierre: 'Este compromiso busca cuidar lo más valioso que tenemos: la confianza y el respeto entre quienes trabajamos y convivimos por la inclusión. Gracias por ser parte de nuestra comunidad.',
})

const ESTADOS_CAMPO_BASE = new Set(['obligatorio', 'opcional', 'oculto'])

function objeto(valor) {
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) return valor
  if (typeof valor !== 'string') return {}
  try {
    const resultado = JSON.parse(valor || '{}')
    return resultado && typeof resultado === 'object' && !Array.isArray(resultado) ? resultado : {}
  } catch { return {} }
}

function texto(valor, limite, porDefecto = '') {
  const limpio = String(valor ?? '').trim().replace(/\r\n?/g, '\n')
  return (limpio || porDefecto).slice(0, limite)
}

function estadoCampo(valor, porDefecto) {
  return ESTADOS_CAMPO_BASE.has(valor) ? valor : porDefecto
}

function enlaceContacto(valor, porDefecto) {
  const candidato = texto(valor, 500, porDefecto)
  return /^(?:https?:|mailto:|tel:)/i.test(candidato) ? candidato : porDefecto
}

function contenidoPrivacidad(valor, porDefecto) {
  const fuente = objeto(valor)
  return {
    titulo: texto(fuente.titulo, 180, porDefecto.titulo),
    introduccion: texto(fuente.introduccion, 1200, porDefecto.introduccion),
    uso: texto(fuente.uso, 1200, porDefecto.uso),
    confidencialidad: texto(fuente.confidencialidad, 1200, porDefecto.confidencialidad),
    derechos: texto(fuente.derechos, 1200, porDefecto.derechos),
    aceptacion: texto(fuente.aceptacion, 600, porDefecto.aceptacion),
  }
}

function contenidoCompromiso(valor, porDefecto) {
  const fuente = objeto(valor)
  const seccionesFuente = Array.isArray(fuente.secciones) ? fuente.secciones : porDefecto.secciones
  const secciones = seccionesFuente.slice(0, 12).map((seccion, indice) => {
    const base = porDefecto.secciones[indice] || porDefecto.secciones[0]
    const puntosFuente = Array.isArray(seccion?.puntos) ? seccion.puntos : base.puntos
    return {
      titulo: texto(seccion?.titulo, 180, base.titulo),
      puntos: puntosFuente.map((punto) => texto(punto, 600)).filter(Boolean).slice(0, 20),
    }
  }).filter((seccion) => seccion.puntos.length)
  return {
    titulo: texto(fuente.titulo, 180, porDefecto.titulo),
    introduccion: texto(fuente.introduccion, 1200, porDefecto.introduccion),
    secciones: secciones.length ? secciones : porDefecto.secciones.map((seccion) => ({ titulo: seccion.titulo, puntos: [...seccion.puntos] })),
    aceptacion: texto(fuente.aceptacion, 600, porDefecto.aceptacion),
    cierre: texto(fuente.cierre, 800, porDefecto.cierre),
  }
}

function huellaContenido(valor) {
  const cadena = JSON.stringify(valor)
  let huella = 2166136261
  for (let indice = 0; indice < cadena.length; indice += 1) {
    huella ^= cadena.charCodeAt(indice)
    huella = Math.imul(huella, 16777619)
  }
  return (huella >>> 0).toString(16).padStart(8, '0')
}

export function textoSeccionesCompromiso(secciones = []) {
  return secciones.map((seccion) => [`## ${seccion.titulo}`, ...seccion.puntos.map((punto) => `- ${punto}`)].join('\n')).join('\n\n')
}

export function seccionesCompromisoDesdeTexto(valor, porDefecto = COMPROMISO_FORMULARIO_GENERAL.secciones) {
  const lineas = String(valor ?? '').replace(/\r\n?/g, '\n').split('\n')
  const secciones = []
  let actual = null
  lineas.forEach((linea) => {
    const limpia = linea.trim()
    if (!limpia) return
    if (limpia.startsWith('## ')) {
      actual = { titulo: texto(limpia.slice(3), 180, 'Compromisos'), puntos: [] }
      secciones.push(actual)
      return
    }
    if (!actual) { actual = { titulo: 'Compromisos', puntos: [] }; secciones.push(actual) }
    actual.puntos.push(texto(limpia.replace(/^[-*]\s*/, ''), 600))
  })
  const validas = secciones.filter((seccion) => seccion.puntos.some(Boolean)).slice(0, 12)
  return validas.length ? validas : porDefecto.map((seccion) => ({ titulo: seccion.titulo, puntos: [...seccion.puntos] }))
}

export function configuracionWhatsAppFamilias() {
  return {
    version: 1,
    modelo: MODELO_WHATSAPP_FAMILIAS,
    nombre: 'obligatorio',
    contacto: 'obligatorio',
    contacto_tipo: 'correo',
    confirmar_contacto: true,
    detalle: 'oculto',
    mostrar_logo: true,
    contacto_institucional: 'info@aletea.org',
    contacto_institucional_enlace: 'mailto:info@aletea.org',
    privacidad_detallada: true,
    privacidad_contenido: PRIVACIDAD_WHATSAPP_FAMILIAS,
    privacidad_version: VERSION_PRIVACIDAD_WHATSAPP_FAMILIAS,
    requiere_compromiso: true,
    compromiso_contenido: COMPROMISO_WHATSAPP_FAMILIAS,
    compromiso_version: VERSION_COMPROMISO_WHATSAPP_FAMILIAS,
    texto_cierre: COMPROMISO_WHATSAPP_FAMILIAS.cierre,
    invitacion_titulo: 'Ingreso a los grupos de WhatsApp de Aletea',
    invitacion_texto: 'Para ingresar a los grupos de familias de Aletea, es necesario completar previamente este breve formulario de registro, privacidad y convivencia. ¡Gracias!',
  }
}

export function configuracionPublicaFormulario(valor = {}) {
  const fuente = objeto(valor)
  const base = fuente.modelo === MODELO_WHATSAPP_FAMILIAS ? configuracionWhatsAppFamilias() : {
    version: 1,
    modelo: MODELO_FORMULARIO_GENERAL,
    nombre: 'obligatorio',
    contacto: 'obligatorio',
    contacto_tipo: 'libre',
    confirmar_contacto: false,
    detalle: 'opcional',
    mostrar_logo: true,
    contacto_institucional: 'info@aletea.org',
    contacto_institucional_enlace: 'mailto:info@aletea.org',
    privacidad_detallada: false,
    privacidad_contenido: PRIVACIDAD_FORMULARIO_GENERAL,
    privacidad_version: '',
    requiere_compromiso: false,
    compromiso_contenido: COMPROMISO_FORMULARIO_GENERAL,
    compromiso_version: '',
    texto_cierre: '',
    invitacion_titulo: '',
    invitacion_texto: '',
  }
  const modelo = fuente.modelo === MODELO_WHATSAPP_FAMILIAS ? MODELO_WHATSAPP_FAMILIAS : MODELO_FORMULARIO_GENERAL
  const contactoTipo = ['correo', 'libre'].includes(fuente.contacto_tipo) ? fuente.contacto_tipo : base.contacto_tipo
  const privacidadContenido = contenidoPrivacidad(fuente.privacidad_contenido, base.privacidad_contenido)
  const compromisoContenido = contenidoCompromiso(fuente.compromiso_contenido, base.compromiso_contenido)
  const privacidadSinCambios = modelo === MODELO_WHATSAPP_FAMILIAS && huellaContenido(privacidadContenido) === huellaContenido(PRIVACIDAD_WHATSAPP_FAMILIAS)
  const compromisoSinCambios = modelo === MODELO_WHATSAPP_FAMILIAS && huellaContenido(compromisoContenido) === huellaContenido(COMPROMISO_WHATSAPP_FAMILIAS)
  return {
    version: 1,
    modelo,
    nombre: estadoCampo(fuente.nombre, base.nombre),
    contacto: estadoCampo(fuente.contacto, base.contacto),
    contacto_tipo: contactoTipo === 'correo' || modelo !== MODELO_WHATSAPP_FAMILIAS ? contactoTipo : base.contacto_tipo,
    confirmar_contacto: contactoTipo === 'correo' && Boolean(fuente.confirmar_contacto ?? base.confirmar_contacto),
    detalle: estadoCampo(fuente.detalle, base.detalle),
    mostrar_logo: Boolean(fuente.mostrar_logo ?? base.mostrar_logo),
    contacto_institucional: texto(fuente.contacto_institucional, 180, base.contacto_institucional),
    contacto_institucional_enlace: enlaceContacto(fuente.contacto_institucional_enlace, base.contacto_institucional_enlace),
    privacidad_detallada: Boolean(fuente.privacidad_detallada ?? base.privacidad_detallada),
    privacidad_contenido: privacidadContenido,
    privacidad_version: privacidadSinCambios ? VERSION_PRIVACIDAD_WHATSAPP_FAMILIAS : `privacidad-${huellaContenido(privacidadContenido)}`,
    requiere_compromiso: Boolean(fuente.requiere_compromiso ?? base.requiere_compromiso),
    compromiso_contenido: compromisoContenido,
    compromiso_version: compromisoSinCambios ? VERSION_COMPROMISO_WHATSAPP_FAMILIAS : `compromiso-${huellaContenido(compromisoContenido)}`,
    texto_cierre: texto(fuente.texto_cierre, 800, base.texto_cierre),
    invitacion_titulo: texto(fuente.invitacion_titulo, 180, base.invitacion_titulo),
    invitacion_texto: texto(fuente.invitacion_texto, 1000, base.invitacion_texto),
  }
}

export function configuracionPublicaJson(valor = {}) {
  return JSON.stringify(configuracionPublicaFormulario(valor))
}

export function campoBaseVisible(estado) {
  return estado !== 'oculto'
}

export function campoBaseRequerido(estado) {
  return estado === 'obligatorio'
}

export function correoFormularioValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor ?? '').trim())
}

export function textoInvitacionFormulario(formulario = {}, url = '') {
  const configuracion = configuracionPublicaFormulario(formulario.configuracion_publica_json ?? formulario.configuracionPublica ?? {})
  const titulo = configuracion.invitacion_titulo || formulario.titulo
  const cuerpo = configuracion.invitacion_texto || formulario.descripcion
  return [titulo, cuerpo, url && `Completá el formulario acá: ${url}`].filter(Boolean).join('\n\n')
}
