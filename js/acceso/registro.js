import { formatearFechaLarga } from '../util/fechas.js'

// El registro de acciones no es un archivo que la aplicacion escriba: son los
// commits del repositorio privado. Cada cambio ya deja uno, con quien lo hizo y
// cuando, y desde la aplicacion no hay forma de editarlos. Un archivo propio
// habria que reescribirlo entero en cada accion, con su conflicto y su
// crecimiento sin techo, y quien quisiera tapar algo solo tendria que guardarlo
// de nuevo sin esa linea.
//
// El separador lo pone el almacen remoto: "<que paso> · <quien>".
const SEPARADOR = ' · '

export function interpretar(commit) {
  const linea = String(commit?.mensaje ?? '').split('\n')[0].trim()
  const corte = linea.lastIndexOf(SEPARADOR)
  const tiene = corte > 0
  return {
    sha: commit?.sha ?? null,
    fecha: commit?.fecha ?? null,
    accion: tiene ? linea.slice(0, corte).trim() : linea,
    // Los commits viejos, y los que escribe alguien por fuera de la aplicacion,
    // no traen nombre. Decirlo es mejor que atribuirselo a cualquiera.
    quien: tiene ? linea.slice(corte + SEPARADOR.length).trim() : null,
  }
}

// Agrupa por dia para que la pantalla no repita la fecha en cada renglon.
export function porDia(commits) {
  const dias = new Map()
  commits.map(interpretar).forEach((entrada) => {
    const dia = (entrada.fecha ?? '').slice(0, 10)
    if (!dias.has(dia)) dias.set(dia, [])
    dias.get(dia).push(entrada)
  })
  return [...dias.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dia, entradas]) => ({
      dia,
      titulo: dia ? formatearFechaLarga(dia) : 'Sin fecha',
      entradas,
    }))
}

export function hora(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export async function leerRegistro(cliente, { cantidad = 60 } = {}) {
  const commits = await cliente.listarCommits({ cantidad })
  return porDia(commits)
}
