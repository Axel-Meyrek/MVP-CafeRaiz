import {
  Boxes,
  Building2,
  ChartColumn,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Rol } from '../types'

export interface ElementoNavegacion {
  ruta: string
  etiqueta: string
  /** Versión corta para la barra inferior del celular. */
  corta?: string
  icono: LucideIcon
  roles: Rol[]
}

/** Qué ve cada rol en la navegación (reglas 14 a 26). */
export const navegacion: ElementoNavegacion[] = [
  { ruta: '/general', etiqueta: 'Vista general', corta: 'General', icono: LayoutDashboard, roles: ['admin'] },
  { ruta: '/panel', etiqueta: 'Panel', icono: LayoutDashboard, roles: ['gerente'] },
  { ruta: '/venta', etiqueta: 'Vender', icono: ShoppingCart, roles: ['barista', 'gerente'] },
  { ruta: '/mis-ventas', etiqueta: 'Mis ventas', icono: Receipt, roles: ['barista'] },
  { ruta: '/ventas', etiqueta: 'Ventas', icono: Receipt, roles: ['gerente'] },
  { ruta: '/inventario', etiqueta: 'Inventario', icono: Package, roles: ['barista', 'gerente'] },
  { ruta: '/inventario-global', etiqueta: 'Inventario', icono: Boxes, roles: ['admin'] },
  { ruta: '/personal', etiqueta: 'Personal', icono: Users, roles: ['gerente'] },
  { ruta: '/reporte', etiqueta: 'Reporte', icono: ChartColumn, roles: ['gerente'] },
  { ruta: '/productos', etiqueta: 'Productos', icono: Package, roles: ['admin'] },
  { ruta: '/descuentos', etiqueta: 'Descuentos', icono: Tag, roles: ['admin'] },
  { ruta: '/sucursales', etiqueta: 'Sucursales', icono: Building2, roles: ['admin'] },
  { ruta: '/comparativo', etiqueta: 'Comparativo', corta: 'Comparar', icono: ChartColumn, roles: ['admin'] },
  { ruta: '/registro', etiqueta: 'Registro', icono: History, roles: ['admin'] },
]

export const rutaInicial: Record<Rol, string> = {
  admin: '/general',
  gerente: '/panel',
  barista: '/venta',
}

export const navegacionPara = (rol: Rol) => navegacion.filter((e) => e.roles.includes(rol))
