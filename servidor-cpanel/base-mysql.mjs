import mysql from 'mysql2/promise'

function sqlMariaDb(sql) {
  return sql
    .replace(/INSERT\s+OR\s+IGNORE/gi, 'INSERT IGNORE')
    .replace(/\s+COLLATE\s+NOCASE/gi, '')
    .replace(/datetime\('now',\s*'-([0-9]+) day(?:s)?'\)/gi, '(CURRENT_TIMESTAMP - INTERVAL $1 DAY)')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+UPDATE\s+SET/gi, 'ON DUPLICATE KEY UPDATE')
    .replace(/excluded\.([a-zA-Z0-9_]+)/g, 'VALUES($1)')
}

function consultaMariaDb(sql, valores) {
  const parametros = []
  const consulta = sqlMariaDb(sql).replace(/\?([0-9]+)/g, (_coincidencia, posicion) => {
    parametros.push(valores[Number(posicion) - 1])
    return '?'
  })
  return { consulta, parametros }
}

class Sentencia {
  constructor(base, sql) {
    this.base = base
    this.sql = sql
    this.valores = []
  }

  bind(...valores) {
    const sentencia = new Sentencia(this.base, this.sql)
    sentencia.valores = valores
    return sentencia
  }

  async ejecutar(conexion) {
    const { consulta, parametros } = consultaMariaDb(this.sql, this.valores)
    return conexion.execute(consulta, parametros)
  }

  async first() {
    const [filas] = await this.ejecutar(this.base.pool)
    return Array.isArray(filas) ? filas[0] ?? null : null
  }

  async all() {
    const [filas] = await this.ejecutar(this.base.pool)
    return { results: Array.isArray(filas) ? filas : [] }
  }

  async run() {
    const [resultado] = await this.ejecutar(this.base.pool)
    return { success: true, meta: { changes: Number(resultado.affectedRows || 0), last_row_id: resultado.insertId || null } }
  }
}

export class BaseMariaDb {
  constructor(pool) {
    this.pool = pool
  }

  prepare(sql) {
    return new Sentencia(this, sql)
  }

  async batch(sentencias) {
    const conexion = await this.pool.getConnection()
    try {
      await conexion.beginTransaction()
      const resultados = []
      for (const sentencia of sentencias) {
        const [resultado] = await sentencia.ejecutar(conexion)
        resultados.push({ success: true, meta: { changes: Number(resultado.affectedRows || 0), last_row_id: resultado.insertId || null } })
      }
      await conexion.commit()
      return resultados
    } catch (error) {
      await conexion.rollback()
      throw error
    } finally {
      conexion.release()
    }
  }
}

export function crearBaseMariaDb(entorno = process.env) {
  const requeridas = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const faltantes = requeridas.filter((nombre) => !entorno[nombre])
  if (faltantes.length) throw new Error(`Faltan variables de base de datos: ${faltantes.join(', ')}`)
  return new BaseMariaDb(mysql.createPool({
    host: entorno.DB_HOST,
    port: Number(entorno.DB_PORT || 3306),
    database: entorno.DB_NAME,
    user: entorno.DB_USER,
    password: entorno.DB_PASSWORD,
    charset: 'utf8mb4',
    dateStrings: true,
    decimalNumbers: true,
    connectionLimit: Number(entorno.DB_CONNECTION_LIMIT || 5),
    enableKeepAlive: true,
  }))
}

export const _pruebas = { sqlMariaDb, consultaMariaDb }
