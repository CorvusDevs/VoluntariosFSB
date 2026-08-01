import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaVistaPrevia, DENSIDAD } from '../../js/ui/pantalla-vista-previa.js'
import { crearLista, asignarVoluntario } from '../../js/modelo/lista.js'
import { ROSTER, medirFalso } from '../ayudas/datos.js'

function contextoFalso() {
  return {
    canvas: { width: 0, height: 0, toBlob: (cb) => cb(new Blob(['x'])) },
    measureText: (t) => ({ width: medirFalso(t, '32px Poppins') }),
    save() {}, restore() {}, beginPath() {}, closePath() {}, fill() {}, stroke() {},
    clip() {}, arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, fillText() {},
    drawImage() {}, roundRect() {}, scale() {},
    set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {},
    set textAlign(v) {}, set textBaseline(v) {}, set lineWidth(v) {},
  }
}

const armar = (raiz, lista, alCambiar = () => {}) => crearPantallaVistaPrevia(raiz, {
  lista, roster: ROSTER, saludo: 'Buenas tardes.', despedida: 'Nos vemos.',
  alCambiar, crearContexto: () => contextoFalso(), cargarFoto: async () => null,
  cargarLogo: async () => null,
})

let raiz, pantalla, lista

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  lista = asignarVoluntario(crearLista('2026-08-08', ROSTER), 'p1', 'v1')
  pantalla = armar(raiz, lista)
})

describe('pantalla de vista previa', () => {
  it('dibuja los cuatro interruptores en español', () => {
    const etiquetas = [...raiz.querySelectorAll('label')].map((e) => e.textContent)
    expect(etiquetas.some((t) => t.includes('Saludo'))).toBe(true)
    expect(etiquetas.some((t) => t.includes('Despedida'))).toBe(true)
    expect(etiquetas.some((t) => t.includes('Fotos'))).toBe(true)
    expect(etiquetas.some((t) => t.includes('compacto'))).toBe(true)
  })

  it('refleja el estado guardado en la lista', () => {
    expect(raiz.querySelector('[data-opcion="saludo"]').checked).toBe(true)
    expect(raiz.querySelector('[data-opcion="compacto"]').checked).toBe(false)
  })

  it('cambiar un interruptor actualiza la lista y avisa', () => {
    document.body.innerHTML = '<div id="r2"></div>'
    const r2 = document.getElementById('r2')
    let avisos = 0
    const p = armar(r2, lista, () => { avisos += 1 })
    const compacto = r2.querySelector('[data-opcion="compacto"]')
    compacto.checked = true
    compacto.dispatchEvent(new Event('change'))
    expect(avisos).toBe(1)
    expect(p.lista().opcionesImagen.compacto).toBe(true)
  })

  it('informa el tamaño real del archivo, no el del lienzo logico', () => {
    const info = raiz.querySelector('.info-imagen').textContent
    expect(info).toContain(String(1080 * DENSIDAD))
    expect(info).not.toContain('1080 por')
    expect(info).toContain('px')
  })

  it('avisa cuando WhatsApp recortaria la imagen', () => {
    const larga = structuredClone(lista)
    for (let i = 0; i < 40; i += 1) {
      larga.grupos[0].filas.push({ participantes: ['p2'], voluntarios: [] })
    }
    document.body.innerHTML = '<div id="r3"></div>'
    const r3 = document.getElementById('r3')
    armar(r3, larga)
    expect(r3.querySelector('.aviso-recorte')).not.toBeNull()
    expect(r3.querySelector('.aviso-recorte').textContent).toContain('recorte')
  })

  it('no avisa de recorte con una lista normal', () => {
    expect(raiz.querySelector('.aviso-recorte')).toBeNull()
  })

  it('tiene botones de descargar y compartir', () => {
    const botones = [...raiz.querySelectorAll('button')].map((e) => e.textContent)
    expect(botones.some((t) => t.includes('Descargar'))).toBe(true)
    expect(botones.some((t) => t.includes('Compartir'))).toBe(true)
  })

  it('el nombre del archivo lleva la fecha de la lista', () => {
    expect(pantalla.nombreDeArchivo()).toBe('futbol-sin-barreras-2026-08-08.png')
  })

  it('activar el modo compacto achica la imagen', () => {
    const altoNormal = pantalla.plano().alto
    const compacto = raiz.querySelector('[data-opcion="compacto"]')
    compacto.checked = true
    compacto.dispatchEvent(new Event('change'))
    expect(pantalla.plano().alto).toBeLessThan(altoNormal)
  })

  it('precarga el logo y las fotos, y repinta al terminar', async () => {
    document.body.innerHTML = '<div id="r4"></div>'
    const r4 = document.getElementById('r4')
    const pedidas = []
    const roster = structuredClone(ROSTER)
    crearPantallaVistaPrevia(r4, {
      lista, roster, saludo: 'x', despedida: 'y', alCambiar: () => {},
      crearContexto: () => contextoFalso(),
      cargarLogo: async () => ({ marca: 'logo' }),
      cargarFoto: async (clave) => { pedidas.push(clave); return { marca: clave } },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(pedidas).toContain('p3.jpg')
    expect(r4.querySelector('.lienzo-vista-previa')).not.toBeNull()
  })

  it('pide cada foto una sola vez aunque se repita en varias filas', async () => {
    document.body.innerHTML = '<div id="r5"></div>'
    const r5 = document.getElementById('r5')
    const pedidas = []
    const dosFilas = structuredClone(lista)
    dosFilas.grupos[0].filas.push({ participantes: ['p3'], voluntarios: [] })
    crearPantallaVistaPrevia(r5, {
      lista: dosFilas, roster: ROSTER, saludo: 'x', despedida: 'y', alCambiar: () => {},
      crearContexto: () => contextoFalso(),
      cargarLogo: async () => null,
      cargarFoto: async (clave) => { pedidas.push(clave); return null },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(pedidas.filter((c) => c === 'p3.jpg')).toHaveLength(1)
  })
})
