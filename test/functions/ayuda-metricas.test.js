import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { normalizarConsultaAyuda, onRequest } from '../../functions/api/[[ruta]].js'

globalThis.crypto ??= webcrypto
const CODIFICADOR = new TextEncoder()

async function cookieSesion(usuario) {
  const cuerpo = Buffer.from(CODIFICADOR.encode(JSON.stringify({ usuario, version: 0, expira: Math.floor(Date.now() / 1000) + 3600 }))).toString('base64url')
  const clave = await crypto.subtle.importKey('raw', CODIFICADOR.encode('secreto-de-prueba'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = Buffer.from(new Uint8Array(await crypto.subtle.sign('HMAC', clave, CODIFICADOR.encode(cuerpo)))).toString('base64url')
  return `vfsb_sesion=${cuerpo}.${firma}`
}

function baseMetricasAyuda() {
  const usuarios = new Map([
    ['admin@aletea.org', { correo: 'admin@aletea.org', nombre: 'Administración', rol: 'admin', perfil_acceso: 'administracion', permisos: '[]', nivel_datos_personales: 'ninguno', version_sesion: 0 }],
    ['integrante@aletea.org', { correo: 'integrante@aletea.org', nombre: 'Integrante', rol: 'coordinacion', perfil_acceso: 'integrante', permisos: '["cms"]', nivel_datos_personales: 'ninguno', version_sesion: 0 }],
  ])
  const metricas = new Map()
  const base = {
    prepare(sql) {
      const consulta = sql.replace(/\s+/g, ' ').trim()
      const ejecutar = (valores = []) => ({
        async first() {
          if (consulta.includes('FROM usuarios WHERE correo = ?1')) return usuarios.get(valores[0]) || null
          throw new Error(`Consulta no simulada: ${consulta}`)
        },
        async run() {
          if (consulta.startsWith('INSERT INTO metricas_ayuda_sin_resultados')) {
            const clave = `${valores[0]}:${valores[1]}`
            const actual = metricas.get(clave) || { fecha: valores[0], consulta: valores[1], cantidad: 0 }
            metricas.set(clave, { ...actual, cantidad: actual.cantidad + 1 })
            return { success: true }
          }
          throw new Error(`Escritura no simulada: ${consulta}`)
        },
        async all() {
          if (consulta.includes('FROM metricas_ayuda_sin_resultados')) {
            return { results: [...metricas.values()].map((fila) => ({ ...fila, ultima_fecha: fila.fecha })) }
          }
          throw new Error(`Listado no simulado: ${consulta}`)
        },
      })
      return { ...ejecutar(), bind: (...valores) => ejecutar(valores) }
    },
  }
  return { base, metricas }
}

function llamar(estado, ruta, { cookie = '', ...opciones } = {}) {
  const headers = new Headers(opciones.headers)
  if (cookie) headers.set('cookie', cookie)
  if (opciones.body) headers.set('content-type', 'application/json')
  return onRequest({
    request: new Request(`https://gestor.aletea.org/api/${ruta}`, { ...opciones, headers }),
    env: { BASE: estado.base, SESSION_SECRET: 'secreto-de-prueba' },
  })
}

describe('métricas anónimas de búsquedas de ayuda', () => {
  let cookieAdmin
  let cookieIntegrante
  beforeAll(async () => {
    cookieAdmin = await cookieSesion('admin@aletea.org')
    cookieIntegrante = await cookieSesion('integrante@aletea.org')
  })

  it('normaliza una consulta y descarta posibles datos personales o enlaces', () => {
    expect(normalizarConsultaAyuda('  Formulários!!! ')).toBe('formularios')
    expect(normalizarConsultaAyuda('persona@ejemplo.org')).toBeNull()
    expect(normalizarConsultaAyuda('https://drive.google.com/carpeta')).toBeNull()
    expect(normalizarConsultaAyuda('cédula 12345678')).toBeNull()
  })

  it('agrega búsquedas sin resultado sin guardar identidad y limita la lectura a Administración', async () => {
    const estado = baseMetricasAyuda()
    for (let intento = 0; intento < 2; intento += 1) {
      const respuesta = await llamar(estado, 'cms/ayuda/busquedas-sin-resultados', {
        method: 'POST', cookie: cookieIntegrante,
        body: JSON.stringify({ consulta: '  Tema Inexisténte ', resultados: 0 }),
      })
      expect(respuesta.status).toBe(200)
      expect(await respuesta.json()).toEqual({ registrada: true })
    }
    expect([...estado.metricas.values()]).toEqual([expect.objectContaining({ consulta: 'tema inexistente', cantidad: 2 })])
    expect(JSON.stringify([...estado.metricas.values()])).not.toContain('integrante@aletea.org')

    expect((await llamar(estado, 'cms/ayuda/busquedas-sin-resultados', { method: 'GET', cookie: cookieIntegrante })).status).toBe(403)
    const lectura = await llamar(estado, 'cms/ayuda/busquedas-sin-resultados', { method: 'GET', cookie: cookieAdmin })
    expect(lectura.status).toBe(200)
    expect((await lectura.json()).busquedas[0]).toMatchObject({ consulta: 'tema inexistente', cantidad: 2 })
  })

  it('no registra búsquedas que contienen información sensible', async () => {
    const estado = baseMetricasAyuda()
    const respuesta = await llamar(estado, 'cms/ayuda/busquedas-sin-resultados', {
      method: 'POST', cookie: cookieIntegrante,
      body: JSON.stringify({ consulta: 'buscar a persona@ejemplo.org', resultados: 0 }),
    })
    expect(await respuesta.json()).toEqual({ registrada: false, motivo: 'consulta_no_apta' })
    expect(estado.metricas.size).toBe(0)
  })
})
