import { VINO, FALTO } from '../modelo/asistencia.js'

// Una comilla dentro de un campo entrecomillado se escribe doble. Es la regla
// del formato, no una manía: sin esto un apodo entre comillas corta la fila y
// todo lo que sigue queda corrido una columna.
function campo(valor) {
  const texto = String(valor ?? '')
  if (!/[",\n]/.test(texto)) return texto
  return `"${texto.replace(/"/g, '""')}"`
}

const CASILLA = { [VINO]: 'Si', [FALTO]: 'No' }

// El BOM al principio es lo unico que hace que Excel en Windows lea el archivo
// como UTF-8. Sin el, "Gaía" llega como "GaÃ­a" y el reporte parece roto.
const BOM = '﻿'

// `titulos` son los rotulos de grupo tal como los escribio la coordinacion. Se
// editan desde Armar lista, asi que poner "Grupo 1" a mano haria que el CSV y la
// planilla se contradigan.
export function aCSV(historia, titulos = {}) {
  const encabezado = ['Tipo', 'Nombre', ...historia.fechas, 'Vino', 'De']
  const tipoDe = (persona) => titulos[persona.grupo] ?? `Grupo ${persona.grupo ?? '?'}`
  const fila = (tipo) => (f) => [
    typeof tipo === 'function' ? campo(tipo(f.persona)) : tipo,
    campo(f.persona.nombre),
    // La casilla vacia es "todavia no estaba": ni si ni no, que en una planilla
    // de calculo se suma mal.
    ...f.estados.map((e) => CASILLA[e] ?? ''),
    f.vino,
    f.de,
  ].join(',')

  return BOM + [
    encabezado.map(campo).join(','),
    ...historia.participantes.map(fila(tipoDe)),
    ...historia.voluntarios.map(fila('Voluntario')),
  ].join('\n')
}

export function descargarCSV(texto, nombre) {
  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
