import { readFile } from 'node:fs/promises'

const TIEMPO_LIMITE_MS = 90_000

function mensajeDe(error) {
  if (Array.isArray(error)) return error.filter(Boolean).join(' ')
  return String(error || 'Error desconocido de cPanel.')
}

function validarRespuestaUapi(datos, modulo, funcion) {
  const resultado = datos?.result || datos
  if (Number(resultado?.status) !== 1) {
    throw new Error(`${modulo}::${funcion}: ${mensajeDe(resultado?.errors || resultado?.messages)}`)
  }
  return resultado.data
}

function validarRespuestaApi2(datos, modulo, funcion) {
  const resultado = datos?.cpanelresult
  if (Number(resultado?.event?.result) !== 1) {
    throw new Error(`${modulo}::${funcion}: ${mensajeDe(resultado?.error || resultado?.reason)}`)
  }
  const fallos = (resultado.data || []).filter((entrada) => 'result' in entrada && Number(entrada.result) !== 1)
  if (fallos.length) throw new Error(`${modulo}::${funcion}: ${mensajeDe(fallos[0].err || fallos[0].reason)}`)
  return resultado.data || []
}

export function cabeceraAutorizacion(usuario, token) {
  if (!usuario || !token) throw new Error('Faltan el usuario o el token de cPanel.')
  return `cpanel ${usuario}:${token}`
}

export class CpanelApi {
  constructor({ host, usuario, token, fetchImpl = fetch }) {
    this.host = String(host || '').replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/:2083$/, '')
    this.usuario = usuario
    this.token = token
    this.fetchImpl = fetchImpl
    if (!this.host) throw new Error('Falta el host de cPanel.')
  }

  async solicitar(url, opciones = {}) {
    const respuesta = await this.fetchImpl(url, {
      ...opciones,
      headers: {
        authorization: cabeceraAutorizacion(this.usuario, this.token),
        ...opciones.headers,
      },
      signal: opciones.signal || AbortSignal.timeout(TIEMPO_LIMITE_MS),
    })
    const texto = await respuesta.text()
    let datos
    try { datos = JSON.parse(texto) } catch {
      const tipo = respuesta.headers?.get?.('content-type') || 'tipo desconocido'
      const destino = respuesta.url || url
      throw new Error(`cPanel respondió ${respuesta.status} sin JSON válido (${tipo}) desde ${destino}.`)
    }
    if (!respuesta.ok) throw new Error(`cPanel respondió ${respuesta.status}: ${mensajeDe(datos?.errors || datos?.error)}`)
    return datos
  }

  async uapi(modulo, funcion, parametros = {}) {
    const url = new URL(`https://${this.host}:2083/execute/${modulo}/${funcion}`)
    for (const [nombre, valor] of Object.entries(parametros)) {
      if (Array.isArray(valor)) {
        for (const elemento of valor) {
          if (elemento !== undefined && elemento !== null) url.searchParams.append(nombre, String(elemento))
        }
      } else if (valor !== undefined && valor !== null) {
        url.searchParams.set(nombre, String(valor))
      }
    }
    return validarRespuestaUapi(await this.solicitar(url), modulo, funcion)
  }

  async api2(modulo, funcion, parametros = {}) {
    const url = new URL(`https://${this.host}:2083/json-api/cpanel`)
    const base = {
      cpanel_jsonapi_user: this.usuario,
      cpanel_jsonapi_apiversion: 2,
      cpanel_jsonapi_module: modulo,
      cpanel_jsonapi_func: funcion,
      ...parametros,
    }
    for (const [nombre, valor] of Object.entries(base)) url.searchParams.set(nombre, String(valor))
    return validarRespuestaApi2(await this.solicitar(url), modulo, funcion)
  }

  async subirArchivo(rutaLocal, directorioRemoto, nombreRemoto) {
    const formulario = new FormData()
    formulario.set('dir', directorioRemoto)
    formulario.set('file-1', new Blob([await readFile(rutaLocal)]), nombreRemoto)
    const url = `https://${this.host}:2083/execute/Fileman/upload_files`
    return validarRespuestaUapi(await this.solicitar(url, { method: 'POST', body: formulario }), 'Fileman', 'upload_files')
  }
}

export const _pruebas = { validarRespuestaUapi, validarRespuestaApi2 }
