import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaAccesosCloudflare, prepararFotoPerfil, resumenPermisosDe, usuarioVisible } from '../../js/ui/pantalla-accesos-cloudflare.js'

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

describe('pantalla de accesos en Cloudflare', () => {
  it('resume perfil, equipos y permisos especiales sin inventar capacidades', () => {
    const resumen = resumenPermisosDe(
      { nombre: 'Coordinación', perfil_acceso: 'coordinacion', nivel_datos_personales: 'ninguno' },
      [{ equipo_id: 'e1', equipo_nombre: 'Familias' }],
      [{ id: 'e1', nombre: 'Familias' }],
    )
    expect(resumen.origen).toEqual(expect.arrayContaining([
      'Incluido por perfil: Coordinación', 'Limitado a: Familias', 'Datos personales: Sin acceso a datos personales · Sin acceso',
    ]))
    expect(resumen.tarjetas.find((permiso) => permiso.tipo === 'publicar')).toMatchObject({ activo: false, texto: 'No puede publicar' })
    expect(resumen.modulos).toEqual(expect.arrayContaining([
      ['Página web', 'Edita, no publica', 'Contenido y borradores'],
      ['Comunicación visual', 'Edita', 'Sin cartas membretadas'],
      ['Administración de accesos', 'Sin acceso', ''],
    ]))
  })

  it('muestra las mayúsculas del nombre sin volver sensible el ingreso', () => {
    expect(usuarioVisible({ nombre: 'Claudia Cravea', correo: 'claudiacravea' })).toBe('ClaudiaCravea')
    expect(usuarioVisible({ nombre: 'Claudia Cravea', correo: 'claudia.coord' })).toBe('claudia.coord')
  })

  it('rechaza originales mayores a 20 MB antes de intentar procesarlos', async () => {
    const optimizarImagen = vi.fn()
    await expect(prepararFotoPerfil({ size: 20 * 1024 * 1024 + 1, type: 'image/jpeg' }, optimizarImagen))
      .rejects.toThrow('supera 20 MB')
    expect(optimizarImagen).not.toHaveBeenCalled()
  })

  it('mantiene el límite privado de 500 KB después de optimizar', async () => {
    const archivo = { size: 4 * 1024 * 1024, type: 'image/jpeg', name: 'perfil.jpg' }
    const optimizarImagen = vi.fn(async () => ({
      blob: new Blob([new Uint8Array(500 * 1024 + 1)], { type: 'image/webp' }),
      tipo: 'image/webp',
    }))
    await expect(prepararFotoPerfil(archivo, optimizarImagen))
      .rejects.toThrow('No se pudo preparar la foto')
  })

  beforeEach(() => {
    document.body.innerHTML = '<div id="raiz"></div>'
    globalThis.fetch = vi.fn(async (url, opciones = {}) => {
      if (url === '/api/usuarios' && !opciones.method) return new Response(JSON.stringify({ usuarios: [
        { correo: 'admin@aletea.org', nombre: 'Administración', rol: 'admin', perfil_acceso: 'administracion' },
        { correo: 'coord@aletea.org', nombre: 'Coordinación', rol: 'usuario', perfil_acceso: 'coordinacion', nivel_datos_personales: 'ninguno', ultimo_acceso: '2026-08-18 17:48:00' },
      ] }))
      if (url === '/api/cms/equipos') return new Response(JSON.stringify({ equipos: [{ id: 'e1', nombre: 'Familias' }, { id: 'e2', nombre: 'Deportes' }] }))
      if (url === '/api/cms/responsabilidades' && !opciones.method) return new Response(JSON.stringify({ responsabilidades: [{ id: 'r1', equipo_id: 'e1', equipo_nombre: 'Familias', usuario_correo: 'coord@aletea.org', tipo: 'coordinacion' }] }))
      if (url === '/api/cms/responsabilidades' && opciones.method === 'POST') return new Response(JSON.stringify({ responsabilidad: { id: 'nueva' } }), { status: 201 })
      if (url === '/api/cms/responsabilidades/r1' && opciones.method === 'DELETE') return new Response(JSON.stringify({ quitada: true }))
      if (url === '/api/auditoria?limite=80') return new Response(JSON.stringify({ actividad: [{ id: 1, actor_nombre: 'Administración', accion: 'crear formulario CMS', recurso: 'formularios/f1', detalle: 'Inscripción', cuando: '2026-08-17 12:00:00' }] }))
      return new Response(JSON.stringify({ guardado: true }))
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('muestra un resumen operativo y permite elegir una foto al crear un acceso', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    expect(raiz.textContent).toContain('cuentas activas')
    expect(raiz.querySelector('input[type="file"][accept*="image/jpeg"]')).not.toBeNull()
    expect(raiz.textContent).toContain('Elegir foto')
    expect(raiz.textContent).toContain('Ningún archivo seleccionado')
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/auditoria?limite=80')).toBe(false)
    expect(raiz.textContent).toContain('no distingue mayúsculas')
    expect(raiz.textContent).toContain('Puede publicar')
    expect(raiz.textContent).toContain('Limitado a: Familias')
  })

  it('abre la cuenta y el control pedidos sin conceder el acceso automáticamente', async () => {
    const raiz = document.getElementById('raiz')
    const alCompletarSolicitud = vi.fn()
    crearPantallaAccesosCloudflare(raiz, {
      sesion: { correo: 'admin@aletea.org' },
      solicitudInicial: {
        seccion: 'Una sección futura', regreso: 'cms-futura',
        requisito: {
          id: 'datos-personales:sensible', titulo: 'Datos personales completos',
          resolver: { tipo: 'datos_personales', nivel: 'sensible', usuario: 'yo' },
        },
      },
      alCompletarSolicitud,
    })
    await esperar(); await esperar()

    expect(raiz.querySelectorAll('.persona-fila')).toHaveLength(1)
    const detalle = raiz.querySelector('[data-resolucion-activa="datos-personales:sensible"]')
    expect(detalle.open).toBe(true)
    expect(detalle.querySelector('select').value).toBe('sensible')
    expect(globalThis.fetch.mock.calls.some(([, opciones]) => opciones?.method === 'PATCH')).toBe(false)

    detalle.querySelector('input[value="indefinida"]').click()
    detalle.querySelector('[data-accion-resolucion-acceso="datos_personales"]').click()
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url, peticion]) => url === '/api/usuarios' && peticion?.method === 'PATCH')
    expect(JSON.parse(opciones.body)).toMatchObject({
      correo: 'admin@aletea.org', nivel_datos_personales: 'sensible', vigencia_datos_personales: 'indefinida',
    })
    expect(alCompletarSolicitud).toHaveBeenCalledWith('cms-futura')
  })

  it('abre una vista explicativa de permisos sin iniciar otra sesión ni guardar cambios', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((item) => item.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const abrir = [...fila.querySelectorAll('button')].find((control) => control.textContent === 'Ver el gestor como Coordinación')
    abrir.click()
    const dialogo = raiz.querySelector('.vista-permisos-superposicion[role="dialog"]')
    expect(dialogo).not.toBeNull()
    expect(dialogo.textContent).toContain('No inicia sesión como la persona ni modifica su acceso.')
    expect(dialogo.textContent).toContain('Página web')
    expect(dialogo.textContent).toContain('Edita, no publica')
    expect(globalThis.fetch.mock.calls.some(([, opciones]) => opciones?.method === 'PATCH')).toBe(false)
    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(raiz.querySelector('.vista-permisos-superposicion[role="dialog"]')).toBeNull()
  })

  it('presenta los equipos como opciones separadas y actualiza la cantidad elegida', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const selector = raiz.querySelector('.equipos-asignados-acceso')
    const opciones = [...selector.querySelectorAll('.equipos-asignados-opciones label')]
    expect(opciones).toHaveLength(2)
    expect(opciones.map((opcion) => opcion.textContent)).toEqual(['Familias', 'Deportes'])
    expect(selector.querySelector('.equipos-asignados-cantidad').textContent).toBe('0 equipos seleccionados')
    opciones[0].querySelector('input').click()
    expect(selector.querySelector('.equipos-asignados-cantidad').textContent).toBe('1 equipo seleccionado')
  })

  it('muestra en español el nombre de la foto elegida', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const entrada = raiz.querySelector('input[aria-label="Foto de perfil opcional"]')
    Object.defineProperty(entrada, 'files', { value: [new File(['foto'], 'claudia.jpg', { type: 'image/jpeg' })] })
    entrada.dispatchEvent(new Event('change'))
    expect(entrada.closest('.selector-archivo').textContent).toContain('claudia.jpg')
    expect(entrada.closest('.selector-archivo').textContent).not.toContain('Ningún archivo seleccionado')
  })

  it('muestra la hora de Uruguay sin permitir cortes dentro de p. m.', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const metadatos = [...raiz.querySelectorAll('.ayuda-ajustes')]
      .find((elemento) => elemento.textContent.includes('Último acceso:'))
    expect(metadatos.textContent).toContain('2:48\u00a0p.\u00a0m.')
  })

  it('exige un equipo para crear una cuenta de coordinación', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    raiz.querySelector('input[placeholder="Nombre"]').value = 'Nueva coordinación'
    raiz.querySelector('input[placeholder="usuario"]').value = 'nueva'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(raiz.textContent).toContain('Elegí al menos un equipo para este perfil.')
    expect(globalThis.fetch.mock.calls.some(([url, opciones]) => url === '/api/usuarios' && opciones?.method === 'POST')).toBe(false)
  })

  it('crea cuentas con equipo asignado y muestra la contraseña inicial una sola vez', async () => {
    const crear = vi.fn(async (url, opciones) => {
      if (url === '/api/usuarios' && opciones?.method === 'POST') return new Response(JSON.stringify({ nombre: 'Nueva coordinación', contrasena: 'temporal-segura' }), { status: 201 })
      if (url === '/api/usuarios') return new Response(JSON.stringify({ usuarios: [] }))
      if (url === '/api/cms/equipos') return new Response(JSON.stringify({ equipos: [{ id: 'e1', nombre: 'Familias' }] }))
      if (url === '/api/cms/responsabilidades') return new Response(JSON.stringify({ responsabilidades: [] }))
      if (url === '/api/auditoria?limite=80') return new Response(JSON.stringify({ actividad: [] }))
      return new Response(JSON.stringify({}), { status: 200 })
    })
    globalThis.fetch = crear
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    raiz.querySelector('input[placeholder="Nombre"]').value = 'Nueva coordinación'
    raiz.querySelector('input[placeholder="usuario"]').value = 'nueva'
    raiz.querySelector('.equipos-asignados-acceso input[value="e1"]').checked = true
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar(); await esperar()
    const [, opciones] = crear.mock.calls.find(([url, opciones]) => url === '/api/usuarios' && opciones?.method === 'POST')
    expect(JSON.parse(opciones.body)).toMatchObject({ nombre: 'Nueva coordinación', usuario: 'nueva', perfil_acceso: 'coordinacion', equipos: ['e1'] })
    expect(raiz.textContent).toContain('Contraseña inicial de Nueva coordinación: temporal-segura')
  })

  it('guarda una foto de perfil opcional después de crear la cuenta', async () => {
    const optimizarImagen = vi.fn(async () => ({
      blob: new Blob(['webp'], { type: 'image/webp' }), ancho: 1200, alto: 800, tipo: 'image/webp', nombre: 'perfil.webp',
    }))
    const crear = vi.fn(async (url, opciones) => {
      if (url === '/api/usuarios' && opciones?.method === 'POST') return new Response(JSON.stringify({ correo: 'nueva@aletea.org', nombre: 'Nueva coordinación', contrasena: 'temporal-segura' }), { status: 201 })
      if (url === '/api/usuarios/foto?correo=nueva%40aletea.org' && opciones?.method === 'PUT') return new Response(JSON.stringify({ guardada: true }))
      if (url === '/api/usuarios') return new Response(JSON.stringify({ usuarios: [] }))
      if (url === '/api/cms/equipos') return new Response(JSON.stringify({ equipos: [{ id: 'e1', nombre: 'Familias' }] }))
      if (url === '/api/cms/responsabilidades') return new Response(JSON.stringify({ responsabilidades: [] }))
      return new Response(JSON.stringify({}), { status: 200 })
    })
    globalThis.fetch = crear
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' }, optimizarImagen })
    await esperar(); await esperar()
    raiz.querySelector('input[placeholder="Nombre"]').value = 'Nueva coordinación'
    raiz.querySelector('input[placeholder="usuario"]').value = 'nueva'
    raiz.querySelector('.equipos-asignados-acceso input[value="e1"]').checked = true
    const entradaFoto = raiz.querySelector('input[aria-label="Foto de perfil opcional"]')
    const fotoGrande = new File([new Uint8Array(2 * 1024 * 1024)], 'perfil.jpg', { type: 'image/jpeg' })
    Object.defineProperty(entradaFoto, 'files', { value: [fotoGrande] })
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar(); await esperar()
    expect(optimizarImagen).toHaveBeenCalledWith(fotoGrande, {}, expect.objectContaining({ ladoMaximo: 1200, pesoObjetivo: 450_000 }))
    expect(crear).toHaveBeenCalledWith('/api/usuarios/foto?correo=nueva%40aletea.org', expect.objectContaining({
      method: 'PUT', headers: { 'content-type': 'image/webp' }, body: expect.any(Blob),
    }))
    expect(raiz.textContent).toContain('hasta 20 MB')
  })

  it('guarda permisos personales con vencimiento y permite cambiar equipos sin tocar la cuenta actual', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const detalles = fila.querySelectorAll('details')
    detalles[0].open = true
    const nivel = detalles[0].querySelector('select')
    nivel.value = 'sensible'; nivel.dispatchEvent(new Event('change'))
    detalles[0].querySelector('input[type="radio"][value="temporal"]').click()
    detalles[0].querySelector('[data-perfil^="acceso-vigencia-"]').value = '2026-12-31'
    ;[...detalles[0].querySelectorAll('button')].find((boton) => boton.textContent === 'Guardar acceso a datos').click()
    await esperar()
    const [, datosPersonales] = globalThis.fetch.mock.calls.find(([url, opciones]) => url === '/api/usuarios' && opciones?.method === 'PATCH')
    expect(JSON.parse(datosPersonales.body)).toMatchObject({ correo: 'coord@aletea.org', nivel_datos_personales: 'sensible', vigencia_datos_personales: 'temporal', datos_personales_hasta: '2026-12-31' })
  })

  it('explica qué habilita cada nivel y cuáles son sus requisitos adicionales', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const datos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent === 'Datos personales')
    datos.open = true
    const nivel = datos.querySelector('select')
    const impacto = datos.querySelector('.acceso-datos-impacto')
    expect(impacto.textContent).toContain('No puede abrir respuestas de formularios')

    nivel.value = 'operativo'; nivel.dispatchEvent(new Event('change'))
    expect(impacto.textContent).toContain('Puede abrir respuestas, entradas')
    expect(impacto.textContent).toContain('Puede ver fotos autorizadas, pero no cambiarlas')

    nivel.value = 'sensible'; nivel.dispatchEvent(new Event('change'))
    expect(impacto.textContent).toContain('Falta completar')
    expect(impacto.textContent).toContain('pertenecer al equipo de Finanzas')
    expect(impacto.textContent).toContain('necesita el perfil Administración')
    expect([...datos.querySelectorAll('option')].map((opcion) => opcion.textContent)).toEqual([
      'Sin acceso a datos personales', 'Datos personales básicos', 'Datos personales completos',
    ])
  })

  it('abre la configuración necesaria desde cada requisito pendiente', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const datos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent === 'Datos personales')
    const nivel = datos.querySelector('select')
    nivel.value = 'sensible'; nivel.dispatchEvent(new Event('change'))

    ;[...datos.querySelectorAll('button')].find((control) => control.textContent === 'Elegir Administración').click()
    const perfil = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent === 'Perfil de acceso')
    expect(perfil.open).toBe(true)
    expect(perfil.querySelector('select').value).toBe('administracion')
    expect(datos.textContent).toContain('Pulsá Guardar perfil para completar el requisito')
  })

  it('muestra Finanzas cumplido o permite preparar su asignación sin salir de Accesos', async () => {
    globalThis.fetch = vi.fn(async (url, opciones = {}) => {
      if (url === '/api/usuarios') return new Response(JSON.stringify({ usuarios: [
        { correo: 'admin@aletea.org', nombre: 'Administración', rol: 'admin', perfil_acceso: 'administracion' },
        { correo: 'coord@aletea.org', nombre: 'Coordinación', rol: 'usuario', perfil_acceso: 'coordinacion', nivel_datos_personales: 'sensible' },
      ] }))
      if (url === '/api/cms/equipos') return new Response(JSON.stringify({ equipos: [{ id: 'ef', clave: 'finanzas', nombre: 'Finanzas' }] }))
      if (url === '/api/cms/responsabilidades') return new Response(JSON.stringify({ responsabilidades: [] }))
      return new Response(JSON.stringify({ guardado: true }))
    })
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const datos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent === 'Datos personales')
    const asignar = [...datos.querySelectorAll('button')].find((control) => control.textContent === 'Asignar a Finanzas')
    asignar.click()
    const equipos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent.startsWith('Equipos asignados'))
    expect(equipos.open).toBe(true)
    expect(equipos.querySelector('input[value="ef"]').checked).toBe(true)
    expect(datos.textContent).toContain('pulsá Guardar equipos para completar el requisito')
  })

  it('identifica los requisitos ya cumplidos y explica de dónde sale el acceso', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Administración')
    const datos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent === 'Datos personales')
    const nivel = datos.querySelector('select')
    nivel.value = 'sensible'; nivel.dispatchEvent(new Event('change'))
    const cumplidos = datos.querySelectorAll('.acceso-datos-impacto-item.es-cumplido')
    expect(cumplidos).toHaveLength(2)
    expect(datos.textContent).toContain('Cumplido por el perfil Administración')
    expect(datos.querySelector('.acceso-requisito-accion')).toBeNull()
  })

  it('permite conceder acceso personal sin vencimiento de forma explícita', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const datos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent === 'Datos personales')
    const nivel = datos.querySelector('select')
    nivel.value = 'sensible'; nivel.dispatchEvent(new Event('change'))
    datos.querySelector('input[type="radio"][value="indefinida"]').click()
    expect(datos.textContent).toContain('Administración podrá revocarlo en cualquier momento')
    expect(datos.querySelector('[data-perfil^="acceso-vigencia-"]').disabled).toBe(true)
    ;[...datos.querySelectorAll('button')].find((control) => control.textContent === 'Guardar acceso a datos').click()
    await esperar()
    const solicitudes = globalThis.fetch.mock.calls.filter(([url, opciones]) => url === '/api/usuarios' && opciones?.method === 'PATCH')
    const cuerpo = JSON.parse(solicitudes.at(-1)[1].body)
    expect(cuerpo).toMatchObject({ correo: 'coord@aletea.org', nivel_datos_personales: 'sensible', vigencia_datos_personales: 'indefinida', datos_personales_hasta: '' })
  })

  it('sincroniza los equipos y las funciones de una cuenta existente', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const equipos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent.startsWith('Equipos asignados'))
    equipos.open = true
    const familia = equipos.querySelector('.editor-equipo-usuario input[value="e1"]')
    const deportes = equipos.querySelector('.editor-equipo-usuario input[value="e2"]')
    familia.closest('.editor-equipo-usuario').querySelector('select').value = 'referente'
    deportes.checked = true
    deportes.dispatchEvent(new Event('change'))
    ;[...equipos.querySelectorAll('button')].find((boton) => boton.textContent === 'Guardar equipos').click()
    await esperar(); await esperar()

    const altas = globalThis.fetch.mock.calls
      .filter(([url, opciones]) => url === '/api/cms/responsabilidades' && opciones?.method === 'POST')
      .map(([, opciones]) => JSON.parse(opciones.body))
    expect(altas).toEqual(expect.arrayContaining([
      expect.objectContaining({ equipo_id: 'e1', usuario_correo: 'coord@aletea.org', tipo: 'referente' }),
      expect.objectContaining({ equipo_id: 'e2', usuario_correo: 'coord@aletea.org', tipo: 'coordinacion' }),
    ]))
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/responsabilidades/r1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('no permite dejar una cuenta de coordinación sin equipos', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    const fila = [...raiz.querySelectorAll('.persona-fila')].find((elemento) => elemento.querySelector('.acceso-identidad-texto strong')?.textContent === 'Coordinación')
    const equipos = [...fila.querySelectorAll('details')].find((detalle) => detalle.querySelector('summary')?.textContent.startsWith('Equipos asignados'))
    equipos.querySelector('input[value="e1"]').checked = false
    ;[...equipos.querySelectorAll('button')].find((boton) => boton.textContent === 'Guardar equipos').click()

    expect(raiz.textContent).toContain('Coordinación e Integrante necesitan al menos un equipo asignado.')
    expect(globalThis.fetch.mock.calls.some(([url, opciones]) => url.includes('/api/cms/responsabilidades/') && opciones?.method === 'DELETE')).toBe(false)
  })
})
