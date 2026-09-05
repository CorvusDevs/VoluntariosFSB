export const LADO_FOTO = 400
export const CALIDAD = 0.82

export function calcularRecorteCuadrado(ancho, alto) {
  const lado = Math.min(ancho, alto)
  return {
    x: Math.round((ancho - lado) / 2),
    y: Math.round((alto - lado) / 2),
    lado,
  }
}

// Vuelca un recorte cuadrado de la imagen al tamaño en que se guardan las fotos.
// Recibe el recuadro ya calculado para no repetir la geometria en dos lugares.
export function volcarRecorte(mapa, { x, y, lado }) {
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO_FOTO
  lienzo.height = LADO_FOTO
  const ctx = lienzo.getContext('2d')
  ctx.drawImage(mapa, x, y, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO)
  return lienzo
}

export function aBlob(lienzo) {
  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', CALIDAD))
}

// El recorte centrado de siempre, para cuando no se pasa por el editor.
export async function procesarFoto(archivo) {
  const mapa = await createImageBitmap(archivo)
  const recorte = calcularRecorteCuadrado(mapa.width, mapa.height)
  const lienzo = volcarRecorte(mapa, recorte)
  mapa.close()
  return aBlob(lienzo)
}
