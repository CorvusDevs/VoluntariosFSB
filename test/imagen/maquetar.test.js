import { describe, it, expect } from 'vitest'
import { maquetar } from '../../js/imagen/maquetar.js'
import { ANCHO, COLORES, COLUMNAS, GRILLA } from '../../js/imagen/tema.js'
import { ROSTER, LISTA, SALUDO, DESPEDIDA, medirFalso } from '../ayudas/datos.js'

const opciones = { saludo: SALUDO, despedida: DESPEDIDA, medirTexto: medirFalso }

function textos(plano) {
  return plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
}

describe('maquetar', () => {
  it('devuelve el ancho fijo de 1080 y un alto positivo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    expect(plano.ancho).toBe(ANCHO)
    expect(plano.alto).toBeGreaterThan(0)
  })

  it('escribe el titulo del programa y la fecha en español', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Fútbol sin Barreras')
    expect(t.some((x) => x.includes('Sábado 8 de agosto'))).toBe(true)
    expect(t.some((x) => x.includes('11:00'))).toBe(true)
    expect(t.some((x) => x.includes('Tres Cruces'))).toBe(true)
  })

  it('escribe los titulos y las canchas de los dos grupos', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Grupo 1 · 10 a 17 años')
    expect(t).toContain('Cancha 1')
    expect(t).toContain('Grupo 2 · 5 a 9 años')
    expect(t).toContain('Cancha 2')
  })

  it('escribe cada participante y su voluntario', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Gonzalo')
    expect(t).toContain('Abi')
  })

  it('un participante sin voluntario se dibuja sin separador', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const fila = plano.ordenes.filter((o) => o.fila === 'p2')
    expect(fila.some((o) => o.tipo === 'texto' && o.texto === 'Sofi')).toBe(true)
    expect(fila.some((o) => o.tipo === 'texto' && o.texto === '-')).toBe(false)
  })

  it('dos voluntarios para un participante se separan con barra', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const fila = plano.ordenes.filter((o) => o.fila === 'p4')
    const t = fila.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(t).toContain('Cris')
    expect(t).toContain('/')
    expect(t).toContain('Francisco')
  })

  it('usa guion simple como separador, nunca raya', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones)).join(' ')
    expect(t).toContain('-')
    expect(t).not.toMatch(/(—|–|―)/)
  })

  it('marca al voluntario nuevo con una pastilla', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const t = textos(plano)
    expect(t).toContain('nuevo')
  })

  it('dibuja la linea de apoyo del grupo 2', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Apoyo G2')
    expect(t).toContain('Majo')
  })

  it('incluye saludo y despedida cuando estan activados', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones)).join(' ')
    expect(t).toContain('Les compartimos las asignaciones')
    expect(t).toContain('Nos vemos mañana')
  })

  it('los omite cuando estan desactivados y la imagen queda mas baja', () => {
    const sin = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, saludo: false, despedida: false } }
    const planoSin = maquetar(sin, ROSTER, opciones)
    const planoCon = maquetar(LISTA, ROSTER, opciones)
    expect(textos(planoSin).join(' ')).not.toContain('Nos vemos mañana')
    expect(planoSin.alto).toBeLessThan(planoCon.alto)
  })

  it('ninguna orden se sale del lienzo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    plano.ordenes.forEach((o) => {
      expect(o.x ?? 0).toBeGreaterThanOrEqual(0)
      expect((o.x ?? 0) + (o.ancho ?? 0)).toBeLessThanOrEqual(ANCHO)
      expect(o.y ?? 0).toBeGreaterThanOrEqual(0)
      expect((o.y ?? 0) + (o.alto ?? 0)).toBeLessThanOrEqual(plano.alto)
    })
  })

  it('pide la foto solo de quien tiene foto', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const imagenes = plano.ordenes.filter((o) => o.tipo === 'imagen')
    expect(imagenes.map((o) => o.clave)).toContain('p3.jpg')
    expect(imagenes.map((o) => o.clave)).not.toContain(null)
  })

  it('dibuja iniciales cuando no hay foto', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('GO')
  })

  it('dibuja el circulo de respaldo tambien debajo de una foto', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const deThiago = plano.ordenes.filter((o) => o.fila === 'p3')
    expect(deThiago.some((o) => o.tipo === 'circulo')).toBe(true)
    expect(deThiago.some((o) => o.tipo === 'texto' && o.texto === 'TH')).toBe(true)
    expect(deThiago.some((o) => o.tipo === 'imagen' && o.clave === 'p3.jpg')).toBe(true)
  })

  it('la foto se dibuja despues del circulo de respaldo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const indices = plano.ordenes
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => o.fila === 'p3' && (o.tipo === 'circulo' || o.tipo === 'imagen'))
    const circulo = indices.find(({ o }) => o.tipo === 'circulo').i
    const foto = indices.find(({ o }) => o.tipo === 'imagen').i
    expect(foto).toBeGreaterThan(circulo)
  })

  it('el circulo de iniciales toma el color de su grupo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const circuloDe = (id) => plano.ordenes.find((o) => o.tipo === 'circulo' && o.fila === id)
    expect(circuloDe('p1').color).toBe(COLORES.turquesaTenue)
    expect(circuloDe('p4').color).toBe(COLORES.magentaTenue)
  })

  it('el modo compacto es mas bajo y no pide fotos de personas', () => {
    const comp = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, compacto: true } }
    const planoComp = maquetar(comp, ROSTER, opciones)
    const planoNormal = maquetar(LISTA, ROSTER, opciones)
    expect(planoComp.alto).toBeLessThan(planoNormal.alto)
    const fotos = planoComp.ordenes.filter((o) => o.tipo === 'imagen' && o.clave !== 'logo')
    expect(fotos).toHaveLength(0)
    expect(planoComp.ordenes.some((o) => o.tipo === 'imagen' && o.clave === 'logo')).toBe(true)
  })

  it('informa la relacion de aspecto y si WhatsApp la recortaria', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    expect(plano.relacion).toBeCloseTo(plano.alto / plano.ancho, 5)
    expect(plano.recorteProbable).toBe(plano.relacion > 2.5)
  })

  it('un participante inactivo que no esta en ninguna fila no aparece', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).not.toContain('Ezequiel')
  })

  it('falla con mensaje claro si una fila referencia un id inexistente', () => {
    const rota = structuredClone(LISTA)
    rota.grupos[0].filas.push({ participantes: ['p999'], voluntarios: [] })
    expect(() => maquetar(rota, ROSTER, opciones)).toThrow(/p999/)
  })

  it('el encabezado no se pisa en ninguno de los dos modos', () => {
    ;[false, true].forEach((compacto) => {
      const lista = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, compacto } }
      const plano = maquetar(lista, ROSTER, opciones)
      const logo = plano.ordenes.find((o) => o.clave === 'logo')
      const titulo = plano.ordenes.find((o) => o.texto === 'Fútbol sin Barreras')
      const subtitulo = plano.ordenes.find((o) => o.texto?.includes('Sábado 8 de agosto'))
      const finDelTitulo = titulo.x + medirFalso(titulo.texto, titulo.fuente)
      expect(finDelTitulo).toBeLessThan(logo.x)
      expect(subtitulo.y - titulo.y).toBeGreaterThanOrEqual(50)
      expect(logo.x + logo.ancho).toBe(ANCHO - (compacto ? 44 : 56))
    })
  })

  it('parte una palabra sola mas ancha que la columna', () => {
    const largo = 'https://www.aletea.org.uy/programas/futbol-sin-barreras/asignaciones-semanales'
    const lista = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, despedida: false } }
    const plano = maquetar(lista, ROSTER, { ...opciones, saludo: largo })
    const lineas = plano.ordenes.filter((o) => o.tipo === 'texto' && o.color === COLORES.textoSuave)
    expect(lineas.length).toBeGreaterThan(1)
    lineas.forEach((o) => {
      expect(o.x + medirFalso(o.texto, o.fuente)).toBeLessThanOrEqual(ANCHO - 56)
    })
  })

  it('respeta los saltos de linea del saludo', () => {
    const plano = maquetar(LISTA, ROSTER, { ...opciones, saludo: 'Primera linea.\nSegunda linea.' })
    const t = plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(t).toContain('Primera linea.')
    expect(t).toContain('Segunda linea.')
  })

  it('informa el borde derecho sin contar las bandas a sangre', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    expect(plano.bordeDerecho).toBeLessThanOrEqual(ANCHO - 56)
    expect(plano.desborde).toBe(false)
  })

  it('marca desborde cuando una fila invade el margen', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes[0].nombre = 'Alfonsina Mariangeles'
    roster.voluntarios[0].nombre = 'Francisco Planells'
    roster.voluntarios[0].nuevo = true
    roster.voluntarios[3].nombre = 'Mariangeles Alejandra'
    const lista = structuredClone(LISTA)
    lista.grupos[0].filas[0] = { participantes: ['p1'], voluntarios: ['v1', 'v4'] }
    const plano = maquetar(lista, roster, opciones)
    expect(plano.desborde).toBe(true)
  })

  it('el saludo y la despedida quedan a la misma distancia de lo que los rodea', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const banda = plano.ordenes.find((o) => o.tipo === 'rect' && o.y === 0)
    const saludo = plano.ordenes.find((o) => o.texto?.includes('Buenas tardes'))
    expect(saludo.y - (banda.y + banda.alto)).toBe(28)
  })

  it('un saludo de solo espacios no agrega altura', () => {
    const conEspacios = maquetar(LISTA, ROSTER, { ...opciones, saludo: '   ' })
    const sinSaludo = maquetar(
      { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, saludo: false } },
      ROSTER, opciones,
    )
    expect(conEspacios.alto).toBe(sinSaludo.alto)
  })

  it('una fila sin participantes falla con un mensaje de dominio', () => {
    const rota = structuredClone(LISTA)
    rota.grupos[0].filas.push({ participantes: [], voluntarios: ['v1'] })
    expect(() => maquetar(rota, ROSTER, opciones)).toThrow(/participante/i)
  })

  it('ninguna fila supera el margen derecho con nombres largos reales', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes[0].nombre = 'Alfonsina'
    roster.voluntarios[0].nombre = 'Francisco Planells'
    roster.voluntarios[0].nuevo = true
    const lista = structuredClone(LISTA)
    lista.grupos[0].filas[0] = { participantes: ['p1'], voluntarios: ['v1', 'v4'] }
    const plano = maquetar(lista, roster, opciones)
    const deLaFila = plano.ordenes.filter((o) => o.fila === 'p1' && o.tipo === 'texto')
    deLaFila.forEach((o) => {
      expect(o.x + medirFalso(o.texto, o.fuente)).toBeLessThanOrEqual(ANCHO)
    })
  })

  it('una fila con dos participantes y un voluntario se dibuja con barra', () => {
    const lista = structuredClone(LISTA)
    lista.grupos[0].filas = [{ participantes: ['p1', 'p3'], voluntarios: ['v1'] }]
    const plano = maquetar(lista, ROSTER, opciones)
    const t = plano.ordenes.filter((o) => o.fila === 'p1' && o.tipo === 'texto').map((o) => o.texto)
    expect(t).toContain('Gonzalo')
    expect(t).toContain('/')
    expect(t).toContain('Thiago')
    expect(t).toContain('-')
    expect(t).toContain('Abi')
  })
})

describe('formato de dos columnas', () => {
  const enColumnas = (base = LISTA) => maquetar(
    { ...base, opcionesImagen: { ...base.opcionesImagen, formato: 'columnas' } },
    ROSTER, opciones,
  )

  it('dibuja a los mismos participantes que el formato apilado', () => {
    const t = (p) => p.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto).join(' ')
    const col = t(enColumnas())
    ;['Gonzalo', 'Sofi', 'Thiago', 'Nikita', 'Julián'].forEach((n) => expect(col).toContain(n))
  })

  it('pone dos participantes por fila, a la misma altura', () => {
    const plano = enColumnas()
    const circulos = plano.ordenes.filter((o) => o.tipo === 'circulo')
    // p1 y p2 son los dos primeros del grupo 1: comparten renglon.
    const a = circulos.find((o) => o.fila === 'p1')
    const b = circulos.find((o) => o.fila === 'p2')
    expect(a.y).toBe(b.y)
    expect(b.x).toBeGreaterThan(a.x)
  })

  it('la tercera arranca un renglon mas abajo', () => {
    const plano = enColumnas()
    const circulos = plano.ordenes.filter((o) => o.tipo === 'circulo')
    const a = circulos.find((o) => o.fila === 'p1')
    const c = circulos.find((o) => o.fila === 'p3')
    expect(c.y).toBeGreaterThan(a.y)
    expect(c.x).toBe(a.x)
  })

  it('la foto es bastante mas grande que en el formato apilado', () => {
    const grande = enColumnas().ordenes.find((o) => o.tipo === 'circulo').radio * 2
    const chica = maquetar(LISTA, ROSTER, opciones).ordenes.find((o) => o.tipo === 'circulo').radio * 2
    expect(grande).toBe(COLUMNAS.avatar)
    expect(grande / chica).toBeGreaterThan(1.8)
  })

  it('el voluntario va debajo del nombre, no al lado', () => {
    const plano = enColumnas()
    const deGonzalo = plano.ordenes.filter((o) => o.fila === 'p1' && o.tipo === 'texto')
    const nombre = deGonzalo.find((o) => o.texto === 'Gonzalo')
    const voluntario = deGonzalo.find((o) => o.texto === 'Abi')
    expect(voluntario).toBeTruthy()
    expect(voluntario.y).toBeGreaterThan(nombre.y)
    expect(voluntario.x).toBe(nombre.x)
  })

  it('un participante sin voluntario centra el nombre y no dibuja segunda linea', () => {
    const plano = enColumnas()
    const deSofi = plano.ordenes.filter((o) => o.fila === 'p2' && o.tipo === 'texto')
    expect(deSofi.filter((o) => o.texto !== 'SO')).toHaveLength(1)
  })

  it('el voluntario nuevo se anuncia en el texto', () => {
    const plano = enColumnas()
    const t = plano.ordenes.filter((o) => o.fila === 'p4' && o.tipo === 'texto').map((o) => o.texto)
    expect(t.join(' ')).toContain('nuevo')
  })

  it('nada se sale del lienzo ni invade el margen', () => {
    const plano = enColumnas()
    expect(plano.bordeDerecho).toBeLessThanOrEqual(ANCHO - 56)
    expect(plano.desborde).toBe(false)
    plano.ordenes.forEach((o) => {
      expect((o.x ?? 0) + (o.ancho ?? 0)).toBeLessThanOrEqual(ANCHO)
    })
  })

  it('sigue informando la relacion de aspecto y el recorte', () => {
    const plano = enColumnas()
    expect(plano.relacion).toBeCloseTo(plano.alto / plano.ancho, 5)
    expect(plano.recorteProbable).toBe(plano.relacion > 2.5)
  })

  it('sin el formato declarado sigue saliendo apilado, como antes', () => {
    const sinFormato = maquetar(LISTA, ROSTER, opciones)
    const circulos = sinFormato.ordenes.filter((o) => o.tipo === 'circulo')
    expect(circulos.find((o) => o.fila === 'p1').y).not.toBe(circulos.find((o) => o.fila === 'p2').y)
  })
})

describe('formato de grilla', () => {
  const enGrilla = (base = LISTA) => maquetar(
    { ...base, opcionesImagen: { ...base.opcionesImagen, formato: 'grilla' } },
    ROSTER, opciones,
  )

  it('dibuja la foto como rectangulo redondeado, no como circulo', () => {
    const plano = enGrilla()
    expect(plano.ordenes.filter((o) => o.tipo === 'circulo')).toHaveLength(0)
    const marco = plano.ordenes.find((o) => o.tipo === 'rect' && o.fila === 'p1')
    expect(marco.radio).toBe(GRILLA.radioFoto)
    expect(marco.alto).toBeGreaterThan(marco.ancho)
  })

  it('la foto es mas de tres veces mas ancha que en el formato apilado', () => {
    const grande = enGrilla().ordenes.find((o) => o.tipo === 'rect' && o.fila === 'p1').ancho
    const chica = maquetar(LISTA, ROSTER, opciones).ordenes.find((o) => o.tipo === 'circulo').radio * 2
    expect(grande / chica).toBeGreaterThan(3)
  })

  it('pone hasta cinco por fila, todos a la misma altura', () => {
    const plano = enGrilla()
    const marcos = ['p1', 'p2', 'p3'].map((id) =>
      plano.ordenes.find((o) => o.tipo === 'rect' && o.fila === id))
    expect(marcos[0].y).toBe(marcos[1].y)
    expect(marcos[0].y).toBe(marcos[2].y)
    expect(marcos[1].x).toBeGreaterThan(marcos[0].x)
    expect(marcos[2].x).toBeGreaterThan(marcos[1].x)
  })

  it('la imagen de la foto tambien lleva el radio, para recortarse redondeada', () => {
    const foto = enGrilla().ordenes.find((o) => o.tipo === 'imagen' && o.clave === 'p3.jpg')
    expect(foto.radio).toBe(GRILLA.radioFoto)
    expect(foto.circular).toBeUndefined()
  })

  it('el nombre va debajo de la foto y centrado', () => {
    const plano = enGrilla()
    const marco = plano.ordenes.find((o) => o.tipo === 'rect' && o.fila === 'p1')
    const nombre = plano.ordenes.find((o) => o.fila === 'p1' && o.texto === 'Gonzalo')
    expect(nombre.y).toBeGreaterThan(marco.y + marco.alto)
    expect(nombre.alineacion).toBe('center')
    expect(Math.round(nombre.x)).toBe(Math.round(marco.x + marco.ancho / 2))
  })

  it('parte en dos renglones el nombre que no entra en la celda', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes[0].nombre = 'Francisco Planells'
    const plano = maquetar(
      { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'grilla' } },
      roster, opciones,
    )
    const textos = plano.ordenes.filter((o) => o.fila === 'p1' && o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('Francisco')
    expect(textos).toContain('Planells')
    expect(textos).not.toContain('Francisco Planells')
  })

  it('todas las celdas del grupo miden lo mismo aunque un nombre ocupe dos renglones', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes[0].nombre = 'Francisco Planells'
    const plano = maquetar(
      { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'grilla' } },
      roster, opciones,
    )
    const marcos = ['p1', 'p2', 'p3'].map((id) =>
      plano.ordenes.find((o) => o.tipo === 'rect' && o.fila === id))
    expect(marcos[0].y).toBe(marcos[1].y)
    expect(marcos[1].y).toBe(marcos[2].y)
  })

  it('nada se sale del lienzo ni invade el margen', () => {
    const plano = enGrilla()
    expect(plano.desborde).toBe(false)
    plano.ordenes.forEach((o) => {
      expect((o.x ?? 0) + (o.ancho ?? 0)).toBeLessThanOrEqual(ANCHO)
      expect(o.x ?? 0).toBeGreaterThanOrEqual(0)
    })
  })

  it('un formato desconocido cae en el apilado, no rompe', () => {
    const raro = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'inventado' } }
    const plano = maquetar(raro, ROSTER, opciones)
    expect(plano.ordenes.filter((o) => o.tipo === 'circulo').length).toBeGreaterThan(0)
  })
})
