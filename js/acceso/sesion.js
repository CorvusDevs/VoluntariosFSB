import { descifrar } from './cripto.js'
import { buscarParaIngresar } from './usuarios.js'

const BASE = 'voluntarios-fsb-sesion'
const DEPOSITO = 'sesion'
const CLAVE = 'actual'
// Los dos mensajes son distintos a proposito. Esconder cual de las dos cosas
// fallo solo tendria sentido si la lista de usuarios fuera secreta, y no lo es:
// usuarios.json es publico y cualquiera lo baja sin credenciales. Con el mensaje
// unico no protegiamos nada y dejabamos a la persona probando la contraseña
// correcta una y otra vez contra un usuario mal escrito.
const SIN_USUARIO = 'No encontramos ese usuario. Probá con tu nombre completo, como figura en la lista.'
const CONTRASENA_MAL = 'Esa contraseña no coincide. Pegala de nuevo, sin espacios al final.'

export async function ingresar({ archivo, usuario, contrasena }) {
  const registro = buscarParaIngresar(archivo, usuario)
  if (!registro) throw new Error(SIN_USUARIO)
  let token, claveAcceso = null
  try {
    if (archivo.version >= 2 && archivo.credencial) {
      claveAcceso = await descifrar(registro, contrasena)
      token = await descifrar(archivo.credencial, claveAcceso)
    } else {
      // Compatibilidad transitoria: los archivos v1 cifraban el token
      // directamente con cada contraseña.
      token = await descifrar(registro, contrasena)
    }
  } catch {
    throw new Error(CONTRASENA_MAL)
  }
  return { token, claveAcceso, nombre: registro.nombre, usuario: registro.usuario, rol: registro.rol }
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
export async function recordar(token, nombre, { usuario = null, rol = null, claveAcceso = null } = {}) {
  const clave = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const datos = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, clave, new TextEncoder().encode(JSON.stringify({ token, claveAcceso })),
  )
  const db = await abrir()
  await operar(db, 'readwrite', (d) => d.put({ clave, iv, datos, nombre, usuario, rol }, CLAVE))
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
    const texto = new TextDecoder().decode(datos)
    let credencial
    try { credencial = JSON.parse(texto) } catch { credencial = { token: texto, claveAcceso: null } }
    return {
      token: credencial.token,
      claveAcceso: credencial.claveAcceso ?? null,
      nombre: guardado.nombre,
      usuario: guardado.usuario ?? null,
      // Sin rol guardado, el permiso mas bajo: que un registro viejo o
      // manipulado abra los ajustes seria peor que pedir que entre de nuevo.
      rol: guardado.rol ?? 'coordinacion',
    }
  } catch {
    return null
  }
}

export async function olvidar() {
  const db = await abrir()
  await operar(db, 'readwrite', (d) => d.delete(CLAVE))
  db.close()
}
