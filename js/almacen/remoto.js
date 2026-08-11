import { ConflictoError } from './github.js'

const RUTA_ROSTER = 'roster.json'
const rutaLista = (fecha) => `listas/${fecha}.json`
const rutaFoto = (clave) => `fotos/${clave}`
const RUTA_SEGUIMIENTOS = 'seguimientos.json'
const rutaAsistencias = (mes) => `asistencias/${mes}.json`

export function crearAlmacenRemoto({ cliente, autor = 'la aplicación' }) {
  const shas = new Map()
  let verificado = null

  // Guarda la PROMESA, no un booleano, para que dos lecturas simultaneas al
  // abrir la app no disparen dos verificaciones.
  async function asegurarAcceso() {
    if (!verificado) verificado = cliente.verificarAcceso()
    return verificado
  }

  async function leerJson(ruta) {
    await asegurarAcceso()
    const datos = await cliente.leerTexto(ruta)
    if (!datos) return null
    shas.set(ruta, datos.sha)
    return JSON.parse(datos.texto)
  }

  // Tras un conflicto se refresca el sha desde el servidor y se vuelve a tirar
  // el error igual. Sin esto, cada reintento manda el mismo sha viejo y falla
  // identico, y la unica salida es recargar la pagina.
  //
  // OJO: esto habilita el reintento, no lo vuelve seguro. Reintentar a ciegas
  // pisaria el trabajo de la otra coordinadora con datos viejos. Solo es seguro
  // despues de releer y combinar. Nada de reintentos automaticos.
  async function escribirJson(ruta, valor, mensaje) {
    await asegurarAcceso()
    const texto = JSON.stringify(valor, null, 2)
    try {
      const resultado = await cliente.escribirTexto(ruta, texto, shas.get(ruta) ?? null, mensaje)
      shas.set(ruta, resultado.sha)
      return resultado
    } catch (error) {
      if (error instanceof ConflictoError) {
        const actual = await cliente.leerTexto(ruta)
        if (actual) shas.set(ruta, actual.sha)
        else shas.delete(ruta)
      }
      throw error
    }
  }

  return {
    async leerRoster() {
      return (await leerJson(RUTA_ROSTER)) ?? { version: 1, participantes: [], voluntarios: [] }
    },

    guardarRoster(roster, descripcion = null) {
      const que = descripcion ?? 'Cambiar las personas'
      return escribirJson(RUTA_ROSTER, roster, `${que} · ${autor}`)
    },

    leerLista(fecha) {
      return leerJson(rutaLista(fecha))
    },

    guardarLista(lista, descripcion = null) {
      // La descripcion viene de quien toco el boton: sin ella el registro decia
      // "Cambiar la planilla" una vez por guardado y nunca que habia cambiado.
      const que = descripcion ?? `Cambiar la planilla del ${lista.fecha}`
      return escribirJson(rutaLista(lista.fecha), lista, `${que} · ${autor}`)
    },

    async listarListas() {
      await asegurarAcceso()
      const archivos = await cliente.listar('listas')
      return archivos
        .filter((a) => a.nombre.endsWith('.json'))
        .map((a) => ({ fecha: a.nombre.replace(/\.json$/, ''), sha: a.sha }))
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    },

    // Correcciones de asistencia, un archivo por mes. Guarda solo las
    // diferencias contra lo que dice la planilla, asi que el archivo que no
    // existe significa "la planilla tenia razon", que es el caso normal.
    leerAsistencias(mes) {
      return leerJson(rutaAsistencias(mes))
    },

    guardarAsistencias(mes, datos, descripcion = null) {
      const que = descripcion ?? `Corregir la asistencia de ${mes}`
      return escribirJson(rutaAsistencias(mes), datos, `${que} · ${autor}`)
    },

    leerSeguimientos() {
      return leerJson(RUTA_SEGUIMIENTOS)
    },

    guardarSeguimientos(datos, descripcion = null) {
      const que = descripcion ?? 'Anotar un seguimiento'
      return escribirJson(RUTA_SEGUIMIENTOS, datos, `${que} · ${autor}`)
    },

    async leerFoto(clave) {
      await asegurarAcceso()
      const datos = await cliente.leerBytes(rutaFoto(clave))
      if (!datos) return null
      shas.set(rutaFoto(clave), datos.sha)
      return new Blob([datos.bytes], { type: 'image/jpeg' })
    },

    async guardarFoto(clave, blob, dueño = clave) {
      await asegurarAcceso()
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const ruta = rutaFoto(clave)
      // Las fotos siguen el mismo camino que el JSON, con la misma salvedad.
      try {
        const resultado = await cliente.escribirBytes(
          ruta, bytes, shas.get(ruta) ?? null, `Cargar la foto de ${dueño} · ${autor}`,
        )
        shas.set(ruta, resultado.sha)
      } catch (error) {
        if (error instanceof ConflictoError) {
          const actual = await cliente.leerBytes(ruta)
          if (actual) shas.set(ruta, actual.sha)
          else shas.delete(ruta)
        }
        throw error
      }
    },

    async borrarFoto(clave, dueño = clave) {
      await asegurarAcceso()
      const ruta = rutaFoto(clave)
      const sha = shas.get(ruta)
      if (!sha) {
        const datos = await cliente.leerBytes(ruta)
        if (!datos) return
        shas.set(ruta, datos.sha)
      }
      await cliente.borrar(ruta, shas.get(ruta), `Quitar la foto de ${dueño} · ${autor}`)
      shas.delete(ruta)
    },
  }
}
