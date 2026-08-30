import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { onRequest } from '../../functions/api/[[ruta]].js'

globalThis.crypto ??= webcrypto

const encoder = new TextEncoder()

async function hashContrasena(contrasena, sal) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(contrasena), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: 100000 }, material, 256))
}

function basePrueba({ nivel = 'sensible', permisos = null } = {}) {
  const usuarios = new Map()
  const documentos = new Map()
  const actividad = []
  const fotos = new Map()
  const intentosIngreso = new Map()
  let actualizacionesUltimoAcceso = 0
  const instantesUltimoAcceso = []
  const base = {
    async batch(consultas) { return Promise.all(consultas.map((consulta) => consulta.run())) },
    prepare(sql) {
      const consulta = sql.replace(/\s+/g, ' ').trim()
      return {
        bind(...valores) {
          return {
            async first() {
              if (consulta.includes('FROM usuarios WHERE correo = ?1')) return usuarios.get(valores[0]) ?? null
              if (consulta.includes('FROM documentos WHERE ruta = ?1')) return documentos.get(valores[0]) ?? null
              if (consulta.includes('FROM fotos WHERE clave = ?1')) return fotos.get(valores[0]) ?? null
              if (consulta.startsWith('SELECT bloqueado_hasta FROM intentos_ingreso_cms')) return intentosIngreso.get(valores[0]) ?? null
              if (consulta.startsWith('SELECT intentos, ventana_inicio FROM intentos_ingreso_cms')) return intentosIngreso.get(valores[0]) ?? null
              throw new Error(`Consulta no simulada: ${consulta}`)
            },
            async run() {
              if (consulta.startsWith('UPDATE usuarios SET ultimo_acceso')) { actualizacionesUltimoAcceso += 1; instantesUltimoAcceso.push(valores[1]); return { success: true } }
              if (consulta.startsWith('UPDATE usuarios SET rol =')) {
                const usuario = usuarios.get(valores[6])
                usuarios.set(valores[6], {
                  ...usuario,
                  rol: valores[0], perfil_acceso: valores[1], permisos: valores[2], nivel_datos_personales: valores[3],
                  datos_personales_hasta: valores[4], datos_personales_sin_vencimiento: valores[5], version_sesion: Number(usuario.version_sesion || 0) + 1,
                })
                return { success: true }
              }
              if (consulta.startsWith('INSERT INTO intentos_ingreso_cms')) {
                intentosIngreso.set(valores[0], { tipo: valores[1], intentos: valores[2], ventana_inicio: intentosIngreso.get(valores[0])?.ventana_inicio || new Date().toISOString().replace('T', ' ').slice(0, 19), bloqueado_hasta: valores[3] })
                return { success: true }
              }
              if (consulta.startsWith('DELETE FROM intentos_ingreso_cms')) { intentosIngreso.delete(valores[0]); return { success: true } }
              if (consulta.startsWith('INSERT INTO actividad')) {
                actividad.push({ correo: valores[0], accion: valores[1], recurso: valores[2], detalle: valores[3] })
                return { success: true }
              }
              if (consulta.startsWith('UPDATE documentos SET contenido')) {
                documentos.set(valores[3], { contenido: valores[0], revision: valores[1], actualizado_por: valores[2] })
                return { success: true }
              }
              throw new Error(`Escritura no simulada: ${consulta}`)
            },
          }
        },
      }
    },
  }
  return { usuarios, documentos, actividad, fotos, base, nivel, permisos, actualizacionesUltimoAcceso: () => actualizacionesUltimoAcceso, instantesUltimoAcceso }
}

async function prepararSesion(estado) {
  const sal = Uint8Array.from({ length: 16 }, (_, indice) => indice + 1)
  estado.usuarios.set('coordinacion@aletea.uy', {
    correo: 'coordinacion@aletea.uy', nombre: 'Coordinación', rol: 'admin', perfil_acceso: 'administracion', permisos: estado.permisos,
    nivel_datos_personales: estado.nivel, datos_personales_hasta: '2099-12-31', sal, hash_contrasena: await hashContrasena('secreta-segura', sal), version_sesion: 0,
  })
  estado.documentos.set('roster.json', {
    revision: 4,
    contenido: JSON.stringify({
      participantes: [{ id: 'p1', nombre: 'Ana', foto: 'p1.jpg', contactoEmergencia: 'María 099 000 000', privacidad: { perfilInterno: true, fotoInterna: true, contacto: true, datosSensibles: true, autorizadoPor: 'Madre', documentadoEl: '2026-08-01' }, perfil: { desde: '2024-01-01', leGusta: 'Fútbol', necesidades: 'Pausa tranquila', anioNacimiento: '2018-08-20' } }],
      voluntarios: [],
    }),
  })
  const ingreso = await llamada(estado, 'ingresar', { method: 'POST', body: JSON.stringify({ usuario: 'coordinacion@aletea.uy', contrasena: 'secreta-segura' }) })
  expect(ingreso.status).toBe(200)
  return ingreso.headers.get('set-cookie').split(';')[0]
}

function llamada(estado, ruta, opciones = {}, cookie = '') {
  const headers = new Headers(opciones.headers)
  if (cookie) headers.set('cookie', cookie)
  if (opciones.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  return onRequest({
    request: new Request(`https://prueba.local/api/${ruta}`, { ...opciones, headers }),
    env: { BASE: estado.base, SESSION_SECRET: 'secreto-de-prueba' },
  })
}

describe('API de fichas protegidas con D1 simulado', () => {
  it('expone un control de salud público, mínimo y sin cache', async () => {
    const respuesta = await llamada(basePrueba(), 'health', { method: 'GET' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('cache-control')).toBe('no-store')
    expect(await respuesta.json()).toEqual({ ok: true, servicio: 'gestor-aletea' })
  })

  it('renueva la sesión actual al cambiar un permiso propio', async () => {
    const estado = basePrueba({ nivel: 'ninguno' })
    const cookieAnterior = await prepararSesion(estado)
    const respuesta = await llamada(estado, 'usuarios', {
      method: 'PATCH',
      body: JSON.stringify({
        correo: 'coordinacion@aletea.uy', perfil_acceso: 'administracion', nivel_datos_personales: 'sensible',
        vigencia_datos_personales: 'indefinida', datos_personales_hasta: '',
      }),
    }, cookieAnterior)

    expect(respuesta.status).toBe(200)
    const cookieNueva = respuesta.headers.get('set-cookie')?.split(';')[0]
    expect(cookieNueva).toBeTruthy()
    expect(cookieNueva).not.toBe(cookieAnterior)
    expect((await llamada(estado, 'sesion', { method: 'GET' }, cookieAnterior)).status).toBe(401)
    expect((await llamada(estado, 'sesion', { method: 'GET' }, cookieNueva)).status).toBe(200)
  })

  it('actualiza el último acceso al recuperar una sesión todavía válida', async () => {
    const estado = basePrueba()
    const cookie = await prepararSesion(estado)
    expect(estado.actualizacionesUltimoAcceso()).toBe(1)

    const respuesta = await llamada(estado, 'sesion', { method: 'GET' }, cookie)

    expect(respuesta.status).toBe(200)
    expect(estado.actualizacionesUltimoAcceso()).toBe(2)
    expect(estado.instantesUltimoAcceso).toHaveLength(2)
    estado.instantesUltimoAcceso.forEach((instante) => expect(instante).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/))
  })

  it('bloquea temporalmente una cuenta después de cinco intentos fallidos', async () => {
    const estado = basePrueba()
    await prepararSesion(estado)
    for (let intento = 0; intento < 5; intento += 1) {
      const respuesta = await llamada(estado, 'ingresar', { method: 'POST', body: JSON.stringify({ usuario: 'coordinacion@aletea.uy', contrasena: 'incorrecta' }) })
      expect(respuesta.status).toBe(401)
    }
    const bloqueada = await llamada(estado, 'ingresar', { method: 'POST', body: JSON.stringify({ usuario: 'coordinacion@aletea.uy', contrasena: 'incorrecta' }) })
    expect(bloqueada.status).toBe(429)
    expect(Number(bloqueada.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await bloqueada.json()).error).toContain('Demasiados intentos')
  })
  it('explica cuando falta la base institucional en vez de fallar internamente', async () => {
    const respuesta = await onRequest({
      request: new Request('https://prueba.local/api/ingresar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuario: 'coordinacion@aletea.uy', contrasena: 'secreta-segura' }),
      }),
      env: { SESSION_SECRET: 'secreto-de-prueba' },
    })

    expect(respuesta.status).toBe(503)
    expect((await respuesta.json()).error).toMatch(/configurándose/i)
  })

  it('rechaza una fecha inexistente sin modificar la ficha ni registrar una escritura', async () => {
    const estado = basePrueba()
    const cookie = await prepararSesion(estado)
    const antes = estado.documentos.get('roster.json').contenido
    const respuesta = await llamada(estado, 'personas/p1/protegida', {
      method: 'PATCH',
      body: JSON.stringify({ privacidad: { perfilInterno: true, datosSensibles: true }, autorizadoPor: 'Madre', documentadoEl: '2026-02-30', anioNacimiento: '2018-02-30', necesidades: 'Pausa tranquila' }),
    }, cookie)

    expect(respuesta.status).toBe(400)
    expect((await respuesta.json()).error).toMatch(/autorizó/i)
    expect(estado.documentos.get('roster.json').contenido).toBe(antes)
    expect(estado.actividad.map((fila) => fila.accion)).not.toContain('guardar ficha protegida')
  })

  it('separa roster operativo, ficha sensible y la trazabilidad de acceso', async () => {
    const estado = basePrueba()
    const cookie = await prepararSesion(estado)

    const roster = await llamada(estado, 'documento?ruta=roster.json', { method: 'GET' }, cookie)
    const personaOperativa = (await roster.json()).participantes[0]
    expect(personaOperativa).toMatchObject({ nombre: 'Ana', foto: 'p1.jpg', perfil: { leGusta: 'Fútbol' } })
    expect(personaOperativa.perfil).not.toHaveProperty('anioNacimiento')
    expect(personaOperativa).not.toHaveProperty('contactoEmergencia')

    const abrir = await llamada(estado, 'personas/p1/protegida', { method: 'GET' }, cookie)
    expect(abrir.status).toBe(200)
    expect(await abrir.json()).toMatchObject({ contactoEmergencia: 'María 099 000 000', anioNacimiento: '2018-08-20', necesidades: 'Pausa tranquila' })
    expect(estado.actividad).toContainEqual(expect.objectContaining({ accion: 'abrir ficha protegida', recurso: 'personas/p1' }))

    const guardar = await llamada(estado, 'personas/p1/protegida', {
      method: 'PATCH',
      body: JSON.stringify({ privacidad: { perfilInterno: true, fotoInterna: true, contacto: true, datosSensibles: true }, autorizadoPor: 'Madre', documentadoEl: '2026-08-17', contactoEmergencia: 'María 099 111 222', anioNacimiento: '2018-08-20', necesidades: 'Pausa tranquila' }),
    }, cookie)
    expect(guardar.status).toBe(200)
    expect((await guardar.json()).guardada).toBe(true)
    const persistida = JSON.parse(estado.documentos.get('roster.json').contenido).participantes[0]
    expect(persistida.contactoEmergencia).toBe('María 099 111 222')
    expect(estado.actividad).toContainEqual(expect.objectContaining({ accion: 'guardar ficha protegida', recurso: 'personas/p1' }))
  })

  it('deniega la ficha sensible y las fotos a un acceso sin nivel personal vigente', async () => {
    const estado = basePrueba({ nivel: 'ninguno' })
    const cookie = await prepararSesion(estado)

    const ficha = await llamada(estado, 'personas/p1/protegida', { method: 'GET' }, cookie)
    expect(ficha.status).toBe(403)
    const foto = await llamada(estado, 'foto?clave=p1.jpg', { method: 'GET' }, cookie)
    expect(foto.status).toBe(403)
  })

  it('deniega solicitudes de privacidad a Administración sin nivel sensible', async () => {
    const estado = basePrueba({ nivel: 'operativo', permisos: JSON.stringify(['cms']) })
    const cookie = await prepararSesion(estado)

    const respuesta = await llamada(estado, 'cms/solicitudes-privacidad', { method: 'GET' }, cookie)

    expect(respuesta.status).toBe(403)
    expect((await respuesta.json()).error).toContain('acceso sensible vigente')
  })
})
