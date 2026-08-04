import { elemento, boton, vaciar } from './componentes.js'
import { selectorVisual } from './selector-visual.js'
import { dibujarMuestra } from './muestra-celda.js'
import { maquetar } from '../imagen/maquetar.js'
import { pintar } from '../imagen/pintar.js'
import { medidorDesde, esperarFuentes, cargarImagen, descargar, compartir, nombreDeArchivo }
  from '../imagen/exportar.js'
import { formatearFechaLarga } from '../util/fechas.js'
import {
  SALUDO_POR_DEFECTO, DESPEDIDA_POR_DEFECTO, FORMATO_POR_DEFECTO, ESQUINA_VOLUNTARIO_POR_DEFECTO, TAMANO_VOLUNTARIO_POR_DEFECTO, ASOMO_VOLUNTARIO_POR_DEFECTO,
} from '../modelo/lista.js'

// El lienzo se pinta al doble de tamaño para que se vea nitido en el telefono.
// El archivo que se descarga mide, entonces, el doble que el plano.
export const DENSIDAD = 2

const OPCIONES = [
  ['saludo', 'Saludo'],
  ['despedida', 'Despedida'],
  ['fotos', 'Fotos'],
  ['compacto', 'Modo compacto'],
]

// Se puede inyectar porque el Image de jsdom, con la carga de recursos apagada,
// no dispara ni onload ni onerror: la promesa queda colgada para siempre y sin
// inyeccion esta rama no se podria probar.
const cargarLogoReal = () => cargarImagen('assets/logo-aletea.png')

export function crearPantallaVistaPrevia(raiz, opciones) {
  const { roster, alCambiar, crearContexto, cargarFoto } = opciones
  // Los textos viven en la lista, no en la pantalla: cambian de una semana a otra
  // y el historial tiene que conservar lo que realmente se mando ese sabado.
  // Las opciones sueltas siguen aceptandose como respaldo para listas viejas.
  const textoSaludo = () => lista.saludo ?? opciones.saludo ?? SALUDO_POR_DEFECTO
  const textoDespedida = () => lista.despedida ?? opciones.despedida ?? DESPEDIDA_POR_DEFECTO
  let lista = opciones.lista
  const lienzo = document.createElement('canvas')
  lienzo.className = 'lienzo-vista-previa'
  const ctx = crearContexto ? crearContexto(lienzo) : lienzo.getContext('2d')
  const imagenes = {}
  let plano = null
  // vivo pasa a false al salir de la pantalla: sin esto la precarga de fotos
  // sigue armando DOM huerfano y repintando un lienzo que ya nadie ve.
  let vivo = true
  // ocupado dura lo que dura una exportacion: mientras tanto los controles
  // quedan bloqueados para que el PNG que baja sea el que estaba en pantalla.
  let ocupado = false
  // Aviso puntual para la coordinadora, por ejemplo cuando compartir no anda.
  let mensaje = ''

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
    pintar(ctx, plano, imagenes, DENSIDAD)
  }

  // Dos formatos conviven a proposito: el apilado sirve los sabados sin fotos
  // cargadas, donde una grilla de iniciales grandes se ve peor que una lista.
  const FORMATOS = [
    ['retratos', 'Retratos'],
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
    ['montado-derecha', 'Montado arriba der.'],
    ['montado-izquierda', 'Montado arriba izq.'],
    ['montado-abajo-derecha', 'Montado abajo der.'],
    ['montado-abajo-izquierda', 'Montado abajo izq.'],
  ]
  const TAMANOS_VOLUNTARIO = [
    ['mediano', 'Mediano'],
    ['grande', 'Grande'],
    ['enorme', 'Muy grande'],
  ]
  const ASOMOS_VOLUNTARIO = [
    ['apenas', 'Apenas'],
    ['montado', 'Montado'],
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

  function elegir(campo, valor) {
    lista = { ...lista, opcionesImagen: { ...lista.opcionesImagen, [campo]: valor } }
    alCambiar(lista)
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

  // Los dos de abajo solo cambian algo con el medallon montado, asi que aparecen
  // unicamente ahi: mostrarlos siempre haria creer que hacen algo cuando no.
  function selectorMontado(campo, rotulo, valores, porDefecto) {
    const esquina = lista.opcionesImagen?.esquinaVoluntario ?? ESQUINA_VOLUNTARIO_POR_DEFECTO
    if (!String(esquina).startsWith('montado-')) return null
    return selectorVisual({
      campo,
      rotulo,
      valores,
      valor: lista.opcionesImagen?.[campo] ?? porDefecto,
      dibujar: (lienzo, valor, ancho) => bosquejoDe(lienzo, { [campo]: valor }, ancho),
      alElegir: (valor) => elegir(campo, valor),
    })
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
    // La relacion no cambia con la densidad: es alto sobre ancho.
    const relacion = plano.relacion.toFixed(2).replace('.', ',')
    const ancho = plano.ancho * DENSIDAD
    const alto = plano.alto * DENSIDAD
    caja.textContent = `Archivo de ${ancho} por ${alto} px, relación ${relacion}.`
    return caja
  }

  function avisoRecorte() {
    if (!plano.recorteProbable) return null
    const caja = elemento('div', ['aviso-recorte'])
    // Pasadas unas 35 filas el modo compacto tampoco alcanza. Recomendarlo
    // igual deja a la coordinadora sin salida, asi que se lo dice de frente.
    const salida = planoCompacto().recorteProbable
      ? 'Ni siquiera el modo compacto alcanza para esta lista. Conviene exportar una imagen por ' +
        'grupo, o dividir la lista en dos mensajes.'
      : 'Si preferís evitarlo, activá el modo compacto.'
    caja.textContent =
      'La imagen es muy alta y WhatsApp probablemente le haga un recorte en la vista previa del ' +
      `chat. Se sigue viendo entera al tocarla. ${salida}`
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
    caja.appendChild(boton('Descargar planificación', () => conControlesBloqueados(async () => {
      await dibujar()
      await descargar(lienzo, nombreDeArchivo(lista))
    })))
    caja.appendChild(boton('Compartir', () => conControlesBloqueados(async () => {
      mensaje = ''
      await dibujar()
      const texto = `Fútbol sin Barreras, ${formatearFechaLarga(lista.fecha)}`
      const compartido = await compartir(lienzo, nombreDeArchivo(lista), texto)
      // Nada de alert: es un modal que bloquea y que Safari en iOS puede tapar.
      if (!compartido) {
        avisar('Este dispositivo no permite compartir el archivo directamente. Usá el botón Descargar planificación.')
      }
    })))
    return caja
  }

  function redibujar() {
    if (!vivo) return
    vaciar(raiz)
    calcular()
    raiz.appendChild(selectorDeFormato())
    const esquina = selectorDeEsquina()
    if (esquina) raiz.appendChild(esquina)
    const tamano = selectorMontado(
      'tamanoVoluntario', 'Tamaño del voluntario', TAMANOS_VOLUNTARIO, TAMANO_VOLUNTARIO_POR_DEFECTO)
    if (tamano) raiz.appendChild(tamano)
    const asomo = selectorMontado(
      'asomoVoluntario', 'Cuánto asoma', ASOMOS_VOLUNTARIO, ASOMO_VOLUNTARIO_POR_DEFECTO)
    if (asomo) raiz.appendChild(asomo)
    raiz.appendChild(interruptores())
    raiz.appendChild(mensajes())
    raiz.appendChild(informacion())
    const aviso = avisoRecorte()
    if (aviso) raiz.appendChild(aviso)
    if (mensaje) raiz.appendChild(elemento('div', ['aviso'], mensaje))
    raiz.appendChild(acciones())
    raiz.appendChild(lienzo)
    // Un repintado en medio de una exportacion (por ejemplo, cuando termina la
    // precarga de fotos) arma controles nuevos: hay que volver a bloquearlos.
    if (ocupado) controles().forEach((c) => { c.disabled = true })
    dibujar()
  }

  // El logo va en toda imagen, asi que no depende de que nos pasen cargarFoto:
  // solo las fotos de las personas necesitan ese lector.
  const cerrar = (i) => { if (i && typeof i.close === 'function') i.close() }

  async function precargarFotos() {
    const logo = await (opciones.cargarLogo ?? cargarLogoReal)()
    if (!vivo) return cerrar(logo)
    if (logo) imagenes.logo = logo
    if (cargarFoto) {
      // Los voluntarios tambien, no solo los participantes. Cuando se escribio
      // esto ningun formato dibujaba la cara del voluntario; Retratos si, y sin
      // esta linea su medallon salia en blanco aunque la foto estuviera cargada.
      const claves = new Set()
      const gente = [...roster.participantes, ...roster.voluntarios]
      gente.forEach((p) => { if (p.foto) claves.add(p.foto) })
      for (const clave of claves) {
        const imagen = await cargarFoto(clave)
        if (!vivo) return cerrar(imagen)
        if (imagen) imagenes[clave] = imagen
      }
    }
    redibujar()
  }

  // La llama app.js al cambiar de pantalla. Los mapas de bits decodificados
  // ocupan memoria hasta que se los cierra a mano.
  function destruir() {
    vivo = false
    Object.values(imagenes).forEach(cerrar)
  }

  redibujar()
  precargarFotos()

  return {
    lista: () => lista,
    plano: () => plano,
    nombreDeArchivo: () => nombreDeArchivo(lista),
    redibujar,
    destruir,
  }
}
