import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  crearPantallaComunicacionVisual, guardarBorradorComunicacion, htmlCartaDesdeLienzo, leerBorradorComunicacion,
} from '../../js/ui/pantalla-comunicacion-visual.js'
import { crearDisenoComunicacion } from '../../js/imagen/comunicacion-visual.js'

function contexto(canvas) {
  return {
    canvas, setTransform: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(), drawImage: vi.fn(),
    beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(),
    measureText: (texto) => ({ width: String(texto).length * 17 }),
  }
}

function almacen() {
  const datos = new Map()
  return { getItem: (clave) => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, String(valor)), removeItem: (clave) => datos.delete(clave) }
}

describe('pantalla de Comunicación visual', () => {
  beforeEach(() => { document.body.innerHTML = '<main id="raiz"></main>' })

  it('ofrece plantillas, edición por intención y formatos de descarga', () => {
    const descargarPNG = vi.fn().mockResolvedValue(undefined)
    const descargarSVG = vi.fn()
    const memoria = almacen()
    const sesion = { correo: 'editora@aletea.org', perfil_acceso: 'coordinacion' }
    crearPantallaComunicacionVisual(document.querySelector('#raiz'), {
      sesion, almacen: memoria, crearContexto: contexto,
      cargarLogo: async () => null, descargarPNG, descargarSVG,
    })
    expect(document.querySelectorAll('[data-plantilla]')).toHaveLength(5)
    expect(document.querySelector('[data-plantilla="carta"]')).toBeNull()
    expect([...document.querySelectorAll('.comunicacion-visual-pestanas button')].map((boton) => boton.textContent)).toEqual(['Texto', 'Estilo', 'Elementos', 'Publicación'])
    expect(document.querySelector('[data-campo="titulo"]').value).toContain('GRUPOS DE APOYO')
    expect([...document.querySelectorAll('.comunicacion-visual-acciones button')].map((boton) => boton.textContent)).toEqual(['Descargar PNG', 'Descargar SVG', 'Restablecer plantilla'])
    ;[...document.querySelectorAll('.comunicacion-visual-pestanas button')].find((boton) => boton.textContent === 'Estilo').click()
    expect(document.querySelectorAll('[data-fuente]')).toHaveLength(2)
    expect(document.querySelector('[data-fuente="leagueGothic"]').textContent).toContain('Titulares League Gothic, textos Poppins')
    const escala = document.querySelector('.comunicacion-visual-rango input[type="range"]')
    expect(escala.max).toBe('2')
    escala.value = '1.8'; escala.dispatchEvent(new Event('input', { bubbles: true }))
    expect(leerBorradorComunicacion(sesion, memoria).diseno.escalaTitulo).toBe(1.8)
    document.querySelector('[data-fuente="leagueGothic"]').click()
    expect(leerBorradorComunicacion(sesion, memoria).diseno.fuente).toBe('leagueGothic')
  })

  it('ofrece una carta A4 editable con firma y salida para PDF', async () => {
    const imprimirCarta = vi.fn()
    crearPantallaComunicacionVisual(document.querySelector('#raiz'), {
      sesion: { correo: 'direccion@aletea.org', perfil_acceso: 'direccion' },
      almacen: almacen(), crearContexto: contexto, cargarLogo: async () => null, imprimirCarta,
    })
    document.querySelector('[data-plantilla="carta"]').click()
    expect(document.querySelector('canvas').width).toBe(1240)
    expect(document.querySelector('canvas').height).toBe(1754)
    expect(document.querySelector('[data-campo="saludo"]').value).toBe('De nuestra mayor consideración:')
    expect([...document.querySelectorAll('.comunicacion-visual-acciones button')].map((boton) => boton.textContent)).toEqual(['Imprimir o guardar PDF', 'Descargar PNG', 'Restablecer plantilla'])
    expect([...document.querySelectorAll('.comunicacion-visual-pestanas button')].map((boton) => boton.textContent)).toEqual(['Texto', 'Estilo', 'Elementos', 'Revisión'])
    ;[...document.querySelectorAll('.comunicacion-visual-pestanas button')].find((boton) => boton.textContent === 'Estilo').click()
    expect([...document.querySelectorAll('.comunicacion-visual-campo select option')].map((opcion) => opcion.textContent)).toEqual(['Carta A4 - 1240 x 1754'])
    expect(document.querySelector('.comunicacion-visual-rango > span').textContent).toContain('Tamaño del texto')
    ;[...document.querySelectorAll('.comunicacion-visual-pestanas button')].find((boton) => boton.textContent === 'Elementos').click()
    expect(document.querySelector('.comunicacion-visual-foto strong').textContent).toBe('Firma')
    expect(document.querySelector('.comunicacion-visual-elegir-foto').textContent).toBe('Elegir firma')
    const canvas = document.querySelector('canvas')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 620, height: 877 })
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 270 }))
    expect(document.activeElement.dataset.campo).toBe('descripcion')
    ;[...document.querySelectorAll('.comunicacion-visual-acciones button')].find((boton) => boton.textContent === 'Imprimir o guardar PDF').click()
    await vi.waitFor(() => expect(imprimirCarta).toHaveBeenCalledTimes(1))
  })

  it('no persiste el contenido ni la firma de una carta en el dispositivo', () => {
    const memoria = almacen()
    const sesion = { correo: 'direccion@aletea.org', perfil_acceso: 'direccion' }
    const carta = leerBorradorComunicacion(sesion, memoria)
    carta.plantilla = 'carta'; carta.diseno.composicion = 'carta'; carta.datos.descripcion = 'Contenido reservado'; carta.datos.foto = 'data:image/png;base64,FIRMA'
    expect(guardarBorradorComunicacion(carta, sesion, memoria)).toBe(false)
    expect(memoria.getItem('aletea:comunicacion-visual:v1:direccion@aletea.org')).toBeNull()
  })

  it('limpia un borrador de carta persistido por una versión anterior', () => {
    const memoria = almacen()
    const sesion = { correo: 'direccion@aletea.org', perfil_acceso: 'direccion' }
    const carta = crearDisenoComunicacion('carta')
    carta.datos.descripcion = 'Contenido reservado anterior'; carta.datos.foto = 'data:image/png;base64,FIRMA'
    memoria.setItem('aletea:comunicacion-visual:v1:direccion@aletea.org', JSON.stringify(carta))
    expect(leerBorradorComunicacion(sesion, memoria).diseno.composicion).not.toBe('carta')
    expect(memoria.getItem('aletea:comunicacion-visual:v1:direccion@aletea.org')).toBeNull()
  })

  it('deniega el editor por defensa adicional a un perfil de Consulta', () => {
    crearPantallaComunicacionVisual(document.querySelector('#raiz'), {
      sesion: { correo: 'consulta@aletea.org', perfil_acceso: 'consulta' }, almacen: almacen(),
    })
    expect(document.querySelector('.mensaje-error').textContent).toContain('no puede abrir')
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('prepara una hoja A4 exacta para el diálogo de impresión', () => {
    const html = htmlCartaDesdeLienzo({ toDataURL: () => 'data:image/png;base64,CARTA' })
    expect(html).toContain('@page{size:A4;margin:0}')
    expect(html).toContain('html,body{margin:0;width:210mm;height:297mm;overflow:hidden}')
    expect(html).toContain('top:-.3mm')
    expect(html).toContain('width:210mm;height:297.3mm;object-fit:fill')
    expect(html).toContain('data:image/png;base64,CARTA')
  })

  it('permite recorrer, duplicar y preparar un carrusel educativo', () => {
    const memoria = almacen(); const sesion = { correo: 'comunicacion@aletea.org' }
    crearPantallaComunicacionVisual(document.querySelector('#raiz'), { sesion, almacen: memoria, crearContexto: contexto, cargarLogo: async () => null })
    document.querySelector('[data-plantilla="carrusel"]').click()
    expect(document.querySelectorAll('.comunicacion-visual-pagina')).toHaveLength(3)
    ;[...document.querySelectorAll('button')].find((boton) => boton.textContent === 'Duplicar página').click()
    expect(document.querySelectorAll('.comunicacion-visual-pagina')).toHaveLength(4)
    expect([...document.querySelectorAll('.comunicacion-visual-acciones button')].map((boton) => boton.textContent)).toContain('Descargar carrusel')
  })

  it('guarda el borrador por cuenta mientras se escribe', () => {
    const memoria = almacen()
    const sesion = { correo: 'editora@aletea.org' }
    crearPantallaComunicacionVisual(document.querySelector('#raiz'), { sesion, almacen: memoria, crearContexto: contexto, cargarLogo: async () => null })
    const titulo = document.querySelector('[data-campo="titulo"]')
    titulo.value = 'NUEVO MENSAJE'; titulo.dispatchEvent(new Event('input', { bubbles: true }))
    expect(leerBorradorComunicacion(sesion, memoria).datos.titulo).toBe('NUEVO MENSAJE')
    expect(document.querySelector('[data-comunicacion-estado]').textContent).toContain('guardado')
  })

  it('recupera un borrador y permite volver al texto tocando la vista previa', () => {
    const memoria = almacen(); const sesion = { nombre: 'Claudia' }
    const pieza = leerBorradorComunicacion(sesion, memoria); pieza.datos.titulo = 'MENSAJE RECUPERADO'; guardarBorradorComunicacion(pieza, sesion, memoria)
    crearPantallaComunicacionVisual(document.querySelector('#raiz'), { sesion, almacen: memoria, crearContexto: contexto, cargarLogo: async () => null })
    ;[...document.querySelectorAll('.comunicacion-visual-pestanas button')].find((boton) => boton.textContent === 'Estilo').click()
    const canvas = document.querySelector('canvas')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 540, height: 675 })
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 225 }))
    expect(document.activeElement.dataset.campo).toBe('titulo')
    expect(document.activeElement.value).toBe('MENSAJE RECUPERADO')
  })

  it('muestra el selector de archivos en español y permite cargar una URL', async () => {
    const memoria = almacen(); const sesion = { correo: 'comunicacion@aletea.org' }
    const cargarDesdeUrl = vi.fn().mockResolvedValue('data:image/png;base64,AAA')
    crearPantallaComunicacionVisual(document.querySelector('#raiz'), {
      sesion, almacen: memoria, crearContexto: contexto, cargarLogo: async () => null,
      cargarDesdeUrl, cargarFoto: async () => ({ width: 100, height: 100 }),
    })
    document.querySelector('[data-plantilla="carrusel"]').click()
    ;[...document.querySelectorAll('.comunicacion-visual-pestanas button')].find((boton) => boton.textContent === 'Elementos').click()
    expect(document.querySelector('.comunicacion-visual-elegir-foto').textContent).toBe('Elegir imagen')
    expect(document.querySelector('.comunicacion-visual-nombre-archivo').textContent).toBe('Ningún archivo seleccionado')
    const detalles = document.querySelector('.comunicacion-visual-enlace'); detalles.open = true
    const entrada = detalles.querySelector('input[type="url"]'); entrada.value = 'https://drive.google.com/file/d/1234567890abcdef/view'
    ;[...detalles.querySelectorAll('button')].find((boton) => boton.textContent === 'Cargar imagen').click()
    await vi.waitFor(() => expect(cargarDesdeUrl).toHaveBeenCalledWith(entrada.value))
    await vi.waitFor(() => expect(leerBorradorComunicacion(sesion, memoria).diapositivas[0].foto).toBe('data:image/png;base64,AAA'))
    await vi.waitFor(() => expect(document.querySelector('[data-comunicacion-estado]').textContent).toBe('Foto cargada desde el enlace'))
  })
})
