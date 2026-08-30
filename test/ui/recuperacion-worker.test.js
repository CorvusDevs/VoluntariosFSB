import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

function codigoRecuperacion() {
  const html = readFileSync('actualizar.html', 'utf8')
  const codigo = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  if (!codigo) throw new Error('No se encontró el script de recuperación.')
  return codigo.trim()
}

async function ejecutarRecuperacion({ registros = [], nombresCache = [] } = {}) {
  const eliminadas = []
  let destino = null
  const navegador = {
    serviceWorker: {
      controller: { scriptURL: 'https://gestor.aletea.org/sw.js?v=anterior' },
      async getRegistrations() { return registros },
    },
  }
  const caches = {
    async keys() { return nombresCache },
    async delete(nombre) { eliminadas.push(nombre); return true },
  }
  const ubicacion = {
    origin: 'https://gestor.aletea.org',
    replace(valor) { destino = valor },
  }
  const ejecutar = new Function('navigator', 'caches', 'location', 'URL', `return ${codigoRecuperacion()}`)
  await ejecutar(navegador, caches, ubicacion, URL)
  return { eliminadas, destino }
}

describe('recuperación desde un service worker anterior', () => {
  it('retira el controlador anterior, conserva caches ajenas y abre el build nuevo', async () => {
    let desregistrado = false
    const resultado = await ejecutarRecuperacion({
      registros: [{ async unregister() { desregistrado = true; return true } }],
      nombresCache: ['voluntarios-fsb-anterior', 'otra-aplicacion'],
    })

    expect(desregistrado).toBe(true)
    expect(resultado.eliminadas).toEqual(['voluntarios-fsb-anterior'])
    const destino = new URL(resultado.destino)
    expect(destino.origin).toBe('https://gestor.aletea.org')
    expect(destino.pathname).toBe('/')
    expect(destino.searchParams.get('actualizada')).toMatch(/^\d{4}-\d{2}-\d{2}\.\d{4}-[a-f0-9]{10}$/)
    expect(destino.searchParams.get('v')).toBe(destino.searchParams.get('actualizada'))
  })

  it('también funciona en una sesión limpia sin registros anteriores', async () => {
    const resultado = await ejecutarRecuperacion()
    expect(resultado.eliminadas).toEqual([])
    expect(resultado.destino).toContain('actualizada=')
  })
})
