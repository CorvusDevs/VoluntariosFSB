import { describe, expect, it } from 'vitest'
import { ConflictoCloudflareError, crearAlmacenCloudflare } from '../../js/almacen/cloudflare.js'

const json = (datos, estado = 200, headers = {}) => new Response(JSON.stringify(datos), {
  status: estado, headers: { 'content-type': 'application/json', ...headers },
})

describe('almacén Cloudflare', () => {
  it('lee el roster y conserva la revisión para guardar', async () => {
    const llamadas = []
    const almacen = crearAlmacenCloudflare({ fetchFn: async (url, opciones = {}) => {
      llamadas.push({ url, opciones })
      if (!opciones.method) return json({ version: 1, participantes: [], voluntarios: [] }, 200, { etag: '"4"' })
      return json({ revision: 5 })
    } })
    const roster = await almacen.leerRoster()
    await almacen.guardarRoster(roster)
    expect(llamadas[1].opciones.headers['if-match']).toBe('4')
  })

  it('traduce un conflicto sin pisar los datos remotos', async () => {
    const almacen = crearAlmacenCloudflare({ fetchFn: async () => json({ error: 'Cambió.' }, 409) })
    await expect(almacen.guardarRoster({ version: 1 })).rejects.toBeInstanceOf(ConflictoCloudflareError)
  })

  it('devuelve null cuando una foto todavía no existe', async () => {
    const almacen = crearAlmacenCloudflare({ fetchFn: async () => json({ error: 'No está.' }, 404) })
    await expect(almacen.leerFoto('p_1.jpg')).resolves.toBeNull()
  })

  it('reutiliza una foto ya leída durante la sesión', async () => {
    let lecturas = 0
    const almacen = crearAlmacenCloudflare({ fetchFn: async () => {
      lecturas += 1
      return new Response(new Blob(['foto'], { type: 'image/jpeg' }))
    } })
    const primera = await almacen.leerFoto('p_1.jpg')
    const segunda = await almacen.leerFoto('p_1.jpg')
    expect(lecturas).toBe(1)
    expect(segunda).toBe(primera)
  })
})
