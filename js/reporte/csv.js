import { VINO, FALTO, NO_ESTABA, agruparPorGrupo } from '../modelo/asistencia.js'

// El CSV existe para abrirlo en una planilla de calculo y poder filtrar, sumar
// y archivar. Por eso cada persona es una fila y cada dato una columna, aunque
// en pantalla los voluntarios vayan al costado: una planilla con bloques uno al
// lado del otro no se puede ordenar ni filtrar sin romperla.

// Una comilla dentro de un campo entrecomillado se escribe doble. Es la regla
// del formato, no una manía: sin esto un apodo entre comillas corta la fila y
// todo lo que sigue queda corrido una columna.
function campo(valor) {
  const texto = String(valor ?? '')
  if (!/[",\n]/.test(texto)) return texto
  return `"${texto.replace(/"/g, '""')}"`
}

// Cada casilla dice que paso. Antes la de "todavia no estaba" iba vacia, y en
// una planilla eso se lee igual que un dato que falta o que se perdio.
const CASILLA = { [VINO]: 'Sí', [FALTO]: 'No', [NO_ESTABA]: 'No estaba' }

// El BOM al principio es lo unico que hace que Excel en Windows lea el archivo
// como UTF-8. Sin el, "Gaía" llega como "GaÃ­a" y el reporte parece roto.
const BOM = '﻿'

// `titulos` son los rotulos de grupo tal como los escribio la coordinacion. Se
// editan desde Armar lista, asi que poner "Grupo 1" a mano haria que el CSV y la
// planilla se contradigan.
export function aCSV(historia, titulos = {}) {
  // Tipo y grupo van en columnas distintas. Metidos en una sola no se podia
  // filtrar por participante y agrupar por grupo a la vez, que es justo para lo
  // que se abre esto en una planilla.
  const encabezado = ['Tipo', 'Grupo', 'Nombre', ...historia.fechas, 'Vino a', 'Podía venir a']

  const fila = (tipo, grupo) => (f) => [
    tipo,
    campo(grupo),
    campo(f.persona.nombre),
    ...f.estados.map((e) => CASILLA[e] ?? ''),
    f.vino,
    f.de,
  ].join(',')

  // Agrupados como en la pantalla. Salian en el orden de la lista de personas,
  // asi que el grupo 1 y el 2 se intercalaban a lo largo de toda la planilla.
  const participantes = agruparPorGrupo(historia.participantes).flatMap((b) => {
    const rotulo = titulos[b.numero] ?? `Grupo ${b.numero ?? '?'}`
    return b.filas.map(fila('Participante', rotulo))
  })

  return BOM + [
    encabezado.map(campo).join(','),
    ...participantes,
    ...historia.voluntarios.map(fila('Voluntario', '')),
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
