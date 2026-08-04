import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaVistaPrevia, DENSIDAD } from '../../js/ui/pantalla-vista-previa.js'
import {
  crearLista, asignarVoluntario, FORMATO_POR_DEFECTO, ESQUINA_VOLUNTARIO_POR_DEFECTO,
  TAMANO_VOLUNTARIO_POR_DEFECTO, ASOMO_VOLUNTARIO_POR_DEFECTO,
} from '../../js/modelo/lista.js'
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

// Formato apilado: estas pruebas son sobre como crece la imagen a lo alto y
// sobre el aviso de recorte, que la grilla casi nunca dispara porque se ensancha.
const apilada = (base) => ({
  ...base, opcionesImagen: { ...base.opcionesImagen, formato: 'filas' },
})

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
    // El saludo arranca apagado a proposito: el mensaje va escrito en el chat.
    expect(raiz.querySelector('[data-opcion="saludo"]').checked).toBe(false)
    expect(raiz.querySelector('[data-opcion="fotos"]').checked).toBe(true)
    expect(raiz.querySelector('[data-opcion="compacto"]').checked).toBe(false)
  })

  it('el saludo y la despedida arrancan apagados', () => {
    const nueva = crearLista('2026-08-08', ROSTER)
    expect(nueva.opcionesImagen.saludo).toBe(false)
    expect(nueva.opcionesImagen.despedida).toBe(false)
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
    const logico = pantalla.plano().ancho
    expect(info).toContain(String(logico * DENSIDAD))
    expect(info).not.toContain(`${logico} por`)
    expect(info).toContain('px')
  })

  it('avisa cuando WhatsApp recortaria la imagen', () => {
    const larga = structuredClone(lista)
    for (let i = 0; i < 40; i += 1) {
      larga.grupos[0].filas.push({ participantes: ['p2'], voluntarios: [] })
    }
    document.body.innerHTML = '<div id="r3"></div>'
    const r3 = document.getElementById('r3')
    armar(r3, apilada(larga))
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

  it('cuando el modo compacto no alcanza, propone otra salida', () => {
    const enorme = structuredClone(lista)
    for (let i = 0; i < 80; i += 1) {
      enorme.grupos[0].filas.push({ participantes: ['p2'], voluntarios: [] })
    }
    document.body.innerHTML = '<div id="r7"></div>'
    const r7 = document.getElementById('r7')
    armar(r7, apilada(enorme))
    expect(r7.querySelector('.aviso-recorte').textContent).toContain('por grupo')
  })

  it('con una lista que el modo compacto si arregla, sigue proponiendo el modo compacto', () => {
    const larga = structuredClone(lista)
    for (let i = 0; i < 25; i += 1) {
      larga.grupos[0].filas.push({ participantes: ['p2'], voluntarios: [] })
    }
    document.body.innerHTML = '<div id="r8"></div>'
    const r8 = document.getElementById('r8')
    armar(r8, apilada(larga))
    const aviso = r8.querySelector('.aviso-recorte')
    expect(aviso).not.toBeNull()
    expect(aviso.textContent).toContain('compacto')
    expect(aviso.textContent).not.toContain('por grupo')
  })

  it('bloquea los interruptores mientras genera el archivo', async () => {
    document.body.innerHTML = '<div id="r9"></div>'
    const r9 = document.getElementById('r9')
    const p = armar(r9, lista)
    // Que termine la precarga y su repintado antes de tomar referencias.
    await new Promise((r) => setTimeout(r, 0))
    let entregarBlob = null
    const toBlobOriginal = HTMLCanvasElement.prototype.toBlob
    const crearUrlOriginal = URL.createObjectURL
    const revocarUrlOriginal = URL.revokeObjectURL
    HTMLCanvasElement.prototype.toBlob = function (cb) { entregarBlob = () => cb(new Blob(['x'])) }
    URL.createObjectURL = () => 'blob:falso'
    URL.revokeObjectURL = () => {}
    try {
      const botonDescargar = [...r9.querySelectorAll('button')].find((b) => b.textContent.includes('Descargar'))
      const compacto = r9.querySelector('[data-opcion="compacto"]')
      expect(compacto.disabled).toBe(false)

      botonDescargar.click()
      // El bloqueo tiene que ocurrir antes del primer await, si no queda una
      // ventana en la que se puede cambiar el plano que ya se dibujo.
      expect(compacto.disabled).toBe(true)
      expect(botonDescargar.disabled).toBe(true)

      for (let i = 0; i < 20 && !entregarBlob; i += 1) {
        await new Promise((r) => setTimeout(r, 0))
      }
      expect(entregarBlob).not.toBeNull()
      expect(compacto.disabled).toBe(true)

      // Un repintado en medio de la exportacion no puede soltar el bloqueo.
      p.redibujar()
      expect(r9.querySelector('[data-opcion="compacto"]').disabled).toBe(true)

      entregarBlob()
      for (let i = 0; i < 20 && r9.querySelector('[data-opcion="compacto"]').disabled; i += 1) {
        await new Promise((r) => setTimeout(r, 0))
      }
      expect(r9.querySelector('[data-opcion="compacto"]').disabled).toBe(false)
      const botonFinal = [...r9.querySelectorAll('button')].find((b) => b.textContent.includes('Descargar'))
      expect(botonFinal.disabled).toBe(false)
    } finally {
      HTMLCanvasElement.prototype.toBlob = toBlobOriginal
      URL.createObjectURL = crearUrlOriginal
      URL.revokeObjectURL = revocarUrlOriginal
    }
  })

  it('cuando el dispositivo no puede compartir, lo dice en pantalla y no con un alert', async () => {
    document.body.innerHTML = '<div id="r10"></div>'
    const r10 = document.getElementById('r10')
    armar(r10, lista)
    await new Promise((r) => setTimeout(r, 0))
    const toBlobOriginal = HTMLCanvasElement.prototype.toBlob
    const alertOriginal = window.alert
    let alertas = 0
    HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new Blob(['x'])) }
    window.alert = () => { alertas += 1 }
    try {
      const botonCompartir = [...r10.querySelectorAll('button')].find((b) => b.textContent.includes('Compartir'))
      botonCompartir.click()
      for (let i = 0; i < 20 && !r10.querySelector('.aviso'); i += 1) {
        await new Promise((r) => setTimeout(r, 0))
      }
      const aviso = r10.querySelector('.aviso')
      expect(aviso).not.toBeNull()
      expect(aviso.textContent).toContain('Descargar planificación')
      expect(alertas).toBe(0)
    } finally {
      HTMLCanvasElement.prototype.toBlob = toBlobOriginal
      window.alert = alertOriginal
    }
  })

  it('las instrucciones estan en rioplatense y con acentos', () => {
    const larga = structuredClone(lista)
    for (let i = 0; i < 25; i += 1) {
      larga.grupos[0].filas.push({ participantes: ['p2'], voluntarios: [] })
    }
    document.body.innerHTML = '<div id="r11"></div>'
    const r11 = document.getElementById('r11')
    armar(r11, apilada(larga))
    expect(r11.querySelector('.aviso-recorte').textContent).toContain('preferís evitarlo, activá')
    expect(r11.querySelector('.info-imagen').textContent).toContain('relación')
  })

  it('deja de repintar despues de destruirse', async () => {
    document.body.innerHTML = '<div id="r6"></div>'
    const r6 = document.getElementById('r6')
    let cerradas = 0
    const p = crearPantallaVistaPrevia(r6, {
      lista, roster: ROSTER, saludo: 'x', despedida: 'y', alCambiar: () => {},
      crearContexto: () => contextoFalso(),
      cargarLogo: async () => ({ close() { cerradas += 1 } }),
      cargarFoto: async () => null,
    })
    await new Promise((r) => setTimeout(r, 0))
    p.destruir()
    expect(cerradas).toBe(1)
    const hijosAntes = r6.children.length
    const primerHijo = r6.firstChild
    p.redibujar()
    expect(r6.children.length).toBe(hijosAntes)
    // vaciar() habria reemplazado los nodos: si el primero es el mismo, no repinto.
    expect(r6.firstChild).toBe(primerHijo)
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

describe('saludo y despedida editables', () => {
  it('dibuja los dos campos con el texto actual de la lista', () => {
    const s = raiz.querySelector('[data-campo="saludo"]')
    const d = raiz.querySelector('[data-campo="despedida"]')
    expect(s.tagName).toBe('TEXTAREA')
    expect(d.tagName).toBe('TEXTAREA')
    expect(s.value.length).toBeGreaterThan(0)
    expect(d.value.length).toBeGreaterThan(0)
  })

  it('editar el saludo actualiza la lista y avisa', () => {
    document.body.innerHTML = '<div id="rs"></div>'
    const rs = document.getElementById('rs')
    let avisos = 0
    const p = armar(rs, lista, () => { avisos += 1 })
    const s = rs.querySelector('[data-campo="saludo"]')
    s.value = 'Buenas, mañana jugamos igual con lluvia.'
    s.dispatchEvent(new Event('change'))
    expect(avisos).toBe(1)
    expect(p.lista().saludo).toBe('Buenas, mañana jugamos igual con lluvia.')
  })

  const prender = (cual) => {
    const i = raiz.querySelector(`[data-opcion="${cual}"]`)
    i.checked = true
    i.dispatchEvent(new Event('change'))
  }

  it('el texto editado llega a la imagen', () => {
    prender('saludo')
    const s = raiz.querySelector('[data-campo="saludo"]')
    s.value = 'Texto propio de esta semana.'
    s.dispatchEvent(new Event('change'))
    const textos = pantalla.plano().ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos.join(' ')).toContain('Texto propio de esta semana')
  })

  it('editar la despedida tambien llega a la imagen', () => {
    prender('despedida')
    const d = raiz.querySelector('[data-campo="despedida"]')
    d.value = 'Gracias por bancar la lluvia.'
    d.dispatchEvent(new Event('change'))
    const textos = pantalla.plano().ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos.join(' ')).toContain('Gracias por bancar la lluvia')
  })

  it('una lista vieja sin los campos usa los textos por defecto', () => {
    // Las listas guardadas antes de este cambio no traen saludo ni despedida.
    const vieja = structuredClone(lista)
    delete vieja.saludo
    delete vieja.despedida
    document.body.innerHTML = '<div id="rv"></div>'
    const rv = document.getElementById('rv')
    crearPantallaVistaPrevia(rv, {
      lista: vieja, roster: ROSTER, alCambiar: () => {},
      crearContexto: () => contextoFalso(), cargarLogo: async () => null, cargarFoto: async () => null,
    })
    expect(rv.querySelector('[data-campo="saludo"]').value).toContain('Buenas tardes')
    expect(rv.querySelector('[data-campo="despedida"]').value).toContain('Nos vemos')
  })
})

describe('selector de formato', () => {
  // Los selectores ya no son desplegables: cada opcion es un boton con un
  // bosquejo de como queda. Se eligen tocando, no abriendo una lista.
  const valores = (raizDada, campo) =>
    [...raizDada.querySelectorAll(`[data-campo="${campo}"] .bosquejo`)].map((b) => b.dataset.valor)
  const elegido = (raizDada, campo) =>
    raizDada.querySelector(`[data-campo="${campo}"] .bosquejo.elegido`)?.dataset.valor
  const tocar = (raizDada, campo, valor) =>
    raizDada.querySelector(`[data-campo="${campo}"] .bosquejo[data-valor="${valor}"]`).click()
  // Los bosquejos arrancan plegados: abiertos ocupaban dos pantallas de alto.
  const abrir = (raizDada) => raizDada.querySelector('[data-accion="cambiar-formato"]').click()

  beforeEach(() => abrir(raiz))

  it('arranca plegado, con solo el resumen a la vista', () => {
    document.body.innerHTML = '<div id="rp"></div>'
    const rp = document.getElementById('rp')
    armar(rp, lista)
    expect(rp.querySelector('.selector-visual')).toBeNull()
    expect(rp.querySelector('[data-accion="cambiar-formato"]')).not.toBeNull()
    expect(rp.querySelector('.panel-formato-resumen').textContent).toContain('Grilla')
    rp.querySelector('[data-accion="cambiar-formato"]').click()
    expect(rp.querySelector('.selector-visual')).not.toBeNull()
  })

  it('ofrece los cuatro formatos y arranca en el por defecto', () => {
    expect(valores(raiz, 'formato')).toEqual(['retratos', 'grilla', 'columnas', 'filas'])
    expect(elegido(raiz, 'formato')).toBe(FORMATO_POR_DEFECTO)
  })

  it('cada opcion trae su propio bosquejo dibujado', () => {
    const lienzos = raiz.querySelectorAll('[data-campo="formato"] .bosquejo-lienzo')
    expect(lienzos).toHaveLength(4)
  })

  it('la esquina de los voluntarios solo aparece en el formato retratos', () => {
    // Los otros tres no dibujan al voluntario sobre la foto, asi que el selector
    // no tendria nada que cambiar y solo agregaria ruido.
    expect(raiz.querySelector('[data-campo="esquina-voluntario"]')).toBeNull()
    tocar(raiz, 'formato', 'retratos')
    expect(valores(raiz, 'esquina-voluntario')).toEqual([
      'abajo-derecha', 'abajo-izquierda', 'arriba-derecha', 'arriba-izquierda',
      'montado-derecha', 'montado-izquierda',
      'montado-abajo-derecha', 'montado-abajo-izquierda',
    ])
    expect(elegido(raiz, 'esquina-voluntario')).toBe(ESQUINA_VOLUNTARIO_POR_DEFECTO)
  })

  it('el tamaño y el asomo solo aparecen con el medallon montado', () => {
    // Con el medallon apoyado no cambian nada, asi que mostrarlos haria creer
    // que hacen algo cuando no.
    tocar(raiz, 'formato', 'retratos')
    expect(raiz.querySelector('[data-campo="tamanoVoluntario"]')).toBeNull()
    expect(raiz.querySelector('[data-campo="asomoVoluntario"]')).toBeNull()

    tocar(raiz, 'esquina-voluntario', 'montado-derecha')
    expect(valores(raiz, 'tamanoVoluntario')).toEqual(['mediano', 'grande', 'enorme'])
    expect(valores(raiz, 'asomoVoluntario')).toEqual(['apenas', 'montado', 'alto'])
    expect(elegido(raiz, 'tamanoVoluntario')).toBe(TAMANO_VOLUNTARIO_POR_DEFECTO)
    expect(elegido(raiz, 'asomoVoluntario')).toBe(ASOMO_VOLUNTARIO_POR_DEFECTO)
  })

  it('las esquinas montadas de abajo tambien corren el nombre del chico', () => {
    tocar(raiz, 'formato', 'retratos')
    tocar(raiz, 'esquina-voluntario', 'montado-abajo-derecha')
    expect(pantalla.lista().opcionesImagen.esquinaVoluntario).toBe('montado-abajo-derecha')
  })

  it('el formato por defecto es la grilla', () => {
    expect(FORMATO_POR_DEFECTO).toBe('grilla')
    expect(crearLista('2026-08-08', ROSTER).opcionesImagen.formato).toBe('grilla')
  })

  it('cambiar a columnas actualiza la lista y avisa', () => {
    document.body.innerHTML = '<div id="rf"></div>'
    const rf = document.getElementById('rf')
    let avisos = 0
    const p = armar(rf, lista, () => { avisos += 1 })
    abrir(rf)
    rf.querySelector('[data-campo="formato"] .bosquejo[data-valor="columnas"]').click()
    expect(avisos).toBe(1)
    expect(p.lista().opcionesImagen.formato).toBe('columnas')
  })

  it('cambiar de formato cambia el tamaño de la foto', () => {
    document.body.innerHTML = '<div id="rc"></div>'
    const rc = document.getElementById('rc')
    const p = armar(rc, apilada(lista))
    const chica = p.plano().ordenes.find((o) => o.tipo === 'circulo').radio
    abrir(rc)
    rc.querySelector('[data-campo="formato"] .bosquejo[data-valor="columnas"]').click()
    const grande = p.plano().ordenes.find((o) => o.tipo === 'circulo').radio
    expect(grande).toBeGreaterThan(chica * 1.8)
  })

  it('una lista guardada en columnas abre en columnas', () => {
    const guardada = { ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'columnas' } }
    document.body.innerHTML = '<div id="rg"></div>'
    const rg = document.getElementById('rg')
    armar(rg, guardada)
    expect(rg.querySelector('.panel-formato-resumen').textContent).toContain('Dos columnas')
    rg.querySelector('[data-accion="cambiar-formato"]').click()
    expect(rg.querySelector('[data-campo="formato"] .bosquejo.elegido').dataset.valor).toBe('columnas')
  })
})


describe('precarga de fotos', () => {
  it('pide tambien las fotos de los voluntarios, no solo las de los chicos', async () => {
    // Hasta el formato Retratos ningun formato dibujaba la cara del voluntario,
    // asi que solo se precargaban las de los chicos y el medallon salia en
    // blanco aunque la foto estuviera cargada y subida.
    const pedidas = []
    const roster = {
      participantes: [{ id: 'p1', nombre: 'Ezequiel', grupo: 1, activo: true, foto: 'p1.jpg' }],
      voluntarios: [{ id: 'v1', nombre: 'Alejandro', activo: true, foto: 'v1.jpg' }],
    }
    document.body.innerHTML = '<div id="raiz"></div>'
    crearPantallaVistaPrevia(document.getElementById('raiz'), {
      lista: crearLista('2026-08-08', roster),
      roster,
      alCambiar: () => {},
      crearContexto: () => contextoFalso(),
      cargarLogo: async () => null,
      cargarFoto: async (clave) => { pedidas.push(clave); return null },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(pedidas).toContain('p1.jpg')
    expect(pedidas).toContain('v1.jpg')
  })
})
