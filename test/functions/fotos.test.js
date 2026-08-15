import { describe, expect, it } from 'vitest'
import { bytesFoto } from '../../functions/api/[[ruta]].js'

describe('respuesta de fotos Cloudflare', () => {
  it('copia el ArrayBuffer de D1 antes de responder', async () => {
    const origen = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]).buffer
    const cuerpo = bytesFoto(origen)
    const respuesta = new Response(cuerpo)
    expect([...new Uint8Array(await respuesta.arrayBuffer())]).toEqual([0xff, 0xd8, 0xff, 0xd9])
  })
})
