import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  sello, versionPublicada, hayQueActualizar, vigilarVersion,
} from '../../js/ui/aviso-version.js'
import { VERSION } from '../../js/version.js'

describe('sello de version', () => {
  it('version.js y version.json dicen lo mismo', () => {
    // Si se desincronizan, el aviso de version nueva aparece para siempre o no
    // aparece nunca. Las dos fallas son peores que no tener aviso.
    // Ruta desde la raiz del repo: en jsdom, import.meta.url es una URL http.
    const publicado = JSON.parse(readFileSync('version.json', 'utf8'))
    expect(publicado.version).toBe(VERSION)
  })

  it('escribe la version en la pantalla', () => {
    expect(sello().textContent).toContain(VERSION)
  })
})

describe('deteccion de version nueva', () => {
  const respuesta = (cuerpo, ok = true) => async () => ({ ok, json: async () => cuerpo })

  it('lee la version publicada sin usar la cache', async () => {
    let opciones = null
    const pedir = async (ruta, o) => { opciones = o; return { ok: true, json: async () => ({ version: 'X' }) } }
    expect(await versionPublicada(pedir)).toBe('X')
    // Sin esto leeriamos la misma copia vieja que estamos tratando de detectar.
    expect(opciones.cache).toBe('no-store')
  })

  it('no rompe nada si no se puede averiguar', async () => {
    expect(await versionPublicada(async () => { throw new Error('sin red') })).toBeNull()
    expect(await versionPublicada(respuesta({}, false))).toBeNull()
    expect(await versionPublicada(respuesta({ version: 7 }))).toBeNull()
  })

  it('solo avisa cuando la publicada es distinta de la cargada', () => {
    expect(hayQueActualizar('otra', 'esta')).toBe(true)
    expect(hayQueActualizar('esta', 'esta')).toBe(false)
    expect(hayQueActualizar(null, 'esta')).toBe(false)
  })
})

describe('barra de actualizacion', () => {
  let raiz
  beforeEach(() => {
    document.body.innerHTML = '<div id="raiz"></div>'
    raiz = document.getElementById('raiz')
  })

  it('no aparece cuando la version es la misma', async () => {
    vigilarVersion(raiz, { pedir: async () => ({ ok: true, json: async () => ({ version: VERSION }) }) })
    await new Promise((r) => setTimeout(r, 0))
    expect(raiz.querySelector('.aviso-version')).toBeNull()
  })

  it('aparece arriba de todo cuando hay una nueva, y recarga al tocarla', async () => {
    let recargo = false
    vigilarVersion(raiz, {
      pedir: async () => ({ ok: true, json: async () => ({ version: 'mas-nueva' }) }),
      recargar: () => { recargo = true },
    })
    await new Promise((r) => setTimeout(r, 0))
    const aviso = raiz.querySelector('.aviso-version')
    expect(aviso).not.toBeNull()
    expect(raiz.firstElementChild).toBe(aviso)
    raiz.querySelector('[data-accion="actualizar-version"]').click()
    expect(recargo).toBe(true)
  })
})
