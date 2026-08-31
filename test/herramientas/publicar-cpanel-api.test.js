import { describe, expect, it } from 'vitest'
import { opcionesDesde, puertoPruebasPublicacion, rutaRelativaCuenta } from '../../herramientas/publicar-cpanel-api.mjs'

describe('publicación automatizada de cPanel', () => {
  it('interpreta el modo seguro y la ruta de la página', () => {
    expect(opcionesDesde(['--simular', '--sin-construir', '--web-root', '/sitio'])).toEqual({
      simular: true, sinConstruir: true, webRoot: '/sitio',
    })
  })

  it('solo permite operar dentro de la cuenta esperada', () => {
    expect(rutaRelativaCuenta('/home/aleteaor/gestor.aletea.org/paquete.zip', 'aleteaor')).toBe('gestor.aletea.org/paquete.zip')
    expect(() => rutaRelativaCuenta('/home/otra/archivo.zip', 'aleteaor')).toThrow('/home/aleteaor/')
  })

  it('rechaza opciones desconocidas para evitar publicaciones ambiguas', () => {
    expect(() => opcionesDesde(['--publicar-produccion'])).toThrow('Opción desconocida')
  })

  it('usa un puerto aislado por ejecución y respeta una selección explícita', () => {
    expect(puertoPruebasPublicacion(33050, '')).toBe('47050')
    expect(puertoPruebasPublicacion(33050, '49876')).toBe('49876')
  })
})
