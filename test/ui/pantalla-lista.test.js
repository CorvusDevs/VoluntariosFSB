import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaLista } from '../../js/ui/pantalla-lista.js'
import { crearLista } from '../../js/modelo/lista.js'
import { ROSTER } from '../ayudas/datos.js'

let raiz, pantalla

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  pantalla = crearPantallaLista(raiz, {
    lista: crearLista('2026-08-08', ROSTER),
    roster: ROSTER,
    alCambiar: () => {},
  })
})

const fichas = (sel) => [...raiz.querySelectorAll(sel)]
const porNombre = (sel, nombre) => fichas(sel).find((f) => f.textContent.includes(nombre))

describe('pantalla de armado', () => {
  it('dibuja los dos grupos', () => {
    expect(raiz.querySelectorAll('.grupo')).toHaveLength(2)
  })

  it('dibuja una ficha por participante activo', () => {
    expect(fichas('.columna-participantes .ficha')).toHaveLength(5)
  })

  it('dibuja la lista de voluntarios una sola vez para toda la pantalla', () => {
    expect(fichas('.columna-voluntarios .ficha')).toHaveLength(5)
    expect(raiz.querySelectorAll('.columna-voluntarios')).toHaveLength(1)
  })

  it('rotula el area de voluntarios', () => {
    const titulos = [...raiz.querySelectorAll('h2')].map((e) => e.textContent)
    expect(titulos).toContain('Voluntarios')
  })

  it('envuelve los grupos, que es de lo que cuelga la retícula de pantalla ancha', () => {
    // El CSS separa grupos y voluntarios en dos columnas a partir de 900 px con
    // .cuerpo:has(.grupos). Sin este envoltorio la regla no aplica y el escritorio
    // vuelve a una sola columna, sin que falle ninguna otra prueba.
    const grupos = raiz.querySelector('.grupos')
    expect(grupos).not.toBeNull()
    expect(grupos.querySelectorAll('.grupo')).toHaveLength(2)
    expect(raiz.querySelector('.voluntarios').closest('.grupos')).toBeNull()
  })

  it('tocar un participante lo selecciona', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    expect(porNombre('.columna-participantes .ficha', 'Gonzalo').getAttribute('aria-pressed')).toBe('true')
  })

  it('tocar participante y luego voluntario los empareja', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toContain('v1')
  })

  it('tocar un segundo voluntario lo suma a la misma fila', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Cris').click()
    const fila = pantalla.lista().grupos[0].filas.find((f) => f.participantes.includes('p1'))
    expect(fila.voluntarios).toHaveLength(2)
  })

  it('tocar un voluntario sin participante seleccionado no hace nada', () => {
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas.every((f) => f.voluntarios.length === 0)).toBe(true)
  })

  it('atenua al voluntario ya asignado sin deshabilitarlo', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    const abi = porNombre('.columna-voluntarios .ficha', 'Abi')
    expect(abi.classList.contains('atenuada')).toBe(true)
    expect(abi.disabled).toBe(false)
  })

  it('muestra el conteo de pendientes por grupo', () => {
    expect(raiz.querySelector('.grupo .pendientes').textContent).toMatch(/3/)
  })

  it('un participante sin voluntario no se marca como error', () => {
    const sofi = porNombre('.columna-participantes .ficha', 'Sofi')
    expect(sofi.classList.contains('error')).toBe(false)
    expect(sofi.getAttribute('aria-invalid')).toBeNull()
  })

  it('deshacer revierte el ultimo emparejamiento', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    raiz.querySelector('[data-accion="deshacer"]').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('tocar un voluntario ya asignado al mismo participante lo quita', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('avisa en pantalla que al voluntario ya asignado se lo puede quitar', () => {
    // Sin esta marca, quitar era invisible: el voluntario ya asignado se veia
    // igual que uno ocupado con otro chico, y la coordinacion apilaba nombres
    // sobre el mismo participante sin encontrar como sacarlos.
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    const abi = porNombre('.columna-voluntarios .ficha', 'Abi')
    expect(abi.classList.contains('quitable')).toBe(true)
    expect(abi.textContent).toContain('quitar')
  })

  it('un voluntario ocupado con OTRO participante no se ofrece como quitable', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Sofi').click()
    const abi = porNombre('.columna-voluntarios .ficha', 'Abi')
    expect(abi.classList.contains('quitable')).toBe(false)
    expect(abi.classList.contains('atenuada')).toBe(true)
  })

  it('sin nadie seleccionado ningun voluntario aparece como quitable', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(fichas('.columna-voluntarios .ficha.quitable')).toHaveLength(0)
  })

  it('muestra una barra mientras hay un participante seleccionado', () => {
    expect(raiz.querySelector('.barra-seleccion')).toBeNull()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    const barra = raiz.querySelector('.barra-seleccion')
    expect(barra).not.toBeNull()
    expect(barra.textContent).toContain('Gonzalo')
  })

  it('cancelar limpia la seleccion sin emparejar', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    raiz.querySelector('[data-accion="cancelar"]').click()
    expect(raiz.querySelector('.barra-seleccion')).toBeNull()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('la barra desaparece despues de emparejar', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(raiz.querySelector('.barra-seleccion')).toBeNull()
  })

  it('muestra la fecha en español y permite cambiarla', () => {
    const etiqueta = raiz.querySelector('.encabezado-lista').textContent
    expect(etiqueta).toContain('Sábado 8 de agosto')
    expect(raiz.querySelector('[data-campo="fecha"]').value).toBe('2026-08-08')
  })

  it('avisa cuando cambia la fecha', () => {
    let recibida = null
    document.body.innerHTML = '<div id="raiz"></div>'
    const r = document.getElementById('raiz')
    crearPantallaLista(r, {
      lista: crearLista('2026-08-08', ROSTER), roster: ROSTER,
      alCambiar: () => {}, alCambiarFecha: (f) => { recibida = f },
    })
    const entrada = r.querySelector('[data-campo="fecha"]')
    entrada.value = '2026-08-15'
    entrada.dispatchEvent(new Event('change'))
    expect(recibida).toBe('2026-08-15')
  })

  it('sin alCambiarFecha la fecha se actualiza en la lista local', () => {
    const entrada = raiz.querySelector('[data-campo="fecha"]')
    entrada.value = '2026-08-15'
    entrada.dispatchEvent(new Event('change'))
    expect(pantalla.lista().fecha).toBe('2026-08-15')
    expect(raiz.querySelector('.encabezado-lista').textContent).toContain('Sábado 15 de agosto')
  })

  it('cambiar la hora y el lugar actualiza la lista', () => {
    const hora = raiz.querySelector('[data-campo="hora"]')
    hora.value = '10:30'
    hora.dispatchEvent(new Event('change'))
    expect(pantalla.lista().hora).toBe('10:30')

    const lugar = raiz.querySelector('[data-campo="lugar"]')
    lugar.value = 'Parque Batlle'
    lugar.dispatchEvent(new Event('change'))
    expect(pantalla.lista().lugar).toBe('Parque Batlle')
  })

  it('avisa al cambiar la hora', () => {
    let avisos = 0
    document.body.innerHTML = '<div id="raiz"></div>'
    const r = document.getElementById('raiz')
    crearPantallaLista(r, {
      lista: crearLista('2026-08-08', ROSTER), roster: ROSTER,
      alCambiar: () => { avisos += 1 },
    })
    const hora = r.querySelector('[data-campo="hora"]')
    hora.value = '10:30'
    hora.dispatchEvent(new Event('change'))
    expect(avisos).toBe(1)
  })

  it('permite editar el rotulo de cada grupo', () => {
    const entrada = raiz.querySelector('[data-campo="titulo-grupo-1"]')
    expect(entrada).not.toBeNull()
    entrada.value = 'Mayores'
    entrada.dispatchEvent(new Event('change'))
    expect(pantalla.lista().grupos[0].titulo).toBe('Mayores')
  })

  it('editar el subtitulo y la cancha tambien actualiza la lista', () => {
    const sub = raiz.querySelector('[data-campo="subtitulo-grupo-2"]')
    sub.value = '5 a 9 años'
    sub.dispatchEvent(new Event('change'))
    const cancha = raiz.querySelector('[data-campo="cancha-grupo-2"]')
    cancha.value = 'Cancha B'
    cancha.dispatchEvent(new Event('change'))
    expect(pantalla.lista().grupos[1].subtitulo).toBe('5 a 9 años')
    expect(pantalla.lista().grupos[1].cancha).toBe('Cancha B')
  })

  it('el rotulo se edita con un lapiz al lado del titulo, no con una palabra', () => {
    const lapiz = raiz.querySelector('[data-accion="editar-grupo-1"]')
    expect(lapiz).not.toBeNull()
    expect(lapiz.querySelector('svg')).not.toBeNull()
    expect(lapiz.textContent.trim()).toBe('')
    expect(lapiz.getAttribute('aria-label')).toMatch(/editar/i)
    // Al lado del titulo, en la misma linea
    expect(lapiz.closest('.grupo-titulo').querySelector('h2')).not.toBeNull()
  })

  it('el bloque de edicion viene oculto y el lapiz lo abre', () => {
    const panel = raiz.querySelector('.editar-grupo')
    expect(panel.hidden).toBe(true)
    raiz.querySelector('[data-accion="editar-grupo-1"]').click()
    expect(raiz.querySelector('.editar-grupo').hidden).toBe(false)
  })

  // Cada cambio redibuja la pantalla entera, y el redibujado crea un <details>
  // nuevo, que nace cerrado. Sin memoria del estado abierto, el bloque se cierra
  // solo despues de escribir el primer campo y hay que volver a abrirlo para el
  // segundo, tres veces seguidas. Medido: open pasaba de true a false.
  it('el bloque de edicion sigue abierto despues de editar un campo', () => {
    raiz.querySelector('[data-accion="editar-grupo-1"]').click()
    const entrada = raiz.querySelector('[data-campo="titulo-grupo-1"]')
    entrada.value = 'Mayores'
    entrada.dispatchEvent(new Event('change'))
    expect(raiz.querySelector('.editar-grupo').hidden).toBe(false)
  })

  it('recordar el bloque abierto no abre el del otro grupo', () => {
    raiz.querySelector('[data-accion="editar-grupo-1"]').click()
    const entrada = raiz.querySelector('[data-campo="titulo-grupo-1"]')
    entrada.value = 'Mayores'
    entrada.dispatchEvent(new Event('change'))
    expect([...raiz.querySelectorAll('.editar-grupo')].map((d) => d.hidden)).toEqual([false, true])
  })

  it('el bloque que se cierra a mano queda cerrado', () => {
    const lapiz = raiz.querySelector('[data-accion="editar-grupo-1"]')
    lapiz.click()
    lapiz.click()
    const entrada = raiz.querySelector('[data-campo="titulo-grupo-1"]')
    entrada.value = 'Mayores'
    entrada.dispatchEvent(new Event('change'))
    expect(raiz.querySelector('.editar-grupo').hidden).toBe(true)
  })

  it('el titulo editado se ve en el encabezado del grupo', () => {
    const entrada = raiz.querySelector('[data-campo="titulo-grupo-1"]')
    entrada.value = 'Mayores'
    entrada.dispatchEvent(new Event('change'))
    const titulos = [...raiz.querySelectorAll('.grupo-encabezado h2')].map((e) => e.textContent)
    expect(titulos[0]).toContain('Mayores')
  })

  it('avisa al cambiar la lista', () => {
    let avisos = 0
    const p = crearPantallaLista(raiz, {
      lista: crearLista('2026-08-08', ROSTER),
      roster: ROSTER,
      alCambiar: () => { avisos += 1 },
    })
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(avisos).toBe(1)
    expect(p.lista()).toBeTruthy()
  })
})

describe('ausencias desde la pantalla', () => {
  it('la barra de seleccion ofrece sacar al participante de la jornada', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    expect(raiz.querySelector('[data-accion="sacar-de-lista"]')).not.toBeNull()
  })

  it('sacarlo lo quita de su grupo y lo lista como ausente', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    raiz.querySelector('[data-accion="sacar-de-lista"]').click()
    expect(porNombre('.columna-participantes .ficha', 'Gonzalo')).toBeUndefined()
    expect(pantalla.lista().ausentes).toContain('p1')
    expect(raiz.querySelector('.ausentes').textContent).toContain('Gonzalo')
  })

  it('tocar al ausente lo devuelve a la planilla', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    raiz.querySelector('[data-accion="sacar-de-lista"]').click()
    porNombre('.columna-ausentes .ficha', 'Gonzalo').click()
    expect(porNombre('.columna-participantes .ficha', 'Gonzalo')).toBeDefined()
    expect(pantalla.lista().ausentes).not.toContain('p1')
  })

  it('sin ausentes no se dibuja la seccion', () => {
    expect(raiz.querySelector('.ausentes')).toBeNull()
  })

  it('deshacer revierte una ausencia', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    raiz.querySelector('[data-accion="sacar-de-lista"]').click()
    raiz.querySelector('[data-accion="deshacer"]').click()
    expect(porNombre('.columna-participantes .ficha', 'Gonzalo')).toBeDefined()
  })
})

describe('apoyo del grupo', () => {
  it('cada grupo ofrece sumar un apoyo', () => {
    expect(raiz.querySelector('[data-accion="sumar-apoyo-1"]')).not.toBeNull()
    expect(raiz.querySelector('[data-accion="sumar-apoyo-2"]')).not.toBeNull()
  })

  it('sumar apoyo y tocar un voluntario lo deja como apoyo de ese grupo', () => {
    raiz.querySelector('[data-accion="sumar-apoyo-1"]').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].apoyo).toEqual(['v1'])
    expect(pantalla.lista().grupos[1].apoyo).toEqual([])
  })

  it('mientras se elige el apoyo la barra lo dice', () => {
    raiz.querySelector('[data-accion="sumar-apoyo-1"]').click()
    const barra = raiz.querySelector('.barra-seleccion')
    expect(barra.textContent).toMatch(/apoyo/i)
    expect(raiz.querySelector('[data-accion="cancelar-apoyo"]')).not.toBeNull()
  })

  it('cancelar deja todo como estaba', () => {
    raiz.querySelector('[data-accion="sumar-apoyo-1"]').click()
    raiz.querySelector('[data-accion="cancelar-apoyo"]').click()
    expect(raiz.querySelector('.barra-seleccion')).toBeNull()
    expect(pantalla.lista().grupos[0].apoyo).toEqual([])
  })

  it('el apoyo cargado se muestra y se puede quitar de un toque', () => {
    raiz.querySelector('[data-accion="sumar-apoyo-1"]').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    const chip = raiz.querySelector('[data-accion="quitar-apoyo-1"]')
    expect(chip.textContent).toContain('Abi')
    chip.click()
    expect(pantalla.lista().grupos[0].apoyo).toEqual([])
  })

  it('elegir un participante cancela el modo apoyo', () => {
    raiz.querySelector('[data-accion="sumar-apoyo-1"]').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].apoyo).toEqual([])
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual(['v1'])
  })

  it('deshacer revierte un apoyo', () => {
    raiz.querySelector('[data-accion="sumar-apoyo-1"]').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    raiz.querySelector('[data-accion="deshacer"]').click()
    expect(pantalla.lista().grupos[0].apoyo).toEqual([])
  })
})

describe('el elegidor se abre donde se tocó', () => {
  it('cuelga los voluntarios del participante elegido, no del pie de la página', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    const elegidor = raiz.querySelector('.elegidor')
    expect(elegidor).not.toBeNull()
    // Dentro del grupo de Gonzalo, no en una sección aparte al final.
    expect(elegidor.closest('.grupo')).not.toBeNull()
    expect(elegidor.querySelectorAll('.ficha').length).toBeGreaterThan(0)
  })

  it('lo pone inmediatamente después de la ficha tocada', () => {
    const ficha = porNombre('.columna-participantes .ficha', 'Gonzalo')
    ficha.click()
    const siguiente = porNombre('.columna-participantes .ficha', 'Gonzalo').nextElementSibling
    expect(siguiente.classList.contains('elegidor')).toBe(true)
  })

  it('saca el plantel del pie mientras se asigna, para no repetir el mismo listado', () => {
    expect(raiz.querySelector('.voluntarios')).not.toBeNull()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    expect(raiz.querySelector('.voluntarios')).toBeNull()
    expect(raiz.querySelectorAll('.columna-voluntarios')).toHaveLength(1)
  })

  it('asignar desde el elegidor empareja igual y lo cierra', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.elegidor .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toContain('v1')
    expect(raiz.querySelector('.elegidor')).toBeNull()
    expect(raiz.querySelector('.voluntarios')).not.toBeNull()
  })

  it('el apoyo también elige ahí mismo, dentro del área del grupo', () => {
    raiz.querySelector('[data-accion="sumar-apoyo-1"]').click()
    const elegidor = raiz.querySelector('.elegidor')
    expect(elegidor).not.toBeNull()
    expect(elegidor.closest('.apoyo-grupo')).not.toBeNull()
    porNombre('.elegidor .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].apoyo).toContain('v1')
    expect(raiz.querySelector('.elegidor')).toBeNull()
  })

  it('cancelar la selección cierra el elegidor y devuelve el plantel al pie', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    raiz.querySelector('[data-accion="cancelar"]').click()
    expect(raiz.querySelector('.elegidor')).toBeNull()
    expect(raiz.querySelector('.voluntarios')).not.toBeNull()
  })
})
