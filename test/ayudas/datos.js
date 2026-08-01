export const ROSTER = {
  version: 1,
  participantes: [
    { id: 'p1', nombre: 'Gonzalo', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p2', nombre: 'Sofi', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p3', nombre: 'Thiago', grupo: 1, foto: 'p3.jpg', activo: true, notas: '' },
    { id: 'p4', nombre: 'Nikita', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p5', nombre: 'Julián', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p6', nombre: 'Ezequiel', grupo: 2, foto: null, activo: false, notas: '' },
  ],
  voluntarios: [
    { id: 'v1', nombre: 'Abi', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v2', nombre: 'Cris', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v3', nombre: 'Francisco', nuevo: true, foto: null, activo: true, notas: '' },
    { id: 'v4', nombre: 'Moni', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v5', nombre: 'Majo', nuevo: false, foto: null, activo: true, notas: '' },
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
      subtitulo: '10 a 17 años',
      cancha: 'Cancha 1',
      filas: [
        { participantes: ['p1'], voluntarios: ['v1'] },
        { participantes: ['p2'], voluntarios: [] },
        { participantes: ['p3'], voluntarios: ['v2'] },
      ],
      apoyo: [],
    },
    {
      numero: 2,
      titulo: 'Grupo 2',
      subtitulo: '5 a 9 años',
      cancha: 'Cancha 2',
      filas: [
        { participantes: ['p4'], voluntarios: ['v2', 'v3'] },
        { participantes: ['p5'], voluntarios: ['v4'] },
      ],
      apoyo: ['v5'],
    },
  ],
  // Declarado a proposito: estas pruebas son sobre el formato apilado, no sobre
  // cual es el predeterminado. Ese tiene su propia prueba aparte.
  opcionesImagen: { saludo: true, despedida: true, fotos: true, compacto: false, formato: 'filas' },
}

export const SALUDO = 'Buenas tardes, esperamos que estén todos bien. Les compartimos las asignaciones para mañana:'
export const DESPEDIDA = 'Nos vemos mañana. Gracias a todos.'

export function medirFalso(texto, fuente) {
  const px = Number(/(\d+)px/.exec(fuente)?.[1] ?? 16)
  return texto.length * px * 0.55
}
