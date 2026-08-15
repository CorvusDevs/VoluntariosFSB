import { describe, expect, it, vi } from 'vitest'
import { cerrarSesionCloudflare, ingresarCloudflare, leerSesionCloudflare } from '../../js/acceso/cloudflare.js'

const respuesta = (datos, estado = 200) => new Response(JSON.stringify(datos), {
  status: estado, headers: { 'content-type': 'application/json' },
})

describe('acceso Cloudflare', () => {
  it('muestra el ingreso cuando todavía no hay una sesión', async () => {
    await expect(leerSesionCloudflare({ fetchFn: async () => respuesta({ error: 'sin sesión' }, 401) })).resolves.toBeNull()
  })

  it('envía usuario y contraseña solamente al endpoint de ingreso', async () => {
    const fetchFn = vi.fn(async () => respuesta({ usuario: 'majo', nombre: 'Majo', rol: 'coordinacion' }))
    await expect(ingresarCloudflare({ usuario: 'majo', contrasena: 'secreta' }, { fetchFn }))
      .resolves.toMatchObject({ usuario: 'majo' })
    expect(fetchFn).toHaveBeenCalledWith('/api/ingresar', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ usuario: 'majo', contrasena: 'secreta' })
  })

  it('cierra la sesión en el servidor', async () => {
    const fetchFn = vi.fn(async () => respuesta({ cerrada: true }))
    await cerrarSesionCloudflare({ fetchFn })
    expect(fetchFn).toHaveBeenCalledWith('/api/cerrar', { method: 'POST' })
  })
})
