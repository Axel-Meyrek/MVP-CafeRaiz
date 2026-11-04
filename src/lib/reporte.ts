import type { MetodoPago, Producto, Venta } from '../types'
import { claveDia, minutoDelDia } from './formato'

export interface RangoFechas {
  /** Claves AAAA-MM-DD, ambas incluidas. */
  desde: string
  hasta: string
}

export interface FilaProducto {
  producto: Producto
  unidades: number
  ingresos: number
}

export interface Reporte {
  ingresos: number
  ventas: number
  ticketPromedio: number
  descuentos: { monto: number; ventas: number }
  canceladas: { monto: number; ventas: number }
  porMetodo: Record<MetodoPago, { total: number; ventas: number }>
  porPersona: { usuarioId: string; total: number; ventas: number }[]
  /** Ordenados de más a menos unidades vendidas. */
  productos: FilaProducto[]
  porDia: { dia: string; total: number; ventas: number }[]
  porHora: { hora: number; total: number; ventas: number }[]
}

export const enRango = (venta: Venta, rango: RangoFechas) => {
  const dia = claveDia(venta.fecha)
  return dia >= rango.desde && dia <= rango.hasta
}

/** Días AAAA-MM-DD entre dos claves, ambas incluidas. */
export function diasEntre(rango: RangoFechas) {
  const dias: string[] = []
  const actual = new Date(`${rango.desde}T12:00:00`)
  const fin = new Date(`${rango.hasta}T12:00:00`)
  while (actual <= fin) {
    dias.push(claveDia(actual))
    actual.setDate(actual.getDate() + 1)
  }
  return dias
}

/**
 * Reporte de ventas de una sucursal en un rango de fechas.
 * Las ventas canceladas no cuentan en ingresos ni en productos (regla 65); se reportan aparte.
 */
export function calcularReporte(
  ventas: Venta[],
  productos: Producto[],
  sucursalId: string,
  rango: RangoFechas,
): Reporte {
  const delRango = ventas.filter((v) => v.sucursalId === sucursalId && enRango(v, rango))
  const vigentes = delRango.filter((v) => !v.cancelacion)
  const canceladas = delRango.filter((v) => v.cancelacion)
  const ingresos = vigentes.reduce((suma, v) => suma + v.total, 0)

  const porMetodo: Reporte['porMetodo'] = { efectivo: { total: 0, ventas: 0 }, tarjeta: { total: 0, ventas: 0 } }
  const personas = new Map<string, { total: number; ventas: number }>()
  const unidades = new Map<string, { unidades: number; ingresos: number }>()
  const dias = new Map<string, { total: number; ventas: number }>()
  const horas = new Map<number, { total: number; ventas: number }>()
  let descuentoMonto = 0
  let descuentoVentas = 0

  for (const venta of vigentes) {
    porMetodo[venta.metodoPago].total += venta.total
    porMetodo[venta.metodoPago].ventas += 1

    const persona = personas.get(venta.usuarioId) ?? { total: 0, ventas: 0 }
    personas.set(venta.usuarioId, { total: persona.total + venta.total, ventas: persona.ventas + 1 })

    const dia = claveDia(venta.fecha)
    const enDia = dias.get(dia) ?? { total: 0, ventas: 0 }
    dias.set(dia, { total: enDia.total + venta.total, ventas: enDia.ventas + 1 })

    const hora = Math.floor(minutoDelDia(venta.fecha) / 60)
    const enHora = horas.get(hora) ?? { total: 0, ventas: 0 }
    horas.set(hora, { total: enHora.total + venta.total, ventas: enHora.ventas + 1 })

    if (venta.montoDescuento > 0) {
      descuentoMonto += venta.montoDescuento
      descuentoVentas += 1
    }

    // Los ingresos por producto se reparten sin descuento: es lo cobrado por línea.
    for (const linea of venta.lineas) {
      const actual = unidades.get(linea.productoId) ?? { unidades: 0, ingresos: 0 }
      unidades.set(linea.productoId, {
        unidades: actual.unidades + linea.cantidad,
        ingresos: actual.ingresos + linea.cantidad * linea.precioUnitario,
      })
    }
  }

  return {
    ingresos,
    ventas: vigentes.length,
    ticketPromedio: vigentes.length ? ingresos / vigentes.length : 0,
    descuentos: { monto: descuentoMonto, ventas: descuentoVentas },
    canceladas: { monto: canceladas.reduce((s, v) => s + v.total, 0), ventas: canceladas.length },
    porMetodo,
    porPersona: [...personas.entries()]
      .map(([usuarioId, datos]) => ({ usuarioId, ...datos }))
      .sort((a, b) => b.total - a.total),
    productos: [...unidades.entries()]
      .map(([productoId, datos]) => ({ producto: productos.find((p) => p.id === productoId)!, ...datos }))
      .filter((f) => f.producto)
      .sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos),
    porDia: diasEntre(rango).map((dia) => ({ dia, ...(dias.get(dia) ?? { total: 0, ventas: 0 }) })),
    porHora: [...horas.entries()].map(([hora, datos]) => ({ hora, ...datos })).sort((a, b) => a.hora - b.hora),
  }
}

/** Descarga un CSV (con BOM para que Excel respete los acentos). */
export function descargarCsv(nombre: string, filas: (string | number)[][]) {
  const escapar = (valor: string | number) => {
    const texto = String(valor)
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const contenido = '﻿' + filas.map((fila) => fila.map(escapar).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}
