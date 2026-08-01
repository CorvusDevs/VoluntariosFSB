import { elemento, boton, vaciar } from './componentes.js'
import { maquetar } from '../imagen/maquetar.js'
import { pintar } from '../imagen/pintar.js'
import { medidorDesde, esperarFuentes, cargarImagen, descargar, compartir, nombreDeArchivo }
  from '../imagen/exportar.js'
import { formatearFechaLarga } from '../util/fechas.js'

const OPCIONES = [
  ['saludo', 'Saludo'],
  ['despedida', 'Despedida'],
  ['fotos', 'Fotos'],
  ['compacto', 'Modo compacto'],
]

export function crearPantallaVistaPrevia(raiz, opciones) {
  const { roster, saludo, despedida, alCambiar, crearContexto, cargarFoto } = opciones
  let lista = opciones.lista
  const lienzo = document.createElement('canvas')
  lienzo.className = 'lienzo-vista-previa'
  const ctx = crearContexto ? crearContexto(lienzo) : lienzo.getContext('2d')
  const imagenes = {}
  let plano = null

  function calcular() {
    plano = maquetar(lista, roster, { saludo, despedida, medirTexto: medidorDesde(ctx) })
    return plano
  }

  async function dibujar() {
    await esperarFuentes()
    calcular()
    pintar(ctx, plano, imagenes, 2)
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

  function informacion() {
    const caja = elemento('div', ['info-imagen'])
    const relacion = plano.relacion.toFixed(2).replace('.', ',')
    caja.textContent = `${plano.ancho} por ${plano.alto} px, relacion ${relacion}.`
    return caja
  }

  function avisoRecorte() {
    if (!plano.recorteProbable) return null
    const caja = elemento('div', ['aviso-recorte'])
    caja.textContent =
      'La imagen es muy alta y WhatsApp probablemente le haga un recorte en la vista previa del ' +
      'chat. Se sigue viendo entera al tocarla. Si preferis evitarlo, activa el modo compacto.'
    return caja
  }

  function acciones() {
    const caja = elemento('div', ['acciones-imagen'])
    caja.appendChild(boton('Descargar PNG', async () => {
      await dibujar()
      await descargar(lienzo, nombreDeArchivo(lista))
    }))
    caja.appendChild(boton('Compartir', async () => {
      await dibujar()
      const texto = `Fútbol sin Barreras, ${formatearFechaLarga(lista.fecha)}`
      const compartido = await compartir(lienzo, nombreDeArchivo(lista), texto)
      if (!compartido) {
        alert('Este dispositivo no permite compartir el archivo directamente. Usa Descargar PNG.')
      }
    }))
    return caja
  }

  function redibujar() {
    vaciar(raiz)
    calcular()
    raiz.appendChild(interruptores())
    raiz.appendChild(informacion())
    const aviso = avisoRecorte()
    if (aviso) raiz.appendChild(aviso)
    raiz.appendChild(acciones())
    raiz.appendChild(lienzo)
    dibujar()
  }

  async function precargarFotos() {
    if (!cargarFoto) return
    const logo = await cargarImagen('assets/logo-aletea.png')
    if (logo) imagenes.logo = logo
    const claves = new Set()
    roster.participantes.forEach((p) => { if (p.foto) claves.add(p.foto) })
    for (const clave of claves) {
      const imagen = await cargarFoto(clave)
      if (imagen) imagenes[clave] = imagen
    }
    redibujar()
  }

  redibujar()
  precargarFotos()

  return {
    lista: () => lista,
    plano: () => plano,
    nombreDeArchivo: () => nombreDeArchivo(lista),
    redibujar,
  }
}
