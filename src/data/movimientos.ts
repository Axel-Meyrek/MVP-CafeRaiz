import type { Existencia, MetodoPago, RegistroAccion, Venta } from '../types'
import { descuentos, productos, sucursales, usuarios } from './catalogo'

/** Generador pseudoaleatorio con semilla: los datos de ejemplo son siempre los mismos. */
function crearAleatorio(semilla: number) {
  let estado = semilla
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
}

const azar = crearAleatorio(2026)
const entero = (min: number, max: number) => Math.floor(azar() * (max - min + 1)) + min
const elegir = <T,>(lista: T[]) => lista[Math.floor(azar() * lista.length)]

export const existencias: Existencia[] = sucursales.flatMap((sucursal) =>
  productos.map((producto) => {
    const tirada = azar()
    // ~8% agotados, ~15% en stock bajo, el resto con existencia normal.
    const cantidad = !producto.activo ? 0 : tirada < 0.08 ? 0 : tirada < 0.23 ? entero(1, 5) : entero(8, 40)
    return {
      productoId: producto.id,
      sucursalId: sucursal.id,
      cantidad,
      limiteStockBajo: 5,
      agotadoManual: null,
    }
  }),
)

// Un agotado manual de ejemplo: hay existencia, pero no se vende (regla 44).
const croissantCholula = existencias.find((e) => e.sucursalId === 'cholula' && e.productoId === 'croissant')
if (croissantCholula) {
  croissantCholula.cantidad = 6
  croissantCholula.agotadoManual = {
    motivo: 'Lote dañado en el traslado',
    usuarioId: 'u-b-cholula-1',
    fecha: '2026-11-03T09:12:00-06:00',
  }
}

const descuentosActivos = descuentos.filter((d) => d.activo)
const productosActivos = productos.filter((p) => p.activo)

function generarVentas(): Venta[] {
  const ventas: Venta[] = []
  let folio = 1000
  const hoy = new Date('2026-11-03T07:00:00-06:00')

  for (let dia = 6; dia >= 0; dia--) {
    for (const sucursal of sucursales) {
      const equipo = usuarios.filter((u) => u.sucursalId === sucursal.id && u.activo)
      const cuantas = entero(14, 30)
      for (let i = 0; i < cuantas; i++) {
        const fecha = new Date(hoy)
        fecha.setDate(hoy.getDate() - dia)
        fecha.setMinutes(fecha.getMinutes() + entero(0, 12 * 60))

        const lineas = Array.from({ length: entero(1, 3) }, () => {
          const producto = elegir(productosActivos)
          return { productoId: producto.id, cantidad: entero(1, 2), precioUnitario: producto.precio }
        })
        const subtotal = lineas.reduce((suma, l) => suma + l.cantidad * l.precioUnitario, 0)
        const descuento = azar() < 0.15 ? elegir(descuentosActivos) : null
        const montoDescuento = descuento
          ? Math.min(subtotal, descuento.tipo === 'porcentaje' ? (subtotal * descuento.valor) / 100 : descuento.valor)
          : 0

        ventas.push({
          id: `v-${folio}`,
          folio: folio++,
          sucursalId: sucursal.id,
          usuarioId: elegir(equipo).id,
          fecha: fecha.toISOString(),
          lineas,
          descuentoId: descuento?.id ?? null,
          montoDescuento: Math.round(montoDescuento * 100) / 100,
          total: Math.round((subtotal - montoDescuento) * 100) / 100,
          metodoPago: (azar() < 0.55 ? 'tarjeta' : 'efectivo') as MetodoPago,
          cancelacion: null,
        })
      }
    }
  }
  return ventas
}

export const ventas = generarVentas()

// Una venta cancelada de ejemplo (reglas 61 a 65).
const ventaCancelada = ventas.find((v) => v.sucursalId === 'centro')
if (ventaCancelada) {
  ventaCancelada.cancelacion = {
    motivo: 'Cobro duplicado',
    usuarioId: 'u-g-centro',
    fecha: ventaCancelada.fecha,
  }
}

export const registroAcciones: RegistroAccion[] = [
  {
    id: 'r-1',
    fecha: '2026-11-01T10:30:00-06:00',
    usuarioId: 'u-admin',
    sucursalId: null,
    accion: 'Cambio de precio',
    detalle: 'Flat white: $56.00 → $60.00',
  },
  {
    id: 'r-2',
    fecha: '2026-11-02T18:05:00-06:00',
    usuarioId: 'u-admin',
    sucursalId: null,
    accion: 'Baja de producto',
    detalle: 'Pan de elote',
  },
  {
    id: 'r-3',
    fecha: '2026-11-03T09:12:00-06:00',
    usuarioId: 'u-b-cholula-1',
    sucursalId: 'cholula',
    accion: 'Agotado manual',
    detalle: 'Croissant · Lote dañado en el traslado',
  },
]
