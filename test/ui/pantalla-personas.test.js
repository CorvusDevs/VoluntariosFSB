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

// Envia un formulario poniendo el nombre y, si corresponde, el grupo.
async function alta(indiceSeccion, nombre, grupo) {
  const seccion = raiz.querySelectorAll('.seccion')[indiceSeccion]
  const formulario = seccion.querySelector('.formulario')
  formulario.querySelector('input[type=text]').value = nombre
  const select = formulario.querySelector('select')
  if (select && grupo) select.value = String(grupo)
  formulario.dispatchEvent(new Event('submit', { cancelable: true }))
  await Promise.resolve()
  await Promise.resolve()
}

describe('pantalla de personas', () => {
  it('lista a los participantes y voluntarios activos', () => {
    const nombres = textos('.fila-nombre')
    expect(nombres).toContain('Gonzalo')
    expect(nombres).toContain('Abi')
    expect(nombres).not.toContain('Ezequiel')
  })

  it('agrega un participante al grupo elegido', async () => {
    await alta(0, 'Valentina', 2)
    expect(textos('.fila-nombre')).toContain('Valentina')
    const nueva = pantalla.roster().participantes.find((p) => p.nombre === 'Valentina')
    expect(nueva.grupo).toBe(2)
    expect(almacen.guardado().participantes).toContain(nueva)
  })

  it('agrega un voluntario', async () => {
    await alta(1, 'Rodrigo')
    expect(textos('.fila-nombre')).toContain('Rodrigo')
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
    const fila = [...raiz.querySelectorAll('.fila-persona')]
      .find((f) => f.querySelector('.fila-nombre').textContent === 'Thiago')
    expect(fila.querySelector('label').textContent).toBe('Cambiar foto')
  })

  it('un nombre con HTML no se interpreta', async () => {
    await alta(0, '<b>Ana</b>', 1)
    expect(raiz.querySelector('b')).toBeNull()
    expect(textos('.fila-nombre')).toContain('<b>Ana</b>')
  })
})
