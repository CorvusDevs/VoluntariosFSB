const CLAVE = 'voluntarios-fsb:ultima-pantalla'

export const PANTALLAS = Object.freeze([
  'lista', 'vista-previa', 'personas', 'reporte', 'asistencias', 'agenda', 'registro', 'ajustes',
])

export function pantallaPermitida(pantalla, { admin = false, cloudflare = false } = {}) {
  if (!PANTALLAS.includes(pantalla)) return false
  if (pantalla === 'registro') return admin && !cloudflare
  if (pantalla === 'ajustes') return admin
  return true
}

export function leerUltimaPantalla(almacen = globalThis.sessionStorage) {
  try {
    const pantalla = almacen?.getItem(CLAVE)
    return PANTALLAS.includes(pantalla) ? pantalla : 'lista'
  } catch {
    return 'lista'
  }
}

export function guardarUltimaPantalla(pantalla, almacen = globalThis.sessionStorage) {
  if (!PANTALLAS.includes(pantalla)) return
  try {
    almacen?.setItem(CLAVE, pantalla)
  } catch {}
}

export function olvidarUltimaPantalla(almacen = globalThis.sessionStorage) {
  try {
    almacen?.removeItem(CLAVE)
  } catch {}
}
