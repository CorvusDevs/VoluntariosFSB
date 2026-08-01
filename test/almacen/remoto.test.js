import { describe, it, expect, beforeEach } from 'vitest'
import { crearAlmacenRemoto } from '../../js/almacen/remoto.js'
import { ConflictoError } from '../../js/almacen/github.js'
import { ROSTER, LISTA } from '../ayudas/datos.js'

function clienteFalso(archivos = {}) {
  const escrituras = []
  return {
    escrituras,
    archivos,
    async verificarAcceso() { return true },
    async leerTexto(ruta) {
      return archivos[ruta] ? { texto: archivos[ruta].texto, sha: archivos[ruta].sha } : null
    },
    async escribirTexto(ruta, texto, sha, mensaje) {
      escrituras.push({ ruta, texto, sha, mensaje })
      if (archivos[ruta] && archivos[ruta].sha !== sha) throw new ConflictoError('conflicto')
      archivos[ruta] = { texto, sha: `sha-${escrituras.length}` }
      return { sha: archivos[ruta].sha }
    },
    async leerBytes(ruta) {
      return archivos[ruta] ? { bytes: archivos[ruta].bytes, sha: archivos[ruta].sha } : null
    },
    async escribirBytes(ruta, bytes, sha) {
      escrituras.push({ ruta, bytes, sha })
      archivos[ruta] = { bytes, sha: `sha-${escrituras.length}` }
      return { sha: archivos[ruta].sha }
    },
    async borrar(ruta) { delete archivos[ruta] },
    async listar(ruta) {
      return Object.keys(archivos)
        .filter((r) => r.startsWith(`${ruta}/`))
        .map((r) => ({ nombre: r.slice(ruta.length + 1), sha: archivos[r].sha }))
    },
  }
}

let cliente, almacen

beforeEach(() => {
  cliente = clienteFalso()
  almacen = crearAlmacenRemoto({ cliente })
})

describe('roster', () => {
  it('devuelve un roster vacio cuando no hay archivo', async () => {
    expect((await almacen.leerRoster()).participantes).toEqual([])
  })

  it('guarda y recupera', async () => {
    await almacen.guardarRoster(ROSTER)
    expect((await almacen.leerRoster()).participantes).toHaveLength(ROSTER.participantes.length)
  })

  it('lo guarda en roster.json', async () => {
    await almacen.guardarRoster(ROSTER)
    expect(cliente.escrituras[0].ruta).toBe('roster.json')
  })

  it('manda el sha conocido en la segunda escritura', async () => {
    await almacen.guardarRoster(ROSTER)
    await almacen.guardarRoster(ROSTER)
    expect(cliente.escrituras[0].sha).toBeNull()
    expect(cliente.escrituras[1].sha).toBe('sha-1')
  })

  it('propaga el conflicto en vez de pisar', async () => {
    await almacen.guardarRoster(ROSTER)
    cliente.archivos['roster.json'].sha = 'otro'
    await expect(almacen.guardarRoster(ROSTER)).rejects.toBeInstanceOf(ConflictoError)
  })

  it('conserva los acentos ida y vuelta', async () => {
    const conAcento = structuredClone(ROSTER)
    conAcento.participantes[0].nombre = 'Julián Begoña'
    await almacen.guardarRoster(conAcento)
    expect((await almacen.leerRoster()).participantes[0].nombre).toBe('Julián Begoña')
  })
})

describe('listas', () => {
  it('guarda cada lista bajo su fecha', async () => {
    await almacen.guardarLista(LISTA)
    expect(cliente.escrituras[0].ruta).toBe('listas/2026-08-08.json')
  })

  it('lee una lista por fecha', async () => {
    await almacen.guardarLista(LISTA)
    expect((await almacen.leerLista('2026-08-08')).lugar).toBe('Tres Cruces')
  })

  it('devuelve null para una fecha sin lista', async () => {
    expect(await almacen.leerLista('1999-01-01')).toBeNull()
  })

  it('lista las fechas de la mas nueva a la mas vieja', async () => {
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-01' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-15' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-08' })
    expect((await almacen.listarListas()).map((x) => x.fecha))
      .toEqual(['2026-08-15', '2026-08-08', '2026-08-01'])
  })
})

describe('fotos', () => {
  it('guarda y recupera un blob', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
    await almacen.guardarFoto('p1.jpg', blob)
    const recuperada = await almacen.leerFoto('p1.jpg')
    expect(recuperada).toBeInstanceOf(Blob)
    expect(new Uint8Array(await recuperada.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('la guarda bajo fotos/', async () => {
    await almacen.guardarFoto('p1.jpg', new Blob([new Uint8Array([1])]))
    expect(cliente.escrituras[0].ruta).toBe('fotos/p1.jpg')
  })

  it('devuelve null si no existe', async () => {
    expect(await almacen.leerFoto('no.jpg')).toBeNull()
  })

  it('borra', async () => {
    await almacen.guardarFoto('p1.jpg', new Blob([new Uint8Array([1])]))
    await almacen.borrarFoto('p1.jpg')
    expect(await almacen.leerFoto('p1.jpg')).toBeNull()
  })
})

describe('verificacion de acceso', () => {
  it('verifica una sola vez, no en cada lectura', async () => {
    let veces = 0
    cliente.verificarAcceso = async () => { veces += 1; return true }
    await almacen.leerRoster()
    await almacen.leerRoster()
    await almacen.leerLista('2026-08-08')
    expect(veces).toBe(1)
  })
})
