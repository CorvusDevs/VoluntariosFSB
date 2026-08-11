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

  it('refresca el sha despues de un conflicto, para que el reintento pueda funcionar', async () => {
    await almacen.guardarRoster(ROSTER)
    cliente.archivos['roster.json'].sha = 'cambiado-por-otra'
    await expect(almacen.guardarRoster(ROSTER)).rejects.toBeInstanceOf(ConflictoError)
    await expect(almacen.guardarRoster(ROSTER)).resolves.toBeTruthy()
  })

  it('el conflicto igual se propaga, no se traga', async () => {
    await almacen.guardarRoster(ROSTER)
    cliente.archivos['roster.json'].sha = 'otra'
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

describe('descripcion de la accion en el registro', () => {
  const conAutor = () => {
    const cliente = clienteFalso()
    return { cliente, almacen: crearAlmacenRemoto({ cliente, autor: 'Ana' }) }
  }

  it('el mensaje del commit dice que se hizo y quien', async () => {
    // Sin descripcion el registro decia "Cambiar la planilla" una vez por
    // guardado, que con tres asignaciones son tres renglones identicos.
    const { cliente, almacen } = conAutor()
    await almacen.guardarLista({ fecha: '2026-08-08' }, 'Asignar a Vicky con Gaia')
    expect(cliente.escrituras.at(-1).mensaje).toBe('Asignar a Vicky con Gaia · Ana')
  })

  it('sin descripcion cae en un mensaje generico, no en undefined', async () => {
    const { cliente, almacen } = conAutor()
    await almacen.guardarLista({ fecha: '2026-08-08' })
    expect(cliente.escrituras.at(-1).mensaje).toBe('Cambiar la planilla del 2026-08-08 · Ana')
  })
})

describe('asistencias y seguimientos', () => {
  const conAutor = () => {
    const cliente = clienteFalso()
    return { cliente, almacen: crearAlmacenRemoto({ cliente, autor: 'Ana' }) }
  }

  it('lee las correcciones del mes', async () => {
    const { cliente, almacen: deposito } = conAutor()
    cliente.archivos['asistencias/2026-08.json'] = {
      texto: JSON.stringify({
        version: 1,
        mes: '2026-08',
        correcciones: [{ fecha: '2026-08-15', persona: 'p1', vino: false }],
      }),
      sha: 'abc',
    }
    expect((await deposito.leerAsistencias('2026-08')).correcciones).toHaveLength(1)
  })

  it('un mes sin correcciones no es un error', async () => {
    const { almacen: deposito } = conAutor()
    expect(await deposito.leerAsistencias('2026-01')).toBeNull()
  })

  it('guarda las correcciones con quien las hizo en el mensaje', async () => {
    const { cliente, almacen: deposito } = conAutor()
    await deposito.guardarAsistencias('2026-08', { version: 1, mes: '2026-08', correcciones: [] },
      'Corregir la asistencia del 2026-08-15')
    expect(cliente.escrituras.at(-1).ruta).toBe('asistencias/2026-08.json')
    expect(cliente.escrituras.at(-1).mensaje).toBe('Corregir la asistencia del 2026-08-15 · Ana')
  })

  it('guarda los seguimientos', async () => {
    const { cliente, almacen: deposito } = conAutor()
    await deposito.guardarSeguimientos({ version: 1, seguimientos: [] }, 'Anotar un seguimiento de Gaia')
    expect(cliente.archivos['seguimientos.json']).toBeDefined()
    expect(cliente.escrituras.at(-1).mensaje).toBe('Anotar un seguimiento de Gaia · Ana')
  })

  it('sin seguimientos guardados devuelve null en vez de romper', async () => {
    const { almacen: deposito } = conAutor()
    expect(await deposito.leerSeguimientos()).toBeNull()
  })
})
