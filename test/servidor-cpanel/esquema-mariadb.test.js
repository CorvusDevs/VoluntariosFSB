import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('esquema MariaDB para cPanel', () => {
  it('se regenera desde las 53 migraciones y contiene el modelo completo', () => {
    execFileSync(process.execPath, ['servidor-cpanel/generar-esquema.mjs'])
    const esquema = readFileSync('servidor-cpanel/esquema-mariadb.sql', 'utf8')
    expect(esquema.match(/^CREATE TABLE/gm)).toHaveLength(44)
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS usuarios')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS intentos_ingreso_cms')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS historial_entradas_cms')
    expect(esquema).toContain('cumplida_en DATE')
    expect(esquema).toContain('cumplida_motivo LONGTEXT')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS medios_pagina_web')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS solicitudes_privacidad_cms')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS metricas_web_diarias')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS metricas_web_paginas_diarias')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS metricas_web_acciones_diarias')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS cuentas_fsb')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS movimientos_fsb')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS compromisos_pago_fsb')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS unidades_operativas_cms')
    expect(esquema).toContain('CREATE TABLE IF NOT EXISTS unidades_vistas_equipo_cms')
    expect(esquema).toContain('unidad_id VARCHAR(191) REFERENCES unidades_operativas_cms(id)')
    expect(esquema).toContain('datos_personales_sin_vencimiento INT NOT NULL DEFAULT 0')
    expect(esquema).toContain('requiere_consentimiento')
    expect(esquema).toContain('datos MEDIUMBLOB NOT NULL')
    expect(esquema).toContain('alcance LONGTEXT NOT NULL')
    expect(esquema).toContain('nota_revision LONGTEXT NOT NULL')
    expect(esquema).toContain('constancia LONGTEXT NOT NULL')
    expect(esquema).toContain('identidad_verificada_en DATETIME')
    expect(esquema).toContain('cerrada_en DATETIME')
    expect(esquema).toContain('seguimiento_personal INT NOT NULL DEFAULT 0')
    expect(esquema).toContain('destino_respuesta VARCHAR')
    expect(esquema).toContain('CREATE TRIGGER tareas_cms_registrar_asignacion_update')
    expect(esquema).not.toMatch(/sqlite_sequence|AUTOINCREMENT|\bREAL\b|\bTEXT\b|IF NOT EXISTS IF NOT EXISTS/)
  })

  it('incluye una actualización repetible para la base ya instalada', () => {
    const actualizacion = readFileSync('servidor-cpanel/actualizar-0044-0047.sql', 'utf8')
    expect(actualizacion).toContain('CREATE TABLE IF NOT EXISTS medios_pagina_web')
    expect(actualizacion).toContain('datos MEDIUMBLOB NOT NULL')
    expect(actualizacion).toContain('ADD COLUMN IF NOT EXISTS finalidad')
    expect(actualizacion).toContain('CREATE TABLE IF NOT EXISTS solicitudes_privacidad_cms')
    expect(actualizacion).toContain('CREATE TABLE IF NOT EXISTS metricas_web_diarias')
    expect(actualizacion).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE/)
  })

  it('agrega las cuentas corrientes sin borrar información existente', () => {
    const actualizacion = readFileSync('servidor-cpanel/actualizar-0048.sql', 'utf8')
    expect(actualizacion).toContain('CREATE TABLE IF NOT EXISTS cuentas_fsb')
    expect(actualizacion).toContain('CREATE TABLE IF NOT EXISTS movimientos_fsb')
    expect(actualizacion).toContain('INDEX movimientos_fsb_vencimiento')
    expect(actualizacion).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE/)
  })

  it('agrega compromisos de pago sin modificar saldos ni borrar información', () => {
    const actualizacion = readFileSync('servidor-cpanel/actualizar-0049.sql', 'utf8')
    expect(actualizacion).toContain('CREATE TABLE IF NOT EXISTS compromisos_pago_fsb')
    expect(actualizacion).toContain('INDEX compromisos_pago_fsb_cuenta_estado')
    expect(actualizacion).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE|UPDATE movimientos_fsb/)
  })

  it('agrega la vigencia indefinida sin concederla a accesos existentes', () => {
    const actualizacion = readFileSync('servidor-cpanel/actualizar-0050.sql', 'utf8')
    expect(actualizacion).toContain('datos_personales_sin_vencimiento')
    expect(actualizacion).toContain('DEFAULT 0')
    expect(actualizacion).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE|UPDATE usuarios/)
  })
})
