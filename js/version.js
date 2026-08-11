// Sello de version. GitHub Pages manda cache-control: max-age=600, asi que
// despues de publicar hay hasta 10 minutos donde el telefono sigue corriendo el
// codigo viejo sin pedirlo de nuevo. Sin este sello no habia forma de saber si
// un arreglo ya llego, y se terminaba depurando un problema ya resuelto.
// Lo escribe herramientas/sellar.sh; una prueba falla si se desincroniza de
// version.json.
export const VERSION = '2026-08-11.1423'
