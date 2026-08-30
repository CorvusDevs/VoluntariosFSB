import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  SECCIONES_PAGINA_WEB, asignarEnRuta, clonarContenidoPaginaWeb, contenidoComoBorrador,
  resumenSeccion, validarContenidoPaginaWeb, valorEnRuta,
} from '../../js/modelo/pagina-web.js'

const contenidoInicial = JSON.parse(readFileSync(new URL('../../assets/pagina-publica-v1.json', import.meta.url), 'utf8'))

describe('contenido de la página web', () => {
  it('acepta como semilla el contenido público verificado', () => {
    expect(validarContenidoPaginaWeb(contenidoInicial)).toEqual([])
    expect(SECCIONES_PAGINA_WEB.map((seccion) => seccion.id)).toEqual(['portada', 'impacto', 'areas', 'institucion', 'actividades', 'familias', 'formacion', 'biblioteca', 'recursos', 'tienda', 'donaciones', 'contacto', 'participacion', 'orientacion', 'actualidad', 'redes', 'general', 'apariencia', 'calidad', 'privacidad', 'operacion'])
    expect(contenidoInicial.aparienciaSitio).toEqual({ movimiento: 'suave', mostrarListon: true, mostrarOrbita: true, mostrarRedAreas: true })
    expect(contenidoInicial.paginas.privacidad).toMatchObject({ visible: true, etiqueta: 'Privacidad' })
    expect(resumenSeccion(contenidoInicial, 'privacidad').cantidad).toBe(5)
    expect(contenidoInicial.operacionWeb).toMatchObject({
      analitica: { activa: false, proveedor: 'Cloudflare Web Analytics', datosPersonales: false },
      inventario: { modo: 'Estados manuales', estados: ['Disponible', 'Pocas unidades', 'Agotado', 'Por encargo'] },
      pagos: { proveedor: 'Mercado Pago', modalidad: 'Enlaces externos', guardarDatosTarjeta: false },
    })
    expect(contenidoInicial.tipografia).toMatchObject({
      cifrasNumeros: 'expresiva', participacion: 'expresiva', portada: 'institucional',
      areas: 'institucional', institucion: 'institucional', familias: 'institucional', contacto: 'institucional',
    })
  })

  it('limita la apariencia a opciones seguras', () => {
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.aparienciaSitio.movimiento = 'vertiginoso'
    invalido.aparienciaSitio.mostrarOrbita = 'sí'
    expect(validarContenidoPaginaWeb(invalido)).toEqual(expect.arrayContaining([
      'Elegí un nivel de movimiento válido.',
      'Indicá si debe mostrarse mostrar orbita.',
    ]))
  })

  it('limita la tipografía a los dos estilos institucionales acordados', () => {
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.tipografia.portada = 'comic-sans'
    expect(validarContenidoPaginaWeb(invalido)).toContain('Elegí un estilo tipográfico válido para portada.')
    invalido.tipografia.areas = 'comic-sans'
    expect(validarContenidoPaginaWeb(invalido)).toContain('Elegí un estilo tipográfico válido para areas.')
  })

  it('impide guardar configuraciones que expongan datos o cobren sin confirmar stock', () => {
    const inseguro = clonarContenidoPaginaWeb(contenidoInicial)
    inseguro.operacionWeb.analitica.datosPersonales = true
    inseguro.operacionWeb.pagos.guardarDatosTarjeta = true
    inseguro.operacionWeb.pagos.confirmarStockAntesDeCobrar = false
    expect(validarContenidoPaginaWeb(inseguro)).toEqual(expect.arrayContaining([
      'Las métricas no pueden recibir datos personales ni información de formularios.',
      'Aletea no puede guardar datos de tarjetas en el gestor.',
      'La tienda debe confirmar disponibilidad antes de cobrar.',
    ]))
  })

  it('actualiza un campo anidado sin modificar la copia original', () => {
    const copia = clonarContenidoPaginaWeb(contenidoInicial)
    asignarEnRuta(copia, 'paginas.contacto.titulo', 'Hablemos')
    expect(valorEnRuta(copia, 'paginas.contacto.titulo')).toBe('Hablemos')
    expect(valorEnRuta(contenidoInicial, 'paginas.contacto.titulo')).toBe('Conversemos.')
  })

  it('convierte los cambios en borrador y conserva la revisión editorial', () => {
    const borrador = contenidoComoBorrador(contenidoInicial)
    expect(borrador.editorial).toMatchObject({ estado: 'borrador', revision: 1 })
    expect(borrador.editorial.actualizadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('completa https en los enlaces externos de la página y conserva rutas internas', () => {
    const copia = clonarContenidoPaginaWeb(contenidoInicial)
    copia.organizacion.instagram = 'instagram.com/aleteauy'
    copia.portada.accionPrincipal.enlace = '/actividades/'
    const borrador = contenidoComoBorrador(copia)
    expect(borrador.organizacion.instagram).toBe('https://instagram.com/aleteauy')
    expect(borrador.portada.accionPrincipal.enlace).toBe('/actividades/')
  })

  it('rechaza límites, enlaces y metadatos inválidos antes de guardar', () => {
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.seo.titulo = 'x'.repeat(66)
    invalido.navegacion[0].enlace = 'javascript:alert(1)'
    invalido.impacto.cifras = Array.from({ length: 7 }, () => ({ valor: 1, etiqueta: 'cifra' }))
    expect(validarContenidoPaginaWeb(invalido)).toEqual(expect.arrayContaining([
      'El título para buscadores debe tener entre 1 y 65 caracteres.',
      'Enlace no contiene un enlace válido.',
      'La página puede tener hasta 6 cifras.',
    ]))
  })

  it('solo permite mostrar actividades con la ficha esencial completa', () => {
    const incompleto = clonarContenidoPaginaWeb(contenidoInicial)
    incompleto.paginas.actividades.propuestas = [{ id: 'nueva', titulo: 'Nueva actividad', queEs: '', paraQuien: '', cuando: '', visible: true, orden: 1, accion: { etiqueta: 'Consultar', enlace: '/contacto/' } }]
    expect(validarContenidoPaginaWeb(incompleto)).toContain('Completá título, qué es, para quién y cuándo en la actividad 1 antes de mostrarla.')
  })

  it('solo acepta actividades vigentes o históricas', () => {
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.paginas.actividades.propuestas = [{ id: 'nueva', titulo: 'Nueva actividad', queEs: 'Encuentro', paraQuien: 'Familias', cuando: 'Agosto', vigencia: 'Futura', visible: false, orden: 1, accion: { etiqueta: '', enlace: '' } }]
    expect(validarContenidoPaginaWeb(invalido)).toContain('Elegí si la actividad 1 está vigente o es histórica.')
  })

  it('protege la clasificación de las actividades nuevas', () => {
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.paginas.actividades.propuestas = [{ id: 'nueva', titulo: 'Nueva actividad', queEs: 'Encuentro', paraQuien: 'Familias', area: '', edad: 'Todas', dia: '', cuando: 'Agosto', vigencia: 'Vigente', estadoInscripcion: 'Abierta', visible: true, orden: 1, accion: { etiqueta: 'Consultar', enlace: '/contacto/' } }]
    expect(validarContenidoPaginaWeb(invalido)).toContain('Completá área y día en la actividad 1 antes de mostrarla.')
  })

  it('admite ocho destinos de menú y protege visibilidad, orden y enlaces', () => {
    expect(contenidoInicial.navegacion).toHaveLength(8)
    expect(validarContenidoPaginaWeb(contenidoInicial)).toEqual([])
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.navegacion[0].visible = 'sí'
    invalido.navegacion[1].orden = 0
    invalido.navegacion[2].enlace = ''
    expect(validarContenidoPaginaWeb(invalido)).toEqual(expect.arrayContaining([
      'Indicá si la sección 1 del menú debe mostrarse.',
      'La posición de la sección 2 del menú no es válida.',
      'El enlace de la sección 3 del menú no es válido.',
    ]))
  })

  it('permite preparar páginas temáticas ocultas y exige completarlas antes de mostrarlas', () => {
    expect(contenidoInicial.paginas.familias.visible).toBe(true)
    expect(contenidoInicial.paginas.formacion.visible).toBe(true)
    const incompleto = clonarContenidoPaginaWeb(contenidoInicial)
    incompleto.paginas.familias = { visible: true, etiqueta: 'Familias', titulo: '', introduccion: '', bloques: [], acciones: [] }
    expect(validarContenidoPaginaWeb(incompleto)).toEqual(expect.arrayContaining([
      'Completá identificación, título e introducción de Familias antes de mostrarla.',
      'Agregá al menos un bloque a Familias antes de mostrarla.',
      'Agregá al menos un botón a Familias antes de mostrarla.',
    ]))
  })

  it('protege Recursos y Tienda hasta que tengan contenido publicable', () => {
    expect(contenidoInicial.paginas.recursos.visible).toBe(true)
    expect(contenidoInicial.paginas.tienda.visible).toBe(true)
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.paginas.recursos.visible = true
    invalido.paginas.recursos.recursos[0].enlace = ''
    invalido.paginas.tienda.visible = true
    invalido.paginas.tienda.productos = []
    expect(validarContenidoPaginaWeb(invalido)).toEqual(expect.arrayContaining([
      'Completá título, categoría y enlace del recurso 1.',
      'Mostrá al menos un producto completo antes de activar la página Tienda.',
    ]))
  })

  it('protege Actualidad hasta que exista una publicación completa y visible', () => {
    expect(contenidoInicial.paginas.actualidad.visible).toBe(true)
    const invalido = clonarContenidoPaginaWeb(contenidoInicial)
    invalido.paginas.actualidad.visible = true
    invalido.paginas.actualidad.novedades = [{ id: 'nueva', fecha: '', categoria: 'Noticia', titulo: 'Nueva', resumen: '', contenido: '', imagen: { src: '', textoAlternativo: '' }, visible: true, orden: 1 }]
    expect(validarContenidoPaginaWeb(invalido)).toEqual(expect.arrayContaining([
      'Completá fecha, categoría, textos e imagen de la publicación 1.',
    ]))

    const fechaImposible = clonarContenidoPaginaWeb(contenidoInicial)
    fechaImposible.paginas.actualidad.novedades = [{ id: 'nueva', fecha: '2026-02-31', categoria: 'Noticia', titulo: 'Nueva', resumen: 'Resumen', contenido: 'Contenido', imagen: { src: '/assets/images/comunidad.webp', textoAlternativo: 'Comunidad' }, visible: true, orden: 1 }]
    expect(validarContenidoPaginaWeb(fechaImposible)).toEqual(expect.arrayContaining([
      'Completá fecha, categoría, textos e imagen de la publicación 1.',
    ]))

    const borradorSinEstado = clonarContenidoPaginaWeb(contenidoInicial)
    borradorSinEstado.paginas.actualidad.novedades = [{ id: 'nueva', fecha: '2026-08-24', categoria: 'Noticia', titulo: 'Nueva', resumen: '', contenido: '', imagen: { src: '', textoAlternativo: '' }, orden: 1 }]
    expect(validarContenidoPaginaWeb(borradorSinEstado)).toEqual(expect.arrayContaining([
      'Indicá si la publicación 1 debe mostrarse.',
    ]))
  })

  it('protege Formación hasta que exista una propuesta completa y visible', () => {
    expect(contenidoInicial.paginas.formacion.propuestasFormativas).toHaveLength(1)
    const sinPropuestas = clonarContenidoPaginaWeb(contenidoInicial)
    sinPropuestas.paginas.formacion.propuestasFormativas = []
    sinPropuestas.paginas.formacion.visible = true
    expect(validarContenidoPaginaWeb(sinPropuestas)).toEqual(expect.arrayContaining([
      'Mostrá al menos una propuesta completa antes de activar la página Formación.',
    ]))

    const incompleta = clonarContenidoPaginaWeb(contenidoInicial)
    incompleta.paginas.formacion.propuestasFormativas = [{ id: 'curso', titulo: 'Curso', categoriaFormacion: 'Profesional', proximaEdicion: '', modalidad: 'Virtual', duracion: '', horarios: '', precio: '', estadoInscripcion: 'Próximamente', visible: true, orden: 1, accion: { etiqueta: 'Consultar', enlace: '/contacto/' } }]
    expect(validarContenidoPaginaWeb(incompleta)).toEqual(expect.arrayContaining([
      'Completá los datos de la propuesta formativa 1 antes de mostrarla.',
    ]))
  })

  it('mantiene los formularios públicos ocultos hasta que tengan un enlace generado por el gestor', () => {
    expect(contenidoInicial.paginas.contacto.formularios).toHaveLength(2)
    const incompleto = clonarContenidoPaginaWeb(contenidoInicial)
    incompleto.paginas.contacto.formularios = [{ id: 'familias', titulo: 'Orientación para familias', descripcion: '', categoria: 'Familias', enlace: '', accionEtiqueta: 'Completar', visible: true, orden: 1 }]
    expect(validarContenidoPaginaWeb(incompleto)).toContain('Completá los datos, el equipo responsable y usá el enlace público del gestor en el formulario 1 antes de mostrarlo.')

    const valido = clonarContenidoPaginaWeb(contenidoInicial)
    valido.paginas.contacto.formularios = [{ id: 'familias', titulo: 'Orientación para familias', descripcion: 'Contanos qué necesitás para derivar tu consulta.', categoria: 'Familias', enlace: 'https://gestor.aletea.org/formulario.html?id=familias-uy', accionEtiqueta: 'Completar formulario', visible: true, orden: 1 }]
    expect(validarContenidoPaginaWeb(valido)).toEqual([])

    const nuevoSinResponsable = clonarContenidoPaginaWeb(contenidoInicial)
    nuevoSinResponsable.paginas.contacto.formularios = [{ id: 'familias', titulo: 'Orientación para familias', descripcion: 'Contanos qué necesitás para derivar tu consulta.', categoria: 'Familias', responsable: '', enlace: 'https://gestor.aletea.org/formulario.html?id=familias-uy', accionEtiqueta: 'Completar formulario', visible: true, orden: 1 }]
    expect(validarContenidoPaginaWeb(nuevoSinResponsable)).toContain('Completá los datos, el equipo responsable y usá el enlace público del gestor en el formulario 1 antes de mostrarlo.')
  })
})
