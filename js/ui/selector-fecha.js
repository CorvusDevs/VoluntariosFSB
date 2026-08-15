const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
let siguienteId = 1

const dos = (valor) => String(valor).padStart(2, '0')
const iso = (fecha) => `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
const fechaDe = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto ?? '') ? new Date(`${texto}T12:00:00`) : null
const textoFecha = (fecha) => new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)

export function crearSelectorFecha({ clave, rotulo, valor = '', max = '' }) {
  const identificador = `selector-fecha-${siguienteId++}`
  const campo = document.createElement('div')
  campo.className = 'selector-fecha campo'
  const titulo = document.createElement('span')
  titulo.className = 'campo-rotulo'
  titulo.textContent = rotulo
  const entrada = document.createElement('input')
  entrada.type = 'hidden'
  entrada.dataset.perfil = clave
  entrada.value = valor
  const disparador = document.createElement('button')
  disparador.type = 'button'
  disparador.className = 'selector-fecha-disparador'
  disparador.setAttribute('aria-label', rotulo)
  disparador.setAttribute('aria-expanded', 'false')
  disparador.setAttribute('aria-controls', identificador)
  const panel = document.createElement('div')
  panel.className = 'selector-fecha-panel'
  panel.id = identificador
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', `Elegir ${rotulo.toLowerCase()}`)
  panel.hidden = true
  const limite = fechaDe(max) ?? new Date(2999, 11, 31)
  let vista = fechaDe(valor) ?? new Date(Math.min(new Date().getTime(), limite.getTime()))
  const refrescarTexto = () => { const fecha = fechaDe(entrada.value); disparador.textContent = fecha ? textoFecha(fecha) : 'Elegir fecha' }
  const cerrar = () => { panel.hidden = true; disparador.setAttribute('aria-expanded', 'false') }
  const abrir = () => { panel.hidden = false; disparador.setAttribute('aria-expanded', 'true'); renderizar() }
  const renderizar = () => {
    panel.replaceChildren()
    const cabecera = document.createElement('div')
    cabecera.className = 'selector-fecha-cabecera'
    const anterior = document.createElement('button')
    anterior.type = 'button'; anterior.className = 'selector-fecha-navegar'; anterior.textContent = '‹'; anterior.setAttribute('aria-label', 'Mes anterior')
    anterior.addEventListener('click', () => { vista = new Date(vista.getFullYear(), vista.getMonth() - 1, 1); renderizar() })
    const mes = document.createElement('select')
    mes.className = 'selector-fecha-mes'; mes.setAttribute('aria-label', 'Mes')
    MESES.forEach((nombre, indice) => mes.appendChild(new Option(nombre, String(indice))))
    mes.value = String(vista.getMonth())
    mes.addEventListener('change', () => { vista = new Date(vista.getFullYear(), Number(mes.value), 1); renderizar() })
    const anio = document.createElement('select')
    anio.className = 'selector-fecha-anio'; anio.setAttribute('aria-label', 'Año')
    for (let numero = limite.getFullYear(); numero >= 1900; numero -= 1) anio.appendChild(new Option(String(numero), String(numero)))
    anio.value = String(vista.getFullYear())
    anio.addEventListener('change', () => { vista = new Date(Number(anio.value), vista.getMonth(), 1); renderizar() })
    const siguiente = document.createElement('button')
    siguiente.type = 'button'; siguiente.className = 'selector-fecha-navegar'; siguiente.textContent = '›'; siguiente.setAttribute('aria-label', 'Mes siguiente')
    siguiente.disabled = vista.getFullYear() === limite.getFullYear() && vista.getMonth() >= limite.getMonth()
    siguiente.addEventListener('click', () => { vista = new Date(vista.getFullYear(), vista.getMonth() + 1, 1); renderizar() })
    cabecera.append(anterior, mes, anio, siguiente)
    const semana = document.createElement('div')
    semana.className = 'selector-fecha-semana'
    DIAS.forEach((dia) => { const etiqueta = document.createElement('span'); etiqueta.textContent = dia; semana.appendChild(etiqueta) })
    const dias = document.createElement('div')
    dias.className = 'selector-fecha-dias'
    const primerDia = new Date(vista.getFullYear(), vista.getMonth(), 1)
    const desplazamiento = (primerDia.getDay() + 6) % 7
    const ultimoDia = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate()
    for (let indice = 0; indice < desplazamiento; indice += 1) dias.appendChild(document.createElement('span'))
    for (let numero = 1; numero <= ultimoDia; numero += 1) {
      const fecha = new Date(vista.getFullYear(), vista.getMonth(), numero, 12)
      const control = document.createElement('button')
      control.type = 'button'; control.className = 'selector-fecha-dia'; control.textContent = String(numero)
      control.setAttribute('aria-label', textoFecha(fecha))
      control.disabled = fecha > limite
      control.classList.toggle('seleccionado', entrada.value === iso(fecha))
      control.addEventListener('click', () => { entrada.value = iso(fecha); refrescarTexto(); cerrar(); entrada.dispatchEvent(new Event('input', { bubbles: true })) })
      dias.appendChild(control)
    }
    panel.append(cabecera, semana, dias)
  }
  disparador.addEventListener('click', () => panel.hidden ? abrir() : cerrar())
  refrescarTexto()
  campo.append(titulo, entrada, disparador, panel)
  return { campo, entrada }
}
