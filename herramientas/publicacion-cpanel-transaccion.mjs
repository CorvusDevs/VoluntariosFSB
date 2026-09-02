import { createHash } from 'node:crypto'
import { basename, dirname } from 'node:path/posix'

const NOMBRE_ESTADO = 'estado.json'

function sha256Contenido(contenido) {
  return createHash('sha256').update(String(contenido)).digest('hex')
}

export function rutaRelativaCuenta(ruta, usuario) {
  const prefijo = `/home/${usuario}/`
  if (!ruta.startsWith(prefijo)) throw new Error(`La ruta remota debe estar dentro de ${prefijo}`)
  const relativa = ruta.slice(prefijo.length)
  if (!relativa || relativa.split('/').some((parte) => !parte || parte === '..' || parte.includes(',') || parte.includes('\n') || parte.includes('\r'))) {
    throw new Error('La ruta remota no es segura para cPanel.')
  }
  return relativa
}

function datosLista(datos) {
  if (Array.isArray(datos)) return datos
  if (Array.isArray(datos?.data)) return datos.data
  if (datos && typeof datos === 'object') return Object.values(datos).filter((valor) => valor && typeof valor === 'object')
  return []
}

function nombreEntrada(entrada) {
  return entrada?.file || entrada?.name || entrada?.filename || entrada?.basename || ''
}

async function nombresRemotos(api, directorio) {
  const datos = await api.uapi('Fileman', 'list_files', { dir: directorio, show_hidden: 1, types: 'file|dir' })
  return new Set(datosLista(datos).map(nombreEntrada).filter(Boolean))
}

async function existeDirectorioOArchivo(api, ruta, usuario) {
  const padre = ruta.slice(0, ruta.lastIndexOf('/')) || `/home/${usuario}`
  const nombre = basename(ruta)
  try { return (await nombresRemotos(api, padre)).has(nombre) } catch { return false }
}

export async function asegurarDirectorio(api, ruta, usuario) {
  const prefijo = `/home/${usuario}`
  if (ruta !== prefijo && !ruta.startsWith(`${prefijo}/`)) throw new Error('El directorio remoto está fuera de la cuenta.')
  const partes = ruta.slice(prefijo.length).split('/').filter(Boolean)
  let actual = prefijo
  for (const parte of partes) {
    if (parte === '..' || parte.includes(',') || parte.includes('\n') || parte.includes('\r')) throw new Error('El directorio remoto no es seguro.')
    if (!(await existeDirectorioOArchivo(api, `${actual}/${parte}`, usuario))) {
      await api.api2('Fileman', 'mkdir', { path: actual, name: parte, permissions: '0700' })
    }
    actual = `${actual}/${parte}`
  }
}

function contenidoDesdeUapi(datos) {
  if (typeof datos === 'string') return datos
  if (typeof datos?.content === 'string') return datos.content
  if (typeof datos?.data?.content === 'string') return datos.data.content
  throw new Error('cPanel no devolvió el contenido esperado.')
}

async function leerTexto(api, directorio, archivo) {
  const datos = await api.uapi('Fileman', 'get_file_content', {
    dir: directorio, file: archivo, from_charset: 'UTF-8', to_charset: 'UTF-8', update_html_document_encoding: 0,
  })
  return contenidoDesdeUapi(datos)
}

export async function leerEstadoRemoto(api, usuario) {
  const base = `/home/${usuario}/.aletea-deploy`
  if (!(await existeDirectorioOArchivo(api, base, usuario))) return { esquema: 1, capas: {}, respaldos: [] }
  const nombres = await nombresRemotos(api, base)
  if (!nombres.has(NOMBRE_ESTADO)) return { esquema: 1, capas: {}, respaldos: [] }
  const estado = JSON.parse(await leerTexto(api, base, NOMBRE_ESTADO))
  if (estado?.esquema !== 1 || !estado.capas || !Array.isArray(estado.respaldos)) throw new Error('El estado remoto de publicación no es válido.')
  return estado
}

export async function guardarEstadoRemoto(api, usuario, estado) {
  const base = `/home/${usuario}/.aletea-deploy`
  await asegurarDirectorio(api, base, usuario)
  await api.uapi('Fileman', 'save_file_content', {
    dir: base,
    file: NOMBRE_ESTADO,
    content: `${JSON.stringify(estado, null, 2)}\n`,
    from_charset: 'UTF-8',
    to_charset: 'UTF-8',
  })
}

export function capasPendientes(plan, estado, forzarTodo = false) {
  return plan.paquetes.filter((paquete) => {
    if (forzarTodo) return true
    const anterior = estado.capas?.[paquete.clave]
    if (!anterior) return true
    if (anterior.contenido_sha256 && paquete.contenidoSha256) return anterior.contenido_sha256 !== paquete.contenidoSha256
    return anterior.sha256 !== paquete.sha256
  })
}

function entradaSuperiorSegura(nombre) {
  return typeof nombre === 'string' && /^[0-9A-Za-z_][0-9A-Za-z._-]*$/.test(nombre)
    && !['node_modules', 'migrations', 'tmp', 'logs'].includes(nombre)
    && nombre !== '.htaccess' && !/^\.env(?:\.|$)/.test(nombre)
}

function validarEntradasSuperiores(entradas) {
  for (const entrada of entradas) {
    if (!entradaSuperiorSegura(entrada)) throw new Error(`La entrada remota no es segura: ${entrada}`)
  }
}

async function operarLote(api, usuario, operacion, fuentes, destino = '') {
  if (!fuentes.length) return
  const relativas = fuentes.map((ruta) => rutaRelativaCuenta(ruta, usuario))
  const parametros = { op: operacion, sourcefiles: relativas.join(','), doubledecode: 1 }
  if (destino) {
    rutaRelativaCuenta(destino, usuario)
    parametros.destfiles = destino
  }
  await api.api2('Fileman', 'fileop', parametros)
}

async function comprobarVersionEtapa(api, capa, versionEsperada) {
  const contenido = await leerTexto(api, capa.etapa, 'version.json')
  const datos = JSON.parse(contenido)
  const version = capa.clave === 'pagina-prueba' ? (datos.build || datos.version) : datos.version
  if (version !== versionEsperada) throw new Error(`La etapa ${capa.clave} no contiene el sello esperado.`)
}

async function comprobarSubida(api, archivoRemoto, bytes) {
  const datos = await api.uapi('Fileman', 'get_file_information', { path: archivoRemoto, show_hidden: 1 })
  const medida = Number(datos?.size ?? datos?.bytes ?? datos?.data?.size)
  if (!Number.isFinite(medida) || medida !== bytes) throw new Error(`El tamaño remoto de ${basename(archivoRemoto)} no coincide.`)
}

async function prepararCapa(api, plan, paquete, usuario, base, id) {
  const incoming = `${base}/incoming/${id}`
  const etapa = `${base}/staging/${id}/${paquete.clave}`
  await asegurarDirectorio(api, etapa, usuario)
  const nombreRemoto = `${paquete.clave}-${paquete.sha256.slice(0, 16)}.zip`
  await api.subirArchivo(paquete.local, incoming, nombreRemoto)
  const archivoRemoto = `${incoming}/${nombreRemoto}`
  await comprobarSubida(api, archivoRemoto, paquete.bytes)
  await api.api2('Fileman', 'fileop', {
    op: 'extract',
    sourcefiles: rutaRelativaCuenta(archivoRemoto, usuario),
    destfiles: etapa,
    doubledecode: 1,
  })
  const nombres = await nombresRemotos(api, etapa)
  const esperadas = new Set(paquete.entradasSuperiores)
  if (nombres.size !== esperadas.size || [...esperadas].some((nombre) => !nombres.has(nombre))) {
    throw new Error(`La extracción de ${paquete.clave} no coincide con el recibo.`)
  }
  const versionEsperada = paquete.clave === 'pagina-prueba'
    ? (plan.versionPagina.build || plan.versionPagina.version)
    : plan.versionGestor
  const capa = { ...paquete, etapa, incoming, archivoRemoto, promovida: false, respaldo: '', anteriores: [], versionesPromovidas: [] }
  await comprobarVersionEtapa(api, capa, versionEsperada)
  return capa
}

async function promoverCapa(api, capa, estadoAnterior, usuario, base, id) {
  const nuevas = capa.entradasSuperiores.filter((entrada) => entrada !== 'release')
  const anterioresDeclaradas = (estadoAnterior?.entradas_superiores || []).filter((entrada) => entrada !== 'release')
  validarEntradasSuperiores(nuevas)
  validarEntradasSuperiores(anterioresDeclaradas)
  const gestionadas = [...new Set([...nuevas, ...anterioresDeclaradas])]
  const vivas = await nombresRemotos(api, capa.remoto)
  const anteriores = gestionadas.filter((entrada) => vivas.has(entrada))
  const respaldo = `${base}/backups/${id}/${capa.clave}`
  await asegurarDirectorio(api, respaldo, usuario)
  await operarLote(api, usuario, 'move', anteriores.map((entrada) => `${capa.remoto}/${entrada}`), respaldo)
  capa.anteriores = anteriores
  capa.respaldo = respaldo
  try {
    await operarLote(api, usuario, 'move', nuevas.map((entrada) => `${capa.etapa}/${entrada}`), capa.remoto)
    if (capa.versionesInmutables.length) {
      const destinoRelease = `${capa.remoto}/release`
      await asegurarDirectorio(api, destinoRelease, usuario)
      const existentes = await nombresRemotos(api, destinoRelease)
      for (const version of capa.versionesInmutables) {
        if (existentes.has(version)) throw new Error(`La versión inmutable ${version} ya existe en ${capa.clave}.`)
      }
      await operarLote(api, usuario, 'move', capa.versionesInmutables.map((version) => `${capa.etapa}/release/${version}`), destinoRelease)
      capa.versionesPromovidas = [...capa.versionesInmutables]
    }
    capa.promovida = true
  } catch (error) {
    capa.promovida = true
    throw error
  }
  return capa
}

async function restaurarCapa(api, capa, usuario, base, id) {
  if (!capa.promovida) return
  const fallida = `${base}/fallidas/${id}/${capa.clave}`
  await asegurarDirectorio(api, fallida, usuario)
  const vivas = await nombresRemotos(api, capa.remoto)
  const nuevasPresentes = capa.entradasSuperiores.filter((entrada) => entrada !== 'release' && vivas.has(entrada))
  await operarLote(api, usuario, 'move', nuevasPresentes.map((entrada) => `${capa.remoto}/${entrada}`), fallida)
  for (const version of capa.versionesPromovidas) {
    const ruta = `${capa.remoto}/release/${version}`
    if (await existeDirectorioOArchivo(api, ruta, usuario)) await operarLote(api, usuario, 'move', [ruta], fallida)
  }
  if (capa.anteriores.length) {
    await operarLote(api, usuario, 'move', capa.anteriores.map((entrada) => `${capa.respaldo}/${entrada}`), capa.remoto)
  }
}

async function huellasHtaccess(api, plan, usuario) {
  const resultado = {}
  const destinos = [...new Set(plan.paquetes.map((paquete) => paquete.remoto))]
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
  const raices = destinos.filter((destino, indice) => !destinos.slice(0, indice).some((raiz) => destino.startsWith(`${raiz}/`)))
  for (const raiz of raices) {
    const datos = await api.api2('Fileman', 'search', {
      dir: raiz,
      recursive: 1,
      regex: '(^|/)\\.htaccess$',
      attributes: 'type|size',
    })
    const rutas = datosLista(datos)
      .map((entrada) => entrada?.file || entrada?.path || '')
      .filter((ruta) => basename(ruta) === '.htaccess')
      .filter((ruta) => ruta === `${raiz}/.htaccess` || ruta.startsWith(`${raiz}/`))
      .sort()
    for (const ruta of [...new Set(rutas)]) {
      rutaRelativaCuenta(ruta, usuario)
      resultado[ruta] = sha256Contenido(await leerTexto(api, dirname(ruta), basename(ruta)))
    }
  }
  return resultado
}

function mismasHuellasHtaccess(antes, despues) {
  return JSON.stringify(antes) === JSON.stringify(despues)
}

async function retirar(api, usuario, rutas) {
  for (const ruta of rutas.filter(Boolean)) {
    if (await existeDirectorioOArchivo(api, ruta, usuario)) await operarLote(api, usuario, 'trash', [ruta])
  }
}

async function retirarSeguro(api, usuario, rutas) {
  try { await retirar(api, usuario, rutas) } catch (error) {
    console.warn(`La publicación quedó activa, pero no se pudo completar la limpieza remota: ${error.message}`)
  }
}

export async function publicarTransaccional({
  api, plan, usuario, forzarTodo = false, verificarVivo, asegurarDependencias, reiniciar,
  ahora = () => new Date(), maxRespaldos = 2,
}) {
  const inicio = Date.now()
  const base = `/home/${usuario}/.aletea-deploy`
  const id = `${ahora().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${plan.versionGestor.slice(-10)}`
  const htaccessInicial = await huellasHtaccess(api, plan, usuario)
  const estadoAnterior = await leerEstadoRemoto(api, usuario)
  const pendientes = capasPendientes(plan, estadoAnterior, forzarTodo)
  if (!pendientes.length) {
    await verificarVivo(plan)
    if (!mismasHuellasHtaccess(htaccessInicial, await huellasHtaccess(api, plan, usuario))) throw new Error('La configuración .htaccess cambió durante la verificación.')
    return { publicadas: [], omitidas: plan.paquetes.map((paquete) => paquete.clave), operaciones: 0, duracionMs: Date.now() - inicio }
  }
  await asegurarDirectorio(api, base, usuario)
  const capas = []
  let dependenciasCambiaron = false
  try {
    await asegurarDirectorio(api, `${base}/incoming/${id}`, usuario)
    await asegurarDirectorio(api, `${base}/staging/${id}`, usuario)
    capas.push(...await Promise.all(pendientes.map((paquete) => prepararCapa(api, plan, paquete, usuario, base, id))))
    for (const capa of capas) await promoverCapa(api, capa, estadoAnterior.capas?.[capa.clave], usuario, base, id)
    dependenciasCambiaron = pendientes.some((capa) => capa.clave === 'gestor-root')
      && estadoAnterior.package_lock_sha256 !== plan.packageLockSha256
    if (dependenciasCambiaron) await asegurarDependencias(api)
    await reiniciar(api, plan.versionGestor)
    await verificarVivo(plan)
    if (!mismasHuellasHtaccess(htaccessInicial, await huellasHtaccess(api, plan, usuario))) throw new Error('La configuración .htaccess cambió durante la publicación.')
    const respaldoActual = { id, ruta: `${base}/backups/${id}`, creado_en: ahora().toISOString() }
    const respaldos = [respaldoActual, ...(estadoAnterior.respaldos || [])]
    const estadoNuevo = {
      esquema: 1,
      version_gestor: plan.versionGestor,
      version_pagina: plan.versionPagina.build || plan.versionPagina.version,
      package_lock_sha256: plan.packageLockSha256,
      actualizado_en: ahora().toISOString(),
      capas: { ...estadoAnterior.capas },
      respaldos: respaldos.slice(0, maxRespaldos),
    }
    for (const paquete of plan.paquetes) {
      if (!estadoNuevo.capas[paquete.clave] || pendientes.some((capa) => capa.clave === paquete.clave)) {
        estadoNuevo.capas[paquete.clave] = {
          sha256: paquete.sha256,
          contenido_sha256: paquete.contenidoSha256,
          bytes: paquete.bytes,
          entradas_superiores: paquete.entradasSuperiores,
          versiones_inmutables: paquete.versionesInmutables,
        }
      }
    }
    await guardarEstadoRemoto(api, usuario, estadoNuevo)
    await retirarSeguro(api, usuario, respaldos.slice(maxRespaldos).map((respaldo) => respaldo.ruta))
    await retirarSeguro(api, usuario, [`${base}/incoming/${id}`, `${base}/staging/${id}`])
    return {
      publicadas: pendientes.map((paquete) => paquete.clave),
      omitidas: plan.paquetes.filter((paquete) => !pendientes.includes(paquete)).map((paquete) => paquete.clave),
      operaciones: pendientes.length,
      duracionMs: Date.now() - inicio,
    }
  } catch (error) {
    const erroresRestauracion = []
    for (const capa of [...capas].reverse()) {
      try { await restaurarCapa(api, capa, usuario, base, id) } catch (restauracionError) { erroresRestauracion.push(restauracionError) }
    }
    if (dependenciasCambiaron) {
      try { await asegurarDependencias(api) } catch (dependenciasError) { erroresRestauracion.push(dependenciasError) }
    }
    try { await reiniciar(api, estadoAnterior.version_gestor || 'anterior') } catch (reinicioError) { erroresRestauracion.push(reinicioError) }
    if (erroresRestauracion.length) {
      throw new AggregateError([error, ...erroresRestauracion], 'Falló la publicación y también parte del rollback automático. Usá el fallback SFTP.')
    }
    if (!mismasHuellasHtaccess(htaccessInicial, await huellasHtaccess(api, plan, usuario))) {
      throw new AggregateError([error], 'La publicación se restauró, pero .htaccess cambió fuera del paquete.')
    }
    throw new Error(`La publicación no quedó activa y se restauró la versión anterior: ${error.message}`)
  }
}

export const _pruebas = {
  datosLista, nombreEntrada, contenidoDesdeUapi, entradaSuperiorSegura, validarEntradasSuperiores,
  operarLote, comprobarVersionEtapa, comprobarSubida, prepararCapa, promoverCapa, restaurarCapa,
  huellasHtaccess, mismasHuellasHtaccess, sha256Contenido,
}
