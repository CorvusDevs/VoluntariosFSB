// Asistencia derivada de las planillas ya guardadas. Nada de esto se anota el
// sabado: la planilla es el plan de la noche anterior y de ahi sale todo, con
// una pasada de correcciones a mano encima para los casos que no coincidieron.
//
// Modulo puro, como lista.js y roster.js: sin DOM y sin almacen, para poder
// probar cada regla sin navegador y sin datos de verdad.

export const VINO = 'vino'
export const FALTO = 'falto'
// Ni vino ni falto: esa persona todavia no existia para el programa. Sin este
// tercer estado, alguien dado de alta en agosto figura faltando de enero a
// julio y dispara la alerta el dia que entra.
export const NO_ESTABA = 'no-estaba'

// La evidencia de cada uno es distinta, y por eso la regla tambien:
//
// Del participante hay registro explicito de la falta, porque alguien toco
// "Hoy no viene". Si no esta ni en un grupo ni en ausentes, esa planilla no
// dice nada de el.
//
// Del voluntario no hay registro: no aparecer es toda la evidencia que existe,
// asi que se cuenta falta. Distinguir "no vino" de "todavia no estaba" no se
// puede con una sola planilla; lo resuelve historial(), mirando el mes entero.
export function estadoDeSabado(lista, roster) {
  const enPlanilla = new Set()
  const acompañados = new Set()
  ;(lista.grupos ?? []).forEach((grupo) => {
    ;(grupo.filas ?? []).forEach((fila) => {
      ;(fila.participantes ?? []).forEach((id) => acompañados.add(id))
      ;(fila.voluntarios ?? []).forEach((id) => enPlanilla.add(id))
    })
    ;(grupo.apoyo ?? []).forEach((id) => enPlanilla.add(id))
  })
  const ausentes = new Set(lista.ausentes ?? [])

  const estado = new Map()
  ;(roster.participantes ?? []).forEach((p) => {
    if (acompañados.has(p.id)) estado.set(p.id, VINO)
    else if (ausentes.has(p.id)) estado.set(p.id, FALTO)
    else estado.set(p.id, NO_ESTABA)
  })
  ;(roster.voluntarios ?? []).forEach((v) => {
    estado.set(v.id, enPlanilla.has(v.id) ? VINO : FALTO)
  })
  return estado
}

// El historial de un periodo: una fila por persona, una columna por sabado que
// tuvo planilla. Los sabados sin planilla no existen para el reporte: no hay
// forma de distinguir "no hubo futbol" de "no se cargo", asi que no se afirma
// nada sobre ellos.
//
// `correcciones` son solo las diferencias contra lo derivado, tal como se
// guardan en asistencias/AAAA-MM.json. La lista vacia es el caso normal.
export function historial(listas, roster, correcciones = []) {
  const ordenadas = [...listas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const fechas = ordenadas.map((l) => l.fecha)
  const conocidas = new Set(fechas)

  const porFecha = new Map(ordenadas.map((l) => [l.fecha, estadoDeSabado(l, roster)]))
  correcciones.forEach((c) => {
    // Una correccion de un sabado que no tiene planilla no tiene donde apoyarse.
    if (!conocidas.has(c.fecha)) return
    porFecha.get(c.fecha).set(c.persona, c.vino ? VINO : FALTO)
  })

  const fila = (persona, recortarArranque) => {
    let estados = fechas.map((f) => porFecha.get(f).get(persona.id) ?? NO_ESTABA)
    if (recortarArranque) {
      // Del voluntario, "no aparece" y "todavia no estaba" son el mismo dato en
      // una planilla suelta. Se separan aca: hasta que se lo ve por primera vez
      // no habia nada que faltar.
      const primero = estados.indexOf(VINO)
      const hasta = primero === -1 ? estados.length : primero
      estados = estados.map((e, i) => (i < hasta ? NO_ESTABA : e))
    }
    const posibles = estados.filter((e) => e !== NO_ESTABA)
    return {
      persona,
      estados,
      vino: posibles.filter((e) => e === VINO).length,
      de: posibles.length,
    }
  }

  return {
    fechas,
    participantes: (roster.participantes ?? []).map((p) => fila(p, false)),
    voluntarios: (roster.voluntarios ?? []).map((v) => fila(v, true)),
  }
}

// Tres faltas seguidas. El usuario lo pidio como "mas de 2 veces seguidas".
export const UMBRAL_ALERTA = 3

// Cuantas faltas seguidas trae hasta hoy, contando desde el ultimo sabado hacia
// atras. Los sabados en que la persona todavia no estaba se saltean sin cortar
// la racha, igual que un sabado sin planilla: ni suman ni interrumpen.
//
// `almenos` avisa que la cuenta llego al principio de lo que se miro sin
// encontrar un sabado en que viniera. Quien llama suele mirar solo los ultimos
// sabados, asi que la racha real puede ser mas larga, y decir el numero pelado
// seria afirmar de mas.
function rachaFinal(estados) {
  let faltas = 0
  for (let i = estados.length - 1; i >= 0; i -= 1) {
    if (estados[i] === VINO) return { faltas, almenos: false }
    if (estados[i] === FALTO) faltas += 1
  }
  return { faltas, almenos: faltas > 0 }
}

// Un seguimiento silencia UNA racha, no a la persona: vale mientras no haya
// vuelto a venir despues de anotarlo. Si volvio y arranco otra racha, la alerta
// tiene que aparecer de nuevo, porque es informacion nueva.
function silenciada(fila, fechas, seguimientos) {
  const suyos = seguimientos.filter((s) => s.persona === fila.persona.id)
  if (suyos.length === 0) return false
  const ultimo = suyos.map((s) => s.desde).sort().at(-1)
  const vinoDespues = fechas.some((f, i) => f > ultimo && fila.estados[i] === VINO)
  return !vinoDespues
}

export function rachasDeFalta(historia, seguimientos = []) {
  const alertas = []
  const revisar = (filas) => filas.forEach((fila) => {
    if (fila.persona.activo === false) return
    const { faltas, almenos } = rachaFinal(fila.estados)
    if (faltas < UMBRAL_ALERTA) return
    if (silenciada(fila, historia.fechas, seguimientos)) return
    alertas.push({ persona: fila.persona, faltas, almenos })
  })
  revisar(historia.participantes)
  revisar(historia.voluntarios)
  return alertas.sort((a, b) => b.faltas - a.faltas)
}

// Solo los sabados que ya ocurrieron. La planilla del sabado que viene existe
// desde que se abre la aplicacion y viene con todos presentes, porque es un plan
// y no lo que paso. Contarla metia un "vino" imaginario al final de la historia
// que cortaba cualquier racha de faltas, y con eso la alerta no saltaba nunca.
//
// Verificado en el navegador: con la planilla del 15 adentro, tres faltas
// seguidas de Gaia daban racha 0.
export function hastaHoy(fechas, hoy) {
  return [...fechas].filter((f) => f <= hoy).sort()
}
