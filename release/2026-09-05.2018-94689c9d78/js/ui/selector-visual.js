import { elemento } from './componentes.js'

// Un selector donde cada opcion se ve, en vez de leerse. Los nombres de estas
// opciones ("superpuesto sobre la esquina", "apenas asomando") no le dicen nada a
// nadie hasta que ve el resultado, y probarlas de a una en un desplegable
// obligaba a abrir, elegir, mirar la planilla entera y volver.
//
// `dibujar(lienzo, valor)` es responsabilidad de quien lo usa: aca no sabemos
// que significa cada opcion, solo que se puede dibujar.
export function selectorVisual({
  campo, rotulo, valores, valor, dibujar, alElegir, ancho = 76,
}) {
  const caja = elemento('div', ['selector-visual'])
  caja.dataset.campo = campo
  caja.setAttribute('role', 'radiogroup')
  caja.setAttribute('aria-label', rotulo)
  caja.appendChild(elemento('p', ['selector-rotulo'], rotulo))

  const tira = elemento('div', ['selector-opciones'])
  valores.forEach(([suyo, etiqueta]) => {
    const boton = elemento('button', ['bosquejo'])
    boton.type = 'button'
    boton.dataset.valor = suyo
    boton.setAttribute('role', 'radio')
    const elegido = suyo === valor
    boton.setAttribute('aria-checked', String(elegido))
    if (elegido) boton.classList.add('elegido')

    const lienzo = document.createElement('canvas')
    lienzo.className = 'bosquejo-lienzo'
    lienzo.width = ancho
    lienzo.height = ancho
    // El dibujo no puede tumbar la pantalla: si un bosquejo falla, queda su
    // etiqueta y el resto del selector sigue funcionando.
    try {
      dibujar(lienzo, suyo, ancho)
    } catch {
      lienzo.classList.add('bosquejo-vacio')
    }
    boton.append(lienzo, elemento('span', ['bosquejo-etiqueta'], etiqueta))
    boton.addEventListener('click', () => {
      if (suyo === valor) return
      alElegir(suyo)
    })
    tira.appendChild(boton)
  })

  caja.appendChild(tira)
  return caja
}
