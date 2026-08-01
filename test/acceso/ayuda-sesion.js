import { cifrar } from '../../js/acceso/cripto.js'

export { cifrar }

const BASE = 'voluntarios-fsb-sesion'
const DEPOSITO = 'sesion'
const CLAVE = 'actual'

// Arma un archivo de usuarios real, con el token cifrado de verdad, para que
// las pruebas de sesion ejerciten la criptografia y no una imitacion.
export async function archivoConUsuario(usuario, nombre, contrasena, token, rol = 'admin') {
  const registro = await cifrar(token, contrasena)
  return {
    version: 1,
    usuarios: [{ usuario, nombre, rol, ...registro }],
  }
}

// Abre la base de la sesion por su cuenta y devuelve el registro tal cual quedo
// guardado, sin pasar por sesion.js, para poder inspeccionar que se persistio.
export function leerCrudoDeIndexedDB() {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE, 1)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      if (!db.objectStoreNames.contains(DEPOSITO)) db.createObjectStore(DEPOSITO)
    }
    solicitud.onerror = () => rechazar(solicitud.error)
    solicitud.onsuccess = () => {
      const db = solicitud.result
      const transaccion = db.transaction(DEPOSITO, 'readonly')
      const lectura = transaccion.objectStore(DEPOSITO).get(CLAVE)
      transaccion.onerror = () => rechazar(transaccion.error)
      lectura.onerror = () => rechazar(lectura.error)
      lectura.onsuccess = () => {
        db.close()
        resolver(lectura.result ?? null)
      }
    }
  })
}
