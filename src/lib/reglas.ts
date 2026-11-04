import type { Descuento, Existencia, Producto } from '../types'

/** Un producto se vende solo si está activo, tiene existencia y no está agotado a mano (reglas 32, 41, 49). */
export function estaDisponible(producto: Producto, existencia: Existencia | undefined) {
  return producto.activo && !!existencia && existencia.cantidad > 0 && !existencia.agotadoManual
}

export type EstadoExistencia = 'disponible' | 'bajo' | 'agotado'

export function estadoExistencia(existencia: Existencia): EstadoExistencia {
  if (existencia.cantidad <= 0 || existencia.agotadoManual) return 'agotado'
  if (existencia.cantidad <= existencia.limiteStockBajo) return 'bajo'
  return 'disponible'
}

/** Un descuento desactivado o vencido no se puede aplicar (regla 71). */
export function descuentoVigente(descuento: Descuento, fecha = new Date()) {
  if (!descuento.activo) return false
  if (!descuento.vigenteHasta) return true
  return fecha <= new Date(`${descuento.vigenteHasta}T23:59:59-06:00`)
}

/** El descuento nunca deja el total por debajo de cero (regla 72). */
export function calcularDescuento(subtotal: number, descuento: Descuento | null | undefined) {
  if (!descuento) return 0
  const monto = descuento.tipo === 'porcentaje' ? (subtotal * descuento.valor) / 100 : descuento.valor
  return Math.round(Math.min(subtotal, monto) * 100) / 100
}

export const etiquetaDescuento = (d: Descuento) =>
  d.tipo === 'porcentaje' ? `${d.nombre} · ${d.valor}%` : `${d.nombre} · $${d.valor}`
