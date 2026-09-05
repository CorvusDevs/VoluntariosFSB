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

export function interpretar(commit, origen = null) {
  const linea = String(commit?.mensaje ?? '').split('\n')[0].trim()
  const corte = linea.lastIndexOf(SEPARADOR)
  const tiene = corte > 0
  return {
    sha: commit?.sha ?? null,
    fecha: commit?.fecha ?? null,
    origen,
    accion: tiene ? linea.slice(0, corte).trim() : linea,
    // Los commits viejos, y los que escribe alguien por fuera de la aplicacion,
    // no traen nombre. Decirlo es mejor que atribuirselo a cualquiera.
    quien: tiene ? linea.slice(corte + SEPARADOR.length).trim() : null,
  }
}

// Agrupa entradas ya interpretadas. Separada de porDia a proposito: adivinar si
// lo que llega son commits crudos o entradas ya leidas es la clase de astucia
// que despues falla en silencio.
export function agruparPorDia(entradas) {
  const dias = new Map()
  entradas.forEach((entrada) => {
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

// Agrupa commits crudos de un solo repositorio.
export function porDia(commits, origen = null) {
  return agruparPorDia(commits.map((c) => interpretar(c, origen)))
}

export function hora(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Los cambios de acceso viven en el repositorio publico y el resto en el
// privado, asi que el registro completo son los dos historiales mezclados por
// fecha. Sin el publico faltaba justo lo mas importante de auditar: quien dio o
// quito acceso, quien cambio un rol y quien roto el token.
export function mezclar(listas) {
  return listas
    .flatMap(({ commits, origen }) => commits.map((c) => interpretar(c, origen)))
    .sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')))
}

// El archivo de accesos, dentro del repositorio publico. Se pide por separado
// porque ese repositorio tambien guarda el codigo.
export const RUTA_ACCESOS = 'usuarios.json'

export async function leerRegistro(cliente, { cantidad = 60, clientePublico = null } = {}) {
  // Si el historial publico no se puede leer, se muestra el privado igual: media
  // verdad sirve mas que una pantalla en blanco.
  const [datos, accesos] = await Promise.all([
    cliente.listarCommits({ cantidad }),
    clientePublico
      ? clientePublico.listarCommits({ cantidad, ruta: RUTA_ACCESOS }).catch(() => [])
      : Promise.resolve([]),
  ])
  const entradas = mezclar([
    { commits: datos, origen: 'datos' },
    { commits: accesos, origen: 'accesos' },
  ])
  return agruparPorDia(entradas)
}
