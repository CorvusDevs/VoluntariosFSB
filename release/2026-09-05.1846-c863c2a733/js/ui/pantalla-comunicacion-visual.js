import { boton, elemento, vaciar } from './componentes.js'
import { cargarImagen, descargar } from '../imagen/exportar.js'
import { cargarImagenRemota } from '../imagen/cargar-remota.js'
import { puedeCrearCartaMembretada, puedeUsarComunicacionVisual } from '../acceso/permisos-funciones.js'
import {
  FORMATOS_COMUNICACION, FUENTES_COMUNICACION, PALETAS_COMUNICACION, PLANTILLAS_COMUNICACION,
  advertenciasComunicacion, crearDisenoComunicacion, datosComunicacionActivos, normalizarDisenoComunicacion,
  ESCALA_TITULO_MAXIMA, pintarComunicacionVisual, svgDesdeLienzo, textoPublicacionComunicacion,
} from '../imagen/comunicacion-visual.js'
import { normalizarCampoEnlace } from '../util/enlaces.js'
import { crearPantallaCertificados } from './pantalla-certificados.js'

const PREFIJO_BORRADOR = 'aletea:comunicacion-visual:v1'

function identidad(sesion = {}) {
  return String(sesion.correo || sesion.usuario || sesion.nombre || 'cuenta')
    .trim().toLocaleLowerCase('es-UY').replace(/[^a-z0-9@._-]+/g, '-').slice(0, 120) || 'cuenta'
}

export function claveBorradorComunicacion(sesion = {}) {
  return `${PREFIJO_BORRADOR}:${identidad(sesion)}`
}

export function leerBorradorComunicacion(sesion = {}, almacen = globalThis.localStorage) {
  try {
    const valor = JSON.parse(almacen?.getItem(claveBorradorComunicacion(sesion)) || 'null')
    if (!valor) return crearDisenoComunicacion()
    const normalizado = normalizarDisenoComunicacion(valor)
    // Las cartas pueden contener cuerpo privado y una firma. Los borradores de
    // versiones anteriores no vuelven a exponerse desde almacenamiento local.
    if (normalizado.diseno.composicion === 'carta') {
      almacen?.removeItem?.(claveBorradorComunicacion(sesion))
      return crearDisenoComunicacion()
    }
    return normalizado
  } catch { return crearDisenoComunicacion() }
}

export function guardarBorradorComunicacion(valor, sesion = {}, almacen = globalThis.localStorage) {
  const normalizado = normalizarDisenoComunicacion(valor)
  // Una carta oficial no se persiste: ni el cuerpo ni la firma deben quedar en
  // localStorage después de cerrar la sesión o compartir el dispositivo.
  if (normalizado.diseno.composicion === 'carta') return false
  try { almacen?.setItem(claveBorradorComunicacion(sesion), JSON.stringify(normalizado)); return true } catch { return false }
}

function descargarTexto(texto, tipo, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const enlace = document.createElement('a')
  enlace.href = url; enlace.download = nombre
  document.body.appendChild(enlace); enlace.click(); enlace.remove(); URL.revokeObjectURL(url)
}

export function htmlCartaDesdeLienzo(canvas) {
  return `<!doctype html><html><head><title>Carta membretada de Aletea</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;width:210mm;height:297mm;overflow:hidden}img{position:fixed;top:-.3mm;left:0;display:block;width:210mm;height:297.3mm;object-fit:fill}</style></head><body><img alt="Carta membretada de Aletea" src="${canvas.toDataURL('image/png')}"></body></html>`
}

export function imprimirCartaDesdeLienzo(canvas, documento = globalThis.document) {
  const marco = documento.createElement('iframe')
  marco.title = 'Carta membretada lista para imprimir'
  marco.style.position = 'fixed'; marco.style.right = '100vw'; marco.style.bottom = '100vh'; marco.style.width = '1px'; marco.style.height = '1px'; marco.style.border = '0'
  documento.body.appendChild(marco)
  const destino = marco.contentDocument
  destino.open()
  destino.write(htmlCartaDesdeLienzo(canvas))
  destino.close()
  const imagen = destino.querySelector('img')
  const imprimir = () => {
    marco.contentWindow?.focus?.(); marco.contentWindow?.print?.()
    globalThis.setTimeout?.(() => marco.remove(), 1200)
  }
  if (imagen?.complete) imprimir(); else imagen?.addEventListener('load', imprimir, { once: true })
}

function campoTexto(datos, configuracion, alCambiar) {
  const { campo, etiqueta, ayuda = '', multilinea = false } = configuracion
  const envoltorio = elemento('label', ['comunicacion-visual-campo'])
  envoltorio.dataset.campoContenedor = campo
  envoltorio.appendChild(elemento('span', ['comunicacion-visual-campo-rotulo'], etiqueta))
  const control = document.createElement(multilinea ? 'textarea' : 'input')
  if (!multilinea) control.type = 'text'
  control.value = datos[campo] ?? ''
  control.dataset.campo = campo
  control.addEventListener('input', () => alCambiar(campo, control.value))
  envoltorio.appendChild(control)
  if (ayuda) envoltorio.appendChild(elemento('small', [], ayuda))
  return envoltorio
}

function controlRango(estado, configuracion, alCambiar) {
  const { campo, etiqueta, min, max, step, sufijo = '' } = configuracion
  const envoltorio = elemento('label', ['comunicacion-visual-rango'])
  const rotulo = elemento('span', [])
  const valor = elemento('strong', [], `${estado.diseno[campo]}${sufijo}`)
  rotulo.append(document.createTextNode(etiqueta), valor)
  const control = document.createElement('input')
  control.type = 'range'; control.min = min; control.max = max; control.step = step; control.value = estado.diseno[campo]
  control.addEventListener('input', () => {
    const siguiente = Number(control.value)
    valor.textContent = `${siguiente}${sufijo}`
    alCambiar(campo, siguiente)
  })
  envoltorio.append(rotulo, control)
  return envoltorio
}

function interruptor(estado, campo, etiqueta, alCambiar) {
  const envoltorio = elemento('label', ['comunicacion-visual-interruptor'])
  const control = document.createElement('input')
  control.type = 'checkbox'; control.checked = Boolean(estado.diseno[campo])
  control.addEventListener('change', () => alCambiar(campo, control.checked))
  envoltorio.append(control, elemento('span', [], etiqueta))
  return envoltorio
}

export function crearPantallaComunicacionVisual(raiz, opciones = {}) {
  const sesion = opciones.sesion ?? {}
  if (!puedeUsarComunicacionVisual(sesion)) {
    raiz.appendChild(elemento('div', ['mensaje-error'], 'Tu perfil no puede abrir el editor de comunicación visual.'))
    return { olvidar() {} }
  }
  const puedeCrearCarta = puedeCrearCartaMembretada(sesion)
  const almacen = opciones.almacen ?? globalThis.localStorage
  const crearContexto = opciones.crearContexto ?? ((canvas) => canvas.getContext('2d'))
  const cargarLogo = opciones.cargarLogo ?? (() => cargarImagen('assets/logo-aletea-violeta.png'))
  const descargarPNG = opciones.descargarPNG ?? descargar
  const descargarSVG = opciones.descargarSVG ?? descargarTexto
  const imprimirCarta = opciones.imprimirCarta ?? imprimirCartaDesdeLienzo
  const cargarFoto = opciones.cargarFoto ?? cargarImagen
  const copiarTexto = opciones.copiarTexto ?? ((texto) => navigator.clipboard?.writeText?.(texto))
  const confirmar = opciones.confirmar ?? ((mensaje) => globalThis.confirm?.(mensaje) ?? true)
  const cargarDesdeUrl = opciones.cargarDesdeUrl ?? cargarImagenRemota
  const leerArchivo = opciones.leerArchivo ?? ((archivo) => new Promise((resolver, rechazar) => {
    const lector = new FileReader(); lector.onload = () => resolver(String(lector.result || '')); lector.onerror = rechazar; lector.readAsDataURL(archivo)
  }))
  let estado = leerBorradorComunicacion(sesion, almacen)
  let logo = null
  let foto = null
  let vivo = true
  let pestana = 'texto'
  let ultimoPlano = null
  let aviso = ''
  let nombreFoto = ''
  let modoCertificados = false
  let vistaCertificados = null

  function cargarFuenteSeleccionada() {
    const fuente = FUENTES_COMUNICACION[estado.diseno.fuente] ?? FUENTES_COMUNICACION.poppins
    return document.fonts?.load?.(`400 32px ${fuente.familia}`) ?? Promise.resolve()
  }

  const contenedor = elemento('section', ['comunicacion-visual'])
  raiz.appendChild(contenedor)

  function nombreArchivo(extension, sufijo = '') {
    const nombrePredeterminado = estado.diseno.composicion === 'carta' ? 'carta-membretada' : 'pieza-aletea'
    const base = String(datosComunicacionActivos(estado).titulo || nombrePredeterminado).split('\n')[0]
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return `aletea-${base || 'comunicacion'}${sufijo}.${extension}`
  }

  function guardarYRepintar(canvas, mensaje = 'Borrador guardado en este dispositivo') {
    const persistido = guardarBorradorComunicacion(estado, sesion, almacen)
    aviso = estado.diseno.composicion === 'carta'
      ? 'Privacidad activa: la carta y la firma se eliminan al cerrar esta pestaña'
      : (persistido ? mensaje : 'No se pudo guardar el borrador en este dispositivo')
    const ctx = crearContexto(canvas)
    if (ctx) ultimoPlano = pintarComunicacionVisual(ctx, estado, logo, foto)
    const estadoEl = contenedor.querySelector('[data-comunicacion-estado]')
    if (estadoEl) estadoEl.textContent = aviso
  }

  function dibujar() {
    vaciar(contenedor)
    if (modoCertificados) {
      vistaCertificados = crearPantallaCertificados(contenedor, { alVolver: () => { vistaCertificados?.olvidar?.(); vistaCertificados = null; modoCertificados = false; dibujar() } })
      return
    }
    const esCarta = estado.diseno.composicion === 'carta'
    const cabecera = elemento('header', ['comunicacion-visual-encabezado'])
    const titulos = elemento('div', [])
    titulos.append(elemento('p', ['comunicacion-visual-sobrelinea'], 'Comunicación visual'), elemento('h1', [], esCarta ? 'Creá una carta membretada' : 'Creá una pieza de Aletea'), elemento('p', ['ayuda'], esCarta ? 'Editá el membrete y el contenido sobre una hoja A4 lista para imprimir o guardar como PDF.' : 'Elegí qué querés comunicar. El editor organiza el diseño, el carrusel y el texto para publicar.'))
    const acciones = elemento('div', ['comunicacion-visual-acciones'])
    const bajarPNG = boton('Descargar PNG', async () => {
      bajarPNG.disabled = true
      try { await cargarFuenteSeleccionada(); guardarYRepintar(lienzo, aviso); await descargarPNG(lienzo, nombreArchivo('png')); aviso = 'PNG descargado' } finally { bajarPNG.disabled = false; estadoEl.textContent = aviso }
    }, esCarta ? [] : ['boton-principal'])
    const bajarSVG = boton('Descargar SVG', async () => {
      await cargarFuenteSeleccionada(); guardarYRepintar(lienzo, aviso)
      descargarSVG(svgDesdeLienzo(lienzo), 'image/svg+xml', nombreArchivo('svg')); aviso = 'SVG descargado'; estadoEl.textContent = aviso
    })
    const reiniciar = boton('Restablecer plantilla', () => {
      if (!confirmar('¿Querés descartar los cambios y volver a la plantilla original?')) return
      estado = crearDisenoComunicacion(estado.plantilla); foto = null; pestana = 'texto'; dibujar()
    })
    if (esCarta) {
      const imprimir = boton('Imprimir o guardar PDF', async () => {
        imprimir.disabled = true
        try { await cargarFuenteSeleccionada(); guardarYRepintar(lienzo, aviso); imprimirCarta(lienzo); aviso = 'Carta preparada para imprimir o guardar como PDF' } finally { imprimir.disabled = false; estadoEl.textContent = aviso }
      }, ['boton-principal'])
      acciones.append(imprimir, bajarPNG, reiniciar)
    } else acciones.append(bajarPNG, bajarSVG, reiniciar)
    if (estado.diapositivas.length > 1) {
      const bajarCarrusel = boton('Descargar carrusel', async () => {
        bajarCarrusel.disabled = true
        const paginaOriginal = estado.diseno.paginaActiva; const fotoOriginal = foto
        try {
          for (let indice = 0; indice < estado.diapositivas.length; indice += 1) {
            estado = { ...estado, diseno: { ...estado.diseno, paginaActiva: indice } }
            const fotoPagina = datosComunicacionActivos(estado).foto
            foto = fotoPagina ? await cargarFoto(fotoPagina) : null
            guardarYRepintar(lienzo, `Preparando página ${indice + 1}`)
            await descargarPNG(lienzo, nombreArchivo('png', `-${String(indice + 1).padStart(2, '0')}`))
          }
          aviso = `${estado.diapositivas.length} páginas descargadas`
        } finally {
          estado = { ...estado, diseno: { ...estado.diseno, paginaActiva: paginaOriginal } }; foto = fotoOriginal
          guardarYRepintar(lienzo, aviso); bajarCarrusel.disabled = false
        }
      }, ['boton-principal'])
      acciones.prepend(bajarCarrusel)
    }
    cabecera.append(titulos, acciones)

    const plantillas = elemento('section', ['comunicacion-visual-plantillas'])
    plantillas.appendChild(elemento('h2', [], '¿Qué querés crear?'))
    const listaPlantillas = elemento('div', ['comunicacion-visual-plantillas-lista'])
    Object.entries(PLANTILLAS_COMUNICACION).forEach(([clave, plantilla]) => {
      if (plantilla.composicion === 'carta' && !puedeCrearCarta) return
      const control = elemento('button', ['comunicacion-visual-plantilla'])
      control.type = 'button'; control.dataset.plantilla = clave
      control.setAttribute('aria-pressed', estado.plantilla === clave ? 'true' : 'false')
      if (estado.plantilla === clave) control.classList.add('activa')
      const muestra = elemento('span', ['comunicacion-visual-plantilla-muestra', `comunicacion-visual-plantilla-${plantilla.paleta}`], plantilla.datos.etiqueta)
      control.append(muestra, elemento('strong', [], plantilla.nombre), elemento('small', [], `${plantilla.categoria} · ${plantilla.descripcion}`))
      control.addEventListener('click', () => { estado = crearDisenoComunicacion(clave); foto = null; pestana = 'texto'; guardarBorradorComunicacion(estado, sesion, almacen); dibujar() })
      listaPlantillas.appendChild(control)
    })
    if (puedeCrearCarta) {
      const certificados = elemento('button', ['comunicacion-visual-plantilla', 'comunicacion-visual-plantilla-certificados'])
      certificados.type = 'button'; certificados.dataset.plantilla = 'certificados'
      const muestra = elemento('span', ['comunicacion-visual-plantilla-muestra', 'comunicacion-visual-plantilla-magenta'], 'A4')
      certificados.append(muestra, elemento('strong', [], 'Certificados'), elemento('small', [], 'Importación y descarga masiva'))
      certificados.addEventListener('click', () => { modoCertificados = true; dibujar() })
      listaPlantillas.appendChild(certificados)
    }
    plantillas.appendChild(listaPlantillas)

    const paginas = elemento('section', ['comunicacion-visual-paginas'])
    if (estado.diapositivas.length) {
      const paginasCabecera = elemento('div', ['comunicacion-visual-paginas-cabecera'])
      const paginasTitulo = elemento('div', [])
      paginasTitulo.append(elemento('strong', [], 'Carrusel'), elemento('small', [], 'Cada tarjeta es una imagen independiente.'))
      paginasCabecera.appendChild(paginasTitulo)
      const duplicar = boton('Duplicar página', () => {
        if (estado.diapositivas.length >= 10) return
        const indice = estado.diseno.paginaActiva
        const siguientes = estado.diapositivas.slice(); siguientes.splice(indice + 1, 0, { ...siguientes[indice], titulo: `${siguientes[indice].titulo}\n` })
        estado = { ...estado, diapositivas: siguientes, diseno: { ...estado.diseno, paginaActiva: indice + 1 } }; foto = null; dibujar()
      })
      paginasCabecera.appendChild(duplicar); paginas.appendChild(paginasCabecera)
      const tira = elemento('div', ['comunicacion-visual-paginas-tira'])
      estado.diapositivas.forEach((pagina, indice) => {
        const paginaBoton = elemento('button', ['comunicacion-visual-pagina'])
        paginaBoton.type = 'button'; paginaBoton.setAttribute('aria-pressed', indice === estado.diseno.paginaActiva ? 'true' : 'false')
        paginaBoton.append(elemento('span', [], String(indice + 1).padStart(2, '0')), elemento('strong', [], String(pagina.titulo || 'Sin título').replace(/\n/g, ' ').slice(0, 40)))
        paginaBoton.addEventListener('click', () => { estado = { ...estado, diseno: { ...estado.diseno, paginaActiva: indice } }; foto = null; dibujar() })
        tira.appendChild(paginaBoton)
      })
      if (estado.diapositivas.length > 1) {
        const eliminar = boton('Eliminar página', () => {
          const siguientes = estado.diapositivas.filter((_, indice) => indice !== estado.diseno.paginaActiva)
          estado = { ...estado, diapositivas: siguientes, diseno: { ...estado.diseno, paginaActiva: Math.max(0, estado.diseno.paginaActiva - 1) } }; foto = null; dibujar()
        })
        tira.appendChild(eliminar)
      }
      paginas.appendChild(tira)
    }

    const trabajo = elemento('div', ['comunicacion-visual-trabajo'])
    const vista = elemento('section', ['comunicacion-visual-vista'])
    const vistaCabecera = elemento('div', ['comunicacion-visual-vista-cabecera'])
    const vistaTexto = elemento('div', [])
    const advertencias = advertenciasComunicacion(estado)
    vistaTexto.append(elemento('strong', [], estado.diapositivas.length ? `Vista previa · Página ${estado.diseno.paginaActiva + 1} de ${estado.diapositivas.length}` : 'Vista previa'), elemento('small', [], `${FORMATOS_COMUNICACION[estado.diseno.formato].ancho} x ${FORMATOS_COMUNICACION[estado.diseno.formato].alto} px${advertencias.length ? ` · ${advertencias[0]}` : esCarta ? ' · Lista para imprimir' : ' · Lista para publicar'}`))
    const estadoEl = elemento('span', ['comunicacion-visual-estado'], aviso || 'Borrador guardado en este dispositivo')
    estadoEl.dataset.comunicacionEstado = ''; estadoEl.setAttribute('role', 'status'); estadoEl.setAttribute('aria-live', 'polite')
    vistaCabecera.append(vistaTexto, estadoEl)
    const marco = elemento('div', ['comunicacion-visual-lienzo-marco'])
    const lienzo = document.createElement('canvas')
    lienzo.className = 'comunicacion-visual-lienzo'; lienzo.setAttribute('role', 'img')
    lienzo.setAttribute('aria-label', 'Vista previa editable de la pieza de Aletea')
    lienzo.addEventListener('click', (evento) => {
      if (!ultimoPlano) return
      const rect = lienzo.getBoundingClientRect()
      const px = (evento.clientX - rect.left) * lienzo.width / rect.width
      const py = (evento.clientY - rect.top) * lienzo.height / rect.height
      const { escala, ox, oy } = ultimoPlano.transformacion
      const x = (px - ox) / escala; const y = (py - oy) / escala
      const zona = [...ultimoPlano.zonas].reverse().find((item) => x >= item.x && x <= item.x + item.ancho && y >= item.y && y <= item.y + item.alto)
      if (!zona) return
      pestana = 'texto'; pintarPanel()
      const control = contenedor.querySelector(`[data-campo="${zona.campo}"]`)
      control?.focus(); control?.closest('[data-campo-contenedor]')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    })
    marco.appendChild(lienzo); vista.append(vistaCabecera, marco)

    const editor = elemento('section', ['comunicacion-visual-editor'])
    const pestanas = elemento('div', ['comunicacion-visual-pestanas'])
    ;[['texto', 'Texto'], ['estilo', 'Estilo'], ['elementos', 'Elementos'], ['publicacion', esCarta ? 'Revisión' : 'Publicación']].forEach(([clave, etiqueta]) => {
      const control = boton(etiqueta, () => { pestana = clave; pintarPanel() })
      control.dataset.pestana = clave
      pestanas.appendChild(control)
    })
    const panel = elemento('div', ['comunicacion-visual-panel'])
    editor.append(pestanas, panel)
    trabajo.append(vista, editor)
    contenedor.append(cabecera, plantillas)
    if (estado.diapositivas.length) contenedor.appendChild(paginas)
    contenedor.appendChild(trabajo)

    function cambiarDato(campo, valor) {
      if (estado.diapositivas.length) {
        const diapositivas = estado.diapositivas.map((datos, indice) => indice === estado.diseno.paginaActiva ? { ...datos, [campo]: valor } : datos)
        estado = { ...estado, diapositivas }
      } else estado = { ...estado, datos: { ...estado.datos, [campo]: valor } }
      guardarYRepintar(lienzo)
    }
    function cambiarDiseno(campo, valor) {
      estado = { ...estado, diseno: { ...estado.diseno, [campo]: valor } }
      guardarYRepintar(lienzo)
      if (campo === 'formato') vistaTexto.querySelector('small').textContent = `${FORMATOS_COMUNICACION[valor].ancho} x ${FORMATOS_COMUNICACION[valor].alto} px`
      if (campo === 'fuente') Promise.resolve(cargarFuenteSeleccionada()).then(() => guardarYRepintar(lienzo))
    }

    function pintarPanel() {
      vaciar(panel)
      pestanas.querySelectorAll('button').forEach((control) => {
        const activa = control.dataset.pestana === pestana
        control.classList.toggle('activa', activa); control.setAttribute('aria-pressed', activa ? 'true' : 'false')
      })
      if (pestana === 'texto') {
        const datos = datosComunicacionActivos(estado)
        const camposEvento = [
          { campo: 'fondoTitulo', etiqueta: 'Mensaje de fondo' },
          { campo: 'titulo', etiqueta: 'Título principal', multilinea: true, ayuda: 'Usá Enter para elegir dónde corta la línea.' },
          { campo: 'etiqueta', etiqueta: 'Etiqueta destacada' },
          { campo: 'descripcion', etiqueta: 'Descripción', multilinea: true },
          { campo: 'destacado', etiqueta: 'Texto destacado', multilinea: true },
          { campo: 'fecha', etiqueta: 'Fecha' }, { campo: 'hora', etiqueta: 'Hora' },
          { campo: 'modalidad', etiqueta: 'Modalidad o lugar' }, { campo: 'contacto', etiqueta: 'Contacto' },
        ]
        const camposEditorial = [
          { campo: 'titulo', etiqueta: 'Título de esta página', multilinea: true, ayuda: 'Usá Enter para marcar los cortes del titular.' },
          { campo: 'descripcion', etiqueta: 'Texto de apoyo', multilinea: true },
          { campo: 'destacado', etiqueta: 'Cierre destacado', multilinea: true },
        ]
        const camposMensaje = [
          { campo: 'titulo', etiqueta: 'Mensaje principal', multilinea: true, ayuda: 'Tres líneas breves suelen funcionar mejor.' },
          { campo: 'etiqueta', etiqueta: 'Saludo o cierre' },
          { campo: 'descripcion', etiqueta: 'Texto complementario', multilinea: true },
        ]
        const camposCarta = [
          { campo: 'lugarFecha', etiqueta: 'Lugar y fecha' },
          { campo: 'titulo', etiqueta: 'Asunto opcional' },
          { campo: 'saludo', etiqueta: 'Saludo' },
          { campo: 'descripcion', etiqueta: 'Cuerpo de la carta', multilinea: true, ayuda: 'Podés escribir varios párrafos. Revisá siempre la hoja completa.' },
          { campo: 'destacado', etiqueta: 'Párrafo destacado opcional', multilinea: true },
          { campo: 'cierre', etiqueta: 'Despedida' },
          { campo: 'firmante', etiqueta: 'Nombre de quien firma' },
          { campo: 'cargo', etiqueta: 'Cargo' },
          { campo: 'organizacion', etiqueta: 'Organización' },
          { campo: 'telefono', etiqueta: 'Teléfono' },
          { campo: 'sitio', etiqueta: 'Sitio web' },
          { campo: 'correo', etiqueta: 'Correo electrónico' },
        ]
        const camposVisibles = estado.diseno.composicion === 'carta' ? camposCarta : estado.diseno.composicion === 'editorial' ? camposEditorial : estado.diseno.composicion === 'mensaje' ? camposMensaje : camposEvento
        panel.appendChild(elemento('p', ['comunicacion-visual-panel-ayuda'], 'Los cambios aparecen en la imagen mientras escribís.'))
        camposVisibles.forEach((configuracion) => panel.appendChild(campoTexto(datos, configuracion, cambiarDato)))
        const secundarios = document.createElement('details'); secundarios.className = 'comunicacion-visual-avanzado'
        secundarios.appendChild(elemento('summary', [], 'Redes y sitio web'))
        const secundariosCampos = elemento('div', ['comunicacion-visual-campos-secundarios'])
        secundariosCampos.append(campoTexto(datos, { campo: 'red', etiqueta: 'Red social' }, cambiarDato), campoTexto(datos, { campo: 'sitio', etiqueta: 'Sitio web' }, cambiarDato))
        secundarios.appendChild(secundariosCampos)
        if (!esCarta) panel.appendChild(secundarios)
      } else if (pestana === 'estilo') {
        const formato = elemento('label', ['comunicacion-visual-campo'])
        formato.appendChild(elemento('span', ['comunicacion-visual-campo-rotulo'], 'Formato de salida'))
        const select = document.createElement('select')
        Object.entries(FORMATOS_COMUNICACION).filter(([clave]) => esCarta ? clave === 'a4' : clave !== 'a4').forEach(([clave, opcion]) => { const item = new Option(`${opcion.etiqueta} - ${opcion.ancho} x ${opcion.alto}`, clave); item.selected = clave === estado.diseno.formato; select.add(item) })
        select.addEventListener('change', () => cambiarDiseno('formato', select.value)); formato.appendChild(select)
        const paletas = elemento('fieldset', ['comunicacion-visual-paletas'])
        paletas.appendChild(elemento('legend', [], 'Combinación de colores'))
        Object.entries(PALETAS_COMUNICACION).forEach(([clave, colores]) => {
          const control = elemento('button', ['comunicacion-visual-paleta'])
          control.type = 'button'; control.setAttribute('aria-pressed', estado.diseno.paleta === clave ? 'true' : 'false')
          control.style.setProperty('--muestra-principal', colores.principal); control.style.setProperty('--muestra-acento', colores.acento); control.style.setProperty('--muestra-apoyo', colores.apoyo)
          control.append(elemento('span', ['comunicacion-visual-paleta-colores']), elemento('strong', [], { institucional: 'Institucional', turquesa: 'Calma', magenta: 'Energía' }[clave]))
          control.addEventListener('click', () => { cambiarDiseno('paleta', clave); pintarPanel() })
          paletas.appendChild(control)
        })
        const tipografias = elemento('fieldset', ['comunicacion-visual-tipografias'])
        tipografias.appendChild(elemento('legend', [], 'Estilo tipográfico'))
        Object.entries(FUENTES_COMUNICACION).forEach(([clave, fuente]) => {
          const control = elemento('button', ['comunicacion-visual-tipografia'])
          control.type = 'button'; control.dataset.fuente = clave
          control.setAttribute('aria-pressed', estado.diseno.fuente === clave ? 'true' : 'false')
          control.style.setProperty('--muestra-tipografia', fuente.familia)
          const descripcion = clave === 'leagueGothic' ? 'Titulares League Gothic, textos Poppins' : 'Toda la pieza en Poppins'
          const textos = elemento('span', ['comunicacion-visual-tipografia-textos'])
          textos.append(elemento('strong', [], fuente.nombre), elemento('small', [], descripcion))
          control.append(elemento('span', ['comunicacion-visual-tipografia-muestra'], 'Aa'), textos)
          control.addEventListener('click', () => { cambiarDiseno('fuente', clave); pintarPanel() })
          tipografias.appendChild(control)
        })
        if (esCarta) {
          panel.append(formato, paletas, controlRango(estado, { campo: 'escalaTexto', etiqueta: 'Tamaño del texto', min: .82, max: 1.3, step: .01, sufijo: '×' }, cambiarDiseno), interruptor(estado, 'justificarTexto', 'Justificar el cuerpo de la carta', cambiarDiseno))
        } else {
          panel.append(formato, tipografias, paletas, controlRango(estado, { campo: 'escalaTitulo', etiqueta: 'Tamaño del título', min: .72, max: ESCALA_TITULO_MAXIMA, step: .01, sufijo: '×' }, cambiarDiseno))
          if (estado.diseno.composicion === 'evento') panel.appendChild(controlRango(estado, { campo: 'giroEtiqueta', etiqueta: 'Giro de la etiqueta', min: -20, max: 20, step: 1, sufijo: '°' }, cambiarDiseno))
          panel.appendChild(interruptor(estado, 'tituloMulticolor', 'Alternar colores del título', cambiarDiseno))
        }
      } else if (pestana === 'elementos') {
        const lista = elemento('div', ['comunicacion-visual-interruptores'])
        const elementosEvento = [
          ['mostrarRedes', 'Red social y sitio'], ['mostrarFondoTitulo', 'Mensaje grande de fondo'],
          ['mostrarEtiqueta', 'Etiqueta inclinada'], ['mostrarDetalles', 'Fecha, hora y modalidad'],
          ['mostrarLogo', 'Logo de Aletea'], ['mostrarBanda', 'Banda tricolor'],
        ]
        const elementosEditorial = [['mostrarRedes', 'Red social y sitio'], ['mostrarFoto', 'Espacio para fotografía'], ['mostrarDesliza', 'Indicador Deslizá'], ['mostrarLogo', 'Logo de Aletea'], ['mostrarBanda', 'Barra tricolor lateral']]
        const elementosMensaje = [['mostrarRedes', 'Red social y sitio'], ['mostrarEtiqueta', 'Saludo o cierre'], ['mostrarLogo', 'Logo de Aletea'], ['mostrarBanda', 'Banda tricolor inferior']]
        const elementosCarta = [['mostrarLogo', 'Logo de Aletea'], ['mostrarContacto', 'Datos de contacto'], ['mostrarFirma', 'Firma'], ['mostrarBanda', 'Barra institucional superior'], ['mostrarNumeroPagina', 'Número de página']]
        const elementosVisibles = estado.diseno.composicion === 'carta' ? elementosCarta : estado.diseno.composicion === 'editorial' ? elementosEditorial : estado.diseno.composicion === 'mensaje' ? elementosMensaje : elementosEvento
        elementosVisibles.forEach(([campo, etiqueta]) => lista.appendChild(interruptor(estado, campo, etiqueta, cambiarDiseno)))
        const fotoCampo = elemento('section', ['comunicacion-visual-foto'])
        fotoCampo.append(elemento('strong', [], esCarta ? 'Firma' : 'Fotografía'), elemento('small', [], esCarta ? 'Usá una firma en PNG con fondo transparente o una imagen clara. Se guarda solo en este dispositivo.' : 'Usá una imagen horizontal, clara y con permiso de uso. Se guarda solo en este dispositivo.'))
        const entradaFoto = document.createElement('input'); entradaFoto.type = 'file'; entradaFoto.accept = 'image/png,image/jpeg,image/webp'; entradaFoto.hidden = true; entradaFoto.tabIndex = -1
        const elegirFoto = boton(esCarta ? 'Elegir firma' : 'Elegir imagen', () => entradaFoto.click(), ['comunicacion-visual-elegir-foto'])
        elegirFoto.dataset.campo = 'foto'
        const nombreElegido = elemento('span', ['comunicacion-visual-nombre-archivo'], nombreFoto || 'Ningún archivo seleccionado')
        entradaFoto.addEventListener('change', async () => {
          const archivo = entradaFoto.files?.[0]; if (!archivo) return
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type)) { estadoEl.textContent = 'Elegí una imagen JPG, PNG o WebP'; return }
          if (archivo.size > 8 * 1024 * 1024) { estadoEl.textContent = 'La imagen supera el máximo de 8 MB'; return }
          const dataUrl = await leerArchivo(archivo); foto = await cargarFoto(dataUrl)
          if (!foto) { estadoEl.textContent = 'No pudimos leer esa imagen'; return }
          cambiarDato('foto', dataUrl); nombreFoto = archivo.name; guardarYRepintar(lienzo, esCarta ? 'Firma agregada' : 'Foto agregada')
          pintarPanel()
        })
        const selectorArchivo = elemento('div', ['comunicacion-visual-selector-archivo'])
        selectorArchivo.append(entradaFoto, elegirFoto, nombreElegido)
        const enlace = document.createElement('details'); enlace.className = 'comunicacion-visual-enlace'
        enlace.appendChild(elemento('summary', [], esCarta ? 'Usar una firma desde un enlace' : 'Usar una imagen desde un enlace'))
        const campoUrl = elemento('label', ['comunicacion-visual-campo'])
        campoUrl.appendChild(elemento('span', ['comunicacion-visual-campo-rotulo'], 'Enlace de la imagen'))
        const entradaUrl = document.createElement('input'); entradaUrl.type = 'url'; entradaUrl.placeholder = 'https://drive.google.com/file/d/...'; entradaUrl.autocomplete = 'off'
        campoUrl.append(entradaUrl, elemento('small', [], 'Acepta enlaces directos y archivos públicos de Google Drive.'))
        const cargarUrl = boton('Cargar imagen', async () => {
          normalizarCampoEnlace(entradaUrl)
          if (!entradaUrl.reportValidity()) return
          cargarUrl.disabled = true; estadoEl.textContent = 'Cargando imagen...'
          try {
            const dataUrl = await cargarDesdeUrl(entradaUrl.value)
            foto = await cargarFoto(dataUrl)
            if (!foto) throw new Error('El enlace no contiene una imagen que podamos usar.')
            cambiarDato('foto', dataUrl); nombreFoto = 'Imagen desde enlace'; guardarYRepintar(lienzo, esCarta ? 'Firma cargada desde el enlace' : 'Foto cargada desde el enlace'); pintarPanel()
          } catch (error) { estadoEl.textContent = error?.message || 'No pudimos cargar esa imagen.' }
          finally { cargarUrl.disabled = false }
        }, ['boton-principal'])
        const accionesEnlace = elemento('div', ['comunicacion-visual-enlace-acciones'])
        accionesEnlace.append(cargarUrl, elemento('small', [], 'En Drive, elegí Compartir y permití acceso a cualquier persona con el enlace.'))
        enlace.append(campoUrl, accionesEnlace)
        fotoCampo.append(selectorArchivo, enlace)
        const quitarFoto = boton(esCarta ? 'Quitar firma' : 'Quitar foto', () => { cambiarDato('foto', ''); foto = null; nombreFoto = ''; guardarYRepintar(lienzo, esCarta ? 'Firma quitada' : 'Foto quitada'); pintarPanel() })
        panel.appendChild(elemento('p', ['comunicacion-visual-panel-ayuda'], 'Mostrá solo los elementos que ayudan a comunicar.'))
        if (estado.diseno.composicion === 'editorial' || esCarta) panel.append(fotoCampo, quitarFoto)
        panel.appendChild(lista)
      } else {
        const texto = textoPublicacionComunicacion(estado)
        const calidad = elemento('div', ['comunicacion-visual-calidad'])
        const alertas = advertenciasComunicacion(estado)
        calidad.append(elemento('strong', [], alertas.length ? (esCarta ? 'Revisá antes de imprimir' : 'Revisá antes de publicar') : (esCarta ? 'La carta está lista' : 'La pieza está lista')), elemento('span', [], alertas.length ? alertas.join(' ') : (esCarta ? 'El cuerpo, el membrete y la firma respetan el espacio de la hoja A4.' : 'Título y descripción tienen una extensión adecuada.')))
        const vistaTextoPublicacion = document.createElement('textarea'); vistaTextoPublicacion.readOnly = true; vistaTextoPublicacion.value = texto; vistaTextoPublicacion.setAttribute('aria-label', esCarta ? 'Texto completo de la carta' : 'Texto sugerido para la publicación')
        const copiar = boton(esCarta ? 'Copiar texto de la carta' : 'Copiar texto para Instagram', async () => { await copiarTexto(texto); aviso = 'Texto copiado'; estadoEl.textContent = aviso }, ['boton-principal'])
        panel.append(elemento('p', ['comunicacion-visual-panel-ayuda'], esCarta ? 'Revisá la carta completa antes de imprimir o guardar el PDF.' : 'Copiá este texto como punto de partida. Revisalo antes de publicarlo.'), calidad, vistaTextoPublicacion, copiar)
      }
    }

    pintarPanel(); guardarYRepintar(lienzo, aviso || 'Borrador guardado en este dispositivo')
    const fotoActual = datosComunicacionActivos(estado).foto
    if (fotoActual) Promise.resolve(cargarFoto(fotoActual)).then((imagen) => { if (!vivo) return; foto = imagen; guardarYRepintar(lienzo, aviso) }).catch(() => {})
  }

  dibujar()
  Promise.resolve(cargarFuenteSeleccionada()).then(() => {
    if (!vivo) return
    const lienzo = contenedor.querySelector('canvas')
    if (lienzo) guardarYRepintar(lienzo, aviso || 'Borrador guardado en este dispositivo')
  })
  Promise.resolve(cargarLogo()).then((imagen) => {
    if (!vivo || !imagen) return
    logo = imagen
    const lienzo = contenedor.querySelector('canvas')
    if (lienzo) guardarYRepintar(lienzo, aviso || 'Borrador guardado en este dispositivo')
  })
  return { olvidar() { vivo = false; vistaCertificados?.olvidar?.() } }
}
