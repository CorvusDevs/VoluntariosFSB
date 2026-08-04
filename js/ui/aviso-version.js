import { elemento } from './componentes.js'
import { VERSION } from '../version.js'

// GitHub Pages manda cache-control: max-age=600 y los modulos se piden sin
// ninguna version en la URL. Durante esos 10 minutos el telefono sigue corriendo
// el codigo anterior sin volver a pedirlo, y no hay nada en pantalla que lo
// delate: un arreglo ya publicado se ve como si no se hubiera hecho.
//
// Esto no puede forzar la recarga de los modulos, porque la cache es del
// navegador y las URL no cambian. Lo que si puede es decir la verdad: que
// version se esta corriendo y si el servidor ya tiene otra.
const RUTA = 'version.json'

// Con el trabajador controlando la pagina, lo que se ve es lo publicado. Sin el,
// puede ser lo que quedo en la cache del navegador. Decirlo evita la pregunta
// que ya nos costo varias vueltas: "¿esta roto o todavia no me llego?".
export function trabajadorAlMando(navegador = typeof navigator !== 'undefined' ? navigator : null) {
  return Boolean(navegador?.serviceWorker?.controller)
}

export function sello(navegador) {
  const alMando = trabajadorAlMando(navegador)
  const p = elemento('p', ['sello-version'])
  p.dataset.version = VERSION
  p.dataset.trabajador = alMando ? 'si' : 'no'
  p.appendChild(elemento('span', [], `Versión ${VERSION}`))
  p.appendChild(elemento('span', ['sello-estado'], alMando
    ? ' · al día'
    : ' · recargá una vez para activar las actualizaciones'))
  return p
}

// Devuelve la version publicada, o null si no se pudo averiguar. Nunca lanza:
// quedarse sin saber no puede romper la aplicacion.
export async function versionPublicada(pedir = fetch) {
  try {
    const respuesta = await pedir(RUTA, { cache: 'no-store' })
    if (!respuesta.ok) return null
    const datos = await respuesta.json()
    return typeof datos?.version === 'string' ? datos.version : null
  } catch {
    return null
  }
}

export function hayQueActualizar(publicada, actual = VERSION) {
  return Boolean(publicada) && publicada !== actual
}

// La barra solo aparece cuando de verdad hay una version distinta, asi que ver
// aparecer una es en si mismo la respuesta a "ya llego el cambio?".
export function barraDeActualizacion(alActualizar) {
  const caja = elemento('div', ['aviso-version'])
  caja.setAttribute('role', 'status')
  caja.appendChild(elemento('span', [], 'Hay una versión nueva de la aplicación.'))
  const boton = elemento('button', ['boton'], 'Actualizar')
  boton.type = 'button'
  boton.dataset.accion = 'actualizar-version'
  boton.addEventListener('click', alActualizar)
  caja.appendChild(boton)
  return caja
}

// Mira al entrar y cada vez que se vuelve a la pestaña, que es cuando alguien
// acaba de recargar esperando ver un cambio.
export function vigilarVersion(raiz, { pedir = fetch, recargar = () => location.reload() } = {}) {
  let avisada = false
  async function mirar() {
    if (avisada) return
    const publicada = await versionPublicada(pedir)
    if (!hayQueActualizar(publicada)) return
    avisada = true
    raiz.prepend(barraDeActualizacion(recargar))
  }
  mirar()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') mirar()
  })
}
