import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaAccesosCloudflare } from '../../js/ui/pantalla-accesos-cloudflare.js'

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

describe('pantalla de accesos en Cloudflare', () => {
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
    crearPantallaAccesosCloudflare(raiz, { sesion: { correo: 'admin@aletea.org' } })
    await esperar(); await esperar()
    raiz.querySelector('input[placeholder="Nombre"]').value = 'Nueva coordinación'
    raiz.querySelector('input[placeholder="usuario"]').value = 'nueva'
    raiz.querySelector('.equipos-asignados-acceso input[value="e1"]').checked = true
    const entradaFoto = raiz.querySelector('input[aria-label="Foto de perfil opcional"]')
    Object.defineProperty(entradaFoto, 'files', { value: [new File(['foto'], 'perfil.jpg', { type: 'image/jpeg' })] })
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar(); await esperar()
    expect(crear).toHaveBeenCalledWith('/api/usuarios/foto?correo=nueva%40aletea.org', expect.objectContaining({ method: 'PUT' }))
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
    detalles[0].querySelector('[data-perfil^="acceso-vigencia-"]').value = '2026-12-31'
    ;[...detalles[0].querySelectorAll('button')].find((boton) => boton.textContent === 'Guardar acceso a datos').click()
    await esperar()
    const [, datosPersonales] = globalThis.fetch.mock.calls.find(([url, opciones]) => url === '/api/usuarios' && opciones?.method === 'PATCH')
    expect(JSON.parse(datosPersonales.body)).toMatchObject({ correo: 'coord@aletea.org', nivel_datos_personales: 'sensible', datos_personales_hasta: '2026-12-31' })
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
