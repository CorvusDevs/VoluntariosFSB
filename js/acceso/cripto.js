export const ITERACIONES = 600000
// Ningun registro legitimo pide mas vueltas de las que escribe la app, y cada
// vuelta de mas es tiempo de espera en el telefono de la coordinadora.
const MAX_ITERACIONES = ITERACIONES * 2
const LARGO_SAL = 16
const LARGO_IV = 12
export const LARGO_MINIMO_CONTRASENA = 16

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

// Falla en vez de recortar: si quien llama pide un largo invalido, el error
// tiene que aparecer donde esta el error, no en una contrasena debil silenciosa.
export function generarContrasena(longitud = LARGO_MINIMO_CONTRASENA) {
  if (!Number.isInteger(longitud) || longitud < LARGO_MINIMO_CONTRASENA) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`)
  }
  const limite = 256 - (256 % ALFABETO.length)
  let salida = ''
  while (salida.length < longitud) {
    const bytes = crypto.getRandomValues(new Uint8Array(longitud * 2))
    for (const valor of bytes) {
      if (salida.length >= longitud) break
      if (valor >= limite) continue
      salida += ALFABETO[valor % ALFABETO.length]
    }
  }
  return salida
}

function aBase64(datos) {
  let binario = ''
  new Uint8Array(datos).forEach((b) => { binario += String.fromCharCode(b) })
  return btoa(binario)
}

function desdeBase64(texto) {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

async function derivarClave(contrasena, sal, iteraciones) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal, iterations: iteraciones, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function cifrar(texto, contrasena) {
  const sal = crypto.getRandomValues(new Uint8Array(LARGO_SAL))
  const iv = crypto.getRandomValues(new Uint8Array(LARGO_IV))
  const clave = await derivarClave(contrasena, sal, ITERACIONES)
  const datos = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, clave, new TextEncoder().encode(texto),
  )
  return {
    kdf: { algoritmo: 'PBKDF2-SHA256', iteraciones: ITERACIONES, sal: aBase64(sal) },
    cifrado: { algoritmo: 'AES-GCM', iv: aBase64(iv), datos: aBase64(datos) },
  }
}

export async function descifrar(registro, contrasena) {
  const iteraciones = registro?.kdf?.iteraciones
  if (!Number.isInteger(iteraciones) || iteraciones < ITERACIONES || iteraciones > MAX_ITERACIONES) {
    throw new Error(`Registro invalido: iteraciones fuera de rango (${iteraciones}).`)
  }
  if (registro.kdf.algoritmo !== 'PBKDF2-SHA256' || registro.cifrado?.algoritmo !== 'AES-GCM') {
    throw new Error('Registro invalido: algoritmo no reconocido.')
  }
  const sal = desdeBase64(registro.kdf.sal)
  const iv = desdeBase64(registro.cifrado.iv)
  const clave = await derivarClave(contrasena, sal, iteraciones)
  const datos = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, clave, desdeBase64(registro.cifrado.datos),
  )
  return new TextDecoder().decode(datos)
}
