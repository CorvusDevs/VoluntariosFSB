import { activos } from './roster.js'

// Formato de la imagen con el que arranca una lista nueva. La grilla muestra la
// cara mucho mas grande, que es lo que la coordinacion necesita para reconocer
// a cada chico de un vistazo.
export const FORMATO_POR_DEFECTO = 'grilla'

// En que esquina de la foto del participante van los medallones de los
// voluntarios. Solo lo usa el formato "retratos". Abajo a la derecha queda
// apoyado sobre la franja del nombre, asi las dos anotaciones viven en la misma
// banda y el resto de la foto queda libre para la cara.
export const ESQUINA_VOLUNTARIO_POR_DEFECTO = 'abajo-derecha'

// Tamaño y cuanto asoma el medallon. Solo cuentan cuando la esquina elegida es
// una de las "montadas": con el medallon apoyado adentro de la foto, agrandarlo
// taparia al chico, que es justo lo que no queremos.
export const TAMANO_VOLUNTARIO_POR_DEFECTO = 'grande'
export const ASOMO_VOLUNTARIO_POR_DEFECTO = 'montado'

export const SALUDO_POR_DEFECTO =
  'Buenas tardes, esperamos que estén todos bien. Les compartimos las asignaciones para mañana:'
export const DESPEDIDA_POR_DEFECTO = 'Nos vemos mañana. Gracias a todos.'

const POR_DEFECTO = {
  1: { titulo: 'Grupo 1', subtitulo: '10 a 17 años', cancha: 'Cancha 1' },
  2: { titulo: 'Grupo 2', subtitulo: '5 a 9 años', cancha: 'Cancha 2' },
}

export function crearLista(fecha, roster, base = {}) {
  const gente = activos(roster.participantes)
  const grupos = [1, 2].map((numero) => ({
    numero,
    ...POR_DEFECTO[numero],
    filas: gente
      .filter((p) => p.grupo === numero)
      .map((p) => ({ participantes: [p.id], voluntarios: [] })),
    apoyo: [],
  }))
  return {
    version: 1,
    fecha,
    hora: base.hora ?? '11:00',
    lugar: base.lugar ?? 'Tres Cruces',
    saludo: base.saludo ?? SALUDO_POR_DEFECTO,
    despedida: base.despedida ?? DESPEDIDA_POR_DEFECTO,
    coordinacion: base.coordinacion ?? [],
    // Quienes hoy no vienen. Se guardan aparte para que reconciliar con el roster
    // no los devuelva a la planilla, que era el efecto de sacarlos sin registrarlo.
    ausentes: [],
    grupos,
    opcionesImagen: {
      // El saludo y la despedida arrancan apagados: la planilla se manda con un
      // mensaje escrito en el chat, y repetirlo adentro de la imagen solo la
      // alarga. Se prenden desde Vista previa cuando hacen falta.
      saludo: false, despedida: false, fotos: true, compacto: false, formato: FORMATO_POR_DEFECTO,
      esquinaVoluntario: ESQUINA_VOLUNTARIO_POR_DEFECTO,
      tamanoVoluntario: TAMANO_VOLUNTARIO_POR_DEFECTO,
      asomoVoluntario: ASOMO_VOLUNTARIO_POR_DEFECTO,
    },
  }
}

function ubicar(lista, participanteId) {
  for (let g = 0; g < lista.grupos.length; g += 1) {
    const f = lista.grupos[g].filas.findIndex((fila) => fila.participantes.includes(participanteId))
    if (f !== -1) return { g, f }
  }
  throw new Error(`El participante ${participanteId} no esta en la lista`)
}

export function filaDe(lista, participanteId) {
  const { g, f } = ubicar(lista, participanteId)
  return lista.grupos[g].filas[f]
}

function conFilas(lista, g, filas) {
  const grupos = lista.grupos.map((grupo, i) => (i === g ? { ...grupo, filas } : grupo))
  return { ...lista, grupos }
}

function cambiarFila(lista, participanteId, transformar) {
  const { g, f } = ubicar(lista, participanteId)
  const filas = lista.grupos[g].filas.map((fila, i) => (i === f ? transformar(fila) : fila))
  return conFilas(lista, g, filas)
}

export function asignarVoluntario(lista, participanteId, voluntarioId) {
  return cambiarFila(lista, participanteId, (fila) =>
    fila.voluntarios.includes(voluntarioId)
      ? fila
      : { ...fila, voluntarios: [...fila.voluntarios, voluntarioId] })
}

export function quitarVoluntario(lista, participanteId, voluntarioId) {
  return cambiarFila(lista, participanteId, (fila) => ({
    ...fila,
    voluntarios: fila.voluntarios.filter((id) => id !== voluntarioId),
  }))
}

export function fusionarParticipantes(lista, destinoId, origenId) {
  const destino = ubicar(lista, destinoId)
  const origen = ubicar(lista, origenId)
  if (destino.g !== origen.g) {
    throw new Error('No se pueden fusionar participantes de grupo distinto')
  }
  if (destino.f === origen.f) return lista

  const filaDestino = lista.grupos[destino.g].filas[destino.f]
  const filaOrigen = lista.grupos[origen.g].filas[origen.f]
  const fusionada = {
    participantes: [...filaDestino.participantes, ...filaOrigen.participantes],
    voluntarios: [...new Set([...filaDestino.voluntarios, ...filaOrigen.voluntarios])],
  }
  const filas = lista.grupos[destino.g].filas
    .map((fila, i) => (i === destino.f ? fusionada : fila))
    .filter((_, i) => i !== origen.f)
  return conFilas(lista, destino.g, filas)
}

export function separarParticipante(lista, participanteId) {
  const { g, f } = ubicar(lista, participanteId)
  const fila = lista.grupos[g].filas[f]
  if (fila.participantes.length === 1) return lista
  const restante = {
    ...fila,
    participantes: fila.participantes.filter((id) => id !== participanteId),
  }
  const nueva = { participantes: [participanteId], voluntarios: [...fila.voluntarios] }
  const filas = [...lista.grupos[g].filas]
  filas.splice(f, 1, restante, nueva)
  return conFilas(lista, g, filas)
}

export function moverAGrupo(lista, participanteId, numeroDestino) {
  const { g, f } = ubicar(lista, participanteId)
  const destino = lista.grupos.findIndex((grupo) => grupo.numero === numeroDestino)
  if (destino === -1) throw new Error(`No existe el grupo ${numeroDestino}`)
  if (destino === g) return lista
  const fila = lista.grupos[g].filas[f]
  const grupos = lista.grupos.map((grupo, i) => {
    if (i === g) return { ...grupo, filas: grupo.filas.filter((_, j) => j !== f) }
    if (i === destino) return { ...grupo, filas: [...grupo.filas, fila] }
    return grupo
  })
  return { ...lista, grupos }
}

export function agregarApoyo(lista, numeroGrupo, voluntarioId) {
  const grupos = lista.grupos.map((grupo) =>
    grupo.numero === numeroGrupo && !grupo.apoyo.includes(voluntarioId)
      ? { ...grupo, apoyo: [...grupo.apoyo, voluntarioId] }
      : grupo)
  return { ...lista, grupos }
}

export function quitarApoyo(lista, numeroGrupo, voluntarioId) {
  const grupos = lista.grupos.map((grupo) =>
    grupo.numero === numeroGrupo
      ? { ...grupo, apoyo: grupo.apoyo.filter((id) => id !== voluntarioId) }
      : grupo)
  return { ...lista, grupos }
}

// Los rotulos de cada grupo se editan desde la pantalla, con valores escritos por
// una persona. La lista blanca es a proposito: solo se puede tocar el rotulo, y
// ni las filas ni el numero ni el apoyo quedan al alcance de ese formulario.
export function editarGrupo(lista, numeroGrupo, cambios) {
  const permitidos = ['titulo', 'subtitulo', 'cancha']
  const filtrados = Object.fromEntries(
    Object.entries(cambios).filter(([clave]) => permitidos.includes(clave)),
  )
  const grupos = lista.grupos.map((grupo) => (
    grupo.numero === numeroGrupo ? { ...grupo, ...filtrados } : grupo
  ))
  return { ...lista, grupos }
}

export function sincronizarConRoster(lista, roster) {
  const activos = new Map(roster.participantes.filter((p) => p.activo).map((p) => [p.id, p]))
  const ausentes = new Set(lista.ausentes ?? [])
  const yaEnLista = new Set()

  const grupos = lista.grupos.map((grupo) => {
    const filas = grupo.filas
      .map((fila) => {
        const participantes = fila.participantes.filter((id) => {
          if (!activos.has(id)) return false
          yaEnLista.add(id)
          return true
        })
        return { ...fila, participantes }
      })
      .filter((fila) => fila.participantes.length > 0)
    return { ...grupo, filas }
  })

  activos.forEach((persona) => {
    if (yaEnLista.has(persona.id) || ausentes.has(persona.id)) return
    const destino = grupos.find((g) => g.numero === persona.grupo)
    if (destino) destino.filas.push({ participantes: [persona.id], voluntarios: [] })
  })

  const voluntariosActivos = new Set(roster.voluntarios.filter((v) => v.activo).map((v) => v.id))
  const limpios = grupos.map((grupo) => ({
    ...grupo,
    filas: grupo.filas.map((fila) => ({
      ...fila,
      voluntarios: fila.voluntarios.filter((id) => voluntariosActivos.has(id)),
    })),
    apoyo: grupo.apoyo.filter((id) => voluntariosActivos.has(id)),
  }))

  // Alguien dado de baja del roster deja de ser una ausencia de esta lista: ya no
  // esta en ninguna parte, y guardar su id para siempre no ayudaria a nadie.
  const ausentesVigentes = [...ausentes].filter((id) => activos.has(id))
  return { ...lista, ausentes: ausentesVigentes, grupos: limpios }
}

export function quitarDeLista(lista, participanteId) {
  const grupos = lista.grupos.map((grupo) => ({
    ...grupo,
    filas: grupo.filas
      .map((fila) => ({
        ...fila,
        participantes: fila.participantes.filter((id) => id !== participanteId),
      }))
      .filter((fila) => fila.participantes.length > 0),
  }))
  const ausentes = [...new Set([...(lista.ausentes ?? []), participanteId])]
  return { ...lista, ausentes, grupos }
}

export function volverALaLista(lista, participanteId, roster) {
  const persona = roster.participantes.find((p) => p.id === participanteId)
  if (!persona) throw new Error(`No existe el participante ${participanteId}`)
  const ausentes = (lista.ausentes ?? []).filter((id) => id !== participanteId)
  const yaEsta = lista.grupos.some((g) => g.filas.some((f) => f.participantes.includes(participanteId)))
  if (yaEsta) return { ...lista, ausentes }
  const grupos = lista.grupos.map((grupo) => (
    grupo.numero === persona.grupo
      ? { ...grupo, filas: [...grupo.filas, { participantes: [participanteId], voluntarios: [] }] }
      : grupo
  ))
  return { ...lista, ausentes, grupos }
}

export function contarPendientes(lista, numeroGrupo, roster) {
  const grupo = lista.grupos.find((g) => g.numero === numeroGrupo)
  if (!grupo) throw new Error(`No existe el grupo ${numeroGrupo}`)
  const asignados = new Set(lista.grupos.flatMap((g) =>
    [...g.filas.flatMap((f) => f.voluntarios), ...g.apoyo]))
  return {
    participantesSinVoluntario: grupo.filas.filter((f) => f.voluntarios.length === 0).length,
    voluntariosSinAsignar: activos(roster.voluntarios).filter((v) => !asignados.has(v.id)).length,
  }
}
