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

export async function procesarFoto(archivo) {
  const mapa = await createImageBitmap(archivo)
  const { x, y, lado } = calcularRecorteCuadrado(mapa.width, mapa.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO_FOTO
  lienzo.height = LADO_FOTO
  const ctx = lienzo.getContext('2d')
  ctx.drawImage(mapa, x, y, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO)
  mapa.close()
  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', CALIDAD))
}
