import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaRegistro } from '../../js/ui/pantalla-registro.js'

const commits = [
  { sha: 'a', fecha: '2026-08-04T17:26:00Z', mensaje: 'Cambiar la planilla del 2026-08-08 · Claudia Cravea' },
  { sha: 'b', fecha: '2026-08-04T16:32:00Z', mensaje: 'Actualizar la lista del 2026-08-01' },
]
const clienteFalso = (lista = commits) => ({ listarCommits: async () => lista })
const esperar = () => new Promise((r) => setTimeout(r, 0))

let raiz
beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
})

describe('registro de actividad', () => {
  it('le muestra a administracion quien hizo cada cosa', async () => {
    crearPantallaRegistro(raiz, { sesion: { rol: 'admin' }, cliente: clienteFalso() })
    await esperar()
    const filas = [...raiz.querySelectorAll('.registro-entrada')]
    expect(filas).toHaveLength(2)
    expect(filas[0].textContent).toContain('Claudia Cravea')
    expect(filas[0].textContent).toContain('Cambiar la planilla del 2026-08-08')
  })

  it('marca aparte las entradas sin autor', async () => {
    crearPantallaRegistro(raiz, { sesion: { rol: 'admin' }, cliente: clienteFalso() })
    await esperar()
    const sinAutor = raiz.querySelector('.registro-entrada.sin-autor')
    expect(sinAutor).not.toBeNull()
    expect(sinAutor.textContent).toContain('sin registrar')
  })

  it('a quien coordina no le muestra nada, y ni siquiera lo pide', async () => {
    let pidio = false
    const cliente = { listarCommits: async () => { pidio = true; return commits } }
    crearPantallaRegistro(raiz, { sesion: { rol: 'coordinacion' }, cliente })
    await esperar()
    expect(raiz.querySelectorAll('.registro-entrada')).toHaveLength(0)
    expect(raiz.textContent).toContain('solo para administración')
    expect(pidio).toBe(false)
  })

  it('sin sesion tampoco', async () => {
    crearPantallaRegistro(raiz, { sesion: null, cliente: clienteFalso() })
    await esperar()
    expect(raiz.querySelectorAll('.registro-entrada')).toHaveLength(0)
  })

  it('avisa si no se pudo leer, en vez de quedarse en blanco', async () => {
    const cliente = { listarCommits: async () => { throw new Error('GitHub respondió 403.') } }
    crearPantallaRegistro(raiz, { sesion: { rol: 'admin' }, cliente })
    await esperar()
    expect(raiz.querySelector('.error-ingreso').textContent).toContain('403')
  })

  it('dice que no hay nada cuando el repositorio esta vacio', async () => {
    crearPantallaRegistro(raiz, { sesion: { rol: 'admin' }, cliente: clienteFalso([]) })
    await esperar()
    expect(raiz.textContent).toContain('Todavía no hay nada registrado')
  })
})


describe('cambios de acceso en el registro', () => {
  const accesos = [{
    sha: 'z', fecha: '2026-08-04T17:40:00Z',
    mensaje: 'Dar acceso a Monica Carreño como coordinacion · Claudia Cravea',
  }]

  it('los muestra y los marca aparte', async () => {
    crearPantallaRegistro(raiz, {
      sesion: { rol: 'admin' },
      cliente: clienteFalso(),
      clientePublico: { listarCommits: async () => accesos },
    })
    await esperar()
    const fila = raiz.querySelector('.registro-entrada.de-accesos')
    expect(fila).not.toBeNull()
    expect(fila.textContent).toContain('Dar acceso a Monica Carreño')
    expect(fila.textContent).toContain('Claudia Cravea')
  })

  it('a quien coordina tampoco le pide el historial de accesos', async () => {
    let pidio = false
    crearPantallaRegistro(raiz, {
      sesion: { rol: 'coordinacion' },
      cliente: clienteFalso(),
      clientePublico: { listarCommits: async () => { pidio = true; return accesos } },
    })
    await esperar()
    expect(pidio).toBe(false)
  })
})
