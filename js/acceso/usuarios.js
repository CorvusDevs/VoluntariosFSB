const normalizar = (usuario) => String(usuario ?? '').trim().toLowerCase()

export function urlUsuarios({ duenio, repoPublico, rama }) {
  return `https://raw.githubusercontent.com/${duenio}/${repoPublico}/${rama}/usuarios.json`
}

export function archivoVacio() {
  return { version: 1, usuarios: [] }
}

// El archivo es publico a proposito: una coordinadora tiene que poder ingresar
// antes de tener token. Por eso se lee sin cabecera Authorization y desde raw,
// que habilita CORS y no consume cuota de la API.
export async function leerUsuarios({ duenio, repoPublico, rama, fetchFn }) {
  const pedir = fetchFn ?? fetch
  const respuesta = await pedir(urlUsuarios({ duenio, repoPublico, rama }), { cache: 'no-store' })
  if (respuesta.status === 404) return archivoVacio()
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer la lista de coordinadoras. GitHub respondió ${respuesta.status}.`)
  }
  return respuesta.json()
}

export const ROLES = ['admin', 'coordinacion']

export function esAdmin(registro) {
  return registro?.rol === 'admin'
}

function validarRol(rol) {
  if (!ROLES.includes(rol)) {
    throw new Error(`Rol inválido: ${rol}. Solo se admiten ${ROLES.join(' y ')}.`)
  }
  return rol
}

function exigirQuedeUnAdmin(usuarios) {
  if (!usuarios.some(esAdmin)) {
    throw new Error('Tiene que quedar al menos una administradora.')
  }
  return usuarios
}

export function buscarUsuario(archivo, usuario) {
  const clave = normalizar(usuario)
  return archivo.usuarios.find((u) => u.usuario === clave) ?? null
}

export function agregarUsuario(archivo, { usuario, nombre, rol = 'coordinacion' }, registro) {
  const clave = normalizar(usuario)
  if (!clave) throw new Error('El usuario no puede estar vacío.')
  if (buscarUsuario(archivo, clave)) throw new Error(`El usuario ${clave} ya existe.`)
  validarRol(rol)
  const nuevo = { usuario: clave, nombre: String(nombre ?? clave).trim(), rol, ...registro }
  return { ...archivo, usuarios: [...archivo.usuarios, nuevo] }
}

export function cambiarRol(archivo, usuario, rol) {
  const clave = normalizar(usuario)
  validarRol(rol)
  if (!buscarUsuario(archivo, clave)) throw new Error(`No existe el usuario ${clave}.`)
  const usuarios = archivo.usuarios.map((u) => (u.usuario === clave ? { ...u, rol } : u))
  return { ...archivo, usuarios: exigirQuedeUnAdmin(usuarios) }
}

// El guardia corre sobre la lista RESULTANTE, no sobre la anterior, asi cubre
// por igual quitar a la ultima administradora y bajarle el rol. Vive aca y no
// en la pantalla para que ninguna interfaz futura pueda saltearlo.
export function quitarUsuario(archivo, usuario) {
  const clave = normalizar(usuario)
  const usuarios = archivo.usuarios.filter((u) => u.usuario !== clave)
  if (usuarios.length === archivo.usuarios.length) return { ...archivo, usuarios }
  return { ...archivo, usuarios: exigirQuedeUnAdmin(usuarios) }
}
