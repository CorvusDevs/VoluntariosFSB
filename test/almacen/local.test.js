import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { crearAlmacenLocal } from '../../js/almacen/local.js'
import { ROSTER, LISTA } from '../ayudas/datos.js'

let almacen

beforeEach(async () => {
  indexedDB.deleteDatabase('voluntarios-fsb')
  almacen = await crearAlmacenLocal()
})

describe('almacen local', () => {
  it('devuelve un roster vacio cuando no hay nada guardado', async () => {
    const r = await almacen.leerRoster()
    expect(r.participantes).toEqual([])
    expect(r.voluntarios).toEqual([])
  })

  it('guarda y recupera el roster', async () => {
    await almacen.guardarRoster(ROSTER)
    const r = await almacen.leerRoster()
    expect(r.participantes).toHaveLength(ROSTER.participantes.length)
    expect(r.participantes[0].nombre).toBe('Gonzalo')
  })

  it('guarda y recupera una lista por fecha', async () => {
    await almacen.guardarLista(LISTA)
    const l = await almacen.leerLista('2026-08-08')
    expect(l.fecha).toBe('2026-08-08')
    expect(l.grupos).toHaveLength(2)
  })

  it('devuelve null para una fecha sin lista', async () => {
    expect(await almacen.leerLista('1999-01-01')).toBeNull()
  })

  it('lista las fechas guardadas, de la mas nueva a la mas vieja', async () => {
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-01' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-15' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-08' })
    const fechas = (await almacen.listarListas()).map((x) => x.fecha)
    expect(fechas).toEqual(['2026-08-15', '2026-08-08', '2026-08-01'])
  })

  it('guardar dos veces la misma fecha sobrescribe', async () => {
    await almacen.guardarLista(LISTA)
    await almacen.guardarLista({ ...LISTA, lugar: 'Otro lugar' })
    expect((await almacen.listarListas())).toHaveLength(1)
    expect((await almacen.leerLista('2026-08-08')).lugar).toBe('Otro lugar')
  })

  it('guarda y recupera una foto como blob', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
    await almacen.guardarFoto('p1.jpg', blob)
    const recuperada = await almacen.leerFoto('p1.jpg')
    expect(recuperada).toBeInstanceOf(Blob)
    expect(recuperada.size).toBe(3)
  })

  it('devuelve null para una foto inexistente', async () => {
    expect(await almacen.leerFoto('no-existe.jpg')).toBeNull()
  })

  it('borra una foto', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })
    await almacen.guardarFoto('p1.jpg', blob)
    await almacen.borrarFoto('p1.jpg')
    expect(await almacen.leerFoto('p1.jpg')).toBeNull()
  })

  it('lo guardado sobrevive a reabrir la base', async () => {
    await almacen.guardarRoster(ROSTER)
    const otro = await crearAlmacenLocal()
    expect((await otro.leerRoster()).participantes).toHaveLength(ROSTER.participantes.length)
  })
})
