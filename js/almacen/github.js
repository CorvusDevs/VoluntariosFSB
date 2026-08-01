export class ConflictoError extends Error {
  constructor(mensaje) {
    super(mensaje)
    this.name = 'ConflictoError'
  }
}

function bytesABase64(datos) {
  let binario = ''
  new Uint8Array(datos).forEach((b) => { binario += String.fromCharCode(b) })
  return btoa(binario)
}

function base64ABytes(base64) {
  const binario = atob(String(base64).replace(/\s/g, ''))
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

const textoABase64 = (texto) => bytesABase64(new TextEncoder().encode(texto))
const base64ATexto = (base64) => new TextDecoder().decode(base64ABytes(base64))

// Una ruta con espacios, ? o # rompe la URL: sin codificar, el ?ref= se pierde
// y GitHub contesta con la rama por defecto en vez de la configurada. Se codifica
// segmento por segmento para que las barras sigan separando carpetas.
const codificar = (ruta) => String(ruta).split('/').map(encodeURIComponent).join('/')

export function crearClienteGitHub({ token, duenio, repo, rama = 'main', fetchFn }) {
  const pedir = fetchFn ?? fetch
  const raiz = `https://api.github.com/repos/${duenio}/${repo}/contents`

  const cabeceras = () => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  })

  async function fallar(respuesta, accion) {
    let detalle = ''
    try {
      detalle = (await respuesta.json())?.message ?? ''
    } catch {
      detalle = ''
    }
    // GitHub usa 403 tanto para "token sin permiso" como para "te pasaste de
    // peticiones". La cabecera de sobrantes es lo unico que los distingue.
    const restantes = respuesta.headers?.get?.('x-ratelimit-remaining')
    if (respuesta.status === 429 || (respuesta.status === 403 && restantes === '0')) {
      throw new Error('GitHub esta limitando las peticiones. Espera unos minutos y volve a intentar.')
    }
    if (respuesta.status === 409 || respuesta.status === 422) {
      throw new ConflictoError(
        'Otra coordinadora modifico esto mientras trabajabas. Recarga para ver los cambios.',
      )
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new Error(`El token de GitHub no tiene permiso o vencio. Detalle: ${detalle}`)
    }
    throw new Error(`GitHub respondio ${respuesta.status} al ${accion}. Detalle: ${detalle}`)
  }

  async function leerCrudo(ruta) {
    const respuesta = await pedir(`${raiz}/${codificar(ruta)}?ref=${rama}`, { headers: cabeceras() })
    if (respuesta.status === 404) return null
    if (!respuesta.ok) await fallar(respuesta, `leer ${ruta}`)
    return respuesta.json()
  }

  async function escribirCrudo(ruta, contenidoBase64, sha, mensaje) {
    const cuerpo = { message: mensaje, content: contenidoBase64, branch: rama }
    if (sha) cuerpo.sha = sha
    const respuesta = await pedir(`${raiz}/${codificar(ruta)}`, {
      method: 'PUT',
      headers: { ...cabeceras(), 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    if (!respuesta.ok) await fallar(respuesta, `guardar ${ruta}`)
    // Un portal cautivo puede contestar 200 con HTML. Sin esta red, el error que
    // ve la coordinadora es "Unexpected token <", que no dice nada.
    let datos = null
    try {
      datos = await respuesta.json()
    } catch {
      datos = null
    }
    return { sha: datos?.content?.sha ?? null }
  }

  return {
    // GitHub contesta 404 tanto para un archivo que falta como para un
    // repositorio equivocado o un token sin acceso: esconde la existencia a
    // proposito. Sin este chequeo, un nombre mal escrito en js/config.js se ve
    // como un roster vacio y no como un error.
    async verificarAcceso() {
      const respuesta = await pedir(`https://api.github.com/repos/${duenio}/${repo}`, {
        headers: cabeceras(),
      })
      if (respuesta.status === 404) {
        throw new Error(
          `No se encontro el repositorio ${duenio}/${repo}, o el token no tiene acceso. ` +
          'Revisa el nombre en js/config.js y los permisos del token.',
        )
      }
      if (!respuesta.ok) await fallar(respuesta, 'verificar el acceso al repositorio')
      return true
    },

    async leerTexto(ruta) {
      const datos = await leerCrudo(ruta)
      return datos ? { texto: base64ATexto(datos.content), sha: datos.sha } : null
    },

    escribirTexto(ruta, texto, sha, mensaje) {
      return escribirCrudo(ruta, textoABase64(texto), sha, mensaje)
    },

    async leerBytes(ruta) {
      const datos = await leerCrudo(ruta)
      return datos ? { bytes: base64ABytes(datos.content), sha: datos.sha } : null
    },

    escribirBytes(ruta, bytes, sha, mensaje) {
      return escribirCrudo(ruta, bytesABase64(bytes), sha, mensaje)
    },

    async borrar(ruta, sha, mensaje) {
      // Sin sha GitHub contesta 422, que fallar traduce como conflicto de
      // edicion. Es un mensaje falso: el problema esta de este lado.
      if (!sha) throw new Error('Para borrar un archivo hace falta su sha.')
      const respuesta = await pedir(`${raiz}/${codificar(ruta)}`, {
        method: 'DELETE',
        headers: { ...cabeceras(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: mensaje, sha, branch: rama }),
      })
      if (!respuesta.ok && respuesta.status !== 404) await fallar(respuesta, `borrar ${ruta}`)
    },

    async listar(ruta) {
      const datos = await leerCrudo(ruta)
      if (!datos || !Array.isArray(datos)) return []
      return datos.filter((x) => x.type === 'file').map((x) => ({ nombre: x.name, sha: x.sha }))
    },
  }
}
