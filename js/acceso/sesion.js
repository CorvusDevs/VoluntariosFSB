import { descifrar } from './cripto.js'
import { buscarUsuario } from './usuarios.js'

const BASE = 'voluntarios-fsb-sesion'
const DEPOSITO = 'sesion'
const CLAVE = 'actual'
// El mismo mensaje para usuario inexistente y contrasena incorrecta, para no
// revelar quien esta dado de alta.
const MENSAJE_INVALIDO = 'Usuario o contrasena incorrectos.'

export async function ingresar({ archivo, usuario, contrasena }) {
  const registro = buscarUsuario(archivo, usuario)
  if (!registro) throw new Error(MENSAJE_INVALIDO)
  let token
  try {
    token = await descifrar(registro, contrasena)
  } catch {
    throw new Error(MENSAJE_INVALIDO)
  }
  return { token, nombre: registro.nombre, usuario: registro.usuario, rol: registro.rol }
}

function abrir() {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE, 1)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      if (!db.objectStoreNames.contains(DEPOSITO)) db.createObjectStore(DEPOSITO)
    }
    solicitud.onsuccess = () => {
      solicitud.result.onversionchange = () => solicitud.result.close()
      resolver(solicitud.result)
    }
    solicitud.onerror = () => rechazar(solicitud.error)
  })
}

function operar(db, modo, accion) {
  return new Promise((resolver, rechazar) => {
    const transaccion = db.transaction(DEPOSITO, modo)
    const solicitud = accion(transaccion.objectStore(DEPOSITO))
    transaccion.onerror = () => rechazar(transaccion.error)
    solicitud.onsuccess = () => resolver(solicitud.result)
    solicitud.onerror = () => rechazar(solicitud.error)
  })
}

// La clave se genera con extractable en false y se guarda como CryptoKey, que
// IndexedDB clona sin exponer el material. Ni un script en la pagina puede
// sacarla: solo puede pedirle al navegador que descifre.
export async function recordar(token, nombre) {
  const clave = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const datos = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, clave, new TextEncoder().encode(token),
  )
  const db = await abrir()
  await operar(db, 'readwrite', (d) => d.put({ clave, iv, datos, nombre }, CLAVE))
  db.close()
}

export async function recuperarRecordado() {
  const db = await abrir()
  const guardado = await operar(db, 'readonly', (d) => d.get(CLAVE))
  db.close()
  if (!guardado) return null
  try {
    const datos = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: guardado.iv }, guardado.clave, guardado.datos,
    )
    return { token: new TextDecoder().decode(datos), nombre: guardado.nombre }
  } catch {
    return null
  }
}

export async function olvidar() {
  const db = await abrir()
  await operar(db, 'readwrite', (d) => d.delete(CLAVE))
  db.close()
}
