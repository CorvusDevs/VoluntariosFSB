// Geometria del recorte de una foto. Vive aparte de la pantalla y sin tocar el
// DOM porque es lo unico de esta funcion que puede fallar en silencio: si el
// recuadro se sale de la imagen aparecen bordes negros en la planilla, y eso no
// se nota hasta el sabado.
//
// El recorte siempre es cuadrado, porque asi se guardan las fotos y asi las
// espera el resto de la aplicacion. Lo que se elige es cuanto se acerca y que
// parte de la imagen queda adentro.

export const ZOOM_MINIMO = 1
export const ZOOM_MAXIMO = 4

export function limitar(valor, minimo, maximo) {
  if (Number.isNaN(Number(valor))) return minimo
  return Math.min(maximo, Math.max(minimo, valor))
}

// centroX y centroY van de 0 a 1 sobre la imagen original. El zoom es cuanto se
// achica el lado del recuadro respecto del lado maximo posible: 1 es el cuadrado
// mas grande que entra, 4 es un cuarto de ese lado.
export function recorteDe({ ancho, alto, zoom = 1, centroX = 0.5, centroY = 0.5 }) {
  if (!(ancho > 0) || !(alto > 0)) throw new Error('La imagen no tiene tamaño')
  const z = limitar(zoom, ZOOM_MINIMO, ZOOM_MAXIMO)
  const lado = Math.min(ancho, alto) / z
  // El recuadro nunca puede salirse: se acomoda contra el borde antes que dejar
  // afuera un pedazo de imagen que no existe.
  const x = limitar(centroX * ancho - lado / 2, 0, ancho - lado)
  const y = limitar(centroY * alto - lado / 2, 0, alto - lado)
  return { x, y, lado }
}

// El centro que corresponde a un recorte, para poder volver del recuadro a los
// controles sin acumular error al arrastrar.
export function centroDe({ x, y, lado }, ancho, alto) {
  return { centroX: (x + lado / 2) / ancho, centroY: (y + lado / 2) / alto }
}

// Mover el recuadro una cantidad de pixeles de la imagen original. Devuelve el
// centro ya limitado, asi el arrastre no puede empujarlo fuera de la foto.
export function mover({ ancho, alto, zoom, centroX, centroY }, dx, dy) {
  const previo = recorteDe({ ancho, alto, zoom, centroX, centroY })
  const movido = {
    x: limitar(previo.x + dx, 0, ancho - previo.lado),
    y: limitar(previo.y + dy, 0, alto - previo.lado),
    lado: previo.lado,
  }
  return centroDe(movido, ancho, alto)
}

// Al alejar, el recuadro crece y puede quedar pisando el borde. Reencuadrar
// devuelve el centro valido mas cercano en vez de recortar fuera de la imagen.
export function reencuadrar({ ancho, alto, zoom, centroX, centroY }) {
  return centroDe(recorteDe({ ancho, alto, zoom, centroX, centroY }), ancho, alto)
}

export const RECORTE_INICIAL = Object.freeze({ zoom: 1, centroX: 0.5, centroY: 0.5 })
