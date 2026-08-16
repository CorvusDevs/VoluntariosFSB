import { describe, it, expect } from 'vitest'
import { maquetar, agruparPorVoluntario } from '../../js/imagen/maquetar.js'
import { FORMATO_POR_DEFECTO } from '../../js/modelo/lista.js'
import {
  ANCHO, COLORES, COLUMNAS, GRILLA, RETRATOS, ESQUINAS, esSuperpuesto, medidas, anchoDeCeldaGrilla,
  TAMANOS_VOLUNTARIO, ASOMOS_VOLUNTARIO, medidasRetratos, anchoDeCeldaRetratos,
} from '../../js/imagen/tema.js'
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
    const plano = maquetar(LISTA, ROSTER, opciones)
    const t = textos(plano)
    expect(t).toContain('Fútbol sin Barreras')
    expect(plano.ordenes).toContainEqual(expect.objectContaining({ tipo: 'imagen', clave: 'icono-pelota' }))
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
    const plano = maquetar(LISTA, ROSTER, opciones)
    const t = textos(plano)
    expect(t).toContain('Gonzalo')
    expect(t).toContain('Abi')
    expect(plano.ordenes).toContainEqual(expect.objectContaining({ tipo: 'imagen', clave: 'icono-voluntario', fila: 'p1' }))
  })

  it('mantiene centrado el nombre del voluntario aunque tenga icono', () => {
    const listaGrilla = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'grilla' } }
    const plano = maquetar(listaGrilla, ROSTER, opciones)
    const voluntario = plano.ordenes.find((o) => o.tipo === 'texto' && o.fila === 'p1' && o.texto === 'Abi')
    const icono = plano.ordenes.find((o) => o.tipo === 'imagen' && o.fila === 'p1' && o.clave === 'icono-voluntario')
    const base = medidas(false)
    expect(voluntario.alineacion).toBe('center')
    expect(voluntario.x).toBe(base.margen + anchoDeCeldaGrilla(base.margen) / 2)
    expect(icono.x + icono.ancho).toBeLessThan(voluntario.x)
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
    const fotos = planoComp.ordenes.filter((o) => o.tipo === 'imagen' && /\.jpg$/.test(o.clave))
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

  it('el voluntario va debajo del nombre, con silbato a la izquierda', () => {
    const plano = enColumnas()
    const deGonzalo = plano.ordenes.filter((o) => o.fila === 'p1' && o.tipo === 'texto')
    const nombre = deGonzalo.find((o) => o.texto === 'Gonzalo')
    const voluntario = deGonzalo.find((o) => o.texto === 'Abi')
    const iconoVoluntario = plano.ordenes.find((o) => o.fila === 'p1' && o.tipo === 'imagen' && o.clave === 'icono-voluntario')
    expect(voluntario).toBeTruthy()
    expect(voluntario.y).toBeGreaterThan(nombre.y)
    expect(iconoVoluntario).toBeTruthy()
    expect(iconoVoluntario.x).toBeLessThan(voluntario.x)
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

  it('una lista sin formato declarado sale en el formato por defecto', () => {
    const sinFormato = structuredClone(LISTA)
    delete sinFormato.opcionesImagen.formato
    const plano = maquetar(sinFormato, ROSTER, opciones)
    const enGrilla = maquetar(
      { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: FORMATO_POR_DEFECTO } },
      ROSTER, opciones,
    )
    expect(plano.alto).toBe(enGrilla.alto)
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

  it('un formato desconocido cae en el por defecto, no rompe', () => {
    const raro = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'inventado' } }
    const bueno = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: FORMATO_POR_DEFECTO } }
    expect(maquetar(raro, ROSTER, opciones).alto).toBe(maquetar(bueno, ROSTER, opciones).alto)
  })
})

describe('aire entre el rotulo del grupo y las fotos', () => {
  // Se reporto que en la grilla las fotos tocaban el titulo. Pasaba solo ahi,
  // porque la foto arranca justo arriba de la celda, mientras que los otros dos
  // formatos heredaban unos 10 px de tener el contenido centrado.
  const arribaDe = (plano, id) => {
    const marco = plano.ordenes.find((o) => o.fila === id && (o.tipo === 'rect' || o.tipo === 'circulo'))
    return marco.tipo === 'circulo' ? marco.y - marco.radio : marco.y
  }
  const finDelTitulo = (plano) => {
    const titulo = plano.ordenes.find((o) => o.tipo === 'rect' && o.radio === 16 && o.ancho > 900)
    return titulo.y + titulo.alto
  }

  ;['filas', 'columnas', 'grilla'].forEach((formato) => {
    it(`el formato ${formato} deja aire bajo el rotulo`, () => {
      const plano = maquetar(
        { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato } },
        ROSTER, opciones,
      )
      expect(arribaDe(plano, 'p1') - finDelTitulo(plano)).toBeGreaterThanOrEqual(16)
    })
  })
})

describe('el voluntario va pegado al nombre', () => {
  it('queda a la misma distancia tenga el nombre uno o dos renglones', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes[0].nombre = 'Francisco Planells'   // dos renglones
    roster.participantes[2].nombre = 'Ana'                  // uno
    const lista = structuredClone(LISTA)
    lista.grupos[0].filas = [
      { participantes: ['p1'], voluntarios: ['v1'] },
      { participantes: ['p3'], voluntarios: ['v2'] },
    ]
    const plano = maquetar(
      { ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'grilla' } },
      roster, opciones,
    )
    const distancia = (id, nombreVoluntario) => {
      const textos = plano.ordenes.filter((o) => o.fila === id && o.tipo === 'texto')
      const voluntario = textos.find((o) => o.texto === nombreVoluntario)
      const ultimoNombre = textos.filter((o) => o.color === COLORES.texto).at(-1)
      return voluntario.y - ultimoNombre.y
    }
    expect(distancia('p1', 'Abi')).toBe(distancia('p3', 'Cris'))
  })
})

describe('la grilla se ensancha en vez de estirarse hacia abajo', () => {
  const conParticipantes = (porGrupo) => {
    const participantes = []
    const filas = [[], []]
    for (let i = 0; i < porGrupo; i += 1) {
      ;[1, 2].forEach((grupo) => {
        const id = `g${grupo}n${i}`
        participantes.push({ id, nombre: 'Santiago', grupo, foto: null, activo: true, notas: '' })
        filas[grupo - 1].push({ participantes: [id], voluntarios: [] })
      })
    }
    const roster = { version: 1, participantes, voluntarios: ROSTER.voluntarios }
    const lista = {
      ...LISTA,
      grupos: LISTA.grupos.map((g, i) => ({ ...g, filas: filas[i], apoyo: [] })),
      opcionesImagen: { ...LISTA.opcionesImagen, formato: 'grilla' },
    }
    return maquetar(lista, roster, opciones)
  }

  it('con pocos participantes mantiene el ancho de siempre', () => {
    expect(conParticipantes(9).ancho).toBeLessThanOrEqual(ANCHO)
  })

  it('con mas participantes la imagen se hace mas ancha', () => {
    expect(conParticipantes(13).ancho).toBeGreaterThan(conParticipantes(9).ancho)
  })

  it('la foto no se achica al ensancharse: lo que crece es la planilla', () => {
    const foto = (p) => p.ordenes.find((o) => o.tipo === 'rect' && o.radio === GRILLA.radioFoto && o.ancho < 400)
    expect(foto(conParticipantes(20)).ancho).toBe(foto(conParticipantes(9)).ancho)
  })

  it('la altura deja de crecer porque se agregan columnas, no filas', () => {
    expect(conParticipantes(13).alto).toBe(conParticipantes(9).alto)
  })

  it('nunca se recorta, por muchos que sean', () => {
    ;[9, 15, 20].forEach((n) => {
      expect(conParticipantes(n).recorteProbable).toBe(false)
    })
  })

  it('nada se sale del lienzo, que ahora es mas ancho', () => {
    const plano = conParticipantes(15)
    plano.ordenes.forEach((o) => {
      expect((o.x ?? 0) + (o.ancho ?? 0)).toBeLessThanOrEqual(plano.ancho)
    })
    expect(plano.desborde).toBe(false)
  })

  it('las bandas cubren el ancho nuevo de punta a punta', () => {
    const plano = conParticipantes(15)
    const banda = plano.ordenes.find((o) => o.tipo === 'rect' && o.y === 0)
    expect(banda.ancho).toBe(plano.ancho)
  })

  it('los otros dos formatos conservan el ancho fijo', () => {
    ;['filas', 'columnas'].forEach((formato) => {
      const plano = maquetar(
        { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato } },
        ROSTER, opciones,
      )
      expect(plano.ancho).toBe(ANCHO)
    })
  })
})

describe('un voluntario que acompaña a varios', () => {
  const conCompartido = () => {
    const lista = structuredClone(LISTA)
    lista.opcionesImagen.formato = 'grilla'
    lista.grupos[0].filas = [
      { participantes: ['p1'], voluntarios: ['v1'] },
      { participantes: ['p2'], voluntarios: ['v2'] },
      { participantes: ['p3'], voluntarios: ['v1'] },
    ]
    return maquetar(lista, ROSTER, opciones)
  }

  it('agrupa las filas del mismo voluntario sin perder a las demas', () => {
    const filas = [
      { participantes: ['a'], voluntarios: ['v1'] },
      { participantes: ['b'], voluntarios: [] },
      { participantes: ['c'], voluntarios: ['v1'] },
      { participantes: ['d'], voluntarios: ['v2'] },
    ]
    const orden = agruparPorVoluntario(filas).map((f) => f.participantes[0])
    expect(orden.indexOf('c') - orden.indexOf('a')).toBe(1)
    expect(orden).toHaveLength(4)
    expect(orden).toContain('b')
    expect(orden).toContain('d')
  })

  it('los pone contiguos en la planilla', () => {
    const marcos = conCompartido().ordenes
      .filter((o) => o.tipo === 'rect' && o.radio === GRILLA.radioFoto && o.ancho < 400)
      .map((o) => o.fila)
    expect(marcos.indexOf('p3') - marcos.indexOf('p1')).toBe(1)
  })

  it('escribe el nombre del voluntario una sola vez, no debajo de cada uno', () => {
    const nombres = conCompartido().ordenes
      .filter((o) => o.tipo === 'texto' && o.color === COLORES.magentaTexto)
      .map((o) => o.texto)
    expect(nombres.filter((n) => n === 'Abi')).toHaveLength(1)
  })

  it('dibuja la llave: dos ganchos y la linea partida al medio', () => {
    const trazos = conCompartido().ordenes.filter((o) => o.tipo === 'linea' && o.grosor === GRILLA.grosorLlave)
    expect(trazos).toHaveLength(4)
    const verticales = trazos.filter((l) => l.x1 === l.x2)
    const horizontales = trazos.filter((l) => l.y1 === l.y2)
    expect(verticales).toHaveLength(2)
    expect(horizontales).toHaveLength(2)
    // Los ganchos suben desde la linea hacia las celdas
    verticales.forEach((l) => expect(l.y1).toBeLessThan(l.y2))
  })

  it('los ganchos caen en el centro de las dos celdas que abarca', () => {
    const plano = conCompartido()
    const centro = (id) => {
      const marco = plano.ordenes.find((o) => o.fila === id && o.tipo === 'rect' && o.ancho < 400)
      return marco.x + marco.ancho / 2
    }
    const verticales = plano.ordenes
      .filter((o) => o.tipo === 'linea' && o.grosor === GRILLA.grosorLlave && o.x1 === o.x2)
      .map((l) => l.x1).sort((a, b) => a - b)
    expect(verticales).toEqual([centro('p1'), centro('p3')].sort((a, b) => a - b))
  })

  it('el nombre queda en el hueco que deja la linea', () => {
    const plano = conCompartido()
    const horizontales = plano.ordenes
      .filter((o) => o.tipo === 'linea' && o.grosor === GRILLA.grosorLlave && o.y1 === o.y2)
      .sort((a, b) => a.x1 - b.x1)
    const nombre = plano.ordenes.find((o) => o.texto === 'Abi')
    expect(nombre.x).toBeGreaterThan(horizontales[0].x2)
    expect(nombre.x).toBeLessThan(horizontales[1].x1)
    expect(nombre.y).toBe(horizontales[0].y1)
  })

  it('un voluntario de un solo participante no lleva llave', () => {
    const plano = maquetar(
      { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'grilla' } },
      ROSTER, opciones,
    )
    expect(plano.ordenes.filter((o) => o.tipo === 'linea' && o.grosor === GRILLA.grosorLlave)).toHaveLength(0)
  })

  it('la llave no salta de renglon: se corta en el borde de la fila', () => {
    const lista = structuredClone(LISTA)
    lista.opcionesImagen.formato = 'grilla'
    // Seis con el mismo voluntario, y solo cinco entran por fila
    const roster = structuredClone(ROSTER)
    const ids = []
    for (let i = 0; i < 6; i += 1) {
      const id = `x${i}`
      ids.push(id)
      roster.participantes.push({ id, nombre: 'Ana', grupo: 1, foto: null, activo: true, notas: '' })
    }
    lista.grupos[0].filas = ids.map((id) => ({ participantes: [id], voluntarios: ['v1'] }))
    const plano = maquetar(lista, roster, opciones)
    const verticales = plano.ordenes.filter(
      (o) => o.tipo === 'linea' && o.grosor === GRILLA.grosorLlave && o.x1 === o.x2,
    )
    // Dos llaves: una para los cinco de la primera fila, otra no, porque el sexto
    // queda solo en la segunda. Nunca una sola llave cruzando el salto de renglon.
    const alturas = new Set(verticales.map((l) => l.y1))
    expect(alturas.size).toBeGreaterThanOrEqual(1)
    verticales.forEach((l) => expect(l.x1).toBeLessThanOrEqual(plano.ancho))
  })
})

// El formato "retratos" es una opcion mas: no reemplaza a ninguno de los tres
// que ya existian, y solo se dibuja cuando se lo elige.
describe('formato retratos', () => {
  const enRetratos = (extra = {}) => ({
    ...LISTA,
    opcionesImagen: { ...LISTA.opcionesImagen, fotos: true, formato: 'retratos', ...extra },
  })
  const celdasDe = (plano) => plano.ordenes.filter(
    (o) => o.tipo === 'rect' && o.radio === RETRATOS.radioFoto && o.alto > 200)

  it('no cambia nada en los otros tres formatos', () => {
    const antes = maquetar({ ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'grilla' } }, ROSTER, opciones)
    const despues = maquetar({ ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, formato: 'grilla' } }, ROSTER, opciones)
    expect(despues.alto).toBe(antes.alto)
    expect(despues.ordenes.length).toBe(antes.ordenes.length)
  })

  it('da a la celda toda la altura, sin texto por debajo de la foto', () => {
    const plano = maquetar(enRetratos(), ROSTER, opciones)
    const celda = celdasDe(plano)[0]
    const ancho = anchoDeCeldaRetratos(56)
    expect(celda.ancho).toBe(ancho)
    expect(celda.alto).toBe(Math.round(ancho * RETRATOS.proporcionCelda))
  })

  it('escribe el nombre del participante en blanco, adentro de la franja', () => {
    const plano = maquetar(enRetratos(), ROSTER, opciones)
    const celda = celdasDe(plano)[0]
    const nombre = plano.ordenes.find(
      (o) => o.tipo === 'texto' && o.color === COLORES.blanco && o.y > celda.y + celda.alto * 0.7)
    expect(nombre).toBeDefined()
    // Adentro de la celda, no debajo.
    expect(nombre.y).toBeLessThan(celda.y + celda.alto)
  })

  it('pone la franja con el color del grupo, distinto en cada cancha', () => {
    const plano = maquetar(enRetratos(), ROSTER, opciones)
    const franjas = plano.ordenes.filter(
      (o) => o.tipo === 'rect' && [COLORES.turquesaTexto, COLORES.magentaTexto].includes(o.color))
    expect(franjas.some((f) => f.color === COLORES.turquesaTexto)).toBe(true)
    expect(franjas.some((f) => f.color === COLORES.magentaTexto)).toBe(true)
  })

  it('mueve los medallones a la esquina elegida', () => {
    const ancho = anchoDeCeldaRetratos(56)
    const lado = Math.round(ancho * RETRATOS.factorMedallon)
    const marcos = (esquina) => {
      const plano = maquetar(enRetratos({ esquinaVoluntario: esquina }), ROSTER, opciones)
      return plano.ordenes.filter((o) => o.tipo === 'rect' && o.color === COLORES.blanco && o.ancho === lado)
    }
    const derecha = marcos('arriba-derecha')
    const izquierda = marcos('arriba-izquierda')
    expect(derecha.length).toBeGreaterThan(0)
    expect(izquierda.length).toBe(derecha.length)
    expect(izquierda[0].x).toBeLessThan(derecha[0].x)
    const abajo = marcos('abajo-derecha')
    expect(abajo[0].y).toBeGreaterThan(derecha[0].y)
  })

  it('corre el nombre al lado libre cuando el medallon va abajo', () => {
    const nombreX = (esquina) => {
      const plano = maquetar(enRetratos({ esquinaVoluntario: esquina }), ROSTER, opciones)
      const celda = celdasDe(plano)[0]
      return plano.ordenes.find(
        (o) => o.tipo === 'texto' && o.color === COLORES.blanco && o.y > celda.y + celda.alto * 0.7).x
    }
    // Con el medallon arriba el nombre va centrado; abajo a la derecha se corre
    // a la izquierda, y abajo a la izquierda se corre a la derecha.
    const centrado = nombreX('arriba-derecha')
    expect(nombreX('abajo-derecha')).toBeLessThan(centrado)
    expect(nombreX('abajo-izquierda')).toBeGreaterThan(centrado)
  })

  it('usa la misma proporcion que la foto de la grilla, para no recortar de mas', () => {
    // Las fotos se guardan cuadradas. Una celda mas alta obliga al recorte que
    // cubre a comerse los costados de la cara, que es lo que se veia estirado.
    expect(RETRATOS.proporcionCelda).toBe(GRILLA.proporcionFoto)
    const ancho = anchoDeCeldaRetratos(56)
    const alto = Math.round(ancho * RETRATOS.proporcionCelda)
    const escala = Math.max(ancho / 400, alto / 400)
    expect(Math.round(ancho / escala)).toBe(300)
  })

  it('redondea las esquinas de abajo de la franja, como la foto', () => {
    // Dibujada como rectangulo recto, la franja le cuadraba las dos esquinas
    // inferiores a todas las celdas, y solo las de arriba quedaban redondeadas.
    const plano = maquetar(enRetratos(), ROSTER, opciones)
    const franjas = plano.ordenes.filter(
      (o) => o.tipo === 'rect' && [COLORES.turquesaTexto, COLORES.magentaTexto].includes(o.color))
    expect(franjas.length).toBeGreaterThan(0)
    franjas.forEach((f) => {
      expect(Array.isArray(f.radio), 'la franja se dibuja sin redondear').toBe(true)
      const [arribaIzq, arribaDer, abajoDer, abajoIzq] = f.radio
      expect(arribaIzq).toBe(0)
      expect(arribaDer).toBe(0)
      expect(abajoDer).toBeGreaterThan(0)
      expect(abajoIzq).toBe(abajoDer)
    })
  })

  it('le deja al voluntario mas foto que marco', () => {
    // El marco blanco llego a comerse el 21% del medallon y la cara quedaba con
    // el 55%. Solo tiene que despegarlo de la foto de abajo, nada mas.
    const ancho = anchoDeCeldaRetratos(56)
    const w = Math.round(ancho * RETRATOS.factorMedallon)
    const h = Math.round(w * RETRATOS.proporcionMedallon)
    const borde = Math.max(2, Math.round(w * RETRATOS.bordeMedallon))
    const interior = (w - borde * 2) * (h - borde * 2)
    expect((w * h - interior) / (w * h)).toBeLessThan(0.15)
  })

  it('los medallones apoyados nunca se salen de su celda', () => {
    const ancho = anchoDeCeldaRetratos(56)
    const alto = Math.round(ancho * RETRATOS.proporcionCelda)
    const lado = Math.round(ancho * RETRATOS.factorMedallon)
    const altoMed = Math.round(lado * RETRATOS.proporcionMedallon)
    ESQUINAS.filter((e) => !esSuperpuesto(e)).forEach((esquina) => {
      const plano = maquetar(enRetratos({ esquinaVoluntario: esquina }), ROSTER, opciones)
      const celdas = celdasDe(plano)
      const marcos = plano.ordenes.filter(
        (o) => o.tipo === 'rect' && o.color === COLORES.blanco && o.ancho === lado)
      expect(marcos.length, esquina).toBeGreaterThan(0)
      marcos.forEach((marco) => {
        const celda = celdas.find((c) => marco.x >= c.x - 1 && marco.x + lado <= c.x + c.ancho + 1
          && marco.y >= c.y - 1 && marco.y + altoMed <= c.y + c.alto + 1)
        expect(celda, `${esquina}: el medallon en (${marco.x}, ${marco.y}) se sale de toda celda`).toBeDefined()
      })
    })
  })

  it('el medallon nunca queda vacio: iniciales debajo, foto encima', () => {
    // Antes eran excluyentes. Si la foto no llegaba a dibujarse, el medallon
    // quedaba en blanco y no decia de quien era. Con las iniciales debajo, lo
    // peor que puede pasar es que se vean las iniciales.
    const plano = maquetar(enRetratos(), ROSTER, opciones)
    const conFoto = ROSTER.voluntarios.find((v) => v.foto)
    if (!conFoto) return
    const suyas = plano.ordenes.filter((o) => o.clave === conFoto.foto)
    expect(suyas.length).toBeGreaterThan(0)
    const laFoto = suyas[0]
    const iniciales = plano.ordenes.filter(
      (o) => o.tipo === 'texto' && o.color === COLORES.violeta && Math.abs(o.x - (laFoto.x + laFoto.ancho / 2)) < 2)
    expect(iniciales.length).toBeGreaterThan(0)
    // Y las iniciales van ANTES que la foto, o taparian la cara.
    expect(plano.ordenes.indexOf(iniciales[0])).toBeLessThan(plano.ordenes.indexOf(laFoto))
  })

  it('abrevia el apellido en la franja, para dejarle lugar al voluntario', () => {
    const conApellido = {
      ...ROSTER,
      participantes: ROSTER.participantes.map((p, i) => (i === 0 ? { ...p, nombre: 'Maria Perez' } : p)),
    }
    const plano = maquetar(enRetratos(), conApellido, opciones)
    const textos = plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('Maria P.')
    expect(textos).not.toContain('Maria Perez')
  })

  it('dos apellidos con la misma inicial no quedan iguales en la planilla', () => {
    const dosFrancisco = {
      ...ROSTER,
      participantes: ROSTER.participantes.map((p, i) => {
        if (i === 0) return { ...p, nombre: 'Francisco Planells' }
        if (i === 1) return { ...p, nombre: 'Francisco Perez', grupo: p.grupo }
        return p
      }),
    }
    const plano = maquetar(enRetratos(), dosFrancisco, opciones)
    const textos = plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('Francisco Pl.')
    expect(textos).toContain('Francisco Pe.')
    expect(textos.filter((s) => s === 'Francisco P.')).toHaveLength(0)
  })

  it('no corre el nombre del chico que no tiene voluntario', () => {
    // El hueco del medallon se reservaba siempre, asi que los chicos sin
    // acompañante quedaban con el nombre corrido contra el borde sin motivo.
    const plano = maquetar(enRetratos(), ROSTER, opciones)
    const celdas = celdasDe(plano)
    const conVoluntario = new Set(
      LISTA.grupos.flatMap((g) => g.filas.filter((f) => f.voluntarios.length > 0)
        .map((f) => f.participantes[0])))
    celdas.forEach((celda) => {
      const nombre = plano.ordenes.find(
        (o) => o.tipo === 'texto' && o.color === COLORES.blanco
          && o.fila === celda.fila && o.y > celda.y + celda.alto * 0.7)
      if (!nombre) return
      const centrado = Math.abs(nombre.x - (celda.x + celda.ancho / 2)) < 1
      expect(centrado, `${celda.fila}: corrido sin voluntario`).toBe(!conVoluntario.has(celda.fila))
    })
  })

  it('el superpuesto sale del marco por arriba y por el costado, a proposito', () => {
    const medidas = medidasRetratos({ margen: 56, esquina: 'superpuesto-derecha' })
    const plano = maquetar(enRetratos({ esquinaVoluntario: 'superpuesto-derecha' }), ROSTER, opciones)
    const celdas = celdasDe(plano)
    const marcos = plano.ordenes.filter(
      (o) => o.tipo === 'rect' && o.color === COLORES.blanco && o.ancho === medidas.anchoMed)
    expect(marcos.length).toBeGreaterThan(0)
    const celda = celdas[0]
    const marco = marcos[0]
    expect(marco.y).toBeLessThan(celda.y)
    expect(marco.x + medidas.anchoMed).toBeGreaterThan(celda.x + celda.ancho)
  })

  it('dos medallones superpuestos nunca se pisan entre columnas', () => {
    // La separacion entre columnas crece lo necesario. Sin eso, el medallon que
    // asoma se metia adentro de la foto del chico de al lado.
    Object.keys(TAMANOS_VOLUNTARIO).forEach((tamano) => {
      const medidas = medidasRetratos({ margen: 56, esquina: 'superpuesto-derecha', tamano })
      const plano = maquetar(
        enRetratos({ esquinaVoluntario: 'superpuesto-derecha', tamanoVoluntario: tamano }), ROSTER, opciones)
      const marcos = plano.ordenes
        .filter((o) => o.tipo === 'rect' && o.color === COLORES.blanco && o.ancho === medidas.anchoMed)
        .sort((a, b) => a.y - b.y || a.x - b.x)
      for (let i = 1; i < marcos.length; i += 1) {
        if (marcos[i].y !== marcos[i - 1].y) continue
        expect(marcos[i].x, `${tamano}: se pisan`).toBeGreaterThanOrEqual(marcos[i - 1].x + medidas.anchoMed)
      }
    })
  })

  it('deja el mismo aire entre renglones que el que deja el titulo arriba', () => {
    // Con 12 px entre renglones y 20 bajo el titulo, los renglones quedaban
    // pegados entre si y despegados del titulo: se leia como una desalineacion.
    // Hacen falta dos renglones DENTRO de un grupo: con uno por grupo se estaria
    // midiendo la separacion entre grupos, que es otra cosa.
    const roster = {
      ...ROSTER,
      participantes: Array.from({ length: 8 }, (_, n) => ({
        id: `q${n}`, nombre: `Chico ${n}`, grupo: 1, activo: true, foto: null,
      })),
    }
    const lista = {
      ...enRetratos(),
      grupos: [{
        numero: 1, titulo: 'Grupo 1', subtitulo: '', cancha: '', apoyo: [],
        filas: roster.participantes.map((p) => ({ participantes: [p.id], voluntarios: [] })),
      }],
    }
    const plano = maquetar(lista, roster, opciones)
    const medidas = medidasRetratos({ margen: 56 })
    const titulo = plano.ordenes.find(
      (o) => o.tipo === 'rect' && o.radio === 16 && o.ancho > medidas.celda * 3)
    const filas = [...new Set(plano.ordenes
      .filter((o) => o.tipo === 'rect' && o.ancho === medidas.celda && o.alto === medidas.alto)
      .map((o) => o.y))].sort((a, b) => a - b)
    expect(filas.length).toBe(2)
    const bajoElTitulo = filas[0] - (titulo.y + titulo.alto)
    const entreRenglones = filas[1] - (filas[0] + medidas.alto)
    expect(entreRenglones).toBe(bajoElTitulo)
  })

  it('no deja el aire de renglon colgando al pie del grupo', () => {
    // Ese aire se sumaba tambien despues del ultimo renglon, encima de la
    // separacion entre grupos y del margen del titulo siguiente: 92 px al pie
    // contra 20 entre renglones, que se veia como un hueco muerto.
    const medidas = medidasRetratos({ margen: 56 })
    const plano = maquetar(enRetratos(), ROSTER, opciones)
    const titulos = plano.ordenes.filter(
      (o) => o.tipo === 'rect' && o.radio === 16 && o.ancho > medidas.celda * 3)
    const filas = [...new Set(plano.ordenes
      .filter((o) => o.tipo === 'rect' && o.ancho === medidas.celda && o.alto === medidas.alto)
      .map((o) => o.y))].sort((a, b) => a - b)
    expect(titulos.length).toBe(2)
    // El grupo 1 del fixture entra en un renglon: entre su unica fila y el
    // titulo del grupo 2 no puede haber mas que la separacion entre grupos.
    const alPie = titulos[1].y - (filas[0] + medidas.alto)
    const entreRenglones = 20
    expect(alPie).toBeLessThan(entreRenglones * 4)
  })

  it('no reserva el sobresalido en los renglones sin acompañante', () => {
    // Reservarlo siempre dejaba 76 px muertos por renglon: en una planilla de 18
    // chicos con un solo acompañante eran 304 px, el 16% del alto de la imagen.
    const sinNadie = {
      ...enRetratos({ esquinaVoluntario: 'superpuesto-abajo-derecha' }),
      grupos: LISTA.grupos.map((g) => ({ ...g, filas: g.filas.map((f) => ({ ...f, voluntarios: [] })) })),
    }
    const conUno = {
      ...sinNadie,
      grupos: sinNadie.grupos.map((g, i) => (i === 0
        ? { ...g, filas: g.filas.map((f, j) => (j === 0 ? { ...f, voluntarios: ['v1'] } : f)) }
        : g)),
    }
    const alto = (l) => maquetar(l, ROSTER, opciones).alto
    expect(alto(sinNadie)).toBeLessThan(alto(conUno))
    // Y la diferencia es exactamente el sobresalido de un renglon.
    const medidas = medidasRetratos({ margen: 56, esquina: 'superpuesto-abajo-derecha' })
    expect(alto(conUno) - alto(sinNadie)).toBe(medidas.asoma)
  })

  it('la imagen se ensancha con el medallon superpuesto, para hacerle lugar', () => {
    const angosta = maquetar(enRetratos(), ROSTER, opciones)
    const ancha = maquetar(enRetratos({ esquinaVoluntario: 'superpuesto-derecha' }), ROSTER, opciones)
    expect(ancha.ancho).toBeGreaterThan(angosta.ancho)
    // Y crece de alto, porque cada fila le deja lugar arriba al medallon.
    expect(ancha.alto).toBeGreaterThan(angosta.alto)
  })

  it('los tres tamaños se distinguen y el mas grande manda', () => {
    const areas = Object.keys(TAMANOS_VOLUNTARIO).map((tamano) =>
      medidasRetratos({ margen: 56, esquina: 'superpuesto-derecha', tamano }).anchoMed)
    expect(new Set(areas).size).toBe(3)
    expect(areas[0]).toBeLessThan(areas[2])
  })

  it('los tres asomos cambian cuanto crece la fila', () => {
    const altos = Object.keys(ASOMOS_VOLUNTARIO).map((asomo) =>
      maquetar(enRetratos({ esquinaVoluntario: 'superpuesto-derecha', asomoVoluntario: asomo }), ROSTER, opciones).alto)
    expect(new Set(altos).size).toBe(3)
    expect(altos[0]).toBeLessThan(altos[2])
  })

  it('el tamaño y el asomo no tocan nada cuando el medallon va apoyado', () => {
    // Solo aplican al superpuesto: cambiarlos con la esquina de abajo no puede mover
    // ni un pixel, o el selector confundiria en vez de ayudar.
    const base = maquetar(enRetratos(), ROSTER, opciones)
    const otro = maquetar(
      enRetratos({ tamanoVoluntario: 'enorme', asomoVoluntario: 'alto' }), ROSTER, opciones)
    expect(otro.ancho).toBe(base.ancho)
    expect(otro.alto).toBe(base.alto)
  })

  it('ensancha la imagen cuando hay mas participantes, en vez de achicar la cara', () => {
    const muchos = {
      ...enRetratos(),
      grupos: LISTA.grupos.map((g, i) => (i === 0
        ? { ...g, filas: Array.from({ length: 14 }, (_, n) => ({ participantes: [`p${n + 1}`], voluntarios: [] })) }
        : g)),
    }
    const rosterGrande = {
      ...ROSTER,
      participantes: Array.from({ length: 14 }, (_, n) => ({ id: `p${n + 1}`, nombre: `Chico ${n + 1}`, grupo: 1, activo: true })),
    }
    const plano = maquetar(muchos, rosterGrande, opciones)
    expect(plano.ancho).toBeGreaterThan(ANCHO)
    expect(celdasDe(plano)[0].ancho).toBe(anchoDeCeldaRetratos(56))
  })
})


// Retratos con el nombre del voluntario debajo: la celda de Retratos y los
// nombres como en la grilla, para cuando importa leer de corrido quien acompaña.
describe('formato retratos con nombre abajo', () => {
  const conNombre = (extra = {}) => ({
    ...LISTA,
    opcionesImagen: { ...LISTA.opcionesImagen, fotos: true, formato: 'retratos-nombre', ...extra },
  })
  const medidas = () => medidasRetratos({ margen: 56 })
  const celdasDe = (plano) => plano.ordenes.filter(
    (o) => o.tipo === 'rect' && o.radio === RETRATOS.radioFoto && o.alto === medidas().alto)

  it('usa la misma celda que Retratos: foto entera y nombre adentro', () => {
    const plano = maquetar(conNombre(), ROSTER, opciones)
    const celda = celdasDe(plano)[0]
    expect(celda.ancho).toBe(medidas().celda)
    expect(celda.alto).toBe(medidas().alto)
    // El nombre del chico, en blanco, adentro de la celda.
    const nombre = plano.ordenes.find(
      (o) => o.tipo === 'texto' && o.color === COLORES.blanco && o.fila === celda.fila
        && o.y > celda.y + celda.alto * 0.7)
    expect(nombre).toBeDefined()
    expect(nombre.y).toBeLessThan(celda.y + celda.alto)
  })

  it('escribe al voluntario debajo de la celda, no como medallon', () => {
    const plano = maquetar(conNombre(), ROSTER, opciones)
    const celda = celdasDe(plano)[0]
    // Ningun marco blanco de medallon.
    const marcos = plano.ordenes.filter((o) => o.tipo === 'rect' && o.color === COLORES.blanco)
    expect(marcos).toHaveLength(0)
    // Y el nombre del voluntario, en magenta, por debajo de la foto.
    const nombreVol = plano.ordenes.find(
      (o) => o.tipo === 'texto' && o.color === COLORES.magentaTexto && o.y > celda.y + celda.alto)
    expect(nombreVol).toBeDefined()
  })

  it('la esquina, el tamaño y el sobresalido no lo tocan: no tiene medallon', () => {
    const base = maquetar(conNombre(), ROSTER, opciones)
    const otro = maquetar(conNombre({
      esquinaVoluntario: 'superpuesto-abajo-derecha',
      tamanoVoluntario: 'enorme',
      asomoVoluntario: 'alto',
    }), ROSTER, opciones)
    expect(otro.ancho).toBe(base.ancho)
    expect(otro.alto).toBe(base.alto)
  })

  it('no deja el aire del texto en los renglones sin acompañante', () => {
    const sinNadie = {
      ...conNombre(),
      grupos: LISTA.grupos.map((g) => ({ ...g, filas: g.filas.map((f) => ({ ...f, voluntarios: [] })) })),
    }
    expect(maquetar(sinNadie, ROSTER, opciones).alto)
      .toBeLessThan(maquetar(conNombre(), ROSTER, opciones).alto)
  })

  it('los dos formatos comparten el dibujo de la celda, no una copia', () => {
    // Si se separaran, un arreglo en uno dejaria al otro atras. La celda tiene
    // que salir identica en los dos, sin contar lo del voluntario.
    const deRetratos = maquetar({
      ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, fotos: true, formato: 'retratos' },
    }, ROSTER, opciones)
    const conNombreAbajo = maquetar(conNombre(), ROSTER, opciones)
    const primeraCelda = (plano) => plano.ordenes.filter(
      (o) => o.tipo === 'rect' && o.radio === RETRATOS.radioFoto && o.alto === medidas().alto)[0]
    expect(primeraCelda(conNombreAbajo).ancho).toBe(primeraCelda(deRetratos).ancho)
    expect(primeraCelda(conNombreAbajo).alto).toBe(primeraCelda(deRetratos).alto)
  })
})
