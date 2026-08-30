import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../', import.meta.url))
const carpetaTemporal = await mkdtemp(join(tmpdir(), 'aletea-esquema-'))
const baseTemporal = join(carpetaTemporal, 'esquema.sqlite')

const camposLargos = new Set([
  'alcance', 'campos_json', 'constancia', 'contenido', 'decisiones_permitidas', 'descripcion', 'detalle',
  'debe_escalar', 'error', 'informa_a', 'minuta', 'notas', 'objetivo', 'pasos',
  'cumplida_motivo', 'motivo', 'motivo_anulacion', 'motivo_cierre', 'nota', 'nota_revision', 'observaciones', 'permisos', 'personas_necesarias', 'preparacion', 'recursos', 'respuestas_json', 'resumen',
])
const camposFechaHora = /^(actualizado_en|anulado_en|asignado_en|bloqueado_hasta|cerrada_en|completado_en|creado_en|cuando|fecha_fin|fecha_hora|identidad_verificada_en|revisado_en|ultimo_acceso|ventana_inicio)$/
const camposFecha = /^(cumplida_en|datos_personales_hasta|fecha|fecha_acuerdo|fecha_inicio|fecha_limite|fecha_objetivo|fecha_prevista|fecha_propuesta|fecha_revision|fecha_seguimiento|generada_para|postergada_hasta|proxima_fecha|semana_inicio|vence_el|vencimiento)$/

function tipoTexto(nombre, resto) {
  if (camposFechaHora.test(nombre)) return `DATETIME${resto}`
  if (camposFecha.test(nombre)) return `DATE${resto}`
  if (nombre === 'url') return `VARCHAR(2048)${resto}`
  if (camposLargos.has(nombre)) return `LONGTEXT${resto}`
  return `VARCHAR(191)${resto}`
}

function convertirEsquema(sqlite) {
  let sql = sqlite
    .replace(/CREATE TABLE sqlite_sequence\(name,seq\);\s*/g, '')
    .replace(/CREATE TRIGGER tareas_cms_registrar_asignacion_insert[\s\S]*?END;\s*/g, '')
    .replace(/CREATE TRIGGER tareas_cms_registrar_asignacion_update[\s\S]*?END;\s*/g, '')
    .replace(/CREATE TABLE IF NOT EXISTS "([a-zA-Z0-9_]+)"/g, 'CREATE TABLE $1')
    .replace(/CREATE TABLE ([a-zA-Z0-9_]+)/g, 'CREATE TABLE IF NOT EXISTS $1')
    .replace(/\bINTEGER PRIMARY KEY AUTOINCREMENT\b/g, 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY')
    .replace(/\bINTEGER\b/g, 'INT')
    .replace(/\bREAL\b/g, 'DECIMAL(12,2)')
    .replace(/^\s*datos\s+BLOB\b(.*)$/gm, '  datos MEDIUMBLOB$1')
    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s+TEXT\b/g, (_texto, nombre) => `${nombre} ${tipoTexto(nombre, '')}`)
    .replace(/\s+WHERE\s+[a-zA-Z0-9_]+\s+IS\s+NOT\s+NULL(?:\s+AND\s+[a-zA-Z0-9_]+\s+IS\s+NOT\s+NULL)?;/g, ';')
  sql = sql.replace(/;\s*CREATE INDEX/g, ';\nCREATE INDEX')
  return `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n${sql.trim()}\n\n` +
    `DROP TRIGGER IF EXISTS tareas_cms_registrar_asignacion_insert;\n` +
    `CREATE TRIGGER tareas_cms_registrar_asignacion_insert BEFORE INSERT ON tareas_cms FOR EACH ROW SET NEW.asignado_en = IF(NEW.responsable_correo IS NULL, NULL, COALESCE(NEW.asignado_en, CURRENT_TIMESTAMP));\n` +
    `DROP TRIGGER IF EXISTS tareas_cms_registrar_asignacion_update;\n` +
    `CREATE TRIGGER tareas_cms_registrar_asignacion_update BEFORE UPDATE ON tareas_cms FOR EACH ROW SET NEW.asignado_en = IF(NEW.responsable_correo <=> OLD.responsable_correo, NEW.asignado_en, IF(NEW.responsable_correo IS NULL, NULL, CURRENT_TIMESTAMP));\n\n` +
    `SET FOREIGN_KEY_CHECKS = 1;\n`
}

try {
  const migraciones = (await readdir(join(raiz, 'migrations'))).filter((nombre) => nombre.endsWith('.sql')).sort()
  for (const nombre of migraciones) {
    const sql = await readFile(join(raiz, 'migrations', nombre), 'utf8')
    execFileSync('sqlite3', [baseTemporal], { input: sql })
  }
  const esquemaSqlite = execFileSync('sqlite3', [baseTemporal, '.schema --indent'], { encoding: 'utf8' })
  const destino = join(raiz, 'servidor-cpanel', 'esquema-mariadb.sql')
  await writeFile(destino, convertirEsquema(esquemaSqlite))
  console.log(`Esquema MariaDB generado: ${destino}`)
} finally {
  await rm(carpetaTemporal, { recursive: true, force: true })
}
