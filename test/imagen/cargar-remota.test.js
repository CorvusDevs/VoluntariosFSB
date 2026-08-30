import { describe, expect, it, vi } from 'vitest'
import { bytesImagenConLimite, cargarImagenRemota, idGoogleDriveDesdeUrl, urlDescargaGoogleDrive } from '../../js/imagen/cargar-remota.js'

class LectorPrueba {
  readAsDataURL() { this.result = 'data:image/png;base64,AAA'; this.onload() }
}

describe('carga de imágenes remotas', () => {
  it('reconoce enlaces públicos habituales de Google Drive', () => {
    const id = '1234567890_AbCdEf'
    expect(idGoogleDriveDesdeUrl(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(id)
    expect(idGoogleDriveDesdeUrl(`https://drive.google.com/open?id=${id}`)).toBe(id)
    expect(urlDescargaGoogleDrive(`https://drive.google.com/file/d/${id}/view`)).toContain(`id=${id}`)
  })

  it('usa la ruta protegida del gestor para Google Drive', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(new Blob(['foto'], { type: 'image/png' }), { headers: { 'content-type': 'image/png' } }))
    const resultado = await cargarImagenRemota('https://drive.google.com/file/d/1234567890_AbCdEf/view', { fetcher, Lector: LectorPrueba })
    expect(resultado).toBe('data:image/png;base64,AAA')
    expect(fetcher).toHaveBeenCalledWith('/api/cms/imagen-remota', expect.objectContaining({ method: 'POST', credentials: 'same-origin' }))
  })

  it('completa https antes de cargar una imagen desde un dominio simple', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(new Blob(['foto'], { type: 'image/png' }), { headers: { 'content-type': 'image/png' } }))
    await cargarImagenRemota('imagenes.ejemplo.org/foto.png', { fetcher, Lector: LectorPrueba })
    expect(fetcher).toHaveBeenCalledWith('https://imagenes.ejemplo.org/foto.png', expect.any(Object))
  })

  it('rechaza protocolos inseguros y respuestas que no son imágenes', async () => {
    await expect(cargarImagenRemota('http://ejemplo.org/foto.jpg')).rejects.toThrow('https://')
    const fetcher = vi.fn().mockResolvedValue(new Response('<html></html>', { headers: { 'content-type': 'text/html' } }))
    await expect(cargarImagenRemota('https://ejemplo.org/foto', { fetcher, Lector: LectorPrueba })).rejects.toThrow('no apunta a una imagen')
  })

  it('detiene la lectura cuando la respuesta supera el límite', async () => {
    const respuesta = new Response(new Uint8Array([1, 2, 3, 4]), { headers: { 'content-type': 'image/png' } })
    await expect(bytesImagenConLimite(respuesta, 3)).rejects.toThrow('supera')
  })
})
