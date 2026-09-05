export async function leerSesionCloudflare({ fetchFn } = {}) {
  const pedir = fetchFn ?? fetch
  const respuesta = await pedir('/api/sesion', { cache: 'no-store' })
  if (respuesta.status === 404) return null
  if (respuesta.status === 401) return null
  if (!respuesta.ok) throw new Error('No se pudo comprobar tu acceso.')
  return respuesta.json()
}

async function leerRespuesta(respuesta, mensaje) {
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(datos.error || mensaje)
  return datos
}

export async function ingresarCloudflare({ usuario, contrasena }, { fetchFn } = {}) {
  const pedir = fetchFn ?? fetch
  return leerRespuesta(await pedir('/api/ingresar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena }),
  }), 'No se pudo ingresar.')
}

export async function cerrarSesionCloudflare({ fetchFn } = {}) {
  const pedir = fetchFn ?? fetch
  await leerRespuesta(await pedir('/api/cerrar', { method: 'POST' }), 'No se pudo cerrar la sesión.')
}
