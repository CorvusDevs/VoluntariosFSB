const BASE = 'voluntarios-fsb'
// La 2 suma los depositos de asistencias y seguimientos. Subir el numero es
// obligatorio: onupgradeneeded no vuelve a correr con la misma version, asi que
// sin esto los depositos nuevos no existen en las bases ya creadas, que son
// todas las que estan andando hoy.
const VERSION = 2
const DEPOSITOS = {
  roster: 'roster', listas: 'listas', fotos: 'fotos',
  asistencias: 'asistencias', seguimientos: 'seguimientos',
}

function abrir() {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE, VERSION)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      if (!db.objectStoreNames.contains(DEPOSITOS.roster)) db.createObjectStore(DEPOSITOS.roster)
      if (!db.objectStoreNames.contains(DEPOSITOS.listas)) db.createObjectStore(DEPOSITOS.listas)
      if (!db.objectStoreNames.contains(DEPOSITOS.fotos)) db.createObjectStore(DEPOSITOS.fotos)
      if (!db.objectStoreNames.contains(DEPOSITOS.asistencias)) db.createObjectStore(DEPOSITOS.asistencias)
      if (!db.objectStoreNames.contains(DEPOSITOS.seguimientos)) db.createObjectStore(DEPOSITOS.seguimientos)
    }
    solicitud.onsuccess = () => {
      const db = solicitud.result
      // Si alguien pide borrar o migrar la base, esta conexion se aparta sola.
      // Sin esto, una conexion abierta bloquea para siempre a deleteDatabase.
      db.onversionchange = () => db.close()
      resolver(db)
    }
    solicitud.onerror = () => rechazar(solicitud.error)
  })
}

function operar(db, deposito, modo, accion) {
  return new Promise((resolver, rechazar) => {
    const transaccion = db.transaction(deposito, modo)
    const solicitud = accion(transaccion.objectStore(deposito))
    transaccion.onerror = () => rechazar(transaccion.error)
    if (solicitud) {
      solicitud.onsuccess = () => resolver(solicitud.result)
      solicitud.onerror = () => rechazar(solicitud.error)
    } else {
      transaccion.oncomplete = () => resolver(undefined)
    }
  })
}

export async function crearAlmacenLocal() {
  const db = await abrir()

  return {
    async leerRoster() {
      const guardado = await operar(db, DEPOSITOS.roster, 'readonly', (d) => d.get('actual'))
      return guardado ?? { version: 1, participantes: [], voluntarios: [] }
    },

    async guardarRoster(roster) {
      await operar(db, DEPOSITOS.roster, 'readwrite', (d) => d.put(roster, 'actual'))
      return { sha: null }
    },

    async leerLista(fecha) {
      const guardada = await operar(db, DEPOSITOS.listas, 'readonly', (d) => d.get(fecha))
      return guardada ?? null
    },

    // La descripcion es para el registro del almacen remoto: aca no hay commits.
    async guardarLista(lista) {
      await operar(db, DEPOSITOS.listas, 'readwrite', (d) => d.put(lista, lista.fecha))
      return { sha: null }
    },

    async listarListas() {
      const claves = await operar(db, DEPOSITOS.listas, 'readonly', (d) => d.getAllKeys())
      return [...claves].sort().reverse().map((fecha) => ({ fecha, sha: null }))
    },

    async borrarMes(mes) {
      const claves = await operar(db, DEPOSITOS.listas, 'readonly', (d) => d.getAllKeys())
      await Promise.all(claves.filter((fecha) => String(fecha).startsWith(`${mes}-`))
        .map((fecha) => operar(db, DEPOSITOS.listas, 'readwrite', (d) => d.delete(fecha))))
      await operar(db, DEPOSITOS.asistencias, 'readwrite', (d) => d.delete(mes))
    },

    // Un día tiene su propia planilla, pero sus correcciones viven dentro del
    // archivo mensual. Al borrarlo se limpian ambas cosas para que nunca quede
    // una corrección huérfana que pudiera reaparecer si se vuelve a crear fecha.
    async borrarDia(fecha) {
      await operar(db, DEPOSITOS.listas, 'readwrite', (d) => d.delete(fecha))
      const mes = String(fecha).slice(0, 7)
      const asistencias = await operar(db, DEPOSITOS.asistencias, 'readonly', (d) => d.get(mes))
      if (!asistencias) return
      const correcciones = (asistencias.correcciones ?? []).filter((correccion) => correccion.fecha !== fecha)
      await operar(db, DEPOSITOS.asistencias, 'readwrite', (d) => d.put({ ...asistencias, correcciones }, mes))
    },

    // Las correcciones de asistencia van por mes, con la misma clave que usa el
    // almacen remoto para el nombre del archivo.
    async leerAsistencias(mes) {
      const guardado = await operar(db, DEPOSITOS.asistencias, 'readonly', (d) => d.get(mes))
      return guardado ?? null
    },

    async guardarAsistencias(mes, datos) {
      await operar(db, DEPOSITOS.asistencias, 'readwrite', (d) => d.put(datos, mes))
      return { sha: null }
    },

    async leerSeguimientos() {
      const guardado = await operar(db, DEPOSITOS.seguimientos, 'readonly', (d) => d.get('actual'))
      return guardado ?? null
    },

    async guardarSeguimientos(datos) {
      await operar(db, DEPOSITOS.seguimientos, 'readwrite', (d) => d.put(datos, 'actual'))
      return { sha: null }
    },

    async leerFoto(clave) {
      const blob = await operar(db, DEPOSITOS.fotos, 'readonly', (d) => d.get(clave))
      return blob ?? null
    },

    // El segundo dato es para el registro del almacen remoto: aca no hay commits.
    async guardarFoto(clave, blob) {
      await operar(db, DEPOSITOS.fotos, 'readwrite', (d) => d.put(blob, clave))
    },

    async borrarFoto(clave) {
      await operar(db, DEPOSITOS.fotos, 'readwrite', (d) => d.delete(clave))
    },
  }
}
