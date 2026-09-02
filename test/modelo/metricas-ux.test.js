import { beforeEach, describe, expect, it } from 'vitest'
import { completarMedicionUX, iniciarMedicionUX, registrarAbandonoFormularioUX, reiniciarMedicionesUX, resumenMetricasUX } from '../../js/modelo/metricas-ux.js'

const almacen = () => {
  const datos = new Map()
  return { getItem: (clave) => datos.get(clave) || null, setItem: (clave, valor) => datos.set(clave, valor) }
}

describe('métricas UX agregadas y privadas', () => {
  beforeEach(() => reiniciarMedicionesUX())

  it('mide una tarea permitida sin guardar contenido, persona ni identificadores', () => {
    const destino = almacen()
    iniciarMedicionUX('crear_tarea', { reloj: () => 100 })
    expect(completarMedicionUX('crear_tarea', { almacen: destino, reloj: () => 850, fecha: () => '2026-09-01' })).toBe(750)
    const resumen = resumenMetricasUX({ almacen: destino })
    expect(resumen.operaciones.crear_tarea).toMatchObject({ completadas: 1, duracionTotalMs: 750, ultimaFecha: '2026-09-01' })
    expect(JSON.stringify(resumen)).not.toMatch(/correo|nombre|contenido|respuesta|persona/i)
  })

  it('registra abandono como un contador diario sin campos del formulario', () => {
    const destino = almacen()
    registrarAbandonoFormularioUX({ almacen: destino, fecha: () => '2026-09-01' })
    expect(resumenMetricasUX({ almacen: destino }).operaciones.abandono_formulario).toMatchObject({ abandonos: 1, ultimaFecha: '2026-09-01' })
  })
})
