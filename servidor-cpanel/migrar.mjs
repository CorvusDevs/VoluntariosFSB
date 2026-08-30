import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const requeridas = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
const faltantes = requeridas.filter((nombre) => !process.env[nombre])
if (faltantes.length) throw new Error(`Faltan variables: ${faltantes.join(', ')}`)
if (process.argv[2] !== '--confirmar') throw new Error('La migración requiere --confirmar para modificar la base indicada.')

const esquema = await readFile(fileURLToPath(new URL('./esquema-mariadb.sql', import.meta.url)), 'utf8')
const conexion = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: 'utf8mb4',
  multipleStatements: true,
})

try {
  await conexion.query(esquema)
  const [tablas] = await conexion.query('SHOW TABLES')
  if (tablas.length < 25) throw new Error(`Esquema incompleto: solo se crearon ${tablas.length} tablas.`)
  console.log(`Esquema MariaDB listo: ${tablas.length} tablas.`)
} finally {
  await conexion.end()
}
