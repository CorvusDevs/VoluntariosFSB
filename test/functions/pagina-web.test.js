import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { onRequest, resumenMetricasWebDesde } from '../../functions/api/[[ruta]].js'

globalThis.crypto ??= webcrypto
const contenidoInicial = JSON.parse(readFileSync(new URL('../../assets/pagina-publica-v1.json', import.meta.url), 'utf8'))
const CODIFICADOR = new TextEncoder()

function basePaginaWeb() {
  const documentos = new Map()
  const actividad = []
  const medios = new Map()
  const metricasDiarias = [
    { fecha: '2026-07-20', visitas: 40, paginas_vistas: 70, acciones: 8, actualizado_en: '2026-07-21 02:00:00' },
    { fecha: '2026-08-20', visitas: 50, paginas_vistas: 90, acciones: 12, actualizado_en: '2026-08-21 02:00:00' },
    { fecha: '2026-08-23', visitas: 70, paginas_vistas: 110, acciones: 18, actualizado_en: '2026-08-24 02:00:00' },
  ]
  const metricasPaginas = [{ ruta: '/', vistas: 120 }, { ruta: '/familias/', vistas: 80 }]
  const metricasAcciones = [{ accion: 'contacto:whatsapp', cantidad: 14 }, { accion: 'donar', cantidad: 8 }]
  const formularios = [
    { id: 'familias-publico', titulo: 'Orientación para familias', descripcion: 'Contanos qué necesitás.', tipo: 'inscripcion', visibilidad: 'publica', estado: 'activa', finalidad: 'Responder la consulta familiar.', responsable_datos: 'Equipo de Familias', conservacion_meses: 12, requiere_consentimiento: 1, equipo_nombre: 'Familias' },
    { id: 'interno', titulo: 'Uso interno', descripcion: '', tipo: 'pedido', visibilidad: 'interna', estado: 'activa' },
    { id: 'pausado', titulo: 'Pausado', descripcion: '', tipo: 'voluntariado', visibilidad: 'publica', estado: 'pausada' },
  ]
  const usuarios = new Map([
    ['direccion@aletea.org', { correo: 'direccion@aletea.org', nombre: 'Dirección', rol: 'coordinacion', perfil_acceso: 'direccion', permisos: JSON.stringify(['cms']), nivel_datos_personales: 'ninguno', version_sesion: 0 }],
    ['coordinacion@aletea.org', { correo: 'coordinacion@aletea.org', nombre: 'Coordinación', rol: 'coordinacion', perfil_acceso: 'coordinacion', permisos: JSON.stringify(['cms']), nivel_datos_personales: 'ninguno', version_sesion: 0 }],
    ['integrante@aletea.org', { correo: 'integrante@aletea.org', nombre: 'Integrante', rol: 'coordinacion', perfil_acceso: 'integrante', permisos: JSON.stringify(['cms']), nivel_datos_personales: 'ninguno', version_sesion: 0 }],
    ['consulta@aletea.org', { correo: 'consulta@aletea.org', nombre: 'Consulta', rol: 'coordinacion', perfil_acceso: 'consulta', permisos: JSON.stringify(['cms']), nivel_datos_personales: 'ninguno', version_sesion: 0 }],
  ])
  const base = {
    async batch(consultas) { return Promise.all(consultas.map((consulta) => consulta.run())) },
    prepare(sql) {
      const consulta = sql.replace(/\s+/g, ' ').trim()
      const ejecutar = (valores = []) => ({
        async first() {
          if (consulta.includes('FROM usuarios WHERE correo = ?1')) return usuarios.get(valores[0]) || null
          if (consulta.includes('FROM documentos WHERE ruta = ?1')) return documentos.get(valores[0]) || null
          if (consulta.includes('FROM medios_pagina_web WHERE id = ?1')) return medios.get(valores[0]) || null
          throw new Error(`Consulta no simulada: ${consulta}`)
        },
        async all() {
          if (consulta.includes("FROM documentos WHERE ruta LIKE 'pagina-web/historial/%.json'")) {
            return { results: [...documentos.entries()].filter(([ruta]) => ruta.startsWith('pagina-web/historial/')).map(([ruta, fila]) => ({ ruta, ...fila })) }
          }
          if (consulta.includes('FROM responsabilidades_equipo')) return { results: [] }
          if (consulta.includes('FROM medios_pagina_web ORDER BY')) return { results: [...medios.values()].map(({ datos, ...medio }) => medio) }
          if (consulta.includes('FROM formularios_cms f LEFT JOIN equipos e')) return { results: formularios.filter((formulario) => formulario.visibilidad === 'publica' && formulario.estado === 'activa') }
          if (consulta.includes('FROM metricas_web_diarias')) return { results: metricasDiarias }
          if (consulta.includes('FROM metricas_web_paginas_diarias')) return { results: metricasPaginas }
          if (consulta.includes('FROM metricas_web_acciones_diarias')) return { results: metricasAcciones }
          throw new Error(`Listado no simulado: ${consulta}`)
        },
        async run() {
          if (consulta.startsWith('INSERT INTO documentos')) {
            documentos.set(valores[0], { contenido: valores[1], revision: valores[2], actualizado_por: valores[3], actualizado_en: '2026-08-23 22:00:00' })
            return { success: true }
          }
          if (consulta.startsWith('INSERT INTO actividad')) {
            actividad.push({ correo: valores[0], accion: valores[1], recurso: valores[2], detalle: valores[3] })
            return { success: true }
          }
          if (consulta.startsWith('INSERT INTO medios_pagina_web')) {
            medios.set(valores[0], { id: valores[0], nombre: valores[1], tipo: valores[2], ancho: valores[3], alto: valores[4], bytes: valores[5], datos: valores[6], texto_alternativo: valores[7], creado_en: '2026-08-24 12:00:00' })
            return { success: true }
          }
          throw new Error(`Escritura no simulada: ${consulta}`)
        },
      })
      const directa = ejecutar()
      return { ...directa, bind: (...valores) => ejecutar(valores) }
    },
  }
  return { base, documentos, actividad, medios, formularios, metricasDiarias, metricasPaginas, metricasAcciones }
}

function base64url(datos) {
  return Buffer.from(datos).toString('base64url')
}

async function cookieSesion(usuario) {
  const cuerpo = base64url(CODIFICADOR.encode(JSON.stringify({ usuario, version: 0, expira: Math.floor(Date.now() / 1000) + 3600 })))
  const clave = await crypto.subtle.importKey('raw', CODIFICADOR.encode('secreto-de-prueba'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = base64url(new Uint8Array(await crypto.subtle.sign('HMAC', clave, CODIFICADOR.encode(cuerpo))))
  return `vfsb_sesion=${cuerpo}.${firma}`
}

function llamar(estado, ruta, { cookie = '', ...opciones } = {}) {
  const headers = new Headers(opciones.headers)
  if (cookie) headers.set('cookie', cookie)
  if (opciones.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  return onRequest({
    request: new Request(`https://gestor.aletea.org/api/${ruta}`, { ...opciones, headers }),
    env: { BASE: estado.base, SESSION_SECRET: 'secreto-de-prueba' },
  })
}

describe('publicación de la página web', () => {
  let cookieDireccion
  let cookieCoordinacion
  let cookieIntegrante
  let cookieConsulta
  beforeAll(async () => {
    cookieDireccion = await cookieSesion('direccion@aletea.org')
    cookieCoordinacion = await cookieSesion('coordinacion@aletea.org')
    cookieIntegrante = await cookieSesion('integrante@aletea.org')
    cookieConsulta = await cookieSesion('consulta@aletea.org')
  })

  it('mantiene privada la versión inexistente y publica solo después de una aprobación', async () => {
    const estado = basePaginaWeb()
    const antes = await llamar(estado, 'pagina-web/publicada', { method: 'GET' })
    expect(antes.status).toBe(404)

    const guardado = await llamar(estado, 'cms/pagina-web/borrador', {
      method: 'PUT', cookie: cookieDireccion, headers: { 'if-match': '"0"' }, body: JSON.stringify(contenidoInicial),
    })
    expect(guardado.status).toBe(200)
    expect((await guardado.json()).revision).toBe(1)

    const publicado = await llamar(estado, 'cms/pagina-web/publicar', {
      method: 'POST', cookie: cookieDireccion, body: JSON.stringify({ revisionBorrador: 1 }),
    })
    expect(publicado.status).toBe(200)
    expect((await publicado.json()).publicado.editorial).toMatchObject({ estado: 'publicado', revision: 1 })
    expect(estado.documentos.has('pagina-web/historial/000001.json')).toBe(true)

    const visible = await llamar(estado, 'pagina-web/publicada', { method: 'GET' })
    expect(visible.status).toBe(200)
    expect(visible.headers.get('access-control-allow-origin')).toBe('*')
    expect((await visible.json()).seo.titulo).toBe(contenidoInicial.seo.titulo)
  })

  it('permite a Coordinación guardar borradores pero no publicarlos', async () => {
    const estado = basePaginaWeb()
    const guardado = await llamar(estado, 'cms/pagina-web/borrador', {
      method: 'PUT', cookie: cookieCoordinacion, headers: { 'if-match': '"0"' }, body: JSON.stringify(contenidoInicial),
    })
    expect(guardado.status).toBe(200)
    const publicado = await llamar(estado, 'cms/pagina-web/publicar', {
      method: 'POST', cookie: cookieCoordinacion, body: JSON.stringify({ revisionBorrador: 1 }),
    })
    expect(publicado.status).toBe(403)
    expect((await publicado.json()).error).toMatch(/Dirección o Administración/)
  })

  it('niega borradores, medios y métricas a Integrantes y Consulta', async () => {
    for (const cookie of [cookieIntegrante, cookieConsulta]) {
      const estado = basePaginaWeb()
      expect((await llamar(estado, 'cms/pagina-web', { method: 'GET', cookie })).status).toBe(403)
      expect((await llamar(estado, 'cms/pagina-web/medios', { method: 'GET', cookie })).status).toBe(403)
      expect((await llamar(estado, 'cms/pagina-web/metricas', { method: 'GET', cookie })).status).toBe(403)
    }
  })

  it('optimiza el flujo de medios: carga privada y lectura pública con caché', async () => {
    const estado = basePaginaWeb()
    const carga = await llamar(estado, 'cms/pagina-web/medios', {
      method: 'POST', cookie: cookieCoordinacion,
      headers: { 'content-type': 'image/webp', 'x-file-name': 'encuentro.webp', 'x-image-width': '1600', 'x-image-height': '900', 'x-alt-text': 'Encuentro de familias' },
      body: new Uint8Array([82, 73, 70, 70]),
    })
    expect(carga.status).toBe(201)
    const medio = (await carga.json()).medio
    expect(medio).toMatchObject({ nombre: 'encuentro.webp', ancho: 1600, alto: 900, bytes: 4 })
    expect(medio.url).toBe(`https://gestor.aletea.org/api/pagina-web/medios/${medio.id}`)
    const listado = await llamar(estado, 'cms/pagina-web/medios', { method: 'GET', cookie: cookieCoordinacion })
    expect((await listado.json()).medios[0].url).toBe(medio.url)
    const publica = await llamar(estado, new URL(medio.url).pathname.replace('/api/', ''), { method: 'GET' })
    expect(publica.status).toBe(200)
    expect(publica.headers.get('cache-control')).toContain('immutable')
    expect([...new Uint8Array(await publica.arrayBuffer())]).toEqual([82, 73, 70, 70])
  })

  it('lista formularios públicos activos con su finalidad y responsable institucional', async () => {
    const estado = basePaginaWeb()
    const respuesta = await llamar(estado, 'cms/pagina-web/formularios', { method: 'GET', cookie: cookieCoordinacion })
    expect(respuesta.status).toBe(200)
    const datos = await respuesta.json()
    expect(datos.formularios).toEqual([{
      id: 'familias-publico', titulo: 'Orientación para familias', descripcion: 'Contanos qué necesitás.', tipo: 'inscripcion',
      equipo: 'Familias', finalidad: 'Responder la consulta familiar.', responsableDatos: 'Equipo de Familias',
      conservacionMeses: 12, requiereConsentimiento: true,
      enlace: 'https://gestor.aletea.org/formulario.html?id=familias-publico',
    }])
    expect(JSON.stringify(datos)).not.toContain('correo')
  })

  it('resume únicamente métricas agregadas y descarta dimensiones inseguras', async () => {
    const resumen = resumenMetricasWebDesde(
      [
        { fecha: '2026-07-20', visitas: 60, paginas_vistas: 80, acciones: 10 },
        { fecha: '2026-08-20', visitas: 50, paginas_vistas: 90, acciones: 12 },
        { fecha: '2026-08-23', visitas: 70, paginas_vistas: 110, acciones: 18, actualizado_en: '2026-08-24 02:00:00' },
      ],
      [{ ruta: '/', vistas: 120 }, { ruta: '/familias/?correo=persona', vistas: 99 }],
      [{ accion: 'contacto:whatsapp', cantidad: 14 }, { accion: 'correo persona@example.com', cantidad: 99 }],
      30,
      '2026-08-24',
    )
    expect(resumen).toMatchObject({
      estado: 'con_datos', periodoDias: 30,
      resumen: { visitas: 120, paginasVistas: 200, acciones: 30 },
      variacion: { visitas: 100 },
      paginas: [{ ruta: '/', vistas: 120 }],
      acciones: [{ accion: 'contacto:whatsapp', cantidad: 14 }],
      privacidad: { agregadas: true, identificadoresPersonales: false, datosFormularios: false },
    })
  })

  it('entrega el resumen agregado del sitio sin activar el proveedor', async () => {
    const estado = basePaginaWeb()
    const respuesta = await llamar(estado, 'cms/pagina-web/metricas?dias=30', { method: 'GET', cookie: cookieCoordinacion })
    expect(respuesta.status).toBe(200)
    const datos = await respuesta.json()
    expect(datos.resumen).toEqual({ visitas: 120, paginasVistas: 200, acciones: 30 })
    expect(datos.paginas[0]).toEqual({ ruta: '/', vistas: 120 })
    expect(JSON.stringify(datos)).not.toMatch(/correo|usuario|direccion|ip/i)
  })
})
