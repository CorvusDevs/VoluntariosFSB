import { maquetar } from '../imagen/maquetar.js'
import { pintar } from '../imagen/pintar.js'

// Dibuja como queda UNA persona en cada formato, pasando por el motor real de la
// planilla en vez de por un dibujo aparte. Es la unica forma de que la vista
// previa del editor de fotos no mienta: si maquetar cambia, esto cambia con el.

const CLAVE_P = 'muestra-participante'
const CLAVE_V = 'muestra-voluntario'

// Una lista minima: un chico, un voluntario, y nada mas. El saludo y la
// despedida se apagan porque solo estorbarian arriba y abajo del recorte.
export function listaDeMuestra({
  formato, esquinaVoluntario, tamanoVoluntario, asomoVoluntario, voluntario,
}) {
  return {
    version: 1,
    fecha: '2026-08-08',
    hora: '11:00',
    lugar: 'Tres Cruces',
    saludo: '',
    despedida: '',
    coordinacion: [],
    ausentes: [],
    grupos: [{
      numero: 1,
      titulo: 'Grupo 1',
      subtitulo: '',
      cancha: '',
      filas: [{ participantes: [CLAVE_P], voluntarios: voluntario ? [CLAVE_V] : [] }],
      apoyo: [],
    }],
    opcionesImagen: {
      saludo: false, despedida: false, fotos: true, compacto: false,
      // El tamaño y el sobresalido tienen que viajar hasta aca. Sin ellos los
      // tres bosquejos de cada fila salian identicos, y elegir "Muy grande" se
      // veia exactamente igual que "Mediano".
      formato, esquinaVoluntario, tamanoVoluntario, asomoVoluntario,
    },
  }
}

// El recuadro que ocupa esa persona dentro del plano. Se saca de las ordenes y
// no de las constantes de cada formato, asi no hay que repetir aca la geometria
// de los cuatro y no puede quedar desincronizada.
export function regionDeFila(plano, clave = CLAVE_P) {
  const suyas = plano.ordenes.filter((o) => o.fila === clave)
  if (suyas.length === 0) return null
  const cajas = suyas.filter((o) => o.ancho > 0 && o.alto > 0)
  if (cajas.length === 0) return null
  const x = Math.min(...cajas.map((o) => o.x))
  const derecha = Math.max(...cajas.map((o) => o.x + o.ancho))
  const y = Math.min(...cajas.map((o) => o.y))
  // Los textos no traen alto, asi que se les reserva un renglon. Pero solo a los
  // que caen por debajo de todo lo demas: en los formatos que escriben el nombre
  // adentro de la foto, reservarlo igual metia dos pixeles de la fila siguiente.
  const abajoCajas = Math.max(...cajas.map((o) => o.y + o.alto))
  const abajoTextos = suyas
    .filter((o) => o.tipo === 'texto' && o.y > abajoCajas)
    .map((o) => o.y + 24)
  const abajo = Math.max(abajoCajas, ...abajoTextos)
  return { x, y, ancho: derecha - x, alto: abajo - y }
}

// `imagenes` mapea clave de foto a algo dibujable. La foto que se esta editando
// entra con la clave del participante o la del voluntario, segun a quien
// pertenezca, para que se vea en el lugar que le toca.
export function dibujarMuestra(lienzo, {
  formato, esquinaVoluntario, tamanoVoluntario, asomoVoluntario,
  participante, voluntario, imagenes, medirTexto, ancho = 150,
}) {
  const lista = listaDeMuestra({
    formato, esquinaVoluntario, tamanoVoluntario, asomoVoluntario, voluntario,
  })
  const porId = {
    ...(participante ? { [CLAVE_P]: { ...participante, id: CLAVE_P } } : {}),
    ...(voluntario ? { [CLAVE_V]: { ...voluntario, id: CLAVE_V } } : {}),
  }
  const roster = {
    participantes: [{ ...porId[CLAVE_P], grupo: 1, activo: true }],
    voluntarios: voluntario ? [{ ...porId[CLAVE_V], activo: true }] : [],
  }
  const plano = maquetar(lista, roster, { saludo: '', despedida: '', medirTexto })

  const region = regionDeFila(plano)
  if (!region) return null
  // Se pinta derecho sobre el lienzo del bosquejo, con el recorte y la escala
  // adentro del pintor. Antes se pintaba la planilla entera en un lienzo aparte
  // y se copiaba un pedazo con drawImage: ese rebote no aportaba nada y era el
  // unico paso que quedaba sin verificar cuando un bosquejo salia mal.
  pintar(lienzo.getContext('2d'), plano, imagenes, ancho / region.ancho, region)
  return region
}

export const CLAVES_MUESTRA = Object.freeze({ participante: CLAVE_P, voluntario: CLAVE_V })
