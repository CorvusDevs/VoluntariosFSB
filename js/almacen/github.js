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
    const respuesta = await pedir(`${raiz}/${ruta}?ref=${rama}`, { headers: cabeceras() })
    if (respuesta.status === 404) return null
    if (!respuesta.ok) await fallar(respuesta, `leer ${ruta}`)
    return respuesta.json()
  }

  async function escribirCrudo(ruta, contenidoBase64, sha, mensaje) {
    const cuerpo = { message: mensaje, content: contenidoBase64, branch: rama }
    if (sha) cuerpo.sha = sha
    const respuesta = await pedir(`${raiz}/${ruta}`, {
      method: 'PUT',
      headers: { ...cabeceras(), 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    if (!respuesta.ok) await fallar(respuesta, `guardar ${ruta}`)
    const datos = await respuesta.json()
    return { sha: datos.content?.sha ?? null }
  }

  return {
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
      const respuesta = await pedir(`${raiz}/${ruta}`, {
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
