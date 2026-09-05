import { elemento, boton } from './componentes.js'

// Aviso de tres faltas seguidas, arriba de todo en Armar lista. Vive aparte de
// pantalla-lista.js, que ya tiene su propio trabajo y no necesita mas.
//
// Devuelve null cuando no hay nada que avisar: quien la usa hace
// `if (franja) raiz.appendChild(franja)` y no tiene que saber contar.
export function crearFranjaAlerta({ alertas, alSilenciar, alVerElMes }) {
  if (!alertas || alertas.length === 0) return null

  const caja = elemento('section', ['franja-alerta'])
  caja.setAttribute('role', 'status')
  caja.appendChild(elemento('h2', ['franja-alerta-titulo'],
    alertas.length === 1 ? 'Alguien viene faltando' : 'Hay quienes vienen faltando'))

  alertas.forEach(({ persona, faltas, almenos }) => {
    const fila = elemento('div', ['alerta-persona'])
    // "al menos" cuando la racha llega al borde de los sabados que se leyeron:
    // puede venir de mas atras, y dar el numero exacto seria afirmar de mas
    // sobre un chico.
    const cuantos = almenos ? `al menos ${faltas}` : `${faltas}`
    fila.appendChild(elemento('span', ['alerta-texto'],
      `${persona.nombre} faltó ${cuantos} sábados seguidos`))
    const anotar = boton('Anotar y silenciar', async () => {
      // El texto es obligatorio a proposito: silenciar sin decir por que deja a
      // la siguiente coordinadora sin saber si alguien se ocupo del tema.
      const nota = window.prompt(`¿Qué anotás sobre ${persona.nombre}?`)
      if (nota === null || nota.trim() === '') return
      await alSilenciar(persona, nota.trim())
    })
    anotar.dataset.accion = `silenciar-${persona.id}`
    fila.appendChild(anotar)
    caja.appendChild(fila)
  })

  const ver = boton('Ver el mes', () => alVerElMes())
  ver.dataset.accion = 'ver-el-mes'
  caja.appendChild(ver)
  return caja
}
