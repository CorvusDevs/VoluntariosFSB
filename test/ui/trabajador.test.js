import { describe, it, expect } from 'vitest'
import { recargarAlCambiarControlador, registrarTrabajador, pidieronApagarlo } from '../../js/ui/trabajador.js'

const contenedorFalso = () => {
  const hechos = []
  return {
    hechos,
    async register(ruta, opciones) { hechos.push(`register:${ruta}:${opciones?.updateViaCache}`) },
    async getRegistrations() {
      return [{ async unregister() { hechos.push('unregister') } }]
    },
  }
}

describe('registro del service worker', () => {
  it('recarga una sola vez cuando el trabajador nuevo toma el control', () => {
    let alCambiar = null
    let recargas = 0
    expect(recargarAlCambiarControlador({
      contenedor: { addEventListener(tipo, accion) { if (tipo === 'controllerchange') alCambiar = accion } },
      recargar: () => { recargas += 1 },
    })).toBe(true)
    alCambiar()
    alCambiar()
    expect(recargas).toBe(1)
  })

  it('lo registra cuando el navegador lo soporta', async () => {
    const c = contenedorFalso()
    expect(await registrarTrabajador({ contenedor: c, busqueda: '' })).toBe('registrado')
    expect(c.hechos).toEqual(['register:sw.js:none'])
  })

  it('con ?sw=off lo desregistra, que es la salida de emergencia', async () => {
    // Sin esta salida, un trabajador con un error dejaria la aplicacion rota sin
    // forma de arreglarla desde el telefono.
    const c = contenedorFalso()
    expect(await registrarTrabajador({ contenedor: c, busqueda: '?sw=off' })).toBe('desregistrado')
    expect(c.hechos).toEqual(['unregister'])
  })

  it('reconoce el pedido de apagarlo entre otros parametros', () => {
    expect(pidieronApagarlo('?a=1&sw=off&b=2')).toBe(true)
    expect(pidieronApagarlo('?sw=on')).toBe(false)
    expect(pidieronApagarlo('')).toBe(false)
    expect(pidieronApagarlo(undefined)).toBe(false)
  })

  it('sin soporte no hace nada y no explota', async () => {
    expect(await registrarTrabajador({ contenedor: null })).toBe('sin soporte')
    expect(await registrarTrabajador({})).toBe('sin soporte')
  })

  it('si el registro falla, la aplicacion arranca igual', async () => {
    // Sin trabajador funciona todo, solo vuelve la ventana de cache.
    const roto = { async register() { throw new Error('no se pudo') }, async getRegistrations() { return [] } }
    expect(await registrarTrabajador({ contenedor: roto, busqueda: '' })).toBe('fallo')
  })

  it('acepta una ruta sellada para no reutilizar un trabajador anterior', async () => {
    const c = contenedorFalso()
    expect(await registrarTrabajador({ contenedor: c, ruta: 'sw.js?v=2026-08-29.1732' })).toBe('registrado')
    expect(c.hechos).toEqual(['register:sw.js?v=2026-08-29.1732:none'])
  })

  it('actualiza el trabajador sin desregistrar antes el que controla la pagina', async () => {
    const hechos = []
    const contenedor = {
      async register(ruta, opciones) { hechos.push(`register:${ruta}:${opciones.updateViaCache}`) },
    }
    expect(await registrarTrabajador({ contenedor, ruta: 'sw.js?v=nueva' })).toBe('registrado')
    expect(hechos).toEqual(['register:sw.js?v=nueva:none'])
  })
})

describe('el sello del trabajador acompaña al de la aplicacion', () => {
  it('sw.js lleva la misma version que version.json', async () => {
    // Si no, la cache vieja sobrevive a la publicacion y el trabajador termina
    // sirviendo codigo viejo, que es justo lo que vino a evitar.
    const { readFileSync } = await import('node:fs')
    const publicada = JSON.parse(readFileSync('version.json', 'utf8')).version
    const enElWorker = readFileSync('sw.js', 'utf8').match(/const VERSION = '([^']*)'/)[1]
    expect(enElWorker).toBe(publicada)
  })
})
