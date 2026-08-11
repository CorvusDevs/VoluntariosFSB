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
