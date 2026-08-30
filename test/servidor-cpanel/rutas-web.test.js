import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esRutaGestor, htmlGestorParaRuta } from '../../servidor-cpanel/rutas-web.mjs'

const htmlBase = readFileSync('index.html', 'utf8')
const servidor = readFileSync('servidor-cpanel/app.mjs', 'utf8')

describe('rutas web del gestor en cPanel', () => {
  it('sirve una vista social específica y segura para Finanzas', () => {
    const html = htmlGestorParaRuta(htmlBase, 'https://gestor.aletea.org/finanzas', '/finanzas')
    expect(html).toContain('<title>Finanzas | Aletea</title>')
    expect(html).toContain('Seguimiento privado de cuotas, pagos y pendientes de Fútbol sin Barreras.')
    expect(html).toContain('content="https://gestor.aletea.org/finanzas"')
    expect(html).toContain('<base href="/">')
    expect(html).not.toMatch(/saldo|importe|deuda|nombre de/i)
  })

  it('distingue rutas válidas de archivos o direcciones inventadas', () => {
    expect(esRutaGestor('/biblioteca')).toBe(true)
    expect(esRutaGestor('/equipos/familias')).toBe(true)
    expect(esRutaGestor('/css/estilos.css')).toBe(false)
    expect(esRutaGestor('/ruta-inventada')).toBe(false)
    expect(htmlGestorParaRuta(htmlBase, 'https://gestor.aletea.org/', '/ruta-inventada')).toBeNull()
  })

  it('presenta Mis tareas con una ruta clara y conserva los enlaces anteriores', () => {
    const html = htmlGestorParaRuta(htmlBase, 'https://gestor.aletea.org/mi-trabajo', '/mi-trabajo')
    expect(esRutaGestor('/tareas')).toBe(true)
    expect(esRutaGestor('/mi-trabajo')).toBe(true)
    expect(html).toContain('<title>Mis tareas | Aletea</title>')
    expect(html).toContain('content="https://gestor.aletea.org/tareas"')
    expect(html).toContain('<link rel="canonical" href="https://gestor.aletea.org/tareas">')
  })

  it('mantiene metadatos genéricos en la portada', () => {
    const html = htmlGestorParaRuta(htmlBase, 'https://gestor.aletea.org/', '/')
    expect(html).toContain('<title>Aletea institucional</title>')
    expect(html).toContain('content="https://gestor.aletea.org/"')
  })

  it('conserva CORS y un error legible si falla un formulario público', () => {
    expect(servidor).toContain("peticion.url.startsWith('/api/formularios')")
    expect(servidor).toContain("respuesta.setHeader('access-control-allow-origin', '*')")
    expect(servidor).toContain("STAGING_DEPLOY_WEBHOOK: process.env.STAGING_DEPLOY_WEBHOOK")
  })
})
