import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

export function resumenArchivo(ruta) {
  const datos = readFileSync(ruta)
  return { sha256: createHash('sha256').update(datos).digest('hex'), bytes: datos.length }
}

const MARCA_CIFRADO = Buffer.from('ALETEA1')

export function cifrarRespaldo(rutaSql, rutaCifrada, frase) {
  if (String(frase || '').length < 16) throw new Error('La frase de respaldo debe tener al menos 16 caracteres.')
  const sal = randomBytes(16); const vector = randomBytes(12)
  const clave = scryptSync(frase, sal, 32)
  const cifrador = createCipheriv('aes-256-gcm', clave, vector)
  const cifrado = Buffer.concat([cifrador.update(readFileSync(rutaSql)), cifrador.final()])
  const etiqueta = cifrador.getAuthTag()
  writeFileSync(rutaCifrada, Buffer.concat([MARCA_CIFRADO, sal, vector, etiqueta, cifrado]), { flag: 'wx', mode: 0o600 })
  return rutaCifrada
}

export function descifrarRespaldo(ruta, frase) {
  const datos = readFileSync(ruta)
  if (!datos.subarray(0, MARCA_CIFRADO.length).equals(MARCA_CIFRADO)) return datos
  if (!frase) throw new Error('Definí ALETEA_BACKUP_PASSPHRASE para verificar o recuperar este respaldo.')
  const inicio = MARCA_CIFRADO.length
  const sal = datos.subarray(inicio, inicio + 16)
  const vector = datos.subarray(inicio + 16, inicio + 28)
  const etiqueta = datos.subarray(inicio + 28, inicio + 44)
  const contenido = datos.subarray(inicio + 44)
  try {
    const descifrador = createDecipheriv('aes-256-gcm', scryptSync(frase, sal, 32), vector)
    descifrador.setAuthTag(etiqueta)
    return Buffer.concat([descifrador.update(contenido), descifrador.final()])
  } catch { throw new Error('No se pudo descifrar el respaldo. Revisá la frase secreta.') }
}

export function escribirManifiesto(rutaSql, datos = {}) {
  const ruta = resolve(rutaSql)
  const resumen = resumenArchivo(ruta)
  const manifiesto = {
    formato: 'aletea-d1-backup-v1',
    creado_en: datos.creado_en || new Date().toISOString(),
    origen: datos.origen || 'local',
    base: datos.base || 'voluntarios-fsb',
    archivo: basename(ruta),
    cifrado: datos.cifrado || null,
    ...resumen,
  }
  const rutaManifiesto = join(dirname(ruta), 'manifest.json')
  writeFileSync(rutaManifiesto, `${JSON.stringify(manifiesto, null, 2)}\n`, { flag: 'wx' })
  return { manifiesto, rutaManifiesto }
}

export function verificarRespaldo(rutaEntrada, { frase = process.env.ALETEA_BACKUP_PASSPHRASE } = {}) {
  const entrada = resolve(rutaEntrada)
  const estado = statSync(entrada)
  const rutaManifiesto = estado.isDirectory() ? join(entrada, 'manifest.json') : join(dirname(entrada), 'manifest.json')
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8'))
  if (manifiesto.formato !== 'aletea-d1-backup-v1' || !manifiesto.archivo) throw new Error('El manifiesto del respaldo no es válido.')
  const rutaSql = join(dirname(rutaManifiesto), basename(manifiesto.archivo))
  const resumen = resumenArchivo(rutaSql)
  if (resumen.sha256 !== manifiesto.sha256 || resumen.bytes !== manifiesto.bytes) throw new Error('El respaldo no coincide con su suma de verificación.')
  const temporal = mkdtempSync(join(tmpdir(), 'aletea-restauracion-'))
  const baseTemporal = join(temporal, 'restaurada.sqlite')
  try {
    const restauracion = spawnSync('sqlite3', [baseTemporal], { input: descifrarRespaldo(rutaSql, frase), encoding: 'utf8' })
    if (restauracion.status !== 0) throw new Error(`No se pudo restaurar el SQL: ${restauracion.stderr.trim()}`)
    const auditoria = spawnSync('sqlite3', [baseTemporal, "PRAGMA integrity_check; PRAGMA foreign_key_check; SELECT count(*) FROM sqlite_master WHERE type='table';"], { encoding: 'utf8' })
    if (auditoria.status !== 0) throw new Error(`No se pudo auditar la restauración: ${auditoria.stderr.trim()}`)
    const lineas = auditoria.stdout.trim().split(/\r?\n/)
    if (lineas[0] !== 'ok') throw new Error(`La restauración no pasó la integridad: ${lineas[0] || 'sin resultado'}`)
    const tablas = Number(lineas.at(-1))
    const erroresForaneos = Math.max(0, lineas.length - 2)
    if (erroresForaneos) throw new Error(`La restauración tiene ${erroresForaneos} referencias inválidas.`)
    return { rutaSql, rutaManifiesto, sha256: resumen.sha256, bytes: resumen.bytes, tablas, integridad: 'ok', referenciasInvalidas: 0 }
  } finally { rmSync(temporal, { recursive: true, force: true }) }
}
