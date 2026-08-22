export class ConflictoCloudflareError extends Error {}

export function crearAlmacenCloudflare({ fetchFn } = {}) {
  const pedir = fetchFn ?? fetch
  const revisiones = new Map()
  // Las fotos se reutilizan entre Personas y Vista previa mientras dura esta
  // sesion. No van a Cache Storage: dejar fotos de niños en disco despues de
  // cerrar sesion seria peor que volver a pedirlas al entrar de nuevo.
  const fotos = new Map()
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

  async function borrarJson(ruta) {
    const respuesta = await pedir(`/api/documento?ruta=${encodeURIComponent(ruta)}`, {
      method: 'DELETE', headers: { 'if-match': revisiones.get(ruta) ?? '0' },
    })
    if (!respuesta.ok && respuesta.status !== 404) throw new Error((await respuesta.json()).error || 'No se pudieron borrar los datos.')
    revisiones.delete(ruta)
  }

  return {
    leerRoster: () => leerJson('roster.json', { version: 1, participantes: [], voluntarios: [] }),
    guardarRoster: (datos) => guardarJson('roster.json', datos),
    async leerFichaProtegida(id) {
      const respuesta = await pedir(`/api/personas/${encodeURIComponent(id)}/protegida`)
      if (!respuesta.ok) throw new Error((await respuesta.json()).error || 'No se pudo abrir la ficha protegida.')
      return respuesta.json()
    },
    async guardarFichaProtegida(id, datos) {
      const respuesta = await pedir(`/api/personas/${encodeURIComponent(id)}/protegida`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos),
      })
      if (!respuesta.ok) throw new Error((await respuesta.json()).error || 'No se pudo guardar la ficha protegida.')
      return respuesta.json()
    },
    leerLista: (fecha) => leerJson(rutaLista(fecha)),
    guardarLista: (datos) => guardarJson(rutaLista(datos.fecha), datos),
    async listarListas() {
      const respuesta = await pedir('/api/listas')
      if (!respuesta.ok) throw new Error((await respuesta.json()).error || 'No se pudieron listar las planillas.')
      return respuesta.json()
    },
    async borrarMes(mes) {
      const listas = await this.listarListas()
      await Promise.all(listas.filter((lista) => lista.fecha.startsWith(`${mes}-`)).map((lista) => {
        revisiones.set(rutaLista(lista.fecha), String(lista.revision))
        return borrarJson(rutaLista(lista.fecha))
      }))
      const asistencias = await leerJson(rutaAsistencias(mes))
      if (asistencias) await borrarJson(rutaAsistencias(mes))
    },
    async borrarDia(fecha) {
      const listas = await this.listarListas()
      const lista = listas.find((registro) => registro.fecha === fecha)
      if (lista) {
        revisiones.set(rutaLista(fecha), String(lista.revision))
        await borrarJson(rutaLista(fecha))
      }
      const mes = fecha.slice(0, 7)
      const asistencias = await leerJson(rutaAsistencias(mes))
      if (!asistencias) return
      await guardarJson(rutaAsistencias(mes), {
        ...asistencias,
        correcciones: (asistencias.correcciones ?? []).filter((correccion) => correccion.fecha !== fecha),
      })
    },
    leerAsistencias: (mes) => leerJson(rutaAsistencias(mes)),
    guardarAsistencias: (mes, datos) => guardarJson(rutaAsistencias(mes), datos),
    leerSeguimientos: () => leerJson('seguimientos.json'),
    guardarSeguimientos: (datos) => guardarJson('seguimientos.json', datos),
    async leerFoto(clave) {
      if (fotos.has(clave)) return fotos.get(clave)
      const lectura = (async () => {
      const respuesta = await pedir(`/api/foto?clave=${encodeURIComponent(clave)}`)
      if (respuesta.status === 404) return null
      if (!respuesta.ok) throw new Error('No se pudo leer la foto.')
      return respuesta.blob()
      })()
      fotos.set(clave, lectura)
      try {
        const foto = await lectura
        if (!foto) fotos.delete(clave)
        return foto
      } catch (error) {
        fotos.delete(clave)
        throw error
      }
    },
    async guardarFoto(clave, blob) {
      const respuesta = await pedir(`/api/foto?clave=${encodeURIComponent(clave)}`, {
        method: 'PUT', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob,
      })
      if (!respuesta.ok) throw new Error('No se pudo guardar la foto.')
      fotos.set(clave, Promise.resolve(blob))
    },
    async borrarFoto(clave) {
      const respuesta = await pedir(`/api/foto?clave=${encodeURIComponent(clave)}`, { method: 'DELETE' })
      if (!respuesta.ok) throw new Error('No se pudo borrar la foto.')
      fotos.delete(clave)
    },
  }
}
