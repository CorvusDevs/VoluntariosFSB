import { MENSAJE_ENLACE_INVALIDO, normalizarEnlaceUsuario } from '../util/enlaces.js'

const TIPOS_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const LIMITE_IMAGEN_REMOTA = 8 * 1024 * 1024

export function idGoogleDriveDesdeUrl(valor) {
  let url
  try { url = new URL(String(valor || '').trim()) } catch { return '' }
  const host = url.hostname.toLowerCase()
  if (!['drive.google.com', 'drive.usercontent.google.com'].includes(host)) return ''
  const porRuta = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/i)?.[1]
  const porParametro = url.searchParams.get('id')
  const id = porRuta || porParametro || ''
  return /^[a-zA-Z0-9_-]{10,}$/.test(id) ? id : ''
}

export function urlDescargaGoogleDrive(valor) {
  const id = idGoogleDriveDesdeUrl(valor)
  return id ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t` : ''
}

function validarRespuestaImagen(respuesta) {
  if (!respuesta.ok) throw new Error('No pudimos abrir esa imagen. Revisá que el enlace sea público.')
  const tipo = String(respuesta.headers.get('content-type') || '').split(';')[0].toLowerCase()
  if (!TIPOS_IMAGEN.has(tipo)) throw new Error('El enlace no apunta a una imagen JPG, PNG o WebP.')
  const longitud = Number(respuesta.headers.get('content-length') || 0)
  if (longitud > LIMITE_IMAGEN_REMOTA) throw new Error('La imagen supera el máximo de 8 MB.')
}

export async function blobImagenDesdeRespuesta(respuesta) {
  validarRespuestaImagen(respuesta)
  const blob = await respuesta.blob()
  if (blob.size > LIMITE_IMAGEN_REMOTA) throw new Error('La imagen supera el máximo de 8 MB.')
  return blob
}

export function blobADataUrl(blob, Lector = globalThis.FileReader) {
  return new Promise((resolver, rechazar) => {
    const lector = new Lector()
    lector.onload = () => resolver(String(lector.result || ''))
    lector.onerror = () => rechazar(new Error('No pudimos leer la imagen.'))
    lector.readAsDataURL(blob)
  })
}

export async function bytesImagenConLimite(respuesta, limite = LIMITE_IMAGEN_REMOTA) {
  const longitud = Number(respuesta.headers.get('content-length') || 0)
  if (longitud > limite) throw new Error('La imagen supera el máximo de 8 MB.')
  const lector = respuesta.body?.getReader?.()
  if (!lector) {
    const bytes = new Uint8Array(await respuesta.arrayBuffer())
    if (bytes.byteLength > limite) throw new Error('La imagen supera el máximo de 8 MB.')
    return bytes
  }
  const partes = []
  let total = 0
  while (true) {
    const { done, value } = await lector.read()
    if (done) break
    total += value.byteLength
    if (total > limite) { await lector.cancel(); throw new Error('La imagen supera el máximo de 8 MB.') }
    partes.push(value)
  }
  const resultado = new Uint8Array(total)
  let posicion = 0
  partes.forEach((parte) => { resultado.set(parte, posicion); posicion += parte.byteLength })
  return resultado
}

export async function cargarImagenRemota(valor, opciones = {}) {
  const url = normalizarEnlaceUsuario(valor)
  let analizada
  try { analizada = new URL(url) } catch { throw new Error(MENSAJE_ENLACE_INVALIDO) }
  if (analizada.protocol !== 'https:') throw new Error('El enlace debe comenzar con https://.')
  const fetcher = opciones.fetcher ?? globalThis.fetch
  const esDrive = Boolean(idGoogleDriveDesdeUrl(url))
  let respuesta
  try {
    respuesta = esDrive
      ? await fetcher('/api/cms/imagen-remota', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }),
      })
      : await fetcher(url, { mode: 'cors', referrerPolicy: 'no-referrer' })
  } catch {
    throw new Error('Ese sitio no permite cargar la imagen directamente. Descargala y usá Elegir imagen.')
  }
  if (!respuesta.ok && esDrive) {
    let mensaje = ''
    try { mensaje = (await respuesta.json()).error } catch {}
    throw new Error(mensaje || 'No pudimos abrir esa imagen de Google Drive.')
  }
  return blobADataUrl(await blobImagenDesdeRespuesta(respuesta), opciones.Lector)
}
