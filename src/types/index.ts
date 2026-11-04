export type Rol = 'admin' | 'gerente' | 'barista'

export interface Sucursal {
  id: string
  nombre: string
  zona: string
  activa: boolean
}

export type Categoria = 'Café caliente' | 'Café frío' | 'Otras bebidas' | 'Panadería'

export interface Producto {
  id: string
  nombre: string
  categoria: Categoria
  /** Precio en pesos mexicanos (regla 35). */
  precio: number
  /** Un producto dado de baja no se vende en ninguna sucursal (regla 32). */
  activo: boolean
}

export interface MarcaAgotado {
  motivo: string
  usuarioId: string
  fecha: string
}

export interface Existencia {
  productoId: string
  sucursalId: string
  cantidad: number
  /** Límite de stock bajo; 5 por defecto (reglas 50 y 51). */
  limiteStockBajo: number
  /** Agotado puesto a mano; no cambia la existencia (regla 47). */
  agotadoManual: MarcaAgotado | null
}

export interface Usuario {
  id: string
  nombre: string
  rol: Rol
  /** null solo para el admin general (regla 9). */
  sucursalId: string | null
  activo: boolean
}

export interface Descuento {
  id: string
  nombre: string
  tipo: 'porcentaje' | 'monto'
  valor: number
  activo: boolean
  vigenteHasta: string | null
}

export interface LineaVenta {
  productoId: string
  cantidad: number
  /** Precio guardado en el momento de la venta (regla 57). */
  precioUnitario: number
}

export type MetodoPago = 'efectivo' | 'tarjeta'

export interface Venta {
  id: string
  folio: number
  sucursalId: string
  usuarioId: string
  fecha: string
  lineas: LineaVenta[]
  descuentoId: string | null
  montoDescuento: number
  total: number
  metodoPago: MetodoPago
  cancelacion: { motivo: string; usuarioId: string; fecha: string } | null
}

export interface RegistroAccion {
  id: string
  fecha: string
  usuarioId: string
  sucursalId: string | null
  accion: string
  detalle: string
}
