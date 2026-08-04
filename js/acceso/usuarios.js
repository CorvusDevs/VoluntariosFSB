const normalizar = (usuario) => String(usuario ?? '').trim().toLowerCase()

// Aplana un texto hasta lo que dos personas escribirian igual: sin tildes, sin
// espacios y en minuscula. El teclado del telefono pone mayuscula sola y nadie
// escribe su propio nombre dos veces igual.
const plegar = (texto) => String(texto ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, '')
  .toLowerCase()

// Arma un usuario a partir del nombre de la persona. Se usa al dar de alta,
// para que nadie tenga que inventarlo ni pueda escribirlo mal.
export function usuarioSugerido(nombre) {
  return plegar(nombre)
}

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

// Solo para ingresar. Las operaciones de administracion (cambiar rol, quitar)
// siguen siendo exactas a proposito: ahi hay que apuntar a un registro y a uno
// solo. Aca, en cambio, hay una persona escribiendo en un telefono, asi que
// aceptamos tambien su nombre completo y perdonamos tildes y mayusculas.
export function buscarParaIngresar(archivo, usuario) {
  const exacto = buscarUsuario(archivo, usuario)
  if (exacto) return exacto
  const buscado = plegar(usuario)
  if (!buscado) return null
  const candidatos = archivo.usuarios.filter(
    (u) => plegar(u.usuario) === buscado || plegar(u.nombre) === buscado)
  // Si dos responden a lo mismo no elegimos por ninguna: entrar como otra
  // persona seria peor que no entrar.
  return candidatos.length === 1 ? candidatos[0] : null
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
