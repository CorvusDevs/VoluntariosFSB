import { elemento, boton, vaciar } from './componentes.js'
import { selectorVisual } from './selector-visual.js'
import { dibujarMuestra } from './muestra-celda.js'
import { maquetar } from '../imagen/maquetar.js'
import { pintar } from '../imagen/pintar.js'
import { ALTO_WHATSAPP, ANCHO_WHATSAPP, crearLienzoWhatsApp } from '../imagen/whatsapp.js'
import { medidorDesde, esperarFuentes, cargarImagen, descargar, nombreDeArchivo, nombreDeArchivoHorizontal }
  from '../imagen/exportar.js'
import {
  SALUDO_POR_DEFECTO, DESPEDIDA_POR_DEFECTO, FORMATO_POR_DEFECTO, ESQUINA_VOLUNTARIO_POR_DEFECTO, TAMANO_VOLUNTARIO_POR_DEFECTO, ASOMO_VOLUNTARIO_POR_DEFECTO,
} from '../modelo/lista.js'

// El lienzo se pinta al doble de tamaño para que se vea nitido en el telefono.
// El archivo que se descarga mide, entonces, el doble que el plano.
export const DENSIDAD = 2
export const FOTOS_POR_LOTE = 4
export const DURACION_FUNDIDO_FOTOS_MS = 220

// Cuatro descargas a la vez recortan la espera de una red móvil sin decodificar
// las 25 fotos juntas, que haría subir de golpe la memoria del navegador.
export async function cargarEnLotes(claves, cargar, alTerminarLote) {
  for (let inicio = 0; inicio < claves.length; inicio += FOTOS_POR_LOTE) {
    const lote = claves.slice(inicio, inicio + FOTOS_POR_LOTE)
    const imagenes = await Promise.all(lote.map(async (clave) => [clave, await cargar(clave)]))
    await alTerminarLote(imagenes)
  }
}

const OPCIONES = [
  ['saludo', 'Saludo'],
  ['despedida', 'Despedida'],
  ['fotos', 'Fotos'],
  ['mostrarIconoVoluntariado', 'Ícono de voluntariado'],
  ['compacto', 'Modo compacto'],
]

// Se puede inyectar porque el Image de jsdom, con la carga de recursos apagada,
// no dispara ni onload ni onerror: la promesa queda colgada para siempre y sin
// inyeccion esta rama no se podria probar.
const cargarLogoReal = () => cargarImagen('assets/logo-aletea.png')
const cargarIconosReales = async () => {
  const [pelota, voluntario] = await Promise.all([
    cargarImagen('assets/iconos/pelota-blanca.svg'),
    cargarImagen('assets/iconos/voluntario-magenta.svg'),
  ])
  return { 'icono-pelota': pelota, 'icono-voluntario': voluntario }
}

export function crearPantallaVistaPrevia(raiz, opciones) {
  const { roster, alCambiar, crearContexto, cargarFoto } = opciones
  // Los textos viven en la lista, no en la pantalla: cambian de una semana a otra
  // y el historial tiene que conservar lo que realmente se mando ese sabado.
  // Las opciones sueltas siguen aceptandose como respaldo para listas viejas.
  const textoSaludo = () => lista.saludo ?? opciones.saludo ?? SALUDO_POR_DEFECTO
  const textoDespedida = () => lista.despedida ?? opciones.despedida ?? DESPEDIDA_POR_DEFECTO
  let lista = opciones.lista
  const lienzoVertical = document.createElement('canvas')
  const ctx = crearContexto ? crearContexto(lienzoVertical) : lienzoVertical.getContext('2d')
  const lienzoHorizontal = document.createElement('canvas')
  lienzoHorizontal.className = 'lienzo-vista-previa lienzo-vista-previa-horizontal'
  const ctxHorizontal = crearContexto
    ? crearContexto(lienzoHorizontal)
    : lienzoHorizontal.getContext('2d')
  const crearLienzoAuxiliar = () => {
    const auxiliar = document.createElement('canvas')
    if (crearContexto) auxiliar.getContext = () => crearContexto(auxiliar)
    return auxiliar
  }
  const imagenes = {}
  const fotosApareciendo = new Map()
  let plano = null
  let animacionFotos = null
  // vivo pasa a false al salir de la pantalla: sin esto la precarga de fotos
  // sigue armando DOM huerfano y repintando un lienzo que ya nadie ve.
  let vivo = true
  // ocupado dura lo que dura una exportacion: mientras tanto los controles
  // quedan bloqueados para que el PNG que baja sea el que estaba en pantalla.
  let ocupado = false
  // Los bosquejos arrancan plegados: se abren al tocar "Cambiar".
  let formatoAbierto = false
  let pestanaActiva = 'resultado'
  // Aviso puntual para la coordinadora, por ejemplo cuando compartir no anda.
  let mensaje = ''
  let composicionHorizontal = null

  function calcular() {
    plano = maquetar(lista, roster, {
      saludo: textoSaludo(), despedida: textoDespedida(), medirTexto: medidorDesde(ctx),
    })
    return plano
  }

  function planoCompacto() {
    if (lista.opcionesImagen?.compacto) return plano
    return maquetar(
      { ...lista, opcionesImagen: { ...lista.opcionesImagen, compacto: true } },
      roster,
      { saludo: textoSaludo(), despedida: textoDespedida(), medirTexto: medidorDesde(ctx) },
    )
  }

  async function dibujar() {
    await esperarFuentes()
    if (!vivo) return
    calcular()
    pintar(ctx, plano, imagenes, DENSIDAD, null, opacidadesDeFotos())
    const resultado = crearLienzoWhatsApp({
      lista,
      roster,
      imagenes,
      medirTexto: medidorDesde(ctx),
      crearLienzo: crearLienzoAuxiliar,
    })
    composicionHorizontal = resultado.composicion
    lienzoHorizontal.width = ANCHO_WHATSAPP
    lienzoHorizontal.height = ALTO_WHATSAPP
    ctxHorizontal.drawImage(resultado.lienzo, 0, 0)
    continuarFundidoDeFotos()
  }

  const ahora = () => globalThis.performance?.now?.() ?? Date.now()
  const reduceMovimiento = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function opacidadesDeFotos() {
    const opacidades = {}
    const momento = ahora()
    fotosApareciendo.forEach((inicio, clave) => {
      const progreso = Math.min(1, (momento - inicio) / DURACION_FUNDIDO_FOTOS_MS)
      if (progreso === 1) fotosApareciendo.delete(clave)
      else opacidades[clave] = progreso
    })
    return opacidades
  }

  function continuarFundidoDeFotos() {
    if (!vivo || animacionFotos !== null || fotosApareciendo.size === 0) return
    animacionFotos = requestAnimationFrame(() => {
      animacionFotos = null
      dibujar()
    })
  }

  function guardarFotos(lote) {
    const inicio = ahora()
    lote.forEach(([clave, imagen]) => {
      if (!imagen) return
      imagenes[clave] = imagen
      if (!reduceMovimiento()) fotosApareciendo.set(clave, inicio)
    })
  }

  // Dos formatos conviven a proposito: el apilado sirve los sabados sin fotos
  // cargadas, donde una grilla de iniciales grandes se ve peor que una lista.
  const FORMATOS = [
    ['retratos', 'Retratos'],
    ['retratos-nombre', 'Retratos, nombre abajo'],
    ['grilla', 'Grilla'],
    ['columnas', 'Dos columnas'],
    ['filas', 'Lista'],
  ]

  // Solo tiene sentido en "retratos": es el unico formato donde el voluntario
  // aparece como medallon sobre la foto del chico.
  const ESQUINAS_VOLUNTARIO = [
    ['abajo-derecha', 'Abajo derecha'],
    ['abajo-izquierda', 'Abajo izquierda'],
    ['arriba-derecha', 'Arriba derecha'],
    ['arriba-izquierda', 'Arriba izquierda'],
    ['superpuesto-derecha', 'Superpuesto arriba der.'],
    ['superpuesto-izquierda', 'Superpuesto arriba izq.'],
    ['superpuesto-abajo-derecha', 'Superpuesto abajo der.'],
    ['superpuesto-abajo-izquierda', 'Superpuesto abajo izq.'],
  ]
  const TAMANOS_VOLUNTARIO = [
    ['mediano', 'Mediano'],
    ['grande', 'Grande'],
    ['enorme', 'Muy grande'],
  ]
  const ASOMOS_VOLUNTARIO = [
    ['apenas', 'Apenas'],
    ['medio', 'Intermedio'],
    ['alto', 'Bien arriba'],
  ]

  // Quien elige toma la decision mirando, no leyendo: cada opcion se dibuja con
  // el motor real de la planilla, con las fotos que ya estan cargadas.
  function personaDeMuestra(gente, respaldo) {
    const conFoto = gente.find((p) => p.activo && p.foto && imagenes[p.foto])
    const alguno = conFoto ?? gente.find((p) => p.activo)
    return alguno
      ? { nombre: alguno.nombre, nuevo: alguno.nuevo, foto: imagenes[alguno.foto] ? alguno.foto : null }
      : respaldo
  }

  function bosquejoDe(lienzo, cambios, ancho) {
    const actuales = lista.opcionesImagen ?? {}
    dibujarMuestra(lienzo, {
      formato: cambios.formato ?? actuales.formato ?? FORMATO_POR_DEFECTO,
      esquinaVoluntario: cambios.esquinaVoluntario ?? actuales.esquinaVoluntario ?? ESQUINA_VOLUNTARIO_POR_DEFECTO,
      tamanoVoluntario: cambios.tamanoVoluntario ?? actuales.tamanoVoluntario ?? TAMANO_VOLUNTARIO_POR_DEFECTO,
      asomoVoluntario: cambios.asomoVoluntario ?? actuales.asomoVoluntario ?? ASOMO_VOLUNTARIO_POR_DEFECTO,
      participante: personaDeMuestra(roster.participantes, { nombre: 'Chico' }),
      voluntario: personaDeMuestra(roster.voluntarios, { nombre: 'Voluntario' }),
      imagenes,
      medirTexto: medidorDesde(ctx),
      ancho,
    })
  }

  const NOMBRE_CAMPO = {
    formato: 'el formato',
    esquinaVoluntario: 'la esquina del voluntario',
    tamanoVoluntario: 'el tamaño del voluntario',
    asomoVoluntario: 'cuánto sobresale el voluntario',
  }

  function elegir(campo, valor) {
    lista = { ...lista, opcionesImagen: { ...lista.opcionesImagen, [campo]: valor } }
    alCambiar(lista, `Cambiar ${NOMBRE_CAMPO[campo] ?? campo} de la imagen a ${valor}`)
    redibujar()
  }

  function selectorDeFormato() {
    return selectorVisual({
      campo: 'formato',
      rotulo: 'Formato',
      valores: FORMATOS,
      valor: lista.opcionesImagen?.formato ?? FORMATO_POR_DEFECTO,
      dibujar: (lienzo, valor, ancho) => bosquejoDe(lienzo, { formato: valor }, ancho),
      alElegir: (valor) => elegir('formato', valor),
    })
  }

  function selectorDeEsquina() {
    // Solo en "retratos": es el unico formato donde el voluntario es un medallon
    // sobre la foto. Con el nombre debajo no hay medallon que ubicar.
    if ((lista.opcionesImagen?.formato ?? FORMATO_POR_DEFECTO) !== 'retratos') return null
    return selectorVisual({
      campo: 'esquina-voluntario',
      rotulo: 'Dónde va la foto del voluntario',
      valores: ESQUINAS_VOLUNTARIO,
      valor: lista.opcionesImagen?.esquinaVoluntario ?? ESQUINA_VOLUNTARIO_POR_DEFECTO,
      dibujar: (lienzo, valor, ancho) => bosquejoDe(lienzo, { esquinaVoluntario: valor }, ancho),
      alElegir: (valor) => elegir('esquinaVoluntario', valor),
    })
  }

  // Los dos de abajo solo cambian algo con el medallon superpuesto, asi que aparecen
  // unicamente ahi: mostrarlos siempre haria creer que hacen algo cuando no.
  function selectorSuperpuesto(campo, rotulo, valores, porDefecto) {
    const esquina = lista.opcionesImagen?.esquinaVoluntario ?? ESQUINA_VOLUNTARIO_POR_DEFECTO
    if (!String(esquina).startsWith('superpuesto-')) return null
    return selectorVisual({
      campo,
      rotulo,
      valores,
      valor: lista.opcionesImagen?.[campo] ?? porDefecto,
      dibujar: (lienzo, valor, ancho) => bosquejoDe(lienzo, { [campo]: valor }, ancho),
      alElegir: (valor) => elegir(campo, valor),
    })
  }

  // Cuatro tiras de bosquejos abiertas ocupaban dos pantallas de alto y empujaban
  // la vista previa fuera de cuadro, que es justo lo que se viene a mirar. Se
  // abren cuando alguien decide cambiar el formato, no antes.
  function resumenDeFormato() {
    const o = lista.opcionesImagen ?? {}
    const nombre = (pares, valor, respaldo) =>
      (pares.find(([v]) => v === (valor ?? respaldo)) ?? pares[0])[1]
    const partes = [nombre(FORMATOS, o.formato, FORMATO_POR_DEFECTO)]
    if ((o.formato ?? FORMATO_POR_DEFECTO) === 'retratos') {
      partes.push(nombre(ESQUINAS_VOLUNTARIO, o.esquinaVoluntario, ESQUINA_VOLUNTARIO_POR_DEFECTO))
      if (String(o.esquinaVoluntario ?? ESQUINA_VOLUNTARIO_POR_DEFECTO).startsWith('superpuesto-')) {
        partes.push(nombre(TAMANOS_VOLUNTARIO, o.tamanoVoluntario, TAMANO_VOLUNTARIO_POR_DEFECTO))
      }
    }
    return partes.join(' · ')
  }

  function panelDeFormato() {
    const caja = elemento('section', ['panel-formato'])
    const cabecera = elemento('div', ['panel-formato-cabecera'])
    cabecera.append(
      elemento('span', ['panel-formato-rotulo'], 'Formato'),
      elemento('span', ['panel-formato-resumen'], resumenDeFormato()),
    )
    const abrir = elemento('button', ['boton', 'boton-cambiar-formato'], formatoAbierto ? 'Listo' : 'Cambiar')
    abrir.type = 'button'
    abrir.dataset.accion = 'cambiar-formato'
    abrir.setAttribute('aria-expanded', String(formatoAbierto))
    abrir.addEventListener('click', () => {
      formatoAbierto = !formatoAbierto
      redibujar()
    })
    cabecera.appendChild(abrir)
    caja.appendChild(cabecera)
    if (!formatoAbierto) return caja

    caja.appendChild(selectorDeFormato())
    const esquina = selectorDeEsquina()
    if (esquina) caja.appendChild(esquina)
    const tamano = selectorSuperpuesto(
      'tamanoVoluntario', 'Tamaño del voluntario', TAMANOS_VOLUNTARIO, TAMANO_VOLUNTARIO_POR_DEFECTO)
    if (tamano) caja.appendChild(tamano)
    const asomo = selectorSuperpuesto(
      'asomoVoluntario', 'Cuánto sobresale', ASOMOS_VOLUNTARIO, ASOMO_VOLUNTARIO_POR_DEFECTO)
    if (asomo) caja.appendChild(asomo)
    return caja
  }

  function interruptores() {
    const caja = elemento('div', ['opciones-imagen'])
    OPCIONES.forEach(([clave, etiqueta]) => {
      const marco = elemento('label', ['opcion'])
      const entrada = document.createElement('input')
      entrada.type = 'checkbox'
      entrada.dataset.opcion = clave
      entrada.checked = Boolean(lista.opcionesImagen?.[clave])
      entrada.addEventListener('change', () => {
        lista = { ...lista, opcionesImagen: { ...lista.opcionesImagen, [clave]: entrada.checked } }
        alCambiar(lista)
        redibujar()
      })
      marco.append(entrada, document.createTextNode(` ${etiqueta}`))
      caja.appendChild(marco)
    })
    return caja
  }

  function campoTexto(rotulo, clave, valor, ayuda) {
    const caja = elemento('label', ['campo', 'campo-mensaje'])
    caja.appendChild(elemento('span', ['campo-rotulo'], rotulo))
    const entrada = document.createElement('textarea')
    entrada.dataset.campo = clave
    // Texto libre en español: mayuscula al empezar cada oracion y corrector activo.
    entrada.setAttribute('autocapitalize', 'sentences')
    entrada.setAttribute('spellcheck', 'true')
    entrada.lang = 'es'
    entrada.rows = 3
    entrada.value = valor
    entrada.addEventListener('change', () => {
      lista = { ...lista, [clave]: entrada.value }
      alCambiar(lista)
      redibujar()
    })
    caja.appendChild(entrada)
    if (ayuda) caja.appendChild(elemento('span', ['campo-ayuda'], ayuda))
    return caja
  }

  function mensajes() {
    const caja = elemento('div', ['mensajes-imagen'])
    caja.appendChild(campoTexto('Saludo', 'saludo', textoSaludo(),
      'Aparece arriba de la lista. Se muestra solo si el interruptor Saludo está activado.'))
    caja.appendChild(campoTexto('Despedida', 'despedida', textoDespedida(),
      'Aparece al final de la imagen.'))
    return caja
  }

  function informacion() {
    const caja = elemento('div', ['info-imagen'])
    caja.textContent = `Imagen final horizontal ampliada de ${ANCHO_WHATSAPP} por ${ALTO_WHATSAPP} px, relación 48:31.`
    return caja
  }

  function controles() {
    return [...raiz.querySelectorAll('input[data-opcion]'), ...raiz.querySelectorAll('button')]
  }

  // El bloqueo se toma antes del primer await: entre el dibujado y el toBlob hay
  // una ventana en la que tocar un interruptor cambiaba el lienzo, y el archivo
  // que bajaba no era el que la coordinadora tenia delante.
  async function conControlesBloqueados(tarea) {
    if (ocupado) return
    ocupado = true
    controles().forEach((c) => { c.disabled = true })
    try {
      await tarea()
    } finally {
      ocupado = false
      controles().forEach((c) => { c.disabled = false })
    }
  }

  function avisar(texto) {
    mensaje = texto
    redibujar()
  }

  function acciones() {
    const caja = elemento('div', ['acciones-imagen'])
    caja.appendChild(boton('Descargar imagen horizontal', () => conControlesBloqueados(async () => {
      mensaje = ''
      await dibujar()
      await descargar(lienzoHorizontal, nombreDeArchivoHorizontal(lista))
      if (!composicionHorizontal.legible) {
        avisar('La lista es excepcionalmente grande. Si algún nombre queda chico, compartí una imagen por grupo.')
      }
    }), ['boton-principal']))
    caja.appendChild(boton('Descargar imagen vertical', () => conControlesBloqueados(async () => {
      await dibujar()
      await descargar(lienzoVertical, nombreDeArchivo(lista))
    })))
    return caja
  }

  function redibujar() {
    if (!vivo) return
    vaciar(raiz)
    calcular()
    const pestanas = elemento('div', ['vista-pestanas'])
    ;[['resultado', 'Vista previa'], ['configuracion', 'Configuración']].forEach(([valor, etiqueta]) => {
      const control = boton(etiqueta, () => { pestanaActiva = valor; redibujar() })
      control.classList.add('vista-pestana')
      control.classList.toggle('activa', pestanaActiva === valor)
      control.setAttribute('aria-pressed', String(pestanaActiva === valor))
      pestanas.appendChild(control)
    })
    raiz.appendChild(pestanas)
    const configuracion = elemento('div', ['vista-panel-configuracion'])
    configuracion.hidden = pestanaActiva !== 'configuracion'
    configuracion.append(panelDeFormato(), interruptores(), informacion(), mensajes())
    raiz.appendChild(configuracion)
    if (mensaje) raiz.appendChild(elemento('div', ['aviso'], mensaje))
    const resultado = elemento('div', ['vista-panel-resultado'])
    resultado.hidden = pestanaActiva !== 'resultado'
    resultado.append(acciones(), lienzoHorizontal)
    raiz.appendChild(resultado)
    // Un repintado en medio de una exportacion (por ejemplo, cuando termina la
    // precarga de fotos) arma controles nuevos: hay que volver a bloquearlos.
    if (ocupado) controles().forEach((c) => { c.disabled = true })
    dibujar()
  }

  // El logo va en toda imagen, asi que no depende de que nos pasen cargarFoto:
  // solo las fotos de las personas necesitan ese lector.
  const cerrar = (i) => { if (i && typeof i.close === 'function') i.close() }

  async function precargarFotos() {
    const logoPendiente = (opciones.cargarLogo ?? cargarLogoReal)()
    const iconosPendientes = (opciones.cargarIconos ?? cargarIconosReales)()
    if (cargarFoto) {
      // Los voluntarios tambien, no solo los participantes. Cuando se escribio
      // esto ningun formato dibujaba la cara del voluntario; Retratos si, y sin
      // esta linea su medallon salia en blanco aunque la foto estuviera cargada.
      const claves = new Set()
      const gente = [...roster.participantes, ...roster.voluntarios]
      gente.forEach((p) => { if (p.foto) claves.add(p.foto) })
      const pendientes = [...claves]
      let cargadas = 0
      if (pendientes.length) {
        mensaje = `Cargando fotos: 0 de ${pendientes.length}`
        redibujar()
      }
      await cargarEnLotes(pendientes, cargarFoto, async (lote) => {
        if (!vivo) {
          lote.forEach(([, imagen]) => cerrar(imagen))
          return
        }
        guardarFotos(lote)
        cargadas += lote.length
        mensaje = cargadas === pendientes.length ? '' : `Cargando fotos: ${cargadas} de ${pendientes.length}`
        redibujar()
      })
    }
    const logo = await logoPendiente
    if (!vivo) return cerrar(logo)
    if (logo) imagenes.logo = logo
    const iconos = await iconosPendientes
    if (!vivo) { Object.values(iconos).forEach(cerrar); return }
    Object.entries(iconos).forEach(([clave, imagen]) => { if (imagen) imagenes[clave] = imagen })
    mensaje = ''
    redibujar()
  }

  // La llama app.js al cambiar de pantalla. Los mapas de bits decodificados
  // ocupan memoria hasta que se los cierra a mano.
  function destruir() {
    vivo = false
    if (animacionFotos !== null) cancelAnimationFrame(animacionFotos)
    Object.values(imagenes).forEach(cerrar)
  }

  redibujar()
  precargarFotos()

  return {
    lista: () => lista,
    plano: () => plano,
    nombreDeArchivo: () => nombreDeArchivo(lista),
    nombreDeArchivoHorizontal: () => nombreDeArchivoHorizontal(lista),
    redibujar,
    destruir,
  }
}
