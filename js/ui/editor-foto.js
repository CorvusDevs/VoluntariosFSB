import { elemento, boton, vaciar } from './componentes.js'
import {
  recorteDe, mover, reencuadrar, arrastreEnImagen,
  RECORTE_INICIAL, ZOOM_MINIMO, ZOOM_MAXIMO, limitar,
} from './recorte.js'
import { volcarRecorte, aBlob } from './fotos.js'
import { dibujarMuestra, CLAVES_MUESTRA } from './muestra-celda.js'

// Los tres formatos que muestran foto. El apilado tambien la muestra, pero chica
// y redonda, y el que decide un recorte quiere ver los grandes.
const VISTAS = [
  { formato: 'retratos', rotulo: 'Retratos' },
  { formato: 'grilla', rotulo: 'Grilla' },
  { formato: 'columnas', rotulo: 'Dos columnas' },
]

const LADO_EDITOR = 260

function medidorDeTexto() {
  const ctx = document.createElement('canvas').getContext('2d')
  return (texto, fuente) => { ctx.font = fuente; return ctx.measureText(texto).width }
}

// `persona` es a quien pertenece la foto, y `tipo` dice si va como participante o
// como voluntario, que es lo que decide en que lugar de la celda se la ve.
export function crearEditorDeFoto({
  mapa, persona, tipo, acompanante, alGuardar, alCancelar, contenedor = document.body,
}) {
  let estado = { ...RECORTE_INICIAL }
  const medir = medidorDeTexto()

  const capa = elemento('div', ['capa-editor'])
  const panel = elemento('section', ['editor-foto'])
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', `Ajustar la foto de ${persona.nombre}`)

  const lienzo = document.createElement('canvas')
  lienzo.className = 'editor-lienzo'
  lienzo.width = LADO_EDITOR
  lienzo.height = LADO_EDITOR
  lienzo.setAttribute('aria-label', 'Arrastrá para mover el recuadro de recorte')

  const zoom = document.createElement('input')
  zoom.type = 'range'
  zoom.min = String(ZOOM_MINIMO)
  zoom.max = String(ZOOM_MAXIMO)
  zoom.step = '0.05'
  zoom.value = String(estado.zoom)
  zoom.dataset.campo = 'zoom'
  zoom.setAttribute('aria-label', 'Acercar la foto')

  const previas = VISTAS.map((vista) => {
    const caja = elemento('figure', ['previa'])
    const c = document.createElement('canvas')
    c.dataset.formato = vista.formato
    caja.append(c, elemento('figcaption', [], vista.rotulo))
    return { ...vista, caja, lienzo: c }
  })

  // El recuadro se dibuja sobre la foto, oscureciendo lo que va a quedar afuera:
  // es lo unico que contesta "que parte se guarda" sin tener que probar y ver.
  function dibujarEditor() {
    const ctx = lienzo.getContext('2d')
    const r = recorteDe({ ancho: mapa.width, alto: mapa.height, ...estado })
    ctx.clearRect(0, 0, LADO_EDITOR, LADO_EDITOR)
    // La foto entera, encajada en el cuadro del editor.
    const escala = Math.min(LADO_EDITOR / mapa.width, LADO_EDITOR / mapa.height)
    const ax = (LADO_EDITOR - mapa.width * escala) / 2
    const ay = (LADO_EDITOR - mapa.height * escala) / 2
    ctx.drawImage(mapa, ax, ay, mapa.width * escala, mapa.height * escala)

    const rx = ax + r.x * escala
    const ry = ay + r.y * escala
    const rl = r.lado * escala
    ctx.save()
    ctx.fillStyle = 'rgba(20, 12, 26, .55)'
    ctx.beginPath()
    ctx.rect(0, 0, LADO_EDITOR, LADO_EDITOR)
    ctx.rect(rx, ry, rl, rl)
    ctx.fill('evenodd')
    ctx.restore()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.strokeRect(rx + 1, ry + 1, rl - 2, rl - 2)
    return { r, escala }
  }

  function dibujarPrevias() {
    const r = recorteDe({ ancho: mapa.width, alto: mapa.height, ...estado })
    const recortada = volcarRecorte(mapa, r)
    const clave = `${tipo}-editando`
    const imagenes = { [clave]: recortada }
    const yo = { nombre: persona.nombre, nuevo: Boolean(persona.nuevo), foto: clave }
    const otro = acompanante
      ? { nombre: acompanante.nombre, nuevo: Boolean(acompanante.nuevo), foto: acompanante.foto ?? null }
      : null
    if (otro?.foto && acompanante?.imagen) imagenes[otro.foto] = acompanante.imagen
    else if (otro) otro.foto = null

    previas.forEach(({ formato, lienzo: c }) => {
      dibujarMuestra(c, {
        formato,
        esquinaVoluntario: 'abajo-derecha',
        participante: tipo === 'participante' ? yo : (otro ?? { nombre: 'Participante' }),
        voluntario: tipo === 'voluntario' ? yo : otro,
        imagenes,
        medirTexto: medir,
        ancho: 132,
      })
    })
  }

  function refrescar() {
    dibujarEditor()
    dibujarPrevias()
  }

  // Arrastre con punteros, que cubre dedo y mouse con el mismo camino. El
  // desplazamiento se pasa a pixeles de la imagen original antes de mover, asi
  // arrastrar lo mismo mueve lo mismo con cualquier zoom.
  let arrastrando = null
  lienzo.addEventListener('pointerdown', (evento) => {
    arrastrando = { x: evento.clientX, y: evento.clientY }
    lienzo.setPointerCapture?.(evento.pointerId)
  })
  lienzo.addEventListener('pointermove', (evento) => {
    if (!arrastrando) return
    evento.preventDefault()
    const escala = Math.min(LADO_EDITOR / mapa.width, LADO_EDITOR / mapa.height)
    const { dx, dy } = arrastreEnImagen(arrastrando, { x: evento.clientX, y: evento.clientY }, escala)
    estado = { ...estado, ...mover({ ancho: mapa.width, alto: mapa.height, ...estado }, dx, dy) }
    arrastrando = { x: evento.clientX, y: evento.clientY }
    refrescar()
  })
  const soltar = () => { arrastrando = null }
  lienzo.addEventListener('pointerup', soltar)
  lienzo.addEventListener('pointercancel', soltar)
  lienzo.addEventListener('pointerleave', soltar)

  zoom.addEventListener('input', () => {
    const z = limitar(Number(zoom.value), ZOOM_MINIMO, ZOOM_MAXIMO)
    estado = { ...estado, zoom: z }
    // Alejar agranda el recuadro y lo puede dejar pisando el borde.
    estado = { ...estado, ...reencuadrar({ ancho: mapa.width, alto: mapa.height, ...estado }) }
    refrescar()
  })

  const centrar = boton('Centrar', () => {
    estado = { ...RECORTE_INICIAL }
    zoom.value = String(RECORTE_INICIAL.zoom)
    refrescar()
  })
  centrar.dataset.accion = 'centrar-foto'

  const guardar = elemento('button', ['boton', 'boton-principal'], 'Usar esta foto')
  guardar.type = 'button'
  guardar.dataset.accion = 'guardar-foto'
  guardar.addEventListener('click', async () => {
    guardar.disabled = true
    const r = recorteDe({ ancho: mapa.width, alto: mapa.height, ...estado })
    const blob = await aBlob(volcarRecorte(mapa, r))
    cerrar()
    await alGuardar(blob)
  })

  const cancelar = boton('Cancelar', () => { cerrar(); alCancelar?.() })
  cancelar.dataset.accion = 'cancelar-foto'

  function cerrar() {
    capa.remove()
    document.removeEventListener('keydown', alaTecla)
  }
  function alaTecla(evento) {
    if (evento.key === 'Escape') { cerrar(); alCancelar?.() }
  }
  document.addEventListener('keydown', alaTecla)

  const controles = elemento('div', ['editor-controles'])
  const filaZoom = elemento('label', ['editor-zoom'])
  filaZoom.append(elemento('span', ['campo-rotulo'], 'Acercar'), zoom)
  controles.append(filaZoom, centrar)

  const tira = elemento('div', ['editor-previas'])
  previas.forEach((p) => tira.appendChild(p.caja))

  const acciones = elemento('div', ['editor-acciones'])
  acciones.append(guardar, cancelar)

  panel.append(
    elemento('h2', ['editor-titulo'], `Foto de ${persona.nombre}`),
    elemento('p', ['editor-ayuda'], 'Arrastrá el recuadro para elegir qué parte se ve. Abajo, cómo queda en la planilla.'),
    lienzo,
    controles,
    elemento('h3', ['editor-subtitulo'], 'Así va a salir'),
    tira,
    acciones,
  )
  capa.appendChild(panel)
  contenedor.appendChild(capa)
  refrescar()

  return { cerrar, estado: () => ({ ...estado }), refrescar }
}
