import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaLista } from '../../js/ui/pantalla-lista.js'
import { crearLista } from '../../js/modelo/lista.js'
import { ROSTER } from '../ayudas/datos.js'

let raiz, pantalla

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  pantalla = crearPantallaLista(raiz, {
    lista: crearLista('2026-08-08', ROSTER),
    roster: ROSTER,
    alCambiar: () => {},
  })
})

const fichas = (sel) => [...raiz.querySelectorAll(sel)]
const porNombre = (sel, nombre) => fichas(sel).find((f) => f.textContent.includes(nombre))

describe('pantalla de armado', () => {
  it('dibuja los dos grupos', () => {
    expect(raiz.querySelectorAll('.grupo')).toHaveLength(2)
  })

  it('dibuja una ficha por participante activo', () => {
    expect(fichas('.columna-participantes .ficha')).toHaveLength(5)
  })

  it('dibuja la lista de voluntarios una sola vez para toda la pantalla', () => {
    expect(fichas('.columna-voluntarios .ficha')).toHaveLength(5)
    expect(raiz.querySelectorAll('.columna-voluntarios')).toHaveLength(1)
  })

  it('rotula el area de voluntarios', () => {
    const titulos = [...raiz.querySelectorAll('h2')].map((e) => e.textContent)
    expect(titulos).toContain('Voluntarios')
  })

  it('envuelve los grupos, que es de lo que cuelga la retícula de pantalla ancha', () => {
    // El CSS separa grupos y voluntarios en dos columnas a partir de 900 px con
    // .cuerpo:has(.grupos). Sin este envoltorio la regla no aplica y el escritorio
    // vuelve a una sola columna, sin que falle ninguna otra prueba.
    const grupos = raiz.querySelector('.grupos')
    expect(grupos).not.toBeNull()
    expect(grupos.querySelectorAll('.grupo')).toHaveLength(2)
    expect(raiz.querySelector('.voluntarios').closest('.grupos')).toBeNull()
  })

  it('tocar un participante lo selecciona', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    expect(porNombre('.columna-participantes .ficha', 'Gonzalo').getAttribute('aria-pressed')).toBe('true')
  })

  it('tocar participante y luego voluntario los empareja', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toContain('v1')
  })

  it('tocar un segundo voluntario lo suma a la misma fila', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Cris').click()
    const fila = pantalla.lista().grupos[0].filas.find((f) => f.participantes.includes('p1'))
    expect(fila.voluntarios).toHaveLength(2)
  })

  it('tocar un voluntario sin participante seleccionado no hace nada', () => {
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas.every((f) => f.voluntarios.length === 0)).toBe(true)
  })

  it('atenua al voluntario ya asignado sin deshabilitarlo', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    const abi = porNombre('.columna-voluntarios .ficha', 'Abi')
    expect(abi.classList.contains('atenuada')).toBe(true)
    expect(abi.disabled).toBe(false)
  })

  it('muestra el conteo de pendientes por grupo', () => {
    expect(raiz.querySelector('.grupo .pendientes').textContent).toMatch(/3/)
  })

  it('un participante sin voluntario no se marca como error', () => {
    const sofi = porNombre('.columna-participantes .ficha', 'Sofi')
    expect(sofi.classList.contains('error')).toBe(false)
    expect(sofi.getAttribute('aria-invalid')).toBeNull()
  })

  it('deshacer revierte el ultimo emparejamiento', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    raiz.querySelector('[data-accion="deshacer"]').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('tocar un voluntario ya asignado al mismo participante lo quita', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('muestra una barra mientras hay un participante seleccionado', () => {
    expect(raiz.querySelector('.barra-seleccion')).toBeNull()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    const barra = raiz.querySelector('.barra-seleccion')
    expect(barra).not.toBeNull()
    expect(barra.textContent).toContain('Gonzalo')
  })

  it('cancelar limpia la seleccion sin emparejar', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    raiz.querySelector('[data-accion="cancelar"]').click()
    expect(raiz.querySelector('.barra-seleccion')).toBeNull()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('la barra desaparece despues de emparejar', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(raiz.querySelector('.barra-seleccion')).toBeNull()
  })

  it('muestra la fecha en español y permite cambiarla', () => {
    const etiqueta = raiz.querySelector('.encabezado-lista').textContent
    expect(etiqueta).toContain('Sábado 8 de agosto')
    expect(raiz.querySelector('[data-campo="fecha"]').value).toBe('2026-08-08')
  })

  it('avisa cuando cambia la fecha', () => {
    let recibida = null
    document.body.innerHTML = '<div id="raiz"></div>'
    const r = document.getElementById('raiz')
    crearPantallaLista(r, {
      lista: crearLista('2026-08-08', ROSTER), roster: ROSTER,
      alCambiar: () => {}, alCambiarFecha: (f) => { recibida = f },
    })
    const entrada = r.querySelector('[data-campo="fecha"]')
    entrada.value = '2026-08-15'
    entrada.dispatchEvent(new Event('change'))
    expect(recibida).toBe('2026-08-15')
  })

  it('sin alCambiarFecha la fecha se actualiza en la lista local', () => {
    const entrada = raiz.querySelector('[data-campo="fecha"]')
    entrada.value = '2026-08-15'
    entrada.dispatchEvent(new Event('change'))
    expect(pantalla.lista().fecha).toBe('2026-08-15')
    expect(raiz.querySelector('.encabezado-lista').textContent).toContain('Sábado 15 de agosto')
  })

  it('cambiar la hora y el lugar actualiza la lista', () => {
    const hora = raiz.querySelector('[data-campo="hora"]')
    hora.value = '10:30'
    hora.dispatchEvent(new Event('change'))
    expect(pantalla.lista().hora).toBe('10:30')

    const lugar = raiz.querySelector('[data-campo="lugar"]')
    lugar.value = 'Parque Batlle'
    lugar.dispatchEvent(new Event('change'))
    expect(pantalla.lista().lugar).toBe('Parque Batlle')
  })

  it('avisa al cambiar la hora', () => {
    let avisos = 0
    document.body.innerHTML = '<div id="raiz"></div>'
    const r = document.getElementById('raiz')
    crearPantallaLista(r, {
      lista: crearLista('2026-08-08', ROSTER), roster: ROSTER,
      alCambiar: () => { avisos += 1 },
    })
    const hora = r.querySelector('[data-campo="hora"]')
    hora.value = '10:30'
    hora.dispatchEvent(new Event('change'))
    expect(avisos).toBe(1)
  })

  it('avisa al cambiar la lista', () => {
    let avisos = 0
    const p = crearPantallaLista(raiz, {
      lista: crearLista('2026-08-08', ROSTER),
      roster: ROSTER,
      alCambiar: () => { avisos += 1 },
    })
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(avisos).toBe(1)
    expect(p.lista()).toBeTruthy()
  })
})
