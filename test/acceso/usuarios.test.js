import { describe, it, expect } from 'vitest'
import {
  archivoVacio, leerUsuarios, buscarUsuario, agregarUsuario, quitarUsuario,
  cambiarRol, esAdmin, urlUsuarios,
} from '../../js/acceso/usuarios.js'

const REGISTRO = {
  kdf: { algoritmo: 'PBKDF2-SHA256', iteraciones: 600000, sal: 'c2Fs' },
  cifrado: { algoritmo: 'AES-GCM', iv: 'aXY=', datos: 'ZGF0b3M=' },
}

const ARCHIVO = {
  version: 1,
  usuarios: [{ usuario: 'majo', nombre: 'Majo', rol: 'admin', ...REGISTRO }],
}

describe('urlUsuarios', () => {
  it('apunta a raw.githubusercontent, no a la API', () => {
    const url = urlUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main' })
    expect(url).toContain('raw.githubusercontent.com/d/r/main/usuarios.json')
    expect(url).not.toContain('api.github.com')
  })
})

describe('archivoVacio', () => {
  it('trae version y una lista vacia', () => {
    expect(archivoVacio()).toEqual({ version: 1, usuarios: [] })
  })
})

describe('leerUsuarios', () => {
  it('descarga y parsea el archivo', async () => {
    const fetchFn = async () => ({ ok: true, status: 200, json: async () => ARCHIVO })
    expect((await leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn })).usuarios)
      .toHaveLength(1)
  })

  it('devuelve un archivo vacio si todavia no existe', async () => {
    const fetchFn = async () => ({ ok: false, status: 404, json: async () => ({}) })
    expect(await leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn }))
      .toEqual({ version: 1, usuarios: [] })
  })

  it('pide sin cache para no arrastrar los 5 minutos de raw', async () => {
    let opcionesVistas = null
    const fetchFn = async (url, opciones) => {
      opcionesVistas = opciones
      return { ok: true, status: 200, json: async () => ARCHIVO }
    }
    await leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn })
    expect(opcionesVistas.cache).toBe('no-store')
  })

  it('falla con mensaje claro ante un error que no sea 404', async () => {
    const fetchFn = async () => ({ ok: false, status: 500, json: async () => ({}) })
    await expect(leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn }))
      .rejects.toThrow(/500/)
  })
})

describe('buscarUsuario', () => {
  it('encuentra sin importar mayusculas ni espacios', () => {
    expect(buscarUsuario(ARCHIVO, '  MAJO ').nombre).toBe('Majo')
  })

  it('devuelve null si no esta', () => {
    expect(buscarUsuario(ARCHIVO, 'otra')).toBeNull()
  })
})

describe('agregarUsuario', () => {
  it('suma el registro cifrado sin tocar el original', () => {
    const nuevo = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    expect(nuevo.usuarios).toHaveLength(2)
    expect(ARCHIVO.usuarios).toHaveLength(1)
    expect(buscarUsuario(nuevo, 'ana').cifrado.datos).toBe('ZGF0b3M=')
  })

  it('por defecto crea una coordinadora, no una administradora', () => {
    expect(buscarUsuario(agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO), 'ana').rol)
      .toBe('coordinacion')
  })

  it('permite crear otra administradora', () => {
    const nuevo = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'admin' }, REGISTRO)
    expect(buscarUsuario(nuevo, 'ana').rol).toBe('admin')
  })

  it('rechaza un rol que no exista', () => {
    expect(() => agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'jefa' }, REGISTRO))
      .toThrow(/rol/i)
  })

  it('normaliza el usuario a minuscula sin espacios', () => {
    expect(agregarUsuario(ARCHIVO, { usuario: '  Ana  ', nombre: 'Ana' }, REGISTRO).usuarios[1].usuario)
      .toBe('ana')
  })

  it('rechaza un usuario repetido', () => {
    expect(() => agregarUsuario(ARCHIVO, { usuario: 'MAJO', nombre: 'x' }, REGISTRO))
      .toThrow(/ya existe/i)
  })

  it('rechaza un usuario vacio', () => {
    expect(() => agregarUsuario(ARCHIVO, { usuario: '  ', nombre: 'x' }, REGISTRO)).toThrow()
  })
})

describe('cambiarRol', () => {
  it('asciende a una coordinadora', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    expect(buscarUsuario(cambiarRol(conDos, 'ana', 'admin'), 'ana').rol).toBe('admin')
  })

  it('no toca el archivo original', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    cambiarRol(conDos, 'ana', 'admin')
    expect(buscarUsuario(conDos, 'ana').rol).toBe('coordinacion')
  })

  it('rechaza dejar la lista sin ninguna administradora', () => {
    expect(() => cambiarRol(ARCHIVO, 'majo', 'coordinacion')).toThrow(/administradora/i)
  })

  it('permite bajar a una administradora si queda otra', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'admin' }, REGISTRO)
    expect(buscarUsuario(cambiarRol(conDos, 'ana', 'coordinacion'), 'ana').rol).toBe('coordinacion')
  })

  it('falla si el usuario no existe', () => {
    expect(() => cambiarRol(ARCHIVO, 'nadie', 'admin')).toThrow(/nadie/)
  })

  it('rechaza un rol que no exista', () => {
    expect(() => cambiarRol(ARCHIVO, 'majo', 'jefa')).toThrow(/rol/i)
  })
})

describe('quitarUsuario', () => {
  it('saca a una coordinadora sin tocar el original', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    expect(quitarUsuario(conDos, 'ana').usuarios).toHaveLength(1)
    expect(conDos.usuarios).toHaveLength(2)
  })

  it('rechaza quitar a la ultima administradora', () => {
    expect(() => quitarUsuario(ARCHIVO, 'majo')).toThrow(/administradora/i)
  })

  it('permite quitar a una administradora si queda otra', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'admin' }, REGISTRO)
    expect(quitarUsuario(conDos, 'majo').usuarios).toHaveLength(1)
  })

  it('no falla si no estaba', () => {
    expect(quitarUsuario(ARCHIVO, 'nadie').usuarios).toHaveLength(1)
  })
})

describe('esAdmin', () => {
  it('reconoce el rol', () => {
    expect(esAdmin(buscarUsuario(ARCHIVO, 'majo'))).toBe(true)
    expect(esAdmin({ rol: 'coordinacion' })).toBe(false)
    expect(esAdmin(null)).toBe(false)
  })
})
