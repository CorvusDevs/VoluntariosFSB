import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { onRequest } from '../../functions/api/[[ruta]].js'

globalThis.crypto ??= webcrypto
const CODIFICADOR = new TextEncoder()

function baseSesion(perfil = 'coordinacion') {
  const cuenta = { correo: 'comunicacion@aletea.org', nombre: 'Comunicación', rol: 'coordinacion', perfil_acceso: perfil, permisos: JSON.stringify(['cms']), nivel_datos_personales: 'ninguno', version_sesion: 0 }
  return { prepare(sql) {
    const consulta = sql.replace(/\s+/g, ' ').trim()
    return { bind: () => ({ async first() {
      if (consulta.includes('FROM usuarios WHERE correo = ?1')) return cuenta
      throw new Error(`Consulta no simulada: ${consulta}`)
    } }) }
  } }
}

function base64url(datos) { return Buffer.from(datos).toString('base64url') }

async function cookieSesion() {
  const cuerpo = base64url(CODIFICADOR.encode(JSON.stringify({ usuario: 'comunicacion@aletea.org', version: 0, expira: Math.floor(Date.now() / 1000) + 3600 })))
  const clave = await crypto.subtle.importKey('raw', CODIFICADOR.encode('secreto-de-prueba'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = base64url(new Uint8Array(await crypto.subtle.sign('HMAC', clave, CODIFICADOR.encode(cuerpo))))
  return `vfsb_sesion=${cuerpo}.${firma}`
}

describe('proxy seguro de imágenes de Drive', () => {
  let cookie
  beforeAll(async () => { cookie = await cookieSesion() })

  async function llamar(url, FETCH_EXTERNO, perfil = 'coordinacion') {
    return onRequest({
      request: new Request('https://gestor.aletea.org/api/cms/imagen-remota', {
        method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ url }),
      }),
      env: { BASE: baseSesion(perfil), SESSION_SECRET: 'secreto-de-prueba', FETCH_EXTERNO },
    })
  }

  it('devuelve solamente bytes de una imagen pública válida', async () => {
    const FETCH_EXTERNO = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }))
    const respuesta = await llamar('https://drive.google.com/file/d/1234567890_AbCdEf/view', FETCH_EXTERNO)
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('content-type')).toBe('image/jpeg')
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(FETCH_EXTERNO.mock.calls[0][0]).toMatch(/^https:\/\/drive\.usercontent\.google\.com\/download\?id=/)
  })

  it('rechaza enlaces ajenos a Drive y páginas HTML', async () => {
    const invalida = await llamar('https://ejemplo.org/foto.jpg', vi.fn())
    expect(invalida.status).toBe(400)
    const html = await llamar('https://drive.google.com/file/d/1234567890_AbCdEf/view', vi.fn().mockResolvedValue(new Response('<html></html>', { headers: { 'content-type': 'text/html' } })))
    expect(html.status).toBe(422)
    expect((await html.json()).error).toContain('no devuelve una imagen')
  })

  it('no permite que Integrantes ni Consulta activen descargas remotas', async () => {
    for (const perfil of ['integrante', 'consulta']) {
      const FETCH_EXTERNO = vi.fn()
      const respuesta = await llamar('https://drive.google.com/file/d/1234567890_AbCdEf/view', FETCH_EXTERNO, perfil)
      expect(respuesta.status).toBe(403)
      expect(FETCH_EXTERNO).not.toHaveBeenCalled()
    }
  })
})
