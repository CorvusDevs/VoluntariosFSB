const PUNTUACION_FINAL = /[\]),.;]+$/
const ENLACE_CON_ESQUEMA = /https?:\/\/[^\s<>"']+/i
const DOMINIO_SIN_ESQUEMA = /(?:^|[\s(])((?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s<>"']*)?)/i

export const MENSAJE_ENLACE_INVALIDO = 'Escribí un enlace válido, por ejemplo prueba.aletea.org o https://prueba.aletea.org.'

export function normalizarEnlaceUsuario(valor, { permitirRutaInterna = false, permitirContacto = false } = {}) {
  const texto = String(valor || '').trim()
  if (!texto) return ''
  if (permitirRutaInterna && texto.startsWith('/') && !texto.startsWith('//')) return texto
  if (permitirContacto && /^(?:mailto:|tel:)/i.test(texto)) {
    try {
      const contacto = new URL(texto)
      return ['mailto:', 'tel:'].includes(contacto.protocol) ? texto : ''
    } catch { return '' }
  }
  const conEsquema = texto.match(ENLACE_CON_ESQUEMA)?.[0]
  const sinEsquema = texto.match(DOMINIO_SIN_ESQUEMA)?.[1]
  const candidato = String(conEsquema || sinEsquema || '').replace(PUNTUACION_FINAL, '')
  if (!candidato) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(candidato) ? candidato : `https://${candidato}`)
    return ['https:', 'http:'].includes(url.protocol) && url.hostname ? url.href : ''
  } catch { return '' }
}

export function normalizarCampoEnlace(input, opciones = {}) {
  const normalizado = normalizarEnlaceUsuario(input.value, opciones)
  if (!normalizado && String(input.value || '').trim()) {
    input.setCustomValidity(MENSAJE_ENLACE_INVALIDO)
    input.setAttribute?.('aria-invalid', 'true')
    return ''
  }
  input.value = normalizado
  input.setCustomValidity('')
  input.removeAttribute?.('aria-invalid')
  return normalizado
}
