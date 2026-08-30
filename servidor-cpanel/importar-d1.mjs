import { readFile, rm, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import mysql from 'mysql2/promise'
import { identificador } from './importar-util.mjs'

const tablasInternas = new Set(['_cf_KV', '_cf_METADATA', 'd1_migrations', 'sqlite_sequence'])

function tablasDeSqlite(base) {
  return base.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all().map(({ name }) => name).filter((nombre) => !tablasInternas.has(nombre))
}

async function importar(rutaSql) {
  const requeridas = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const faltantes = requeridas.filter((nombre) => !process.env[nombre])
  if (faltantes.length) throw new Error(`Faltan variables: ${faltantes.join(', ')}`)

  const temporal = await mkdtemp(join(tmpdir(), 'aletea-importacion-'))
  const rutaSqlite = join(temporal, 'origen.sqlite')
  let origen
  let destino
  try {
    origen = new DatabaseSync(rutaSqlite)
    origen.exec(await readFile(rutaSql, 'utf8'))
    const tablas = tablasDeSqlite(origen)
    if (!tablas.includes('usuarios') || !tablas.includes('documentos')) throw new Error('El SQL no parece ser una exportación completa del CMS de Aletea.')

    destino = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8mb4',
      dateStrings: true,
      decimalNumbers: true,
    })
    const [tablasDestino] = await destino.query('SHOW TABLES')
    const nombresDestino = new Set(tablasDestino.map((fila) => Object.values(fila)[0]))
    const ausentes = tablas.filter((tabla) => !nombresDestino.has(tabla))
    if (ausentes.length) throw new Error(`Faltan tablas en MariaDB: ${ausentes.join(', ')}`)

    for (const tabla of tablas) {
      const [[{ cantidad }]] = await destino.query(`SELECT COUNT(*) AS cantidad FROM ${identificador(tabla)}`)
      if (Number(cantidad) !== 0) throw new Error(`La tabla ${tabla} no está vacía. Se canceló la importación sin reemplazar datos.`)
    }

    await destino.beginTransaction()
    await destino.query('SET FOREIGN_KEY_CHECKS = 0')
    const resumen = []
    for (const tabla of tablas) {
      const columnas = origen.prepare(`PRAGMA table_info(${identificador(tabla)})`).all().map(({ name }) => name)
      const filas = origen.prepare(`SELECT * FROM ${identificador(tabla)}`).all()
      const columnasSql = columnas.map(identificador).join(', ')
      const parametros = columnas.map(() => '?').join(', ')
      const insertar = `INSERT INTO ${identificador(tabla)} (${columnasSql}) VALUES (${parametros})`
      for (const fila of filas) await destino.execute(insertar, columnas.map((columna) => fila[columna]))
      resumen.push({ tabla, cantidad: filas.length })
    }
    await destino.query('SET FOREIGN_KEY_CHECKS = 1')
    await destino.commit()

    for (const { tabla, cantidad } of resumen) {
      const [[fila]] = await destino.query(`SELECT COUNT(*) AS cantidad FROM ${identificador(tabla)}`)
      if (Number(fila.cantidad) !== cantidad) throw new Error(`La comprobación de ${tabla} no coincide: ${cantidad} origen, ${fila.cantidad} destino.`)
    }
    console.log(JSON.stringify({ estado: 'importado', tablas: resumen.length, filas: resumen.reduce((total, item) => total + item.cantidad, 0), resumen }, null, 2))
  } catch (error) {
    if (destino) {
      try { await destino.rollback() } catch {}
      try { await destino.query('SET FOREIGN_KEY_CHECKS = 1') } catch {}
    }
    throw error
  } finally {
    origen?.close()
    await destino?.end()
    await rm(temporal, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rutaSql = process.argv[2]
  if (!rutaSql || process.argv[3] !== '--confirmar') throw new Error('Uso: node servidor-cpanel/importar-d1.mjs exportacion.sql --confirmar')
  await importar(rutaSql)
}
