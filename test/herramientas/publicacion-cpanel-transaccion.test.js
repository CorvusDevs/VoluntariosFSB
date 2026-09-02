import { readFile, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { basename, dirname } from 'node:path/posix'
import { describe, expect, it } from 'vitest'
import {
  asegurarDirectorio, capasPendientes, publicarTransaccional, rutaRelativaCuenta,
} from '../../herramientas/publicacion-cpanel-transaccion.mjs'

class CpanelFalso {
  constructor() {
    this.directorios = new Map([['/home', new Set()]])
    this.contenidos = new Map()
    this.tamanos = new Map()
    this.llamadas = []
    this.extracciones = new Map()
    this.fallarTrash = false
  }

  agregarDirectorio(ruta) {
    if (this.directorios.has(ruta)) return
    const padre = dirname(ruta)
    this.agregarDirectorio(padre)
    this.directorios.set(ruta, new Set())
    this.directorios.get(padre).add(basename(ruta))
  }

  agregarArchivo(ruta, contenido = '') {
    const padre = dirname(ruta)
    this.agregarDirectorio(padre)
    this.directorios.get(padre).add(basename(ruta))
    this.contenidos.set(ruta, contenido)
    this.tamanos.set(ruta, Buffer.byteLength(contenido))
  }

  quitar(ruta) {
    const padre = dirname(ruta)
    this.directorios.get(padre)?.delete(basename(ruta))
    for (const clave of [...this.directorios.keys()].filter((valor) => valor === ruta || valor.startsWith(`${ruta}/`))) this.directorios.delete(clave)
    for (const clave of [...this.contenidos.keys()].filter((valor) => valor === ruta || valor.startsWith(`${ruta}/`))) {
      this.contenidos.delete(clave); this.tamanos.delete(clave)
    }
  }

  mover(ruta, destinoDirectorio) {
    if (!this.directorios.has(destinoDirectorio)) throw new Error(`No existe ${destinoDirectorio}`)
    const destino = `${destinoDirectorio}/${basename(ruta)}`
    if (this.directorios.has(ruta)) {
      const directorios = [...this.directorios.entries()].filter(([clave]) => clave === ruta || clave.startsWith(`${ruta}/`))
      const archivos = [...this.contenidos.entries()].filter(([clave]) => clave.startsWith(`${ruta}/`))
      this.quitar(ruta)
      for (const [clave] of directorios.sort(([a], [b]) => a.length - b.length)) this.agregarDirectorio(destino + clave.slice(ruta.length))
      for (const [clave, contenido] of archivos) this.agregarArchivo(destino + clave.slice(ruta.length), contenido)
    } else if (this.contenidos.has(ruta)) {
      const contenido = this.contenidos.get(ruta)
      this.quitar(ruta)
      this.agregarArchivo(destino, contenido)
    } else throw new Error(`No existe ${ruta}`)
  }

  absoluta(ruta) { return ruta.startsWith('/home/') ? ruta : `/home/aleteaor/${ruta}` }

  async uapi(modulo, funcion, parametros) {
    this.llamadas.push(['uapi', modulo, funcion, parametros])
    if (modulo === 'Fileman' && funcion === 'list_files') {
      if (!this.directorios.has(parametros.dir)) throw new Error(`No existe ${parametros.dir}`)
      return [...this.directorios.get(parametros.dir)].sort().map((file) => ({ file }))
    }
    if (modulo === 'Fileman' && funcion === 'get_file_content') {
      const ruta = `${parametros.dir}/${parametros.file}`
      if (!this.contenidos.has(ruta)) throw new Error(`No existe ${ruta}`)
      return { content: this.contenidos.get(ruta) }
    }
    if (modulo === 'Fileman' && funcion === 'get_file_information') {
      if (!this.tamanos.has(parametros.path)) throw new Error(`No existe ${parametros.path}`)
      return { size: this.tamanos.get(parametros.path), type: 'file' }
    }
    if (modulo === 'Fileman' && funcion === 'save_file_content') {
      this.agregarArchivo(`${parametros.dir}/${parametros.file}`, parametros.content)
      return null
    }
    throw new Error(`UAPI no simulada: ${modulo}/${funcion}`)
  }

  async api2(modulo, funcion, parametros) {
    this.llamadas.push(['api2', modulo, funcion, parametros])
    if (modulo === 'Fileman' && funcion === 'mkdir') {
      this.agregarDirectorio(`${parametros.path}/${parametros.name}`)
      return []
    }
    if (modulo === 'Fileman' && funcion === 'search') {
      return [...this.contenidos.keys()]
        .filter((ruta) => ruta.startsWith(`${parametros.dir}/`) && basename(ruta) === '.htaccess')
        .sort()
        .map((file) => ({ file, type: 'file', size: this.tamanos.get(file) }))
    }
    if (modulo !== 'Fileman' || funcion !== 'fileop') throw new Error(`API2 no simulada: ${modulo}/${funcion}`)
    const fuentes = parametros.sourcefiles.split(',').map((ruta) => this.absoluta(ruta))
    const destino = parametros.destfiles ? this.absoluta(parametros.destfiles) : ''
    if (parametros.op === 'move') {
      for (const fuente of fuentes) this.mover(fuente, destino)
      return []
    }
    if (parametros.op === 'trash') {
      if (this.fallarTrash) throw new Error('limpieza no disponible')
      for (const fuente of fuentes) this.quitar(fuente)
      return []
    }
    if (parametros.op === 'extract') {
      const clave = [...this.extracciones.keys()].find((candidata) => basename(fuentes[0]).startsWith(candidata))
      if (!clave) throw new Error('No hay fixture de extracción.')
      for (const [entrada, contenido] of Object.entries(this.extracciones.get(clave))) {
        const ruta = `${destino}/${entrada}`
        if (contenido === null) this.agregarDirectorio(ruta)
        else this.agregarArchivo(ruta, contenido)
      }
      return []
    }
    throw new Error(`Operación no simulada: ${parametros.op}`)
  }

  async subirArchivo(rutaLocal, directorio, nombre) {
    this.llamadas.push(['subir', directorio, nombre])
    const contenido = await readFile(rutaLocal)
    this.agregarArchivo(`${directorio}/${nombre}`, contenido.toString('binary'))
    this.tamanos.set(`${directorio}/${nombre}`, contenido.length)
  }
}

async function escenario() {
  const api = new CpanelFalso()
  for (const ruta of ['/home/aleteaor', '/home/aleteaor/gestor.aletea.org', '/home/aleteaor/gestor.aletea.org/dist', '/home/aleteaor/prueba.aletea.org', '/home/aleteaor/.aletea-deploy']) api.agregarDirectorio(ruta)
  api.agregarArchivo('/home/aleteaor/gestor.aletea.org/.htaccess', 'passenger-original')
  api.agregarArchivo('/home/aleteaor/gestor.aletea.org/index.html', 'gestor-anterior')
  api.agregarArchivo('/home/aleteaor/gestor.aletea.org/version.json', JSON.stringify({ version: '2026-09-01.1700-anterior1' }))
  api.agregarArchivo('/home/aleteaor/prueba.aletea.org/.htaccess', 'static-original')
  api.agregarArchivo('/home/aleteaor/prueba.aletea.org/index.html', 'anterior')
  api.agregarArchivo('/home/aleteaor/prueba.aletea.org/version.json', JSON.stringify({ version: 'anterior' }))
  const estado = {
    esquema: 1,
    version_gestor: '2026-09-01.1700-anterior1',
    version_pagina: 'anterior',
    package_lock_sha256: 'l'.repeat(64),
    capas: {
      'gestor-root': { sha256: 'a'.repeat(64), entradas_superiores: ['index.html', 'version.json'] },
      'gestor-dist': { sha256: 'b'.repeat(64), entradas_superiores: ['index.html', 'version.json'] },
      'pagina-prueba': { sha256: 'vieja', entradas_superiores: ['index.html', 'version.json'] },
    },
    respaldos: [],
  }
  api.agregarArchivo('/home/aleteaor/.aletea-deploy/estado.json', `${JSON.stringify(estado)}\n`)
  const raiz = await mkdtemp(join(tmpdir(), 'aletea-transaccion-test-'))
  const zip = join(raiz, 'pagina.zip')
  await writeFile(zip, 'zip')
  const version = '2026-09-01.1800-abcdef1234'
  const paquetes = [
    { clave: 'gestor-root', remoto: '/home/aleteaor/gestor.aletea.org', sha256: 'a'.repeat(64), bytes: 3, entradasSuperiores: ['index.html', 'version.json'], versionesInmutables: [], entradas: ['index.html', 'version.json'], local: zip },
    { clave: 'gestor-dist', remoto: '/home/aleteaor/gestor.aletea.org/dist', sha256: 'b'.repeat(64), bytes: 3, entradasSuperiores: ['index.html', 'version.json'], versionesInmutables: [], entradas: ['index.html', 'version.json'], local: zip },
    { clave: 'pagina-prueba', remoto: '/home/aleteaor/prueba.aletea.org', sha256: 'c'.repeat(64), bytes: 3, entradasSuperiores: ['index.html', 'version.json'], versionesInmutables: [], entradas: ['index.html', 'version.json'], local: zip },
  ]
  api.extracciones.set('pagina-prueba', {
    'index.html': `nuevo ${version}`,
    'version.json': JSON.stringify({ version: '0.5.3', build: version }),
  })
  api.extracciones.set('gestor-root', {
    'index.html': `gestor nuevo ${version}`,
    'version.json': JSON.stringify({ version }),
  })
  return { api, plan: { versionGestor: version, versionPagina: { build: version }, packageLockSha256: 'l'.repeat(64), paquetes } }
}

describe('publicación cPanel transaccional', () => {
  it('limita todas las rutas a la cuenta esperada', () => {
    expect(rutaRelativaCuenta('/home/aleteaor/.aletea-deploy/estado.json', 'aleteaor')).toBe('.aletea-deploy/estado.json')
    expect(() => rutaRelativaCuenta('/home/otra/estado.json', 'aleteaor')).toThrow('/home/aleteaor/')
    expect(() => rutaRelativaCuenta('/home/aleteaor/uno,dos', 'aleteaor')).toThrow('segura')
  })

  it('crea directorios dentro de la cuenta y no repite los existentes', async () => {
    const api = new CpanelFalso()
    api.agregarDirectorio('/home/aleteaor')
    await asegurarDirectorio(api, '/home/aleteaor/.aletea-deploy/staging', 'aleteaor')
    expect(api.directorios.has('/home/aleteaor/.aletea-deploy/staging')).toBe(true)
    const llamadas = api.llamadas.filter((llamada) => llamada[0] === 'api2' && llamada[2] === 'mkdir').length
    await asegurarDirectorio(api, '/home/aleteaor/.aletea-deploy/staging', 'aleteaor')
    expect(api.llamadas.filter((llamada) => llamada[0] === 'api2' && llamada[2] === 'mkdir')).toHaveLength(llamadas)
  })

  it('omite capas cuya huella ya coincide y permite forzar un reemplazo completo', () => {
    const plan = { paquetes: [{ clave: 'uno', sha256: 'a' }, { clave: 'dos', sha256: 'b' }] }
    const estado = { capas: { uno: { sha256: 'a' }, dos: { sha256: 'vieja' } } }
    expect(capasPendientes(plan, estado).map((capa) => capa.clave)).toEqual(['dos'])
    expect(capasPendientes(plan, estado, true).map((capa) => capa.clave)).toEqual(['uno', 'dos'])
  })

  it('omite un ZIP regenerado cuando el contenido validado es idéntico', () => {
    const plan = { paquetes: [{ clave: 'pagina', sha256: 'zip-nuevo', contenidoSha256: 'contenido' }] }
    const estado = { capas: { pagina: { sha256: 'zip-viejo', contenido_sha256: 'contenido' } } }
    expect(capasPendientes(plan, estado)).toEqual([])
  })

  it('no escribe nada cuando las tres capas ya coinciden, pero conserva la verificación viva', async () => {
    const { api, plan } = await escenario()
    const estado = JSON.parse(api.contenidos.get('/home/aleteaor/.aletea-deploy/estado.json'))
    estado.capas['pagina-prueba'].sha256 = 'c'.repeat(64)
    api.agregarArchivo('/home/aleteaor/.aletea-deploy/estado.json', `${JSON.stringify(estado)}\n`)
    let verificaciones = 0
    const resultado = await publicarTransaccional({
      api, plan, usuario: 'aleteaor',
      verificarVivo: async () => { verificaciones += 1 },
      asegurarDependencias: async () => { throw new Error('No debía instalar dependencias') },
      reiniciar: async () => { throw new Error('No debía reiniciar Passenger') },
    })
    expect(resultado.publicadas).toEqual([])
    expect(resultado.omitidas).toEqual(['gestor-root', 'gestor-dist', 'pagina-prueba'])
    expect(verificaciones).toBe(1)
    expect(api.llamadas.some((llamada) => llamada[0] === 'subir')).toBe(false)
  })

  it('publica solo la capa modificada, conserva ambos htaccess y guarda el respaldo', async () => {
    const { api, plan } = await escenario()
    const reinicios = []
    const resultado = await publicarTransaccional({
      api, plan, usuario: 'aleteaor',
      verificarVivo: async () => expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/index.html')).toContain(plan.versionGestor),
      asegurarDependencias: async () => { throw new Error('No debía instalar dependencias') },
      reiniciar: async (_api, version) => reinicios.push(version),
      ahora: () => new Date('2026-09-01T18:00:00.000Z'),
    })
    expect(resultado.publicadas).toEqual(['pagina-prueba'])
    expect(resultado.omitidas).toEqual(['gestor-root', 'gestor-dist'])
    expect(api.contenidos.get('/home/aleteaor/gestor.aletea.org/.htaccess')).toBe('passenger-original')
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/.htaccess')).toBe('static-original')
    expect(reinicios).toEqual([plan.versionGestor])
    const estado = JSON.parse(api.contenidos.get('/home/aleteaor/.aletea-deploy/estado.json'))
    expect(estado.capas['pagina-prueba'].sha256).toBe('c'.repeat(64))
    expect(estado.respaldos).toHaveLength(1)
  })

  it('restaura la capa anterior automáticamente cuando falla la verificación viva', async () => {
    const { api, plan } = await escenario()
    const reinicios = []
    await expect(publicarTransaccional({
      api, plan, usuario: 'aleteaor',
      verificarVivo: async () => { throw new Error('hash vivo distinto') },
      asegurarDependencias: async () => {},
      reiniciar: async (_api, version) => reinicios.push(version),
      ahora: () => new Date('2026-09-01T18:00:00.000Z'),
    })).rejects.toThrow('se restauró la versión anterior')
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/index.html')).toBe('anterior')
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/version.json')).toBe(JSON.stringify({ version: 'anterior' }))
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/.htaccess')).toBe('static-original')
    expect(reinicios.at(-1)).toBe('2026-09-01.1700-anterior1')
  })

  it('detecta cualquier cambio de .htaccess aunque ocurra fuera del paquete', async () => {
    const { api, plan } = await escenario()
    await expect(publicarTransaccional({
      api, plan, usuario: 'aleteaor',
      verificarVivo: async () => api.agregarArchivo('/home/aleteaor/prueba.aletea.org/.htaccess', 'alterado-externamente'),
      asegurarDependencias: async () => {}, reiniciar: async () => {},
      ahora: () => new Date('2026-09-01T18:00:00.000Z'),
    })).rejects.toThrow('.htaccess cambió')
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/index.html')).toBe('anterior')
  })

  it('detecta y restaura un .htaccess anidado dentro de una carpeta administrada', async () => {
    const { api, plan } = await escenario()
    const pagina = plan.paquetes.find((paquete) => paquete.clave === 'pagina-prueba')
    pagina.entradasSuperiores = ['assets', 'index.html', 'version.json']
    pagina.entradas = ['assets/app.js', 'index.html', 'version.json']
    api.extracciones.set('pagina-prueba', {
      assets: null,
      'assets/app.js': 'nuevo',
      'index.html': `nuevo ${plan.versionGestor}`,
      'version.json': JSON.stringify({ version: '0.5.3', build: plan.versionGestor }),
    })
    const estado = JSON.parse(api.contenidos.get('/home/aleteaor/.aletea-deploy/estado.json'))
    estado.capas['pagina-prueba'].entradas_superiores = ['assets', 'index.html', 'version.json']
    api.agregarArchivo('/home/aleteaor/.aletea-deploy/estado.json', `${JSON.stringify(estado)}\n`)
    api.agregarArchivo('/home/aleteaor/prueba.aletea.org/assets/app.js', 'anterior')
    api.agregarArchivo('/home/aleteaor/prueba.aletea.org/assets/.htaccess', 'anidado-original')
    await expect(publicarTransaccional({
      api, plan, usuario: 'aleteaor', verificarVivo: async () => {},
      asegurarDependencias: async () => {}, reiniciar: async () => {},
      ahora: () => new Date('2026-09-01T18:00:00.000Z'),
    })).rejects.toThrow('.htaccess cambió')
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/assets/.htaccess')).toBe('anidado-original')
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/assets/app.js')).toBe('anterior')
  })

  it('no reemplaza una versión inmutable que ya existe en el destino', async () => {
    const { api, plan } = await escenario()
    const pagina = plan.paquetes.find((paquete) => paquete.clave === 'pagina-prueba')
    pagina.entradasSuperiores = ['index.html', 'release', 'version.json']
    pagina.entradas = ['index.html', `release/${plan.versionGestor}/app.js`, 'version.json']
    pagina.versionesInmutables = [plan.versionGestor]
    api.extracciones.set('pagina-prueba', {
      'index.html': `nuevo ${plan.versionGestor}`,
      'release': null,
      [`release/${plan.versionGestor}`]: null,
      [`release/${plan.versionGestor}/app.js`]: 'nuevo',
      'version.json': JSON.stringify({ version: '0.5.3', build: plan.versionGestor }),
    })
    api.agregarArchivo(`/home/aleteaor/prueba.aletea.org/release/${plan.versionGestor}/app.js`, 'existente')
    await expect(publicarTransaccional({
      api, plan, usuario: 'aleteaor', verificarVivo: async () => {},
      asegurarDependencias: async () => {}, reiniciar: async () => {},
      ahora: () => new Date('2026-09-01T18:00:00.000Z'),
    })).rejects.toThrow('versión inmutable')
    expect(api.contenidos.get(`/home/aleteaor/prueba.aletea.org/release/${plan.versionGestor}/app.js`)).toBe('existente')
    expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/index.html')).toBe('anterior')
  })

  it('instala dependencias solo cuando cambian el gestor y su package-lock', async () => {
    const { api, plan } = await escenario()
    const estado = JSON.parse(api.contenidos.get('/home/aleteaor/.aletea-deploy/estado.json'))
    estado.capas['gestor-root'].sha256 = 'gestor-viejo'
    estado.capas['pagina-prueba'].sha256 = 'c'.repeat(64)
    api.agregarArchivo('/home/aleteaor/.aletea-deploy/estado.json', `${JSON.stringify(estado)}\n`)
    plan.packageLockSha256 = 'n'.repeat(64)
    let instalaciones = 0
    await publicarTransaccional({
      api, plan, usuario: 'aleteaor',
      verificarVivo: async () => {},
      asegurarDependencias: async () => { instalaciones += 1 },
      reiniciar: async () => {},
      ahora: () => new Date('2026-09-01T18:00:00.000Z'),
    })
    expect(instalaciones).toBe(1)
    expect(api.contenidos.get('/home/aleteaor/gestor.aletea.org/.htaccess')).toBe('passenger-original')
  })

  it('considera la limpieza posterior recuperable y no revierte una versión ya verificada', async () => {
    const { api, plan } = await escenario()
    api.fallarTrash = true
    const advertir = console.warn
    const mensajes = []
    console.warn = (mensaje) => mensajes.push(mensaje)
    try {
      const resultado = await publicarTransaccional({
        api, plan, usuario: 'aleteaor', verificarVivo: async () => {},
        asegurarDependencias: async () => {}, reiniciar: async () => {},
        ahora: () => new Date('2026-09-01T18:00:00.000Z'),
      })
      expect(resultado.publicadas).toEqual(['pagina-prueba'])
      expect(api.contenidos.get('/home/aleteaor/prueba.aletea.org/index.html')).toContain(plan.versionGestor)
      expect(mensajes.join(' ')).toContain('limpieza remota')
    } finally { console.warn = advertir }
  })
})
