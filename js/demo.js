// Arnes de demostracion, descartable. Se elimina al cerrar el hito 2.
import { maquetar } from './imagen/maquetar.js'
import { pintar } from './imagen/pintar.js'
import { nombreDeArchivo, medidorDesde, esperarFuentes, cargarImagen, descargar } from './imagen/exportar.js'

const DENSIDAD = 2

export const ROSTER = {
  version: 1,
  participantes: [
    { id: 'p1', nombre: 'Gonzalo', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p2', nombre: 'Sofi', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p3', nombre: 'Thiago', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p4', nombre: 'Facundo', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p5', nombre: 'Angel', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p6', nombre: 'Fabi', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p7', nombre: 'Santiago', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p8', nombre: 'Juan', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p9', nombre: 'Nikita', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p10', nombre: 'Julián', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p11', nombre: 'Ezequiel', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p12', nombre: 'Gaia', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p13', nombre: 'Manuel', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p14', nombre: 'Samuel', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p15', nombre: 'Luan', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p16', nombre: 'Nicolás', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p17', nombre: 'Francisco', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p18', nombre: 'Alfonsina', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p19', nombre: 'Lautaro', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p20', nombre: 'Bruno', grupo: 2, foto: null, activo: true, notas: '' },
  ],
  voluntarios: [
    { id: 'v1', nombre: 'Abi', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v2', nombre: 'Pato', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v3', nombre: 'Cris', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v4', nombre: 'Francisco Planells', nuevo: true, foto: null, activo: true, notas: '' },
    { id: 'v5', nombre: 'Moni', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v6', nombre: 'Eloísa', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v7', nombre: 'Jess', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v8', nombre: 'Majo', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v9', nombre: 'Vicky', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v10', nombre: 'Ruben', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v11', nombre: 'Fer', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v12', nombre: 'Noah', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v13', nombre: 'Lizz', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v14', nombre: 'Rena', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v15', nombre: 'Alejandro', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v16', nombre: 'Mariangeles', nuevo: false, foto: null, activo: true, notas: '' },
  ],
}

export const LISTA = {
  version: 1,
  fecha: '2026-08-08',
  hora: '11:00',
  lugar: 'Tres Cruces',
  coordinacion: ['Majo'],
  grupos: [
    {
      numero: 1,
      titulo: 'Grupo 1',
      subtitulo: '5 a 9 años',
      cancha: 'Cancha 1',
      filas: [
        { participantes: ['p1'], voluntarios: ['v1'] },
        { participantes: ['p2'], voluntarios: ['v2'] },
        { participantes: ['p3'], voluntarios: ['v3'] },
        { participantes: ['p4'], voluntarios: [] },
        { participantes: ['p5'], voluntarios: ['v5', 'v6'] },
        { participantes: ['p6'], voluntarios: ['v7'] },
        { participantes: ['p7', 'p8'], voluntarios: ['v8'] },
        { participantes: ['p9'], voluntarios: ['v9'] },
      ],
      apoyo: ['v10'],
    },
    {
      numero: 2,
      titulo: 'Grupo 2',
      subtitulo: '10 a 17 años',
      cancha: 'Cancha 2',
      filas: [
        { participantes: ['p10'], voluntarios: ['v11'] },
        { participantes: ['p11'], voluntarios: ['v12'] },
        { participantes: ['p12'], voluntarios: ['v13'] },
        { participantes: ['p13'], voluntarios: ['v14'] },
        { participantes: ['p14'], voluntarios: ['v15'] },
        { participantes: ['p15'], voluntarios: ['v16'] },
        { participantes: ['p16'], voluntarios: ['v4'] },
        { participantes: ['p17'], voluntarios: ['v2'] },
        { participantes: ['p18'], voluntarios: ['v3'] },
        { participantes: ['p19'], voluntarios: ['v9'] },
        { participantes: ['p20'], voluntarios: ['v8'] },
      ],
      apoyo: ['v6'],
    },
  ],
  opcionesImagen: { saludo: true, despedida: true, fotos: true, compacto: false },
}

export const SALUDO = 'Buenas tardes familias, les compartimos las asignaciones de este sábado. Cualquier consulta nos escriben por acá.'
export const DESPEDIDA = 'Gracias como siempre por la buena onda. Nos vemos el sábado.'

// Las lecturas del DOM se posponen al bloque de arranque, al final del archivo,
// para que este modulo tambien se pueda importar desde Node (por ejemplo, un
// script de verificacion que solo necesita ROSTER y LISTA).
let lienzo, ctx, info, casillas
let logo = null

function formatearNumero(n) {
  return Math.round(n).toLocaleString('es-UY')
}

async function redibujar() {
  await esperarFuentes()

  const lista = {
    ...LISTA,
    opcionesImagen: {
      saludo: casillas.saludo.checked,
      despedida: casillas.despedida.checked,
      fotos: casillas.fotos.checked,
      compacto: casillas.compacto.checked,
    },
  }

  const medirTexto = medidorDesde(ctx)
  const plano = maquetar(lista, ROSTER, { saludo: SALUDO, despedida: DESPEDIDA, medirTexto })
  pintar(ctx, plano, { logo }, DENSIDAD)

  const anchoPx = plano.ancho * DENSIDAD
  const altoPx = plano.alto * DENSIDAD
  const relacion = plano.relacion.toFixed(2)
  const recorte = plano.recorteProbable
    ? 'WhatsApp probablemente recorte la vista previa porque la imagen es muy alta.'
    : 'WhatsApp no debería recortar la vista previa.'
  const desborde = plano.desborde
    ? 'Atención: algún texto se sale del margen derecho.'
    : 'Ningún texto se sale del margen derecho.'
  info.textContent = `Tamaño real del archivo: ${formatearNumero(anchoPx)} x ${formatearNumero(altoPx)} px. `
    + `Relación de aspecto (alto sobre ancho): ${relacion}. ${recorte} ${desborde}`
}

async function alDescargar() {
  await esperarFuentes()
  await descargar(lienzo, nombreDeArchivo(LISTA))
}

if (typeof document !== 'undefined') {
  lienzo = document.getElementById('lienzo')
  ctx = lienzo.getContext('2d')
  info = document.getElementById('info')
  casillas = {
    saludo: document.getElementById('saludo'),
    despedida: document.getElementById('despedida'),
    fotos: document.getElementById('fotos'),
    compacto: document.getElementById('compacto'),
  }

  Object.values(casillas).forEach((casilla) => casilla.addEventListener('change', redibujar))
  document.getElementById('descargar').addEventListener('click', alDescargar)

  cargarImagen('assets/logo-aletea.png').then((img) => {
    logo = img
    redibujar()
  })
}
