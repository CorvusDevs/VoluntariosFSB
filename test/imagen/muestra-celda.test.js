import { describe, it, expect } from 'vitest'
import { maquetar } from '../../js/imagen/maquetar.js'
import { listaDeMuestra, regionDeFila, CLAVES_MUESTRA } from '../../js/ui/muestra-celda.js'
import { medirFalso } from '../ayudas/datos.js'
import { RETRATOS, anchoDeCeldaRetratos } from '../../js/imagen/tema.js'

const roster = {
  participantes: [{ id: CLAVES_MUESTRA.participante, nombre: 'Ezequiel', grupo: 1, activo: true, foto: 'p.jpg' }],
  voluntarios: [{ id: CLAVES_MUESTRA.voluntario, nombre: 'Alejandro', activo: true, foto: 'v.jpg' }],
}
const plano = (formato) => maquetar(
  listaDeMuestra(formato, 'abajo-derecha', roster.participantes[0], roster.voluntarios[0]),
  roster,
  { saludo: '', despedida: '', medirTexto: medirFalso },
)

describe('muestra de una celda para el editor de fotos', () => {
  it('recorta justo la celda de esa persona, en los cuatro formatos', () => {
    // Si la region se calculara con las constantes de cada formato habria que
    // repetirlas aca y podrian quedar desincronizadas. Sale de las ordenes.
    ;['retratos', 'grilla', 'columnas', 'filas'].forEach((formato) => {
      const region = regionDeFila(plano(formato))
      expect(region, formato).not.toBeNull()
      expect(region.ancho, formato).toBeGreaterThan(0)
      expect(region.alto, formato).toBeGreaterThan(0)
    })
  })

  it('en retratos la region es exactamente la celda', () => {
    const ancho = anchoDeCeldaRetratos(56)
    const region = regionDeFila(plano('retratos'))
    expect(region.ancho).toBe(ancho)
    expect(region.alto).toBe(Math.round(ancho * RETRATOS.proporcionCelda))
  })

  it('incluye al voluntario superpuesto, que es medio punto de la vista previa', () => {
    const ordenes = plano('retratos').ordenes.filter((o) => o.fila === CLAVES_MUESTRA.participante)
    expect(ordenes.some((o) => o.tipo === 'texto' && o.texto === 'Alejandro')).toBe(true)
    expect(ordenes.some((o) => o.tipo === 'imagen' && o.clave === 'v.jpg')).toBe(true)
  })

  it('funciona igual sin voluntario asignado', () => {
    const sinVol = maquetar(
      listaDeMuestra('retratos', 'abajo-derecha', roster.participantes[0], null),
      { participantes: roster.participantes, voluntarios: [] },
      { saludo: '', despedida: '', medirTexto: medirFalso },
    )
    expect(regionDeFila(sinVol)).not.toBeNull()
  })

  it('devuelve null si esa persona no esta en el plano', () => {
    expect(regionDeFila(plano('retratos'), 'nadie')).toBeNull()
  })
})
