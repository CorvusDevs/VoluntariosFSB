import { describe, expect, it, vi } from 'vitest'
import { configuracionSmtp, demoraReintentoMinutos, identificadorMensaje, limitesEnvio, procesarColaCorreos } from '../../servidor-cpanel/procesar-cola-correos.mjs'

describe('procesador de la cola de correo', () => {
  it('aumenta la espera sin superar un día', () => {
    expect([1, 2, 3, 4, 5].map(demoraReintentoMinutos)).toEqual([5, 10, 20, 40, 80])
    expect(demoraReintentoMinutos(20)).toBe(1440)
  })

  it('usa TLS implícito en el puerto 465 sin debilitar certificados', () => {
    expect(configuracionSmtp({ SMTP_HOST: 'mail.aletea.org', SMTP_PORT: '465', SMTP_USER: 'novedades@aletea.org', SMTP_PASSWORD: 'privada' })).toEqual({
      host: 'mail.aletea.org', port: 465, secure: true, auth: { user: 'novedades@aletea.org', pass: 'privada' },
    })
  })

  it('reutiliza un Message-ID estable si debe reanudar un envío', () => {
    const entorno = { EMAIL_FROM: 'Aletea <novedades@aletea.org>' }
    expect(identificadorMensaje('correo-123', entorno)).toBe('<gestor-correo-123@aletea.org>')
    expect(identificadorMensaje('correo-123', entorno)).toBe(identificadorMensaje('correo-123', entorno))
  })

  it('limita la corrida y deja margen bajo el máximo de 300 correos por hora del hosting', () => {
    expect(limitesEnvio({})).toEqual({ porCorrida: 20, porHora: 240 })
    expect(limitesEnvio({ EMAIL_MAX_PER_RUN: '80', EMAIL_MAX_PER_HOUR: '900' })).toEqual({ porCorrida: 50, porHora: 300 })
  })

  it('no toma nuevos correos cuando ya agotó el límite horario', async () => {
    const sendMail = vi.fn()
    const query = vi.fn(async (sql) => {
      if (sql.includes("GET_LOCK('gestor_aletea_cola_correos'")) return [[{ adquirido: 1 }], []]
      if (sql.includes("COUNT(*) AS enviados")) return [[{ enviados: 240 }], []]
      return [{ affectedRows: 1 }, []]
    })
    const conexion = { query, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() }
    const pool = { getConnection: vi.fn(async () => conexion), end: vi.fn(async () => {}) }
    const resumen = await procesarColaCorreos({
      entorno: {
        DB_HOST: 'db', DB_NAME: 'gestor', DB_USER: 'gestor', DB_PASSWORD: 'privada',
        EMAIL_TRANSPORT: 'smtp', EMAIL_FROM: 'Aletea <novedades@aletea.org>',
        SMTP_HOST: 'mail.aletea.org', SMTP_USER: 'novedades@aletea.org', SMTP_PASSWORD: 'privada',
      },
      crearBase: () => ({ pool }),
      crearTransporte: () => ({ sendMail }),
    })
    expect(resumen).toMatchObject({ omitido: 'limite_horario', enviados_ultima_hora: 240, limite_por_hora: 240 })
    expect(sendMail).not.toHaveBeenCalled()
    expect(query.mock.calls.some(([sql]) => sql.includes('ORDER BY proximo_intento'))).toBe(false)
  })

  it('vuelve a comprobar el estado del contacto antes de enviar una campaña', async () => {
    const sendMail = vi.fn()
    const query = vi.fn(async (sql) => {
      if (sql.includes("GET_LOCK('gestor_aletea_cola_correos'")) return [[{ adquirido: 1 }], []]
      if (sql.includes('FROM cola_correos') && sql.includes("estado = 'pendiente'") && sql.includes('ORDER BY')) {
        return [[{ id: 'q1', tipo: 'campana', contacto_id: 'c1', campana_id: 'm1', destinatario: 'baja@ejemplo.uy', asunto: 'Agenda', contenido_texto: 'Texto', contenido_html: '', intentos: 0 }], []]
      }
      if (sql.includes('FROM supresiones_comunicacion')) return [[], []]
      if (sql.includes('FROM contactos_comunicacion')) return [[{ estado: 'baja' }], []]
      return [{ affectedRows: 1 }, []]
    })
    const conexion = { query, beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() }
    const pool = { getConnection: vi.fn(async () => conexion), end: vi.fn(async () => {}) }
    const resumen = await procesarColaCorreos({
      entorno: {
        DB_HOST: 'db', DB_NAME: 'gestor', DB_USER: 'gestor', DB_PASSWORD: 'privada',
        EMAIL_TRANSPORT: 'smtp', EMAIL_FROM: 'Aletea <novedades@aletea.org>',
        SMTP_HOST: 'mail.aletea.org', SMTP_USER: 'novedades@aletea.org', SMTP_PASSWORD: 'privada',
      },
      crearBase: () => ({ pool }),
      crearTransporte: () => ({ sendMail }),
    })
    expect(resumen.suprimidos).toBe(1)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
