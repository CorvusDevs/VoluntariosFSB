// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaOperaciones } from '../../js/ui/pantalla-operaciones.js'

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

function respuestaOperativa() {
  return {
    acceso: { puede_administrar: true, puede_ver_datos: true },
    version: '2026-08-31.0100-prueba',
    indicadores: { formularios_activos: 4, entradas_abiertas: 2, contactos_activos: 12, contactos_pendientes: 1, privacidad_pendiente: 0 },
    resumen: { pendientesCola: 3, fallidosCola: 1, incidentesAbiertos: 1, controlesPendientes: 1, integracionesConAtencion: 2 },
    integraciones: [
      { clave: 'base', nombre: 'Base institucional', estado: 'saludable', detalle: 'Disponible.' },
      { clave: 'correo', nombre: 'Correo y campañas', estado: 'advertencia', detalle: 'Revisar cron.' },
    ],
    controles: [{ clave: 'correo_dmarc', titulo: 'DMARC publicado', descripcion: 'Protege el dominio.', categoria: 'correo', estado: 'pendiente', detalle: '', evidencia: '' }],
    cola: [{ estado: 'pendiente', cantidad: 3 }, { estado: 'fallido', cantidad: 1 }],
    correosFallidos: [{ id: 'correo-1', destinatario: 'p***@ejemplo.uy', asunto: 'Agenda', intentos: 3, ultimo_error: 'Tiempo agotado' }],
    ejecuciones: [{ id: 'e1', trabajo: 'cola_correos', estado: 'completada', iniciada_en: '2026-08-31 10:00:00', exitos: 2, reintentados: 0, fallidos: 0 }],
    incidentes: [{ id: 'i1', estado: 'abierto', severidad: 'critica', titulo: 'Cola detenida', detalle: 'SMTP no respondió.', fuente: 'cron', detectado_en: '2026-08-31 10:00:00', ocurrencias: 2 }],
  }
}

describe('centro de operaciones', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="raiz"></div>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(respuestaOperativa()), { status: 200, headers: { 'content-type': 'application/json' } })))
  })

  it('muestra integraciones, recuperación, evidencia y versión', async () => {
    crearPantallaOperaciones(document.getElementById('raiz'))
    await esperar()
    expect(document.querySelector('.cms-operaciones-circuito').textContent).toContain('Base institucional')
    expect(document.querySelector('.cms-operaciones-incidentes').textContent).toContain('Cola detenida')
    expect(document.querySelector('.cms-operaciones-controles').textContent).toContain('DMARC publicado')
    expect(document.querySelector('.cms-operaciones-foco').textContent).toContain('2026-08-31.0100-prueba')
  })

  it('permite reintentar un correo fallido y vuelve a cargar el estado', async () => {
    crearPantallaOperaciones(document.getElementById('raiz'))
    await esperar()
    const reintentar = [...document.querySelectorAll('button')].find((control) => control.textContent.includes('Reintentar correo'))
    reintentar.click()
    await esperar()
    expect(fetch).toHaveBeenCalledWith('/api/cms/operaciones/correos/correo-1/reintentar', expect.objectContaining({ method: 'POST' }))
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
