// Registro del service worker. Vive aparte de app.js porque tiene una salida de
// emergencia que hay que poder leer de un vistazo: si el trabajador rompiera
// algo, abrir la aplicacion con ?sw=off lo desregistra y todo vuelve a como
// estaba, sin tocar codigo ni esperar una publicacion.
export const APAGAR = 'sw=off'

export function pidieronApagarlo(busqueda) {
  return new URLSearchParams(busqueda ?? '').get('sw') === 'off'
}

export function recargarAlCambiarControlador({
  contenedor = typeof navigator !== 'undefined' ? navigator.serviceWorker : null,
  recargar = () => location.reload(),
} = {}) {
  if (!contenedor?.addEventListener) return false
  let recargando = false
  contenedor.addEventListener('controllerchange', () => {
    if (recargando) return
    recargando = true
    recargar()
  })
  return true
}

// El soporte se deduce del contenedor y no de una bandera aparte: con dos
// fuentes para lo mismo, una prueba que pasaba el contenedor a mano seguia
// creyendo que el navegador no lo soportaba.
export async function registrarTrabajador({
  contenedor = typeof navigator !== 'undefined' ? navigator.serviceWorker : null,
  busqueda = typeof location !== 'undefined' ? location.search : '',
  ruta = 'sw.js',
} = {}) {
  if (!contenedor) return 'sin soporte'
  try {
    if (pidieronApagarlo(busqueda)) {
      const registros = await contenedor.getRegistrations()
      await Promise.all(registros.map((r) => r.unregister()))
      return 'desregistrado'
    }
    // El trabajador tambien necesita una ruta sellada. Sin ella, el navegador
    // puede volver a registrar un sw.js anterior desde su cache HTTP y devolver
    // la aplicacion a una version vieja despues de haber cargado la nueva. No
    // desregistramos primero el anterior: registrar la misma zona con una URL
    // nueva activa el ciclo normal de actualizacion y permite que
    // controllerchange confirme cuando el reemplazo ya tomo el control.
    await contenedor.register(ruta, { updateViaCache: 'none' })
    return 'registrado'
  } catch {
    // Que falle el registro no puede tumbar la aplicacion: sin trabajador
    // funciona igual, solo vuelve la ventana de cache de diez minutos.
    return 'fallo'
  }
}
