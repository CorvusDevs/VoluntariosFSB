const LADO_MAXIMO = 1920
const PESO_OBJETIVO = 850_000

export async function optimizarImagenParaWeb(archivo, dependencias = {}, opciones = {}) {
  if (!archivo?.type?.startsWith('image/')) throw new Error('Elegí un archivo de imagen.')
  const crearBitmap = dependencias.createImageBitmap || globalThis.createImageBitmap
  const crearLienzo = dependencias.crearLienzo || ((ancho, alto) => Object.assign(document.createElement('canvas'), { ancho, alto, width: ancho, height: alto }))
  const ladoMaximo = opciones.ladoMaximo ?? LADO_MAXIMO
  const pesoObjetivo = opciones.pesoObjetivo ?? PESO_OBJETIVO
  const calidadMinima = opciones.calidadMinima ?? 0.68
  const intentosMaximos = opciones.intentosMaximos ?? 10
  const bitmap = await crearBitmap(archivo, { imageOrientation: 'from-image' })
  let ancho
  let alto
  let blob
  let calidadUsada = opciones.calidadInicial ?? 0.88
  try {
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
    ancho = Math.max(1, Math.round(bitmap.width * escala))
    alto = Math.max(1, Math.round(bitmap.height * escala))
    let calidad = calidadUsada
    for (let intento = 0; intento < intentosMaximos; intento += 1) {
      const lienzo = crearLienzo(ancho, alto)
      lienzo.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto)
      blob = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/webp', calidad))
      calidadUsada = calidad
      if (blob && blob.size <= pesoObjetivo) break
      if (calidad > calidadMinima) calidad = Math.max(calidadMinima, calidad - 0.05)
      else {
        ancho = Math.max(1, Math.round(ancho * 0.86))
        alto = Math.max(1, Math.round(alto * 0.86))
      }
    }
  } finally {
    bitmap.close?.()
  }
  if (!blob) throw new Error('No se pudo preparar la imagen para la web.')
  if (blob.size > pesoObjetivo) throw new Error('No se pudo reducir la imagen a un tamaño seguro. Probá con otra foto.')
  const bytesOriginales = Number(archivo.size || 0)
  const ahorroPorcentaje = bytesOriginales > 0 ? Math.max(0, Math.round((1 - blob.size / bytesOriginales) * 100)) : null
  return { blob, ancho, alto, tipo: blob.type || 'image/webp', nombre: String(archivo.name || 'imagen').replace(/\.[^.]+$/, '') + '.webp', calidad: calidadUsada, bytesOriginales, ahorroPorcentaje }
}

export function textoPeso(bytes) {
  return bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`
}
