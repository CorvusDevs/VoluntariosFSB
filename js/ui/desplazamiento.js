export function llevarVistaAlInicio(ventana = globalThis.window, documento = globalThis.document) {
  try { ventana?.scrollTo?.({ top: 0, left: 0, behavior: 'instant' }) } catch { /* Algunos entornos de prueba no implementan scrollTo. */ }
  if (documento?.documentElement) documento.documentElement.scrollTop = 0
  if (documento?.body) documento.body.scrollTop = 0
}
