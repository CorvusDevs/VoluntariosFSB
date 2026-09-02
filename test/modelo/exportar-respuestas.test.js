import { describe, expect, it } from 'vitest'
import { csvRespuestas, excelRespuestas, nombreExportacionRespuestas, tablaRespuestas } from '../../js/modelo/exportar-respuestas.js'

const formularios = [{
  id: 'f1', titulo: 'Ingreso a familias', campos_json: JSON.stringify([
    { clave: 'barrio', etiqueta: 'Barrio' },
    { clave: 'intereses', etiqueta: 'Intereses' },
  ]),
}]

const entradas = [{
  id: 'e1', formulario_id: 'f1', formulario_titulo: 'Ingreso a familias', equipo_nombre: 'Familias', nombre: 'Ana',
  contacto: 'ana@example.org', estado: 'nueva', creado_en: '2026-08-31 18:00:00', detalle: '=HIPERVINCULO("mal")',
  respuestas_json: JSON.stringify({ barrio: 'Centro', intereses: ['Encuentros', 'Talleres'], _consentimiento_privacidad: true }),
}]

describe('exportación operativa de respuestas', () => {
  it('ordena campos base, preguntas configurables y columnas de seguimiento', () => {
    const tabla = tablaRespuestas(entradas, formularios)
    expect(tabla.columnas).toEqual(expect.arrayContaining(['Estado de contacto', 'Canal de contacto', 'Barrio', 'Intereses']))
    expect(tabla.filas[0]).toEqual(expect.arrayContaining(['Ana', 'Centro', 'Encuentros, Talleres', 'Sí']))
  })

  it('genera CSV compatible con Excel sin interpretar fórmulas', () => {
    const csv = csvRespuestas(entradas, formularios)
    expect(csv.startsWith('\ufeffsep=;')).toBe(true)
    expect(csv).toContain('"\'=HIPERVINCULO(""mal"")"')
  })

  it('genera un XLSX real con filtro, cabecera fija y listas controladas', () => {
    const archivo = excelRespuestas(entradas, formularios)
    const contenido = new TextDecoder().decode(archivo)
    expect([...archivo.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
    expect(contenido).toContain('<autoFilter')
    expect(contenido).toContain('Estado de contacto')
    expect(contenido).toContain('Nuevo,Contactar,Contactado')
    expect(contenido).not.toContain('<f>')
  })

  it('crea un nombre legible y estable por fecha', () => {
    expect(nombreExportacionRespuestas(formularios[0], 'csv')).toMatch(/^ingreso-a-familias-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
