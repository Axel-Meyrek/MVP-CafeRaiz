import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { descuentos, productos } from '../data/catalogo'
import { existencias as existenciasIniciales, ventas as ventasIniciales } from '../data/movimientos'
import { calcularDescuento, descuentoVigente, estaDisponible } from '../lib/reglas'
import type { Existencia, LineaVenta, MetodoPago, Venta } from '../types'

export interface NuevaVenta {
  sucursalId: string
  usuarioId: string
  lineas: { productoId: string; cantidad: number }[]
  descuentoId: string | null
  metodoPago: MetodoPago
}

type ResultadoVenta = { ok: true; venta: Venta } | { ok: false; error: string }

interface Datos {
  existencias: Existencia[]
  ventas: Venta[]
  existenciaDe: (sucursalId: string, productoId: string) => Existencia | undefined
  registrarVenta: (nueva: NuevaVenta) => ResultadoVenta
}

const DatosContext = createContext<Datos | null>(null)

/** Almacén en memoria que sustituye al backend mientras construimos la interfaz. */
export function DatosProvider({ children }: { children: ReactNode }) {
  const [existencias, setExistencias] = useState(existenciasIniciales)
  const [ventas, setVentas] = useState(ventasIniciales)

  const existenciaDe = useCallback(
    (sucursalId: string, productoId: string) =>
      existencias.find((e) => e.sucursalId === sucursalId && e.productoId === productoId),
    [existencias],
  )

  const registrarVenta = useCallback(
    (nueva: NuevaVenta): ResultadoVenta => {
      if (nueva.lineas.length === 0) return { ok: false, error: 'El ticket está vacío.' }

      const lineas: LineaVenta[] = []
      for (const linea of nueva.lineas) {
        const producto = productos.find((p) => p.id === linea.productoId)
        const existencia = existencias.find(
          (e) => e.sucursalId === nueva.sucursalId && e.productoId === linea.productoId,
        )
        if (!producto || !estaDisponible(producto, existencia)) {
          return { ok: false, error: `${producto?.nombre ?? 'Un producto'} ya no está disponible.` }
        }
        // Una venta no puede incluir más unidades de las que hay (regla 56).
        if (linea.cantidad > existencia!.cantidad) {
          return { ok: false, error: `Solo quedan ${existencia!.cantidad} de ${producto.nombre}.` }
        }
        lineas.push({ productoId: producto.id, cantidad: linea.cantidad, precioUnitario: producto.precio })
      }

      const descuento = descuentos.find((d) => d.id === nueva.descuentoId)
      if (descuento && !descuentoVigente(descuento)) return { ok: false, error: 'El descuento ya no es válido.' }

      const subtotal = lineas.reduce((suma, l) => suma + l.cantidad * l.precioUnitario, 0)
      const montoDescuento = calcularDescuento(subtotal, descuento)
      const folio = Math.max(...ventas.map((v) => v.folio)) + 1

      const venta: Venta = {
        id: `v-${folio}`,
        folio,
        sucursalId: nueva.sucursalId,
        usuarioId: nueva.usuarioId,
        fecha: new Date().toISOString(),
        lineas,
        descuentoId: descuento?.id ?? null,
        montoDescuento,
        total: Math.round((subtotal - montoDescuento) * 100) / 100,
        metodoPago: nueva.metodoPago,
        cancelacion: null,
      }

      setVentas((actuales) => [...actuales, venta])
      // Cada venta resta del inventario de su sucursal (regla 38).
      setExistencias((actuales) =>
        actuales.map((e) => {
          const vendida = lineas.find((l) => l.productoId === e.productoId)
          return vendida && e.sucursalId === nueva.sucursalId ? { ...e, cantidad: e.cantidad - vendida.cantidad } : e
        }),
      )
      return { ok: true, venta }
    },
    [existencias, ventas],
  )

  const valor = useMemo(
    () => ({ existencias, ventas, existenciaDe, registrarVenta }),
    [existencias, ventas, existenciaDe, registrarVenta],
  )
  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useDatos() {
  const contexto = useContext(DatosContext)
  if (!contexto) throw new Error('useDatos debe usarse dentro de DatosProvider')
  return contexto
}
