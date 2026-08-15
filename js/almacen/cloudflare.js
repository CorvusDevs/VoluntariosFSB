export class ConflictoCloudflareError extends Error {}

export function crearAlmacenCloudflare({ fetchFn } = {}) {
  const pedir = fetchFn ?? fetch
  const revisiones = new Map()
  const rutaLista = (fecha) => `listas/${fecha}.json`
  const rutaAsistencias = (mes) => `asistencias/${mes}.json`

  async function leerJson(ruta, vacio = null) {
    const respuesta = await pedir(`/api/documento?ruta=${encodeURIComponent(ruta)}`)
    if (respuesta.status === 404) return vacio
    if (!respuesta.ok) throw new Error((await respuesta.json()).error || 'No se pudieron leer los datos.')
    revisiones.set(ruta, respuesta.headers.get('etag')?.replaceAll('"', '') ?? null)
    return respuesta.json()
  }

  async function guardarJson(ruta, datos) {
    const respuesta = await pedir(`/api/documento?ruta=${encodeURIComponent(ruta)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'if-match': revisiones.get(ruta) ?? '0' },
      body: JSON.stringify(datos),
    })
    if (respuesta.status === 409) throw new ConflictoCloudflareError((await respuesta.json()).error)
    if (!respuesta.ok) throw new Error((await respuesta.json()).error || 'No se pudieron guardar los datos.')
    const resultado = await respuesta.json()
    revisiones.set(ruta, String(resultado.revision))
    return resultado
  }

  return {
    leerRoster: () => leerJson('roster.json', { version: 1, participantes: [], voluntarios: [] }),
    guardarRoster: (datos) => guardarJson('roster.json', datos),
    leerLista: (fecha) => leerJson(rutaLista(fecha)),
    guardarLista: (datos) => guardarJson(rutaLista(datos.fecha), datos),
    async listarListas() {
      const respuesta = await pedir('/api/listas')
      if (!respuesta.ok) throw new Error((await respuesta.json()).error || 'No se pudieron listar las planillas.')
      return respuesta.json()
    },
    leerAsistencias: (mes) => leerJson(rutaAsistencias(mes)),
    guardarAsistencias: (mes, datos) => guardarJson(rutaAsistencias(mes), datos),
    leerSeguimientos: () => leerJson('seguimientos.json'),
    guardarSeguimientos: (datos) => guardarJson('seguimientos.json', datos),
    async leerFoto(clave) {
      const respuesta = await pedir(`/api/foto?clave=${encodeURIComponent(clave)}`)
      if (respuesta.status === 404) return null
      if (!respuesta.ok) throw new Error('No se pudo leer la foto.')
      return respuesta.blob()
    },
    async guardarFoto(clave, blob) {
      const respuesta = await pedir(`/api/foto?clave=${encodeURIComponent(clave)}`, {
        method: 'PUT', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob,
      })
      if (!respuesta.ok) throw new Error('No se pudo guardar la foto.')
    },
    async borrarFoto(clave) {
      const respuesta = await pedir(`/api/foto?clave=${encodeURIComponent(clave)}`, { method: 'DELETE' })
      if (!respuesta.ok) throw new Error('No se pudo borrar la foto.')
    },
  }
}
