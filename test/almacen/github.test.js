import { describe, it, expect } from 'vitest'
import { crearClienteGitHub, ConflictoError } from '../../js/almacen/github.js'

function fetchFalso(respuestas) {
  const llamadas = []
  const fn = async (url, opciones = {}) => {
    llamadas.push({ url, opciones })
    const clave = `${opciones.method ?? 'GET'} ${url.replace(/^https:\/\/[^/]+/, '')}`
    const r = respuestas[clave] ?? { estado: 404, cuerpo: { message: 'Not Found' } }
    return {
      ok: r.estado >= 200 && r.estado < 300,
      status: r.estado,
      headers: { get: (n) => (r.cabeceras ?? {})[n] ?? null },
      json: async () => {
        if (r.cuerpoCrudo !== undefined) throw new SyntaxError('Unexpected token <')
        return r.cuerpo
      },
    }
  }
  fn.llamadas = llamadas
  return fn
}

const base = '/repos/duenio/datos/contents'
const cliente = (f) =>
  crearClienteGitHub({ token: 'tok', duenio: 'duenio', repo: 'datos', fetchFn: f })

function aBase64Utf8(texto) {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  bytes.forEach((b) => { binario += String.fromCharCode(b) })
  return btoa(binario)
}

describe('leerTexto', () => {
  it('devuelve el contenido y el sha', async () => {
    const f = fetchFalso({
      [`GET ${base}/roster.json?ref=main`]:
        { estado: 200, cuerpo: { content: aBase64Utf8('{"a":1}'), sha: 'abc' } },
    })
    const r = await cliente(f).leerTexto('roster.json')
    expect(r.texto).toBe('{"a":1}')
    expect(r.sha).toBe('abc')
  })

  it('devuelve null cuando el archivo no existe', async () => {
    expect(await cliente(fetchFalso({})).leerTexto('falta.json')).toBeNull()
  })

  it('manda el token en la cabecera Authorization', async () => {
    const f = fetchFalso({
      [`GET ${base}/x.json?ref=main`]: { estado: 200, cuerpo: { content: aBase64Utf8('{}'), sha: 's' } },
    })
    await cliente(f).leerTexto('x.json')
    expect(f.llamadas[0].opciones.headers.Authorization).toBe('Bearer tok')
  })

  it('decodifica acentos correctamente', async () => {
    const f = fetchFalso({
      [`GET ${base}/n.json?ref=main`]:
        { estado: 200, cuerpo: { content: aBase64Utf8('{"n":"Julián Begoña"}'), sha: 's' } },
    })
    const r = await cliente(f).leerTexto('n.json')
    expect(JSON.parse(r.texto).n).toBe('Julián Begoña')
  })

  it('tolera los saltos de linea que GitHub mete en el base64', async () => {
    const crudo = aBase64Utf8('{"a":1}')
    const conSaltos = `${crudo.slice(0, 4)}\n${crudo.slice(4)}\n`
    const f = fetchFalso({
      [`GET ${base}/s.json?ref=main`]: { estado: 200, cuerpo: { content: conSaltos, sha: 's' } },
    })
    expect((await cliente(f).leerTexto('s.json')).texto).toBe('{"a":1}')
  })
})

describe('escribirTexto', () => {
  it('manda PUT con el contenido en base64 y el sha', async () => {
    const f = fetchFalso({
      [`PUT ${base}/roster.json`]: { estado: 200, cuerpo: { content: { sha: 'nuevo' } } },
    })
    const r = await cliente(f).escribirTexto('roster.json', '{"a":1}', 'viejo', 'mensaje')
    expect(r.sha).toBe('nuevo')
    const cuerpo = JSON.parse(f.llamadas[0].opciones.body)
    expect(cuerpo.sha).toBe('viejo')
    expect(cuerpo.message).toBe('mensaje')
    expect(cuerpo.branch).toBe('main')
  })

  it('omite el sha cuando el archivo es nuevo', async () => {
    const f = fetchFalso({
      [`PUT ${base}/nuevo.json`]: { estado: 201, cuerpo: { content: { sha: 's' } } },
    })
    await cliente(f).escribirTexto('nuevo.json', '{}', null, 'alta')
    expect(JSON.parse(f.llamadas[0].opciones.body).sha).toBeUndefined()
  })

  it('lanza ConflictoError ante un 409', async () => {
    const f = fetchFalso({ [`PUT ${base}/roster.json`]: { estado: 409, cuerpo: { message: 'conflict' } } })
    await expect(cliente(f).escribirTexto('roster.json', '{}', 'viejo', 'm'))
      .rejects.toBeInstanceOf(ConflictoError)
  })

  it('lanza ConflictoError ante un 422, que GitHub usa para sha desactualizado', async () => {
    const f = fetchFalso({ [`PUT ${base}/roster.json`]: { estado: 422, cuerpo: { message: 'does not match' } } })
    await expect(cliente(f).escribirTexto('roster.json', '{}', 'viejo', 'm'))
      .rejects.toBeInstanceOf(ConflictoError)
  })

  it('codifica acentos sin romperlos', async () => {
    const f = fetchFalso({ [`PUT ${base}/n.json`]: { estado: 200, cuerpo: { content: { sha: 's' } } } })
    await cliente(f).escribirTexto('n.json', '{"n":"Julián"}', null, 'm')
    const enviado = JSON.parse(f.llamadas[0].opciones.body).content
    const binario = atob(enviado)
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
    expect(new TextDecoder().decode(bytes)).toBe('{"n":"Julián"}')
  })

  it('lanza un error legible ante un 401', async () => {
    const f = fetchFalso({ [`PUT ${base}/x.json`]: { estado: 401, cuerpo: { message: 'Bad credentials' } } })
    await expect(cliente(f).escribirTexto('x.json', '{}', null, 'm')).rejects.toThrow(/token/i)
  })

  it('distingue un limite de peticiones de un token vencido', async () => {
    const f = fetchFalso({
      [`PUT ${base}/x.json`]: { estado: 403, cuerpo: { message: 'rate limit' }, cabeceras: { 'x-ratelimit-remaining': '0' } },
    })
    await expect(cliente(f).escribirTexto('x.json', '{}', null, 'm')).rejects.toThrow(/limitando/i)
  })

  it('un 403 sin limite agotado sigue reportando problema de token', async () => {
    const f = fetchFalso({
      [`PUT ${base}/y.json`]: { estado: 403, cuerpo: { message: 'forbidden' }, cabeceras: { 'x-ratelimit-remaining': '56' } },
    })
    await expect(cliente(f).escribirTexto('y.json', '{}', null, 'm')).rejects.toThrow(/token/i)
  })

  it('no explota cuando un 200 trae un cuerpo que no es JSON', async () => {
    const f = fetchFalso({
      [`PUT ${base}/x.json`]: { estado: 200, cuerpoCrudo: '<html>portal cautivo</html>' },
    })
    expect(await cliente(f).escribirTexto('x.json', '{}', null, 'm')).toEqual({ sha: null })
  })
})

describe('verificarAcceso', () => {
  it('pasa cuando el repositorio existe y el token llega', async () => {
    const f = fetchFalso({ 'GET /repos/duenio/datos': { estado: 200, cuerpo: { name: 'datos' } } })
    expect(await cliente(f).verificarAcceso()).toBe(true)
  })

  it('distingue un repositorio inalcanzable de un archivo que no existe', async () => {
    const f = fetchFalso({})
    await expect(cliente(f).verificarAcceso()).rejects.toThrow(/repositorio/i)
    expect(await cliente(f).leerTexto('roster.json')).toBeNull()
  })
})

describe('rutas', () => {
  it('codifica el nombre del archivo sin perder la rama', async () => {
    const f = fetchFalso({})
    await cliente(f).leerTexto('fotos/a b.jpg')
    expect(f.llamadas[0].url).toContain('a%20b.jpg')
    expect(f.llamadas[0].url).toContain('ref=main')
  })
})

describe('borrar', () => {
  it('avisa cuando falta el sha en vez de hablar de un conflicto', async () => {
    const f = fetchFalso({})
    await expect(cliente(f).borrar('fotos/p1.jpg', null, 'baja')).rejects.toThrow(/sha/i)
    expect(f.llamadas).toHaveLength(0)
  })
})

describe('listar', () => {
  it('devuelve los nombres y shas del directorio', async () => {
    const f = fetchFalso({
      [`GET ${base}/listas?ref=main`]: {
        estado: 200,
        cuerpo: [{ name: '2026-08-08.json', sha: 'a', type: 'file' },
                 { name: '2026-08-01.json', sha: 'b', type: 'file' }],
      },
    })
    expect((await cliente(f).listar('listas')).map((x) => x.nombre))
      .toEqual(['2026-08-08.json', '2026-08-01.json'])
  })

  it('devuelve arreglo vacio si el directorio no existe', async () => {
    expect(await cliente(fetchFalso({})).listar('listas')).toEqual([])
  })
})
