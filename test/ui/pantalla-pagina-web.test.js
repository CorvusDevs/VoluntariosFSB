import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaPaginaWeb } from '../../js/ui/pantalla-pagina-web.js'

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))
const contenidoConEjemplos = JSON.parse(readFileSync(`${process.cwd()}/assets/pagina-publica-v1.json`, 'utf8'))
const contenidoInicial = structuredClone(contenidoConEjemplos)
contenidoInicial.demostracion.activa = false
contenidoInicial.navegacion.slice(4).forEach((item) => { item.visible = false })
;['familias', 'formacion', 'recursos', 'tienda', 'actualidad'].forEach((pagina) => { contenidoInicial.paginas[pagina].visible = false })
contenidoInicial.paginas.actividades.propuestas = []
contenidoInicial.paginas.formacion.propuestasFormativas = []
contenidoInicial.paginas.tienda.productos = []
contenidoInicial.paginas.actualidad.novedades = []
contenidoInicial.paginas.contacto.formularios = []
let raiz

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  window.confirm = vi.fn(() => true)
  window.open = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

function respuesta(datos, estado = 200, headers = {}) {
  return new Response(JSON.stringify(datos), { status: estado, headers: { 'content-type': 'application/json', ...headers } })
}

describe('editor de Página web', () => {
  it('instala y retira la protección contra cerrar con cambios sin guardar', async () => {
    const agregar = vi.spyOn(window, 'addEventListener')
    const retirar = vi.spyOn(window, 'removeEventListener')
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: contenidoInicial, revisionBorrador: 4 }))
    const pantalla = crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()
    expect(agregar).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    pantalla.destruir()
    expect(retirar).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('carga ejemplos ocultos para revisar las secciones todavía vacías', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoConEjemplos)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Qué hacemos').click()
    expect(raiz.textContent).toContain('Actividad vigente, ejemplo para completar')
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Tienda').click()
    expect(raiz.textContent).toContain('Producto de ejemplo para reemplazar')
    expect(raiz.querySelector('[aria-label="Visible de paginas.tienda.productos.0.visible"]').checked).toBe(true)
  })
  it('mantiene separación vertical legible en los títulos con League Gothic', () => {
    const css = readFileSync(`${process.cwd()}/css/estilos.css`, 'utf8')
    expect(css).toMatch(/\.pagina-web-preview-pagina h3\.tipografia-expresiva[^}]*line-height: 1;/)
    expect(css).toMatch(/\.pagina-web-impacto-titulo\.tipografia-expresiva[^}]*line-height: \.98;/)
  })

  it('simula un teléfono real sin conservar las medidas de escritorio', () => {
    const css = readFileSync(`${process.cwd()}/css/estilos.css`, 'utf8')
    expect(css).toMatch(/\.pagina-web-preview-movil \.pagina-web-preview-pagina \{ width: min\(390px, 100%\); \}/)
    expect(css).toMatch(/\.pagina-web-preview-movil \.pagina-web-preview-contenido \{ padding: 40px 24px 46px; \}/)
    expect(css).toMatch(/\.pagina-web-preview-movil \.pagina-web-preview-pagina h3\.tipografia-expresiva \{ font-size: 56px; line-height: 1; \}/)
  })

  it('muestra el destino de prueba, protege el principal y organiza todo por secciones', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'coordinacion' } })
    await esperar()

    expect(raiz.textContent).toContain('prueba.aletea.org')
    expect(raiz.textContent).toContain('aletea.org')
    expect(raiz.textContent).toContain('Protegido. No cambia desde esta pantalla.')
    expect([...raiz.querySelectorAll('.pagina-web-grupos button')].map((boton) => boton.textContent)).toEqual([
      'Inicio', 'Institución', 'Páginas y contenido', 'Participación', 'Ajustes',
    ])
    expect([...raiz.querySelectorAll('.pagina-web-secciones button')].map((boton) => boton.textContent)).toEqual(['Portada', 'Cifras'])
    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    expect([...raiz.querySelectorAll('.pagina-web-secciones button')].map((boton) => boton.textContent)).toEqual(['Qué hacemos', 'Formación', 'Biblioteca', 'Recursos', 'Tienda', 'Actualidad'])
    expect(raiz.querySelector('[data-pagina-web-publicar]').disabled).toBe(true)
  })

  it('muestra el menú futuro como una lista ordenable y deja ocultos los destinos todavía no aprobados', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Ajustes').click()
    expect([...raiz.querySelectorAll('.pagina-web-secciones button')].map((boton) => boton.textContent)).toEqual(['Datos generales', 'Apariencia del sitio', 'Publicación y calidad', 'Aviso de privacidad', 'Operación y privacidad'])
    const visibles = [...raiz.querySelectorAll('[aria-label^="Visible de navegacion."]')]
    expect(visibles).toHaveLength(8)
    expect(visibles.filter((control) => control.checked)).toHaveLength(4)
    expect(visibles[4].checked).toBe(false)
    expect(raiz.querySelector('[aria-label="Enlace de navegacion.4.enlace"]').value).toBe('/familias/')
    expect([...raiz.querySelectorAll('button')].some((boton) => boton.textContent === 'Agregar enlace')).toBe(false)
  })

  it('ofrece apariencia segura y una revisión honesta antes de publicar', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()
    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Ajustes').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Apariencia del sitio').click()
    expect(raiz.textContent).toContain('Personalizá la experiencia, no la geometría')
    expect(raiz.querySelector('[aria-label="Movimiento de aparienciaSitio.movimiento"]').value).toBe('suave')
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Publicación y calidad').click()
    expect(raiz.textContent).toContain('Aprobado automáticamente')
    expect(raiz.textContent).toContain('teléfonos de 390 y 320 píxeles')
    expect([...raiz.querySelectorAll('.pagina-web-calidad-acciones a')].map((enlace) => enlace.href)).toEqual(expect.arrayContaining([
      'https://prueba.aletea.org/', 'https://prueba.aletea.org/validacion-corto-plazo/',
    ]))
  })

  it('presenta decisiones operativas seguras sin campos técnicos ni activación automática', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Ajustes').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Operación y privacidad').click()
    expect(raiz.textContent).toContain('La web queda preparada, no activada')
    expect(raiz.textContent).toContain('Sin perfiles personales')
    expect(raiz.textContent).toContain('Preparación de la conexión')
    expect(raiz.textContent).toContain('Consulta agregada validada con Cloudflare')
    expect(raiz.textContent).toContain('Las acciones públicas requieren una etapa separada')
    expect([...raiz.querySelectorAll('.pagina-web-sincronizacion .estado-completo')]).toHaveLength(3)
    expect([...raiz.querySelectorAll('.pagina-web-sincronizacion .estado-pendiente')]).toHaveLength(2)
    expect(raiz.textContent).toContain('Datos de tarjetas bloqueados')
    expect(raiz.querySelector('[aria-label="Activar métricas de operacionWeb.analitica.activa"]').checked).toBe(false)
    expect(raiz.querySelector('[aria-label="Conservar detalle de operacionWeb.analitica.retencionDias"]').value).toBe('90')
    expect(raiz.querySelector('[aria-label="Confirmar disponibilidad antes de cobrar de operacionWeb.pagos.confirmarStockAntesDeCobrar"]').checked).toBe(true)
    expect([...raiz.querySelectorAll('.pagina-web-operacion-estados span')].map((estado) => estado.textContent)).toEqual(['Disponible', 'Pocas unidades', 'Agotado', 'Por encargo'])
  })

  it('muestra métricas agregadas reales con períodos simples y sin perfiles personales', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (String(url).startsWith('/api/cms/pagina-web/metricas')) return respuesta({
        estado: 'con_datos', periodoDias: 30, desde: '2026-07-26', hasta: '2026-08-24',
        resumen: { visitas: 120, paginasVistas: 200, acciones: 30 },
        variacion: { visitas: 20, paginasVistas: 0, acciones: null },
        paginas: [{ ruta: '/', vistas: 120 }, { ruta: '/familias/', vistas: 80 }],
        acciones: [{ accion: 'contacto:whatsapp', cantidad: 14 }],
        privacidad: { agregadas: true, identificadoresPersonales: false, datosFormularios: false },
      })
      return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Ajustes').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Operación y privacidad').click()
    await esperar()

    expect([...raiz.querySelectorAll('.pagina-web-metrica strong')].map((valor) => valor.textContent)).toEqual(['120', '200', '30'])
    expect(raiz.textContent).toContain('Páginas más consultadas')
    expect(raiz.textContent).toContain('Contacto whatsapp')
    const panel = raiz.querySelector('.pagina-web-metricas')
    expect(panel.textContent).toContain('sin identificadores personales')
    expect(panel.textContent).toContain('Próximo paso sugerido')
    expect(panel.textContent).toContain('/ concentra más consultas')
    expect(panel.textContent).not.toMatch(/correo|\bIP\b|persona individual/i)
  })

  it('explica el estado vacío sin inventar cifras ni activar las métricas', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (String(url).startsWith('/api/cms/pagina-web/metricas')) return respuesta({ estado: 'sin_datos', periodoDias: 30, resumen: { visitas: 0, paginasVistas: 0, acciones: 0 }, paginas: [], acciones: [] })
      return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Ajustes').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Operación y privacidad').click()
    await esperar()

    expect(raiz.textContent).toContain('Todavía no hay mediciones reales')
    expect(raiz.textContent).toContain('Las métricas continúan apagadas')
    expect(raiz.querySelectorAll('.pagina-web-metrica')).toHaveLength(0)
    expect(raiz.querySelector('[aria-label="Activar métricas de operacionWeb.analitica.activa"]').checked).toBe(false)
  })

  it('ofrece editores visuales separados para Familias y Formación', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Participación').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Familias').click()
    expect(raiz.querySelector('[aria-label="Visible de paginas.familias.visible"]').checked).toBe(false)
    expect(raiz.querySelector('[aria-label="Imagen de paginas.familias.imagen.src"]')).toBeTruthy()
    expect(raiz.querySelectorAll('[aria-label^="Título de paginas.familias.bloques."]')).toHaveLength(3)

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Formación').click()
    expect(raiz.querySelector('[aria-label="Visible de paginas.formacion.visible"]').checked).toBe(false)
    expect(raiz.querySelector('[aria-label="Imagen de paginas.formacion.imagen.src"]')).toBeTruthy()
  })

  it('ofrece editores visuales para Recursos y Tienda con contenido seguro', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Recursos').click()
    expect(raiz.querySelector('[aria-label="Visible de paginas.recursos.visible"]').checked).toBe(false)
    expect(raiz.querySelectorAll('[aria-label^="Título de paginas.recursos.recursos."]')).toHaveLength(3)
    expect(raiz.querySelector('[aria-label="Imagen de paginas.recursos.imagen.src"]')).toBeTruthy()
    const categoria = raiz.querySelector('[aria-label="Categoría de paginas.recursos.recursos.0.categoria"]')
    expect(categoria.tagName).toBe('SELECT')
    expect([...categoria.options].map((opcion) => opcion.value)).toContain('Guías')

    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Tienda').click()
    expect(raiz.querySelector('[aria-label="Visible de paginas.tienda.visible"]').checked).toBe(false)
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar producto').click()
    const disponibilidad = raiz.querySelector('[aria-label="Disponibilidad de paginas.tienda.productos.0.disponibilidad"]')
    expect(disponibilidad.tagName).toBe('SELECT')
    expect([...disponibilidad.options].map((opcion) => opcion.value)).toEqual(['Disponible', 'Pocas unidades', 'Agotado', 'Por encargo'])
    expect(disponibilidad.value).toBe('Por encargo')
  })

  it('abre una vista privada completa con el borrador actual de las páginas ocultas', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Participación').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Familias').click()
    const titulo = raiz.querySelector('[aria-label="Título de paginas.familias.titulo"]')
    titulo.value = 'Una comunidad que acompaña de verdad.'
    titulo.dispatchEvent(new Event('input', { bubbles: true }))
    raiz.querySelector('[data-pagina-web-abrir-vista-completa]').click()

    const dialogo = raiz.querySelector('[data-pagina-web-vista-completa]')
    expect(dialogo).toBeTruthy()
    expect(raiz.querySelector('.pagina-web').hasAttribute('inert')).toBe(true)
    expect(dialogo.textContent).toContain('Una comunidad que acompaña de verdad.')
    expect(dialogo.textContent).toContain('Familias sigue oculta en la web.')
    expect(dialogo.textContent).toContain('No guarda ni publica cambios.')
    expect(dialogo.querySelectorAll('.pagina-web-vista-completa-tarjeta')).toHaveLength(3)
  })

  it('permite revisar la vista completa en teléfono y cerrarla con Escape', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Tienda').click()
    raiz.querySelector('[data-pagina-web-abrir-vista-completa]').click()
    const dialogo = raiz.querySelector('[data-pagina-web-vista-completa]')
    expect(dialogo.textContent).toContain('Todavía no hay productos cargados.')
    ;[...dialogo.querySelectorAll('button')].find((boton) => boton.textContent === 'Teléfono').click()
    expect(dialogo.querySelector('.pagina-web-vista-completa-cuerpo').classList.contains('movil')).toBe(true)
    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(raiz.querySelector('[data-pagina-web-vista-completa]')).toBeNull()
    expect(raiz.querySelector('.pagina-web').hasAttribute('inert')).toBe(false)
    expect(document.activeElement.textContent).toBe('Vista completa')
  })

  it('crea publicaciones de Actualidad ocultas y permite revisarlas completas', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Actualidad').click()
    expect(raiz.querySelector('[aria-label="Visible de paginas.actualidad.visible"]').checked).toBe(false)
    expect(raiz.textContent).toContain('0 publicaciones')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar publicación').click()
    expect(raiz.querySelector('[aria-label="Fecha de paginas.actualidad.novedades.0.fecha"]').type).toBe('date')
    expect(raiz.querySelector('[aria-label="Visible de paginas.actualidad.novedades.0.visible"]').checked).toBe(false)
    const campoImagen = raiz.querySelector('[aria-label="Imagen de paginas.actualidad.novedades.0.imagen.src"]')
    expect(campoImagen).toBeTruthy()
    expect(campoImagen.closest('.pagina-web-imagen-editor').parentElement.parentElement.classList.contains('pagina-web-lista-item-cuerpo')).toBe(true)
    raiz.querySelector('[data-pagina-web-abrir-vista-completa]').click()
    const dialogo = raiz.querySelector('[data-pagina-web-vista-completa]')
    expect(dialogo.textContent).toContain('Actualidad sigue oculta en la web.')
    expect(dialogo.textContent).toContain('Nueva publicación')
    expect(dialogo.textContent).toContain('Oculta')
  })

  it('crea propuestas de Formación con campos claros y vista completa', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web/formularios') return respuesta({ formularios: [
        { id: 'voluntariado', titulo: 'Sumate como voluntario', descripcion: '', tipo: 'voluntariado', enlace: 'https://gestor.aletea.org/formulario.html?id=voluntariado' },
        { id: 'curso', titulo: 'Inscripción a cursos', descripcion: '', tipo: 'inscripcion', enlace: 'https://gestor.aletea.org/formulario.html?id=curso' },
      ] })
      return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Formación').click()
    expect(raiz.textContent).toContain('0 propuestas')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar propuesta').click()
    expect(raiz.querySelector('[aria-label="Tipo de formación de paginas.formacion.propuestasFormativas.0.categoriaFormacion"]').tagName).toBe('SELECT')
    const modalidad = raiz.querySelector('[aria-label="Modalidad de paginas.formacion.propuestasFormativas.0.modalidad"]')
    expect(modalidad.tagName).toBe('SELECT')
    expect(modalidad.closest('.pagina-web-campos').parentElement.classList.contains('pagina-web-lista-item-cuerpo')).toBe(true)
    expect(raiz.querySelector('[aria-label="Inscripción de paginas.formacion.propuestasFormativas.0.estadoInscripcion"]').tagName).toBe('SELECT')
    expect(raiz.querySelector('[aria-label="Visible de paginas.formacion.propuestasFormativas.0.visible"]').checked).toBe(false)
    expect(raiz.textContent).toContain('Faltan 6 datos')
    expect(raiz.querySelector('.pagina-web-lista-item-estado').textContent).toBe('Incompleta')
    const visibleIncompleta = raiz.querySelector('[aria-label="Visible de paginas.formacion.propuestasFormativas.0.visible"]')
    visibleIncompleta.click()
    expect(visibleIncompleta.checked).toBe(false)
    expect(raiz.textContent).toContain('Completá la tarjeta antes de mostrarla')
    const selectorFormulario = raiz.querySelector('[aria-label="Formulario de inscripción de paginas.formacion.propuestasFormativas.0"]')
    expect([...selectorFormulario.querySelectorAll('optgroup')].map((grupo) => grupo.label)).toEqual(['Recomendados para esta sección', 'Otros formularios públicos'])
    expect([...selectorFormulario.options].map((opcion) => opcion.textContent)).toEqual(['Elegir formulario activo', 'Inscripción a cursos', 'Sumate como voluntario'])
    selectorFormulario.value = 'https://gestor.aletea.org/formulario.html?id=curso'
    selectorFormulario.dispatchEvent(new Event('change', { bubbles: true }))
    expect(raiz.querySelector('[aria-label="Enlace de paginas.formacion.propuestasFormativas.0.accion.enlace"]').value).toBe('https://gestor.aletea.org/formulario.html?id=curso')
    expect(raiz.querySelector('[aria-label="Etiqueta breve de paginas.formacion.propuestasFormativas.0.accion.etiqueta"]').value).toBe('Consultar')
    expect(raiz.textContent).toContain('Activo y público')
    for (const [aria, valor] of [
      ['Título de paginas.formacion.propuestasFormativas.0.titulo', 'Curso para equipos educativos'],
      ['Próxima edición de paginas.formacion.propuestasFormativas.0.proximaEdicion', 'Octubre de 2026'],
      ['Duración de paginas.formacion.propuestasFormativas.0.duracion', '4 encuentros'],
      ['Horarios de paginas.formacion.propuestasFormativas.0.horarios', 'Miércoles de 19 a 21 h'],
      ['Precio de paginas.formacion.propuestasFormativas.0.precio', 'Sin costo'],
    ]) {
      const campo = raiz.querySelector(`[aria-label="${aria}"]`)
      campo.value = valor
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    }
    expect(raiz.textContent).toContain('Lista para mostrar')
    expect(raiz.querySelector('.pagina-web-lista-item-estado').textContent).toBe('Lista')
    const visibleLista = raiz.querySelector('[aria-label="Visible de paginas.formacion.propuestasFormativas.0.visible"]')
    visibleLista.click()
    expect(visibleLista.checked).toBe(true)
    expect(raiz.querySelector('.pagina-web-lista-item-estado').textContent).toBe('Visible')
    visibleLista.click()
    expect(visibleLista.checked).toBe(false)
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    raiz.querySelector('[aria-label="Revisar Inscripción a cursos"]').click()
    expect(abrir).toHaveBeenCalledWith('https://gestor.aletea.org/formulario.html?id=curso', '_blank', 'noopener,noreferrer')
    abrir.mockRestore()
    raiz.querySelector('[data-pagina-web-abrir-vista-completa]').click()
    const dialogo = raiz.querySelector('[data-pagina-web-vista-completa]')
    expect(dialogo.textContent).toContain('Formación sigue oculta en la web.')
    expect(dialogo.textContent).toContain('Curso para equipos educativos')
    expect(dialogo.textContent).toContain('Próximamente · Profesional · Oculta')
  })

  it('permite vincular formularios públicos desde Contacto y revisarlos antes de mostrarlos', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web/formularios') return respuesta({ formularios: [{ id: 'voluntariado', titulo: 'Sumate como voluntario', descripcion: 'Contanos cómo te gustaría colaborar.', tipo: 'voluntariado', equipo: 'Voluntariado', finalidad: 'Responder el interés en colaborar.', responsableDatos: 'Equipo de Voluntariado', conservacionMeses: 12, requiereConsentimiento: true, enlace: 'https://gestor.aletea.org/formulario.html?id=voluntariado' }] })
      return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Participación').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Contacto').click()
    expect(raiz.textContent).toContain('0 formularios')
    expect(raiz.textContent).toContain('Crear y ordenar preguntas')
    expect(raiz.textContent).toContain('Asignar equipo y privacidad')
    expect(raiz.textContent).toContain('Vincular y mostrar en la web')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar formulario').click()
    const visibleIncompleto = raiz.querySelector('[aria-label="Visible de paginas.contacto.formularios.0.visible"]')
    visibleIncompleto.click()
    expect(visibleIncompleto.checked).toBe(false)
    expect(raiz.textContent).toContain('Completá la tarjeta antes de mostrarla')
    const selector = raiz.querySelector('[aria-label="Formulario del gestor de paginas.contacto.formularios.0"]')
    expect(selector.tagName).toBe('SELECT')
    expect([...selector.options].map((opcion) => opcion.textContent)).toContain('Sumate como voluntario')
    selector.value = 'https://gestor.aletea.org/formulario.html?id=voluntariado'
    selector.dispatchEvent(new Event('change', { bubbles: true }))
    expect(raiz.querySelector('[aria-label="Título de paginas.contacto.formularios.0.titulo"]').value).toBe('Sumate como voluntario')
    expect(raiz.querySelector('[aria-label="Descripción de paginas.contacto.formularios.0.descripcion"]').value).toBe('Contanos cómo te gustaría colaborar.')
    expect(raiz.querySelector('[aria-label="Categoría de paginas.contacto.formularios.0.categoria"]').value).toBe('Voluntariado')
    expect(raiz.querySelector('[aria-label="Equipo responsable de paginas.contacto.formularios.0.responsable"]').value).toBe('Voluntariado')
    expect(raiz.querySelector('[aria-label="Enlace de paginas.contacto.formularios.0.enlace"]').value).toBe('https://gestor.aletea.org/formulario.html?id=voluntariado')
    expect(raiz.querySelector('[aria-label="Categoría de paginas.contacto.formularios.0.categoria"]').tagName).toBe('SELECT')
    expect(raiz.querySelector('[aria-label="Visible de paginas.contacto.formularios.0.visible"]').checked).toBe(false)
    expect(raiz.querySelector('[aria-label="Enlace de paginas.contacto.formularios.0.enlace"]')).toBeTruthy()
    expect(raiz.textContent).toContain('Responder el interés en colaborar. Responsable: Equipo de Voluntariado. Conservación: 12 meses.')
    expect(raiz.textContent).toContain('Lista para mostrar')
    const visibleListo = raiz.querySelector('[aria-label="Visible de paginas.contacto.formularios.0.visible"]')
    visibleListo.click()
    expect(visibleListo.checked).toBe(true)
    expect(raiz.querySelector('.pagina-web-lista-item-estado').textContent).toBe('Visible')
    raiz.querySelector('[data-pagina-web-abrir-vista-completa]').click()
    const dialogo = raiz.querySelector('[data-pagina-web-vista-completa]')
    expect(dialogo.textContent).toContain('Sumate como voluntario')
    expect(dialogo.textContent).toContain('Voluntariado')
    expect(dialogo.textContent).toContain('Seguimiento: Voluntariado')
    expect(dialogo.textContent).not.toContain('Voluntariado · Oculto')
    expect(dialogo.textContent).toContain('Completar formulario')
  })

  it('usa la maqueta como entrada visual y mantiene las opciones avanzadas plegadas', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const trabajo = raiz.querySelector('.pagina-web-trabajo')
    expect(trabajo.firstElementChild.classList.contains('pagina-web-vista')).toBe(true)
    expect(raiz.textContent).toContain('Editá sobre la maqueta')
    expect(raiz.querySelectorAll('.pagina-web-preview-editable').length).toBeGreaterThanOrEqual(4)
    expect([...raiz.querySelectorAll('.pagina-web-avanzado')].every((detalle) => !detalle.open)).toBe(true)

    const editable = raiz.querySelector('[aria-label="Editar Parte destacada en la maqueta"]')
    const campo = raiz.querySelector('[aria-label="Parte destacada de portada.tituloDestacado"]')
    expect(editable.getAttribute('contenteditable')).toBe('plaintext-only')
    editable.focus()
    editable.textContent = 'una sociedad plenamente inclusiva'
    editable.dispatchEvent(new Event('input', { bubbles: true }))
    expect(document.activeElement).toBe(editable)
    expect(campo.value).toBe('una sociedad plenamente inclusiva')
    expect(raiz.querySelector('[data-pagina-web-estado]').textContent).toContain('cambios sin guardar')
  })

  it('ofrece un mapa visual completo y abre cada destino desde el infinito', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const mapa = raiz.querySelector('.pagina-web-mapa')
    expect(mapa).toBeTruthy()
    expect(mapa.querySelectorAll('.pagina-web-mapa-nodo')).toHaveLength(21)
    expect(mapa.querySelector('.pagina-web-mapa-nodo.activo').textContent).toBe('Portada')
    const recursos = [...mapa.querySelectorAll('.pagina-web-mapa-nodo')].find((nodo) => nodo.textContent === 'Recursos')
    recursos.click()
    expect(raiz.querySelector('[data-pagina-web-editor] h2').textContent).toBe('Recursos')
    expect(raiz.querySelector('.pagina-web-mapa-nodo.activo').textContent).toBe('Recursos')
  })

  it('ofrece un modo enfocado que libera el lienzo y se cierra con Escape', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    const pantalla = crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    raiz.querySelector('[data-pagina-web-enfocar]').click()
    expect(raiz.querySelector('.pagina-web').classList.contains('pagina-web-enfocada')).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(raiz.querySelector('.pagina-web').classList.contains('pagina-web-enfocada')).toBe(false)
    pantalla.destruir()
  })

  it('permite plegar el mapa, filtrar estados y abrir la búsqueda con el teclado', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    const pantalla = crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const alternar = [...raiz.querySelectorAll('.pagina-web-mapa-herramientas button')].find((control) => control.textContent === 'Ocultar mapa')
    alternar.click()
    expect(raiz.querySelector('.pagina-web-mapa').hidden).toBe(true)
    const filtro = raiz.querySelector('[aria-label="Filtrar secciones por estado"]')
    filtro.value = 'incompleta'; filtro.dispatchEvent(new Event('change', { bubbles: true }))
    expect([...raiz.querySelectorAll('.pagina-web-secciones button')].every((control) => control.dataset.estado === 'incompleta')).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(document.activeElement).toBe(raiz.querySelector('[data-pagina-web-buscador]'))
    pantalla.destruir()
  })

  it('ajusta zoom y ancho del inspector sin perder la sección seleccionada', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const zoom = raiz.querySelector('[aria-label="Zoom de la maqueta"]')
    zoom.value = '80'; zoom.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('.pagina-web-preview-pagina').style.zoom).toBe('0.8')
    const ancho = raiz.querySelector('[aria-label="Ancho del panel de edición"]')
    ancho.value = '520'; ancho.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('.pagina-web-trabajo').style.getPropertyValue('--pagina-web-inspector-ancho')).toBe('520px')
    expect(raiz.querySelector('.pagina-web-migas').textContent).toContain('Inicio / Portada')
  })

  it('explica cambios, historial y recuperación junto a las acciones de publicación', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    expect(raiz.querySelector('[data-pagina-web-estado-detalle]').textContent).toContain('historial')
    const editable = raiz.querySelector('[aria-label="Editar Parte destacada en la maqueta"]')
    editable.textContent = 'Una comunidad que acompaña'; editable.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('[data-pagina-web-estado-detalle]').textContent).toContain('sin guardar')
  })

  it('mantiene el foco al editar sobre la maqueta y reduce el inspector al contexto elegido', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const editable = raiz.querySelector('[aria-label="Editar Parte destacada en la maqueta"]')
    editable.focus()
    expect(document.activeElement).toBe(editable)
    const editor = raiz.querySelector('[data-pagina-web-editor]')
    expect(editor.classList.contains('pagina-web-editor-contextual')).toBe(true)
    expect(editor.querySelectorAll(':scope > .pagina-web-grupo-seleccionado')).toHaveLength(1)
    editable.textContent = 'una comunidad sin barreras'
    editable.dispatchEvent(new Event('input', { bubbles: true }))
    expect(document.activeElement).toBe(editable)
    expect(raiz.querySelector('[aria-label="Parte destacada de portada.tituloDestacado"]').value).toBe('una comunidad sin barreras')
  })

  it('permite ajustar el punto focal sin volver a cargar ni degradar la imagen', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoConEjemplos)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const recursos = [...raiz.querySelectorAll('.pagina-web-mapa-nodo')].find((nodo) => nodo.textContent === 'Recursos')
    recursos.click()
    const horizontal = raiz.querySelector('[aria-label="Horizontal de paginas.recursos.imagen"]')
    const vertical = raiz.querySelector('[aria-label="Vertical de paginas.recursos.imagen"]')
    horizontal.value = '28'; horizontal.dispatchEvent(new Event('input', { bubbles: true }))
    vertical.value = '72'; vertical.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('.pagina-web-imagen-encuadre img').style.objectPosition).toBe('28% 72%')
    expect(raiz.querySelector('.pagina-web-imagen-foco').style.left).toBe('28%')
    expect(raiz.querySelector('.pagina-web-imagen-foco').style.top).toBe('72%')
  })

  it('deja ordenar y ocultar elementos desde la propia maqueta', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoConEjemplos)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Cifras').click()
    const titulosAntes = [...raiz.querySelectorAll('.pagina-web-preview-coleccion-titulo')].map((boton) => boton.textContent)
    raiz.querySelector(`[aria-label="Bajar ${titulosAntes[0]}"]`).click()
    const titulosDespues = [...raiz.querySelectorAll('.pagina-web-preview-coleccion-titulo')].map((boton) => boton.textContent)
    expect(titulosDespues[0]).toBe(titulosAntes[1])
    expect(titulosDespues[1]).toBe(titulosAntes[0])
  })

  it('presenta las colecciones compactas y mantiene una sola tarjeta abierta', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((control) => control.textContent === 'Cifras').click()
    const cifras = [...raiz.querySelectorAll('.pagina-web-lista-item')]
    expect(cifras.length).toBe(contenidoInicial.impacto.cifras.length)
    expect(cifras.filter((detalle) => detalle.open)).toHaveLength(0)
    expect(cifras[0].querySelector('.pagina-web-lista-item-numero').textContent).toBe('01')
    cifras[0].querySelector('summary').click()
    await esperar()
    expect(cifras[0].open).toBe(true)
    cifras[1].querySelector('summary').click()
    await esperar()
    expect(cifras[0].open).toBe(false)
    expect(cifras[1].open).toBe(true)
  })

  it('agrega una actividad completa desde una ficha plegable y la deja oculta hasta revisarla', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web/formularios') return respuesta({ formularios: [
        { id: 'voluntariado', titulo: 'Sumate como voluntario', descripcion: '', tipo: 'voluntariado', enlace: 'https://gestor.aletea.org/formulario.html?id=voluntariado' },
        { id: 'actividad', titulo: 'Inscripción a la actividad', descripcion: '', tipo: 'actividad', enlace: 'https://gestor.aletea.org/formulario.html?id=actividad' },
      ] })
      return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Qué hacemos').click()
    const agregar = [...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar actividad')
    agregar.click()
    expect(raiz.textContent).toContain('Faltan 7 datos')
    expect(raiz.querySelectorAll('[aria-label^="Título de paginas.actividades.propuestas."]')).toHaveLength(1)
    expect(raiz.querySelector('[aria-label="Visible de paginas.actividades.propuestas.0.visible"]').checked).toBe(false)
    expect(raiz.querySelector('[aria-label="Inscripción de paginas.actividades.propuestas.0.estadoInscripcion"]').tagName).toBe('SELECT')
    expect(raiz.querySelector('[aria-label="Modalidad de paginas.actividades.propuestas.0.modalidad"]')).toBeTruthy()
    const visibleIncompleta = raiz.querySelector('[aria-label="Visible de paginas.actividades.propuestas.0.visible"]')
    visibleIncompleta.click()
    expect(visibleIncompleta.checked).toBe(false)
    const selectorFormulario = raiz.querySelector('[aria-label="Formulario de inscripción de paginas.actividades.propuestas.0"]')
    expect([...selectorFormulario.querySelectorAll('optgroup')].map((grupo) => grupo.label)).toEqual(['Recomendados para esta sección', 'Otros formularios públicos'])
    expect([...selectorFormulario.options].map((opcion) => opcion.textContent)).toEqual(['Elegir formulario activo', 'Inscripción a la actividad', 'Sumate como voluntario'])
    selectorFormulario.value = 'https://gestor.aletea.org/formulario.html?id=actividad'
    selectorFormulario.dispatchEvent(new Event('change', { bubbles: true }))
    expect(raiz.querySelector('[aria-label="Enlace de paginas.actividades.propuestas.0.accion.enlace"]').value).toBe('https://gestor.aletea.org/formulario.html?id=actividad')
    expect(raiz.querySelector('[aria-label="Etiqueta breve de paginas.actividades.propuestas.0.accion.etiqueta"]').value).toBe('Consultar')
    expect(raiz.textContent).toContain('Activo y público')
    expect(raiz.querySelector('[aria-label="Revisar Inscripción a la actividad"]')).toBeTruthy()
    for (const [aria, valor] of [
      ['Título de paginas.actividades.propuestas.0.titulo', 'Encuentro para familias'],
      ['Qué es de paginas.actividades.propuestas.0.queEs', 'Un espacio de orientación y encuentro.'],
      ['Para quién de paginas.actividades.propuestas.0.paraQuien', 'Familias'],
      ['Área de paginas.actividades.propuestas.0.area', 'Familias'],
      ['Día de paginas.actividades.propuestas.0.dia', 'Sábados'],
      ['Cuándo de paginas.actividades.propuestas.0.cuando', 'Setiembre de 2026'],
    ]) {
      const campo = raiz.querySelector(`[aria-label="${aria}"]`)
      campo.value = valor
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    }
    expect(raiz.querySelector('[aria-label="Área de paginas.actividades.propuestas.0.area"]').tagName).toBe('SELECT')
    const visibleLista = raiz.querySelector('[aria-label="Visible de paginas.actividades.propuestas.0.visible"]')
    visibleLista.click()
    expect(visibleLista.checked).toBe(true)
    expect(raiz.querySelector('.pagina-web-lista-item-estado').textContent).toBe('Visible')
  })

  it('separa actividades vigentes e históricas sin exigir inscripción al archivo', async () => {
    const contenidoConHistoria = structuredClone(contenidoInicial)
    contenidoConHistoria.paginas.actividades.propuestas = [
      { id: 'actual', titulo: 'Encuentro actual', queEs: 'Orientación', paraQuien: 'Familias', cuando: 'Setiembre de 2026', estadoInscripcion: 'Abierta', vigencia: 'Vigente', visible: true, orden: 1, accion: { etiqueta: 'Inscribirme', enlace: 'https://gestor.aletea.org/formulario.html?id=actual' } },
      { id: 'historia', titulo: 'Encuentro 2024', queEs: 'Una experiencia anterior', paraQuien: 'Familias', cuando: 'Agosto de 2024', estadoInscripcion: 'Cerrada', vigencia: 'Histórica', visible: false, orden: 2, accion: { etiqueta: '', enlace: '' } },
    ]
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoConHistoria)
      if (url === '/api/cms/pagina-web/formularios') return respuesta({ formularios: [{ id: 'actual', titulo: 'Inscripción actual', descripcion: '', tipo: 'actividad', enlace: 'https://gestor.aletea.org/formulario.html?id=actual' }] })
      return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Qué hacemos').click()
    expect([...raiz.querySelectorAll('.pagina-web-lista-item-vigencia')].map((estado) => estado.textContent)).toEqual(['Vigente', 'Histórica'])
    const visibleHistoria = raiz.querySelector('[aria-label="Visible de paginas.actividades.propuestas.1.visible"]')
    visibleHistoria.click()
    expect(visibleHistoria.checked).toBe(true)

    raiz.querySelector('[data-pagina-web-abrir-vista-completa]').click()
    const dialogo = raiz.querySelector('[data-pagina-web-vista-completa]')
    expect(dialogo.textContent).toContain('Actividades vigentes')
    expect(dialogo.textContent).toContain('Archivo histórico')
    const historica = dialogo.querySelector('.pagina-web-vista-completa-tarjeta.historica')
    expect(historica.textContent).toContain('Encuentro 2024')
    expect(historica.querySelector('.pagina-web-vista-completa-enlace')).toBeNull()
  })

  it('advierte cuando el formulario vinculado dejó de estar público y activo', async () => {
    const contenidoConRetirado = structuredClone(contenidoInicial)
    contenidoConRetirado.paginas.actividades.propuestas = [{
      id: 'anterior', titulo: 'Actividad anterior', queEs: 'Encuentro', paraQuien: 'Familias', cuando: 'Setiembre',
      estadoInscripcion: 'Cerrada', vigencia: 'Vigente', visible: false, orden: 1,
      accion: { etiqueta: 'Consultar', enlace: 'https://gestor.aletea.org/formulario.html?id=retirado' },
    }]
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoConRetirado)
      if (url === '/api/cms/pagina-web/formularios') return respuesta({ formularios: [{ id: 'actual', titulo: 'Formulario actual', descripcion: '', tipo: 'actividad', enlace: 'https://gestor.aletea.org/formulario.html?id=actual' }] })
      return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Qué hacemos').click()
    expect(raiz.textContent).toContain('Ya no está disponible')
    expect(raiz.textContent).toContain('Elegí otro antes de mantener visible la tarjeta.')
    expect(raiz.querySelector('[aria-label^="Revisar "]')).toBeNull()
  })

  it('permite reutilizar una imagen de la biblioteca visual', async () => {
    const urlMedio = 'https://gestor.aletea.org/api/pagina-web/medios/11111111-1111-1111-1111-111111111111'
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web') return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
      if (url === '/api/cms/pagina-web/medios') return respuesta({ medios: [{ id: '11111111-1111-1111-1111-111111111111', nombre: 'familias.webp', ancho: 1600, alto: 900, bytes: 320000, texto_alternativo: 'Encuentro de familias', url: urlMedio }] })
      throw new Error(`Solicitud inesperada: ${url}`)
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar(); await esperar()
    const biblioteca = raiz.querySelector('.pagina-web-biblioteca-medios')
    biblioteca.open = true
    const tarjeta = raiz.querySelector('.pagina-web-medio')
    expect(tarjeta.textContent).toContain('familias.webp')
    tarjeta.click()
    expect(raiz.querySelector('[aria-label="Imagen de portada.imagen.src"]').value).toBe(urlMedio)
  })

  it('muestra las cifras reales y permite ajustar su animación desde la maqueta', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((control) => control.textContent === 'Cifras').click()
    expect(raiz.querySelectorAll('.pagina-web-impacto-cifra')).toHaveLength(contenidoInicial.impacto.cifras.length)
    expect(raiz.querySelector('.pagina-web-impacto-hilo').hidden).toBe(false)
    expect(raiz.querySelector('.pagina-web-impacto-reproducir').textContent).toBe('Reproducir')

    const duracion = raiz.querySelector('[aria-label="Duración"]')
    duracion.value = '2400'
    duracion.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('[aria-label="Duración de la animación de impacto.animacion.duracionMs"]').value).toBe('2400')
    expect(raiz.querySelector('[data-pagina-web-estado]').textContent).toContain('cambios sin guardar')

    const hilo = raiz.querySelector('[aria-label="Mostrar hilo"]')
    hilo.checked = false
    hilo.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('.pagina-web-impacto-hilo').hidden).toBe(true)
  })

  it('edita una cifra en la maqueta y conserva el valor al guardar', async () => {
    let cuerpoGuardado = null
    globalThis.fetch = vi.fn(async (url, opciones = {}) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web') return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
      if (url === '/api/cms/pagina-web/borrador') { cuerpoGuardado = JSON.parse(opciones.body); return respuesta({ revision: 1 }, 200, { etag: '"1"' }) }
      throw new Error(`Solicitud inesperada: ${url}`)
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((control) => control.textContent === 'Cifras').click()
    const numero = raiz.querySelector('[data-pagina-web-contador]')
    numero.value = '575'
    numero.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('[aria-label="Número de impacto.cifras.0.valor"]').value).toBe('575')
    raiz.querySelector('[data-pagina-web-guardar]').click()
    await esperar()
    expect(cuerpoGuardado.impacto.cifras[0].valor).toBe(575)
  })

  it('guarda como borrador el texto escrito directamente en la maqueta', async () => {
    let cuerpoGuardado = null
    globalThis.fetch = vi.fn(async (url, opciones = {}) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web') return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
      if (url === '/api/cms/pagina-web/borrador') { cuerpoGuardado = JSON.parse(opciones.body); return respuesta({ revision: 1 }, 200, { etag: '"1"' }) }
      throw new Error(`Solicitud inesperada: ${url}`)
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const editable = raiz.querySelector('[aria-label="Editar Parte destacada en la maqueta"]')
    editable.textContent = 'incluya a todas las personas'
    editable.dispatchEvent(new Event('input', { bubbles: true }))
    raiz.querySelector('[data-pagina-web-guardar]').click()
    await esperar()

    expect(cuerpoGuardado.portada.tituloDestacado).toBe('incluya a todas las personas')
    expect(raiz.textContent).toContain('Todavía no cambió el sitio de prueba.')
  })

  it('permite elegir visualmente League Gothic solo en textos compatibles', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-inspector-pestanas button')].find((boton) => boton.textContent === 'Diseño').click()
    expect(raiz.textContent).toContain('Estilo del texto')
    expect(raiz.textContent).toContain('Poppins, clara y serena')
    expect(raiz.textContent).toContain('League Gothic, para destacar')
    expect(raiz.querySelector('[aria-label="Título principal: Institucional"]').getAttribute('aria-pressed')).toBe('true')
    raiz.querySelector('[aria-label="Título principal: Con impacto"]').click()
    expect(raiz.querySelector('.pagina-web-preview-pagina h3').classList.contains('tipografia-expresiva')).toBe(true)

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Institución').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Áreas').click()
    ;[...raiz.querySelectorAll('.pagina-web-inspector-pestanas button')].find((boton) => boton.textContent === 'Diseño').click()
    expect(raiz.querySelector('[aria-label="Título del mapa de áreas: Con impacto"]')).toBeTruthy()
    raiz.querySelector('[aria-label="Título del mapa de áreas: Con impacto"]').click()
    expect(raiz.querySelector('.pagina-web-preview-pagina h3').classList.contains('tipografia-expresiva')).toBe(true)

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Ajustes').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Aviso de privacidad').click()
    expect(raiz.querySelector('[aria-label^="Título de la página: Con impacto"]')).toBeNull()
  })

  it('guarda un cambio como borrador sin publicarlo', async () => {
    const solicitudes = []
    globalThis.fetch = vi.fn(async (url, opciones = {}) => {
      solicitudes.push({ url, opciones })
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web') return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
      if (url === '/api/cms/pagina-web/borrador') return respuesta({ revision: 1 }, 200, { etag: '"1"' })
      throw new Error(`Solicitud inesperada: ${url}`)
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'coordinacion' } })
    await esperar()
    const titulo = raiz.querySelector('[aria-label="Primera parte del título de portada.tituloAntes"]')
    titulo.value = 'Construimos una sociedad que'
    titulo.dispatchEvent(new Event('input', { bubbles: true }))
    raiz.querySelector('[data-pagina-web-guardar]').click()
    await esperar()

    const guardado = solicitudes.find((solicitud) => solicitud.url === '/api/cms/pagina-web/borrador')
    expect(guardado.opciones.method).toBe('PUT')
    expect(guardado.opciones.headers['if-match']).toBe('"0"')
    expect(JSON.parse(guardado.opciones.body)).toMatchObject({ editorial: { estado: 'borrador' }, portada: { tituloAntes: 'Construimos una sociedad que' } })
    expect(raiz.textContent).toContain('Todavía no cambió el sitio de prueba.')
  })

  it('permite revisar a Consulta pero desactiva cualquier modificación', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: contenidoInicial, revisionBorrador: 4 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'consulta' } })
    await esperar()
    expect(raiz.textContent).toContain('Tu perfil puede revisar el contenido, pero no modificarlo.')
    expect([...raiz.querySelectorAll('input, textarea')].every((control) => control.disabled)).toBe(true)
    expect(raiz.querySelector('[data-pagina-web-guardar]').disabled).toBe(true)
    expect(raiz.querySelector('[data-pagina-web-publicar]').disabled).toBe(true)
  })

  it('oculta identificadores técnicos y conserva el nuevo orden de las áreas', async () => {
    let cuerpoGuardado = null
    globalThis.fetch = vi.fn(async (url, opciones = {}) => {
      if (url === '/assets/pagina-publica-v1.json') return respuesta(contenidoInicial)
      if (url === '/api/cms/pagina-web') return respuesta({ borrador: null, publicado: null, revisionBorrador: 0 })
      if (url === '/api/cms/pagina-web/borrador') { cuerpoGuardado = JSON.parse(opciones.body); return respuesta({ revision: 1 }) }
      throw new Error(`Solicitud inesperada: ${url}`)
    })
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'coordinacion' } })
    await esperar()
    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Institución').click()
    const botonAreas = [...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Áreas')
    botonAreas.click()
    expect(raiz.textContent).not.toContain('Identificador interno')
    expect(raiz.textContent).not.toContain('Orden')
    expect(raiz.querySelector('[aria-label="Color de areas.0.color"]').value).toBe('turquesa')
    raiz.querySelector('[aria-label="Bajar Familias"]').click()
    raiz.querySelector('[data-pagina-web-guardar]').click()
    await esperar()
    expect(cuerpoGuardado.areas.slice(0, 2)).toMatchObject([{ id: 'educacion', orden: 1 }, { id: 'familias', orden: 2 }])
  })

  it('encuentra cualquier sección por nombre y abre su inspector', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const buscador = raiz.querySelector('[aria-label="Buscar una sección de la página"]')
    buscador.value = 'privacidad'
    buscador.dispatchEvent(new Event('input', { bubbles: true }))
    const resultados = [...raiz.querySelectorAll('.pagina-web-secciones button')]
    expect(resultados.map((boton) => boton.textContent)).toContain('Aviso de privacidad')
    resultados.find((boton) => boton.textContent === 'Aviso de privacidad').click()
    expect(raiz.textContent).toContain('Editando ahora')
    expect(raiz.textContent).toContain('Aviso de privacidad')
  })

  it('ofrece vistas de escritorio, tablet y teléfono sin recargar la pantalla', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-vista-modos button')].find((boton) => boton.textContent === 'Tablet').click()
    expect(raiz.querySelector('[data-pagina-web-preview]').classList.contains('pagina-web-preview-tablet')).toBe(true)
    ;[...raiz.querySelectorAll('.pagina-web-vista-modos button')].find((boton) => boton.textContent === 'Teléfono').click()
    expect(raiz.querySelector('[data-pagina-web-preview]').classList.contains('pagina-web-preview-movil')).toBe(true)
  })

  it('deshace y rehace cambios de texto desde la misma pantalla', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoInicial)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    const ruta = '[aria-label="Primera parte del título de portada.tituloAntes"]'
    const original = raiz.querySelector(ruta).value
    raiz.querySelector(ruta).value = 'Un nuevo comienzo'
    raiz.querySelector(ruta).dispatchEvent(new Event('input', { bubbles: true }))
    ;[...raiz.querySelectorAll('.pagina-web-historial-controles button')].find((boton) => boton.textContent === 'Deshacer').click()
    expect(raiz.querySelector(ruta).value).toBe(original)
    ;[...raiz.querySelectorAll('.pagina-web-historial-controles button')].find((boton) => boton.textContent === 'Rehacer').click()
    expect(raiz.querySelector(ruta).value).toBe('Un nuevo comienzo')
  })

  it('duplica tarjetas como copias ocultas y sugiere destinos internos en enlaces', async () => {
    globalThis.fetch = vi.fn(async (url) => url === '/assets/pagina-publica-v1.json'
      ? respuesta(contenidoConEjemplos)
      : respuesta({ borrador: null, publicado: null, revisionBorrador: 0 }))
    crearPantallaPaginaWeb(raiz, { sesion: { perfil_acceso: 'direccion' } })
    await esperar()

    ;[...raiz.querySelectorAll('.pagina-web-grupos button')].find((boton) => boton.textContent === 'Páginas y contenido').click()
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Actualidad').click()
    const cantidadInicial = raiz.querySelectorAll('.pagina-web-lista-item').length
    raiz.querySelector('[aria-label^="Duplicar "]').click()
    expect(raiz.querySelectorAll('.pagina-web-lista-item')).toHaveLength(cantidadInicial + 1)
    const visibles = [...raiz.querySelectorAll('[aria-label^="Visible de paginas.actualidad.novedades."]')]
    expect(visibles.at(-1).checked).toBe(false)
    ;[...raiz.querySelectorAll('.pagina-web-secciones button')].find((boton) => boton.textContent === 'Recursos').click()
    raiz.querySelector('.pagina-web-lista-item summary').click()
    const enlace = raiz.querySelector('[aria-label^="Enlace de paginas.recursos.recursos."]')
    const lista = document.getElementById(enlace.getAttribute('list'))
    expect([...lista.options].map((opcion) => opcion.value)).toContain('/contacto/')
  })
})
