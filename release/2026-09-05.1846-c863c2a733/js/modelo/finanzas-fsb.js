const TIPOS_CARGO = new Set(['cargo', 'recargo', 'ajuste_cargo', 'saldo_inicial'])
const TIPOS_CREDITO = new Set(['pago', 'ajuste_credito'])

export function importeCentavosFsb(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.round(valor * 100) : null
  const normalizado = String(valor ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizado)) return null
  const numero = Number(normalizado)
  return Number.isFinite(numero) ? Math.round(numero * 100) : null
}

export function signoMovimientoFsb(tipo) {
  if (TIPOS_CARGO.has(tipo)) return 1
  if (TIPOS_CREDITO.has(tipo)) return -1
  return 0
}

export function dineroFsb(centavos) {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency', currency: 'UYU', maximumFractionDigits: Number(centavos) % 100 ? 2 : 0,
  }).format(Number(centavos || 0) / 100)
}

export function recargoFsb(importeBase, porcentaje = 10) {
  const baseCentavos = importeCentavosFsb(importeBase)
  const tasa = Number(porcentaje)
  if (!baseCentavos || !Number.isFinite(tasa) || tasa <= 0 || tasa > 100) return null
  return Math.round(baseCentavos * tasa / 100)
}

function celdaCsvFsb(valor) {
  const texto = String(valor ?? '').replace(/\r?\n/g, ' ').trim()
  return /[",;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function exportarFinanzasFsb(cuentas = [], periodo = '') {
  const encabezado = ['Cuenta', 'Grupo', 'Condición', 'Estado', 'Concepto', 'Tipo', 'Período', 'Fecha', 'Vencimiento', 'Importe', 'Saldo actual', 'Medio de pago', 'Comprobante', 'Notas']
  const filas = []
  cuentas.forEach((cuenta) => {
    const movimientos = (cuenta.movimientos || []).filter((movimiento) => !movimiento.anulado_en)
      .filter((movimiento) => !periodo || (movimiento.periodo || String(movimiento.fecha || '').slice(0, 7)) === periodo)
    const base = [cuenta.nombre, cuenta.grupo ? `Grupo ${cuenta.grupo}` : 'Sin grupo', cuenta.condicion || '', cuenta.estado_pago || '']
    if (!movimientos.length) filas.push([...base, '', '', periodo, '', '', '', Number(cuenta.saldo_centavos || 0) / 100, '', '', cuenta.observaciones || ''])
    movimientos.forEach((movimiento) => filas.push([
      ...base,
      movimiento.concepto,
      movimiento.tipo,
      movimiento.periodo || '',
      movimiento.fecha || '',
      movimiento.vencimiento || '',
      Number(movimiento.importe_centavos || 0) / 100,
      Number(cuenta.saldo_centavos || 0) / 100,
      movimiento.medio_pago || '',
      movimiento.comprobante || '',
      movimiento.notas || cuenta.observaciones || '',
    ]))
  })
  return `\ufeff${[encabezado, ...filas].map((fila) => fila.map(celdaCsvFsb).join(';')).join('\n')}`
}

export function estadoCompromisoFsb(compromiso, hoy = new Date().toISOString().slice(0, 10)) {
  if (compromiso?.estado === 'cumplido') return 'cumplido'
  if (compromiso?.estado === 'cancelado') return 'cancelado'
  return String(compromiso?.fecha_prevista || '') < hoy ? 'vencido' : 'vigente'
}

export function estadoCuentaMensualFsb(cuenta, periodo) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(periodo || ''))) return { error: 'Elegí un mes válido.' }
  const activos = (cuenta?.movimientos || []).filter((movimiento) => !movimiento.anulado_en)
  const mesDe = (movimiento) => movimiento.periodo || String(movimiento.fecha || '').slice(0, 7)
  const anteriores = activos.filter((movimiento) => mesDe(movimiento) < periodo)
  const delMes = activos.filter((movimiento) => mesDe(movimiento) === periodo)
  const saldoInicial = anteriores.reduce((total, movimiento) => total + Number(movimiento.importe_centavos || 0), 0)
  const cargos = delMes.filter((movimiento) => Number(movimiento.importe_centavos) > 0).reduce((total, movimiento) => total + Number(movimiento.importe_centavos), 0)
  const pagos = delMes.filter((movimiento) => Number(movimiento.importe_centavos) < 0).reduce((total, movimiento) => total + Math.abs(Number(movimiento.importe_centavos)), 0)
  return {
    periodo,
    saldo_inicial_centavos: saldoInicial,
    cargos_centavos: cargos,
    pagos_centavos: pagos,
    saldo_final_centavos: saldoInicial + cargos - pagos,
    movimientos: delMes.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
  }
}

export function cierreMensualFsb(cuentas = [], periodo) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(periodo || ''))) return { error: 'Elegí un mes válido.' }
  const esDelPeriodo = (movimiento, usarFecha = false) => {
    const mes = usarFecha ? String(movimiento.fecha || '').slice(0, 7) : (movimiento.periodo || String(movimiento.fecha || '').slice(0, 7))
    return mes === periodo
  }
  const cuentasCalculadas = cuentas.map((cuenta) => {
    const movimientos = (cuenta.movimientos || []).filter((movimiento) => !movimiento.anulado_en)
    const cargos = movimientos.filter((movimiento) => Number(movimiento.importe_centavos) > 0 && esDelPeriodo(movimiento))
    const pagos = movimientos.filter((movimiento) => Number(movimiento.importe_centavos) < 0 && esDelPeriodo(movimiento, true))
    const saldoAnterior = movimientos.filter((movimiento) => {
      const mes = Number(movimiento.importe_centavos) < 0
        ? String(movimiento.fecha || '').slice(0, 7)
        : (movimiento.periodo || String(movimiento.fecha || '').slice(0, 7))
      return mes < periodo
    }).reduce((total, movimiento) => total + Number(movimiento.importe_centavos || 0), 0)
    const cargosCentavos = cargos.reduce((total, movimiento) => total + Number(movimiento.importe_centavos || 0), 0)
    const pagosCentavos = pagos.reduce((total, movimiento) => total + Math.abs(Number(movimiento.importe_centavos || 0)), 0)
    const saldoCierreCentavos = saldoAnterior + cargosCentavos - pagosCentavos
    return {
      id: cuenta.id,
      nombre: cuenta.nombre,
      grupo: cuenta.grupo,
      condicion: cuenta.condicion,
      saldo_anterior_centavos: saldoAnterior,
      cargos_centavos: cargosCentavos,
      pagos_centavos: pagosCentavos,
      saldo_cierre_centavos: saldoCierreCentavos,
      pagos_registrados: pagos.length,
      compromiso_activo: cuenta.compromiso_activo || null,
    }
  })
  const cargosCentavos = cuentasCalculadas.reduce((total, cuenta) => total + cuenta.cargos_centavos, 0)
  const pagosCentavos = cuentasCalculadas.reduce((total, cuenta) => total + cuenta.pagos_centavos, 0)
  const saldoAnteriorPendiente = cuentasCalculadas.reduce((total, cuenta) => total + Math.max(0, cuenta.saldo_anterior_centavos), 0)
  const porCobrarCentavos = saldoAnteriorPendiente + cargosCentavos
  const pendienteCentavos = cuentasCalculadas.reduce((total, cuenta) => total + Math.max(0, cuenta.saldo_cierre_centavos), 0)
  const aFavorCentavos = cuentasCalculadas.reduce((total, cuenta) => total + Math.abs(Math.min(0, cuenta.saldo_cierre_centavos)), 0)
  const seguimiento = cuentasCalculadas.filter((cuenta) => cuenta.saldo_cierre_centavos > 0)
    .sort((a, b) => b.saldo_cierre_centavos - a.saldo_cierre_centavos || String(a.nombre).localeCompare(String(b.nombre), 'es'))
  return {
    periodo,
    cargos_centavos: cargosCentavos,
    pagos_centavos: pagosCentavos,
    por_cobrar_centavos: porCobrarCentavos,
    pendiente_centavos: pendienteCentavos,
    a_favor_centavos: aFavorCentavos,
    tasa_cobro: porCobrarCentavos > 0 ? Math.min(100, Math.round((pagosCentavos / porCobrarCentavos) * 100)) : null,
    cuentas_con_pago: cuentasCalculadas.filter((cuenta) => cuenta.pagos_registrados > 0).length,
    cuentas_pendientes: seguimiento.length,
    cuentas: cuentasCalculadas,
    seguimiento,
  }
}

export function textoRecordatorioFsb(cuenta, { incluirImporte = false } = {}) {
  const primerNombre = String(cuenta?.nombre || '').trim().split(/\s+/)[0] || '¿cómo estás?'
  const saldo = Math.max(0, Number(cuenta?.saldo_centavos || 0))
  const importe = incluirImporte && saldo ? ` de ${dineroFsb(saldo)}` : ''
  return `Hola ${primerNombre}, te escribimos desde Fútbol sin Barreras para recordar que tu cuenta registra un saldo pendiente${importe}. Si ya realizaste el pago, podés ignorar este mensaje. Gracias.`
}

function fechaISOValidaFsb(valor) {
  const partes = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!partes) return false
  const fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])))
  return fecha.toISOString().slice(0, 10) === valor
}

export function exclusionesCuotasFsb(cuentas = []) {
  return cuentas.filter((cuenta) => cuenta.activa === 0 || ![1, 2].includes(Number(cuenta.grupo)) || !['regular', 'beca'].includes(cuenta.condicion) || (cuenta.condicion === 'beca' && !Number(cuenta.beca_porcentaje)))
    .map((cuenta) => ({
      cuenta_id: cuenta.id,
      persona_id: cuenta.persona_id || null,
      nombre: cuenta.nombre,
      razon: cuenta.activa === 0 || cuenta.condicion === 'baja'
        ? 'Participante inactivo, no genera cuota.'
        : cuenta.condicion === 'voluntariado'
          ? 'Voluntariado, no corresponde cuota mensual.'
          : ![1, 2].includes(Number(cuenta.grupo))
            ? 'Falta asignar Grupo 1 o Grupo 2.'
            : cuenta.condicion === 'beca' && !Number(cuenta.beca_porcentaje)
              ? 'La beca no tiene un porcentaje de descuento.'
              : 'El tipo de cuota no genera un cobro mensual.',
    }))
}

export function prepararCuotasFsb(cuentas = [], movimientos = [], datos = {}) {
  const periodo = String(datos.periodo || '').trim()
  const concepto = String(datos.concepto || '').trim()
  const fecha = String(datos.fecha || '').trim()
  const vencimiento = String(datos.vencimiento || '').trim()
  const grupo1Centavos = importeCentavosFsb(datos.grupo_1)
  const grupo2Centavos = importeCentavosFsb(datos.grupo_2)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return { error: 'Elegí el mes de las cuotas.' }
  if (!concepto) return { error: 'Ingresá el concepto de las cuotas.' }
  if (!fechaISOValidaFsb(fecha) || !fechaISOValidaFsb(vencimiento) || vencimiento < fecha) return { error: 'Ingresá una fecha y un vencimiento válidos.' }
  if (!grupo1Centavos || !grupo2Centavos) return { error: 'Ingresá el importe de cada grupo.' }
  const clavesExistentes = new Set(movimientos.map((movimiento) => movimiento.clave_operacion).filter(Boolean))
  const cuotas = cuentas.filter((cuenta) => cuenta.activa !== 0 && [1, 2].includes(Number(cuenta.grupo)) && ['regular', 'beca'].includes(cuenta.condicion) && (cuenta.condicion !== 'beca' || Number(cuenta.beca_porcentaje) > 0))
    .map((cuenta) => {
      const claveOperacion = `cuota:${periodo}:${cuenta.id}`
      const baseCentavos = Number(cuenta.grupo) === 1 ? grupo1Centavos : grupo2Centavos
      const descuento = cuenta.condicion === 'beca' ? Number(cuenta.beca_porcentaje || 0) : 0
      return {
        cuenta_id: cuenta.id,
        nombre: cuenta.nombre,
        grupo: Number(cuenta.grupo),
        beca_porcentaje: descuento,
        importe_base_centavos: baseCentavos,
        tipo: 'cargo',
        concepto,
        periodo,
        fecha,
        vencimiento,
        importe_centavos: Math.round(baseCentavos * (100 - descuento) / 100),
        clave_operacion: claveOperacion,
        ya_generada: clavesExistentes.has(claveOperacion),
      }
    })
    .filter((cuota) => cuota.importe_centavos > 0)
  return {
    cuotas,
    nuevas: cuotas.filter((cuota) => !cuota.ya_generada),
    exclusiones: exclusionesCuotasFsb(cuentas),
    total_centavos: cuotas.filter((cuota) => !cuota.ya_generada).reduce((total, cuota) => total + cuota.importe_centavos, 0),
  }
}

export function prepararRecargosFsb(cuentas = [], movimientos = [], hoy = new Date().toISOString().slice(0, 10)) {
  if (!fechaISOValidaFsb(hoy) || Number(hoy.slice(8, 10)) < 16) return []
  const periodo = hoy.slice(0, 7)
  const limitePago = `${periodo}-15`
  const clavesExistentes = new Set(movimientos.map((movimiento) => movimiento.clave_operacion).filter(Boolean))
  return cuentas.filter((cuenta) => cuenta.activa !== 0 && cuenta.condicion === 'regular').flatMap((cuenta) => {
    const propios = movimientos.filter((movimiento) => movimiento.cuenta_id === cuenta.id && !movimiento.anulado_en)
    const cuota = propios.find((movimiento) => movimiento.clave_operacion === `cuota:${periodo}:${cuenta.id}` && Number(movimiento.importe_centavos) > 0)
    const claveOperacion = `recargo:${periodo}:${cuenta.id}`
    if (!cuota || clavesExistentes.has(claveOperacion)) return []
    const saldoAlDia15 = propios.filter((movimiento) => String(movimiento.fecha || '') <= limitePago)
      .reduce((total, movimiento) => total + Number(movimiento.importe_centavos || 0), 0)
    if (saldoAlDia15 <= 0) return []
    return [{
      cuenta_id: cuenta.id,
      tipo: 'recargo',
      concepto: 'Recargo 10% por pago posterior al día 15',
      periodo,
      fecha: `${periodo}-16`,
      vencimiento: null,
      importe_centavos: Math.round(Number(cuota.importe_centavos) * 0.1),
      clave_operacion: claveOperacion,
    }]
  }).filter((movimiento) => movimiento.importe_centavos > 0)
}

export function resumenFinanzasFsb(cuentas = [], movimientos = [], hoy = new Date().toISOString().slice(0, 10), compromisos = []) {
  const periodoActual = hoy.slice(0, 7)
  const movimientosActivos = movimientos.filter((movimiento) => !movimiento.anulado_en)
  const porCuenta = new Map()
  movimientos.forEach((movimiento) => {
    const lista = porCuenta.get(movimiento.cuenta_id) || []
    lista.push(movimiento)
    porCuenta.set(movimiento.cuenta_id, lista)
  })
  const compromisosPorCuenta = new Map()
  compromisos.forEach((compromiso) => {
    const lista = compromisosPorCuenta.get(compromiso.cuenta_id) || []
    lista.push({ ...compromiso, estado_calculado: estadoCompromisoFsb(compromiso, hoy) })
    compromisosPorCuenta.set(compromiso.cuenta_id, lista)
  })

  const cuentasCalculadas = cuentas.map((cuenta) => {
    const propios = (porCuenta.get(cuenta.id) || []).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    const propiosActivos = propios.filter((movimiento) => !movimiento.anulado_en)
    const saldoCentavos = propiosActivos.reduce((total, movimiento) => total + Number(movimiento.importe_centavos || 0), 0)
    const creditosAplicables = propiosActivos.filter((movimiento) => Number(movimiento.importe_centavos) < 0)
      .reduce((total, movimiento) => total + Math.abs(Number(movimiento.importe_centavos)), 0)
    const cargosVencidos = propiosActivos.filter((movimiento) => Number(movimiento.importe_centavos) > 0 && movimiento.vencimiento && movimiento.vencimiento < hoy)
      .reduce((total, movimiento) => total + Number(movimiento.importe_centavos), 0)
    const vencidoCentavos = Math.max(0, Math.min(Math.max(0, saldoCentavos), cargosVencidos - creditosAplicables))
    const ultimoPago = propiosActivos.find((movimiento) => movimiento.tipo === 'pago') || null
    const compromisosCuenta = (compromisosPorCuenta.get(cuenta.id) || []).sort((a, b) => String(b.fecha_prevista).localeCompare(String(a.fecha_prevista)))
    const compromisoActivo = compromisosCuenta.find((compromiso) => ['vigente', 'vencido'].includes(compromiso.estado_calculado)) || null
    return {
      ...cuenta,
      saldo_centavos: saldoCentavos,
      vencido_centavos: vencidoCentavos,
      estado_pago: saldoCentavos < 0 ? 'a_favor' : vencidoCentavos > 0 ? 'vencido' : saldoCentavos > 0 ? 'pendiente' : 'al_dia',
      ultimo_pago_fecha: ultimoPago?.fecha || null,
      ultimo_pago_centavos: ultimoPago ? Math.abs(Number(ultimoPago.importe_centavos || 0)) : 0,
      movimientos: propios,
      compromisos: compromisosCuenta,
      compromiso_activo: compromisoActivo,
    }
  }).sort((a, b) => {
    const prioridad = { vencido: 0, pendiente: 1, a_favor: 2, al_dia: 3 }
    return (prioridad[a.estado_pago] - prioridad[b.estado_pago]) || b.saldo_centavos - a.saldo_centavos || String(a.nombre).localeCompare(String(b.nombre), 'es')
  })

  const pagosDelMes = movimientosActivos.filter((movimiento) => movimiento.tipo === 'pago' && String(movimiento.fecha).startsWith(periodoActual))
    .reduce((total, movimiento) => total + Math.abs(Number(movimiento.importe_centavos || 0)), 0)
  return {
    cuentas: cuentasCalculadas,
    total_pendiente_centavos: cuentasCalculadas.reduce((total, cuenta) => total + Math.max(0, cuenta.saldo_centavos), 0),
    total_a_favor_centavos: cuentasCalculadas.reduce((total, cuenta) => total + Math.abs(Math.min(0, cuenta.saldo_centavos)), 0),
    cuentas_pendientes: cuentasCalculadas.filter((cuenta) => cuenta.saldo_centavos > 0).length,
    cuentas_vencidas: cuentasCalculadas.filter((cuenta) => cuenta.vencido_centavos > 0).length,
    pagos_mes_centavos: pagosDelMes,
  }
}

export const _pruebas = { TIPOS_CARGO, TIPOS_CREDITO, fechaISOValidaFsb }
