import { describe, expect, it, vi } from 'vitest'
import { llevarVistaAlInicio } from '../../js/ui/desplazamiento.js'

describe('navegación entre pantallas', () => {
  it('lleva la vista al comienzo para que una pantalla corta no parezca vacía', () => {
    const scrollTo = vi.fn()
    const documento = { documentElement: { scrollTop: 840 }, body: { scrollTop: 840 } }

    llevarVistaAlInicio({ scrollTo }, documento)

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
    expect(documento.documentElement.scrollTop).toBe(0)
    expect(documento.body.scrollTop).toBe(0)
  })
})
