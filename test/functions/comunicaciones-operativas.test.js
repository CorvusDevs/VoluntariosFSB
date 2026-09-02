import { describe, expect, it } from 'vitest'
import { preparacionCorreoCms } from '../../functions/api/[[ruta]].js'

const entornoSmtp = {
  EMAIL_TRANSPORT: 'smtp', EMAIL_FROM: 'Aletea <novedades@aletea.org>',
  SMTP_HOST: 'mail.aletea.org', SMTP_USER: 'novedades@aletea.org', SMTP_PASSWORD: 'privada',
}

describe('preparación operativa de comunicaciones', () => {
  const claves = ['correo_cuenta_remitente', 'correo_dmarc', 'correo_limites_proveedor', 'correo_prueba_externa', 'correo_baja_verificada']

  it('no habilita campañas solo porque existan credenciales SMTP', () => {
    const preparacion = preparacionCorreoCms([], entornoSmtp)
    expect(preparacion.smtp_configurado).toBe(true)
    expect(preparacion.lista).toBe(false)
    expect(preparacion.controles_pendientes).toEqual(claves)
  })

  it('habilita la programación cuando SMTP y todos los controles están confirmados', () => {
    const controles = claves.map((clave) => ({ clave, estado: 'confirmado' }))
    expect(preparacionCorreoCms(controles, entornoSmtp)).toEqual({ lista: true, smtp_configurado: true, controles_pendientes: [] })
  })
})
