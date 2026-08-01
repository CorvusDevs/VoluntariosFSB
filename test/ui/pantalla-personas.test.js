import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaPersonas } from '../../js/ui/pantalla-personas.js'
import { ROSTER } from '../ayudas/datos.js'

// Almacen de mentira: nada de IndexedDB en una prueba de interfaz.
function almacenFalso() {
  let roster = null
  const listas = new Map()
  const fotos = new Map()
  return {
    async leerRoster() { return roster },
    async guardarRoster(siguiente) { roster = siguiente; return { sha: null } },
    async leerLista(fecha) { return listas.get(fecha) ?? null },
    async guardarLista(lista) { listas.set(lista.fecha, lista); return { sha: null } },
    async listarListas() { return [...listas.keys()].map((fecha) => ({ fecha, sha: null })) },
    async leerFoto(clave) { return fotos.get(clave) ?? null },
    async guardarFoto(clave, blob) { fotos.set(clave, blob) },
    async borrarFoto(clave) { fotos.delete(clave) },
    guardado: () => roster,
  }
}

let raiz, almacen, pantalla

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  almacen = almacenFalso()
  pantalla = crearPantallaPersonas(raiz, {
    roster: ROSTER,
    almacen,
    alCambiar: () => {},
  })
})

const textos = (sel) => [...raiz.querySelectorAll(sel)].map((e) => e.textContent)
// El nombre de cada fila es un campo editable, asi que su texto vive en value.
const nombresEnLista = () => [...raiz.querySelectorAll('.fila-persona .fila-nombre')].map((e) => e.value)
const filaDe = (nombre) => [...raiz.querySelectorAll('.fila-persona')]
  .find((f) => f.querySelector('.fila-nombre').value === nombre)

// Envia un formulario poniendo el nombre y, si corresponde, el grupo.
async function alta(indiceSeccion, nombre, grupo) {
  const seccion = raiz.querySelectorAll('.seccion')[indiceSeccion]
  const formulario = seccion.querySelector('.formulario')
  formulario.querySelector('input[type=text]:not(.fila-nombre)').value = nombre
  const select = formulario.querySelector('select')
  if (select && grupo) select.value = String(grupo)
  formulario.dispatchEvent(new Event('submit', { cancelable: true }))
  await Promise.resolve()
  await Promise.resolve()
}

describe('pantalla de personas', () => {
  it('lista a los participantes y voluntarios activos', () => {
    const nombres = nombresEnLista()
    expect(nombres).toContain('Gonzalo')
    expect(nombres).toContain('Abi')
    expect(nombres).not.toContain('Ezequiel')
  })

  it('agrega un participante al grupo elegido', async () => {
    await alta(0, 'Valentina', 2)
    expect(nombresEnLista()).toContain('Valentina')
    const nueva = pantalla.roster().participantes.find((p) => p.nombre === 'Valentina')
    expect(nueva.grupo).toBe(2)
    expect(almacen.guardado().participantes).toContain(nueva)
  })

  it('agrega un voluntario', async () => {
    await alta(1, 'Rodrigo')
    expect(nombresEnLista()).toContain('Rodrigo')
    expect(pantalla.roster().voluntarios.some((v) => v.nombre === 'Rodrigo')).toBe(true)
  })

  it('el boton de foto esta en español y no muestra el control nativo', () => {
    const etiquetas = [...raiz.querySelectorAll('label')].map((e) => e.textContent)
    expect(etiquetas.some((t) => t.includes('Foto'))).toBe(true)
    const entrada = raiz.querySelector('input[type=file]')
    expect(entrada).not.toBeNull()
    expect(entrada.classList.contains('oculto-visualmente')).toBe(true)
  })

  it('dice Cambiar foto cuando la persona ya tiene una', () => {
    const fila = filaDe('Thiago')
    expect(fila.querySelector('.boton-foto').textContent).toBe('Cambiar foto')
  })

  it('un nombre con HTML no se interpreta', async () => {
    await alta(0, '<b>Ana</b>', 1)
    expect(raiz.querySelector('b')).toBeNull()
    expect(nombresEnLista()).toContain('<b>Ana</b>')
  })
})

describe('editar en la lista de personas', () => {
  it('el nombre es un campo editable, no un texto fijo', () => {
    const entrada = filaDe('Gonzalo').querySelector('.fila-nombre')
    expect(entrada.tagName).toBe('INPUT')
    expect(entrada.value).toBe('Gonzalo')
  })

  it('cambiar el nombre lo guarda', async () => {
    const entrada = filaDe('Gonzalo').querySelector('.fila-nombre')
    entrada.value = 'Gonzalito'
    entrada.dispatchEvent(new Event('change'))
    await new Promise((r) => setTimeout(r, 0))
    expect(nombresEnLista()).toContain('Gonzalito')
    expect(nombresEnLista()).not.toContain('Gonzalo')
  })

  it('un nombre vacio no se guarda y el campo vuelve atras', async () => {
    const entrada = filaDe('Gonzalo').querySelector('.fila-nombre')
    entrada.value = '   '
    entrada.dispatchEvent(new Event('change'))
    await new Promise((r) => setTimeout(r, 0))
    expect(nombresEnLista()).toContain('Gonzalo')
  })

  it('un participante se puede marcar como nuevo', async () => {
    const casilla = filaDe('Gonzalo').querySelector('[data-campo="nuevo"]')
    expect(casilla.checked).toBe(false)
    casilla.checked = true
    casilla.dispatchEvent(new Event('change'))
    await new Promise((r) => setTimeout(r, 0))
    expect(filaDe('Gonzalo').querySelector('[data-campo="nuevo"]').checked).toBe(true)
  })

  it('un voluntario tambien tiene la marca de nuevo', () => {
    expect(filaDe('Abi').querySelector('[data-campo="nuevo"]')).not.toBeNull()
  })
})
