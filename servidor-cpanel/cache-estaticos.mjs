// El gestor se actualiza como un conjunto. Guardar CSS o modulos JavaScript
// por separado puede combinar dos versiones y deformar una pantalla aunque
// cada archivo publicado sea correcto. Passenger sirve estos recursos chicos
// sin cache HTTP; el service worker conserva la copia para trabajar sin red.
export function cabecerasDeArchivo() {
  return {
    'cache-control': 'no-store, max-age=0',
    pragma: 'no-cache',
    expires: '0',
  }
}
