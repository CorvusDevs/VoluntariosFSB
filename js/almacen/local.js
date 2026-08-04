const BASE = 'voluntarios-fsb'
const VERSION = 1
const DEPOSITOS = { roster: 'roster', listas: 'listas', fotos: 'fotos' }

function abrir() {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE, VERSION)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      if (!db.objectStoreNames.contains(DEPOSITOS.roster)) db.createObjectStore(DEPOSITOS.roster)
      if (!db.objectStoreNames.contains(DEPOSITOS.listas)) db.createObjectStore(DEPOSITOS.listas)
      if (!db.objectStoreNames.contains(DEPOSITOS.fotos)) db.createObjectStore(DEPOSITOS.fotos)
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
