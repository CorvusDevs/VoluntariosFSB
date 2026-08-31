import { describe, expect, it, vi } from 'vitest'
import { CpanelApi, cabeceraAutorizacion, _pruebas } from '../../herramientas/cpanel-api.mjs'

describe('cliente de cPanel', () => {
  it('usa el formato de token que exige cPanel sin incluirlo en la URL', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ result: { status: 1, data: ['ok'] } })))
    const api = new CpanelApi({ host: 'cpanel.ejemplo.org', usuario: 'cuenta', token: 'secreto', fetchImpl })
    await expect(api.uapi('Fileman', 'list_files', { dir: 'public_html' })).resolves.toEqual(['ok'])
    const [url, opciones] = fetchImpl.mock.calls[0]
    expect(String(url)).toContain('/execute/Fileman/list_files?dir=public_html')
    expect(String(url)).not.toContain('secreto')
    expect(opciones.headers.authorization).toBe('cpanel cuenta:secreto')
  })

  it('rechaza errores UAPI y API 2 aunque la respuesta HTTP sea correcta', () => {
    expect(() => _pruebas.validarRespuestaUapi({ result: { status: 0, errors: ['sin permiso'] } }, 'Fileman', 'x')).toThrow('sin permiso')
    expect(() => _pruebas.validarRespuestaApi2({ cpanelresult: { event: { result: 0 }, error: 'falló' } }, 'Fileman', 'x')).toThrow('falló')
  })

  it('no acepta credenciales incompletas', () => {
    expect(() => cabeceraAutorizacion('cuenta', '')).toThrow('Faltan')
  })
})
