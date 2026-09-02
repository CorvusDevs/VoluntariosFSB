import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearPantallaAjustes } from '../../js/ui/pantalla-ajustes.js'
import { cifrar, descifrar, generarClaveAcceso, LARGO_MINIMO_CONTRASENA } from '../../js/acceso/cripto.js'
import { buscarUsuario } from '../../js/acceso/usuarios.js'

const TOKEN = 'ghp_tokenDelDuenio'
const CLAVE_ACCESO = generarClaveAcceso()
const SESION = { token: TOKEN, claveAcceso: CLAVE_ACCESO, nombre: 'Majo', usuario: 'majo', rol: 'admin' }

let raiz, archivo, pantalla, guardados, cerradas, tokensAvisados, lecturas

// Dos personas de verdad, con el token cifrado de verdad, para poder comprobar
// despues que las contraseñas nuevas realmente abren el token.
async function archivoDePrueba() {
  const deMajo = await cifrar(CLAVE_ACCESO, 'ContrasenaDeMajo0001')
  const deAna = await cifrar(CLAVE_ACCESO, 'ContrasenaDeAna00001')
  return {
    version: 2,
    credencial: await cifrar(TOKEN, CLAVE_ACCESO),
    usuarios: [
      { usuario: 'majo', nombre: 'Majo', rol: 'admin', ...deMajo },
      { usuario: 'ana', nombre: 'Ana', rol: 'coordinacion', ...deAna },
    ],
  }
}

function montar(opciones = {}) {
  guardados = []
  cerradas = 0
  tokensAvisados = []
  lecturas = 0
  pantalla = crearPantallaAjustes(raiz, {
    sesion: opciones.sesion ?? { ...SESION },
    leerArchivo: opciones.leerArchivo ?? (async () => { lecturas += 1; return structuredClone(archivo) }),
    guardarArchivo: opciones.guardarArchivo ?? (async (siguiente) => { guardados.push(siguiente) }),
    alCerrarSesion: () => { cerradas += 1 },
    alCambiarToken: (token) => { tokensAvisados.push(token) },
    confirmar: opciones.confirmar ?? (() => true),
  })
  return pantalla
}

const fila = (usuario) => raiz.querySelector(`.fila-acceso[data-usuario=${usuario}]`)
const campo = (nombre) => raiz.querySelector(`[data-campo=${nombre}]`)
const error = () => raiz.querySelector('.error-ajustes').textContent
const caja = () => raiz.querySelector('.contrasena-generada')

function cambiar(elemento, valor) {
  elemento.value = valor
  elemento.dispatchEvent(new Event('change', { bubbles: true }))
}

async function enviar(selector) {
  raiz.querySelector(selector).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
  await pantalla.listo()
}

async function agregar(usuario, nombre, rol) {
  campo('nuevo-usuario').value = usuario
  campo('nuevo-nombre').value = nombre
  if (rol) cambiar(campo('nuevo-rol'), rol)
  await enviar('.formulario-agregar')
}

async function clic(elemento) {
  elemento.click()
  await pantalla.listo()
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  archivo = await archivoDePrueba()
  montar()
  await pantalla.listo()
})

describe('quien no es administradora', () => {
  it('no encuentra ninguna accion en la pantalla', async () => {
    montar({ sesion: { ...SESION, rol: 'coordinacion' } })
    await pantalla.listo()
    const interactivos = raiz.querySelectorAll('button, input, select, textarea, a, form, details, summary')
    expect([...interactivos]).toEqual([])
  })

  it('ni siquiera se descarga la lista de personas', async () => {
    montar({ sesion: { ...SESION, rol: 'coordinacion' } })
    await pantalla.listo()
    expect(lecturas).toBe(0)
  })

  it('le explica en español por que no hay nada', async () => {
    montar({ sesion: { ...SESION, rol: 'coordinacion' } })
    await pantalla.listo()
    expect(raiz.textContent).toMatch(/administración/i)
  })
})

describe('lista de personas con acceso', () => {
  it('muestra nombre, usuario y rol de cada una', () => {
    expect(raiz.querySelectorAll('.fila-acceso')).toHaveLength(2)
    expect(fila('majo').textContent).toContain('Majo')
    expect(fila('majo').querySelector('.fila-usuario').textContent).toBe('majo')
    expect(fila('majo').querySelector('[data-campo=rol]').value).toBe('admin')
    expect(fila('ana').querySelector('[data-campo=rol]').value).toBe('coordinacion')
  })

  it('los roles se leen en español', () => {
    const opciones = [...fila('ana').querySelectorAll('[data-campo=rol] option')].map((o) => o.textContent)
    expect(opciones).toEqual(['Administradora', 'Coordinadora'])
  })

  it('cada fila tiene su boton de quitar', () => {
    expect(fila('ana').querySelector('[data-accion=quitar]').textContent).toBe('Quitar')
  })
})

describe('agregar una persona', () => {
  it('el rol por defecto es coordinación', () => {
    expect(campo('nuevo-rol').value).toBe('coordinacion')
  })

  it('no hay ningun campo para escribir la contraseña de otra persona', () => {
    const ocultos = [...raiz.querySelectorAll('input[type=password]')].map((e) => e.dataset.campo)
    expect(ocultos).toEqual(['token-nuevo'])
    expect(raiz.querySelector('[data-campo*=contrasena]')).toBeNull()
  })

  it('genera la contraseña, la muestra una vez y avisa que no vuelve', async () => {
    await agregar('sofi', 'Sofía')
    const generada = caja().querySelector('.contrasena-valor').textContent
    expect(generada.length).toBeGreaterThanOrEqual(LARGO_MINIMO_CONTRASENA)
    expect(caja().textContent).toMatch(/no se vuelve a mostrar/i)
    expect(caja().querySelector('[data-accion=copiar]').textContent).toBe('Copiar')
  })

  it('la contraseña mostrada abre de verdad el token', async () => {
    await agregar('sofi', 'Sofía')
    const generada = caja().querySelector('.contrasena-valor').textContent
    const guardado = guardados.at(-1)
    expect(await descifrar(buscarUsuario(guardado, 'sofi'), generada)).toBe(CLAVE_ACCESO)
  })

  it('la contraseña usa solo caracteres sin ambiguedad', async () => {
    await agregar('sofi', 'Sofía')
    const generada = caja().querySelector('.contrasena-valor').textContent
    expect(generada).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/)
  })

  it('avisa que la propagación puede tardar 5 minutos', async () => {
    await agregar('sofi', 'Sofía')
    expect(caja().textContent).toMatch(/5 minutos/)
  })

  it('la contraseña no sobrevive a la accion siguiente', async () => {
    await agregar('sofi', 'Sofía')
    expect(caja()).not.toBeNull()
    await clic(fila('ana').querySelector('[data-accion=quitar]'))
    expect(caja()).toBeNull()
  })

  it('se puede tapar a mano cuando ya se copió', async () => {
    await agregar('sofi', 'Sofía')
    await clic(caja().querySelector('[data-accion=ocultar-contrasena]'))
    expect(caja()).toBeNull()
  })

  it('la suma a la lista y la guarda como coordinadora', async () => {
    await agregar('sofi', 'Sofía')
    expect(buscarUsuario(guardados.at(-1), 'sofi').rol).toBe('coordinacion')
    expect(fila('sofi')).not.toBeNull()
  })

  it('un nombre con HTML no se interpreta', async () => {
    await agregar('sofi', '<b>Sofía</b>')
    expect(raiz.querySelector('b')).toBeNull()
    expect(fila('sofi').textContent).toContain('<b>Sofía</b>')
  })

  it('muestra tal cual el error de usuarios.js ante un usuario repetido', async () => {
    await agregar('ana', 'Otra Ana')
    expect(error()).toBe('El usuario ana ya existe.')
    expect(guardados).toHaveLength(0)
  })
})

describe('crear otra administradora', () => {
  it('el aviso aparece recien al elegir el rol', async () => {
    expect(raiz.querySelector('.aviso-admin').hidden).toBe(true)
    cambiar(campo('nuevo-rol'), 'admin')
    expect(raiz.querySelector('.aviso-admin').hidden).toBe(false)
    expect(raiz.querySelector('.aviso-admin').textContent)
      .toBe('Va a poder agregar y quitar personas, cambiar roles y rotar el token.')
  })

  it('se puede crear', async () => {
    await agregar('flor', 'Flor', 'admin')
    expect(buscarUsuario(guardados.at(-1), 'flor').rol).toBe('admin')
  })
})

describe('cambiar el rol', () => {
  it('asciende a una coordinadora y lo guarda', async () => {
    cambiar(fila('ana').querySelector('[data-campo=rol]'), 'admin')
    await pantalla.listo()
    expect(buscarUsuario(guardados.at(-1), 'ana').rol).toBe('admin')
    expect(fila('ana').querySelector('[data-campo=rol]').value).toBe('admin')
  })

  it('bajarle el rol a la ultima administradora muestra el error del modelo y no cambia nada', async () => {
    cambiar(fila('majo').querySelector('[data-campo=rol]'), 'coordinacion')
    await pantalla.listo()
    expect(error()).toBe('Tiene que quedar al menos una administradora.')
    expect(guardados).toHaveLength(0)
    expect(fila('majo').querySelector('[data-campo=rol]').value).toBe('admin')
  })
})

describe('quitar a una persona', () => {
  it('saca a una coordinadora de la lista', async () => {
    await clic(fila('ana').querySelector('[data-accion=quitar]'))
    expect(guardados.at(-1).usuarios.map((u) => u.usuario)).toEqual(['majo'])
    expect(fila('ana')).toBeNull()
  })

  it('quitar a la ultima administradora muestra el error del modelo y no cambia nada', async () => {
    await clic(fila('majo').querySelector('[data-accion=quitar]'))
    expect(error()).toBe('Tiene que quedar al menos una administradora.')
    expect(guardados).toHaveLength(0)
    expect(raiz.querySelectorAll('.fila-acceso')).toHaveLength(2)
  })

  it('respeta que se cancele la confirmación', async () => {
    montar({ confirmar: () => false })
    await pantalla.listo()
    await clic(fila('ana').querySelector('[data-accion=quitar]'))
    expect(guardados).toHaveLength(0)
    expect(fila('ana')).not.toBeNull()
  })
})

describe('rotar el token', () => {
  it('explica que conserva las contraseñas personales', () => {
    const aviso = raiz.querySelector('.aviso-rotar').textContent
    expect(aviso).toMatch(/sin cambiar las contraseñas personales/i)
  })

  it('viene plegado, para no quedar a un toque de las acciones de todos los dias', () => {
    const plegable = raiz.querySelector('.zona-peligro')
    expect(plegable).not.toBeNull()
    expect(plegable.tagName).toBe('DETAILS')
    expect(plegable.open).toBe(false)
    expect(plegable.querySelector('summary').textContent).toMatch(/rotar el token/i)
  })

  it('el formulario y el aviso viven adentro del plegable', () => {
    const plegable = raiz.querySelector('.zona-peligro')
    expect(plegable.querySelector('.formulario-rotar')).not.toBeNull()
    expect(plegable.querySelector('.aviso-rotar')).not.toBeNull()
    expect(raiz.querySelector('[data-campo="token-nuevo"]').closest('.zona-peligro'))
      .toBe(plegable)
  })

  it('cambia solo la credencial técnica y no genera contraseñas nuevas', async () => {
    const usuariosAntes = structuredClone(archivo.usuarios)
    campo('token-nuevo').value = 'ghp_tokenNuevo'
    await enviar('.formulario-rotar')

    const guardado = guardados.at(-1)
    expect(guardado.usuarios).toEqual(usuariosAntes)
    expect(await descifrar(guardado.credencial, CLAVE_ACCESO)).toBe('ghp_tokenNuevo')
    expect(raiz.querySelector('.contrasena-generada')).toBeNull()
  })

  it('conserva el rol de cada una', async () => {
    campo('token-nuevo').value = 'ghp_tokenNuevo'
    await enviar('.formulario-rotar')
    const guardado = guardados.at(-1)
    expect(buscarUsuario(guardado, 'majo').rol).toBe('admin')
    expect(buscarUsuario(guardado, 'ana').rol).toBe('coordinacion')
  })

  it('avisa el token nuevo hacia afuera para que el almacen deje de usar el viejo', async () => {
    campo('token-nuevo').value = 'ghp_tokenNuevo'
    await enviar('.formulario-rotar')
    expect(tokensAvisados).toEqual(['ghp_tokenNuevo'])
  })

  it('no hace nada con el campo vacio', async () => {
    campo('token-nuevo').value = '   '
    await enviar('.formulario-rotar')
    expect(guardados).toHaveLength(0)
    expect(tokensAvisados).toEqual([])
  })
})

describe('copiar', () => {
  it('manda la contraseña al portapapeles', async () => {
    const escribir = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true })
    await agregar('sofi', 'Sofía')
    const generada = caja().querySelector('.contrasena-valor').textContent
    caja().querySelector('[data-accion=copiar]').click()
    await Promise.resolve()
    expect(escribir).toHaveBeenCalledWith(generada)
  })
})

describe('cerrar sesión', () => {
  it('avisa hacia afuera', async () => {
    raiz.querySelector('[data-accion=cerrar-sesion]').click()
    expect(cerradas).toBe(1)
  })
})

describe('secretos', () => {
  it('el token de la sesión no queda escrito en la pantalla', () => {
    expect(raiz.innerHTML).not.toContain(TOKEN)
  })

  it('el token nuevo tampoco queda escrito tras rotar', async () => {
    campo('token-nuevo').value = 'ghp_tokenNuevo'
    await enviar('.formulario-rotar')
    expect(raiz.innerHTML).not.toContain('ghp_tokenNuevo')
  })
})
