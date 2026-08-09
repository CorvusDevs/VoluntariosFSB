// Service worker: que el telefono corra siempre el codigo publicado.
//
// GitHub Pages manda cache-control: max-age=600 y cada archivo se cachea por su
// cuenta, con su propio reloj. Eso permitia el peor de los estados: version.js
// de una version y el resto de otra, con el sello diciendo la verdad sobre si
// mismo y mintiendo sobre todo lo demas. Se perdieron varias vueltas
// distinguiendo "esta roto" de "todavia no te llego".
//
// La estrategia es "primero la red": si hay conexion, gana lo que sirve el
// servidor, siempre. La copia guardada existe solo para que la aplicacion abra
// sin senal, que en la cancha pasa. Es lo contrario de lo que suele hacer un
// service worker, y es a proposito: aca la frescura importa mas que la
// velocidad, y los archivos son chicos.
//
// Si algo sale mal, abrir la aplicacion con ?sw=off la desregistra y vuelve
// todo al comportamiento anterior.

const VERSION = '2026-08-09.1842'
const CACHE = `voluntarios-fsb-${VERSION}`

// Tomar el control apenas se instala, sin esperar a que se cierren las pestañas
// viejas. Sin esto una version nueva podia quedar esperando dias.
self.addEventListener('install', (evento) => {
  evento.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nombres = await caches.keys()
    await Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    await self.clients.claim()
  })())
})

// Solo se ocupa de lo propio: la API de GitHub, las fotos del repositorio y
// cualquier otro origen pasan de largo sin tocarse.
function nosCorresponde(peticion) {
  if (peticion.method !== 'GET') return false
  const url = new URL(peticion.url)
  if (url.origin !== self.location.origin) return false
  // version.json es justamente el que contesta "hay algo nuevo": guardarlo
  // seria pedirle a la copia vieja que avise que quedo vieja.
  if (url.pathname.endsWith('/version.json')) return false
  return true
}

self.addEventListener('fetch', (evento) => {
  if (!nosCorresponde(evento.request)) return
  evento.respondWith((async () => {
    try {
      // 'reload' saltea la cache HTTP del navegador y ademas la actualiza. Sin
      // esto el fetch del trabajador cae en esa misma cache de diez minutos y
      // "primero la red" termina siendo "primero la cache", que es exactamente
      // el problema que vino a resolver. Verificado: sin este parametro el
      // trabajador devolvia el archivo viejo aunque el servidor tuviera el nuevo.
      const respuesta = await fetch(evento.request, { cache: 'reload' })
      // Solo se guarda lo que llego entero: una respuesta parcial o un error
      // guardado es peor que no tener nada.
      if (respuesta && respuesta.ok && respuesta.type === 'basic') {
        const cache = await caches.open(CACHE)
        cache.put(evento.request, respuesta.clone())
      }
      return respuesta
    } catch (fallo) {
      const guardada = await caches.match(evento.request)
      if (guardada) return guardada
      throw fallo
    }
  })())
})
