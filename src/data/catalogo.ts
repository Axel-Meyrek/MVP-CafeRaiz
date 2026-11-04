import type { Descuento, Producto, Sucursal, Usuario } from '../types'

export const sucursales: Sucursal[] = [
  { id: 'centro', nombre: 'Centro', zona: 'Centro Histórico', activa: true },
  { id: 'angelopolis', nombre: 'Angelópolis', zona: 'Lomas de Angelópolis', activa: true },
  { id: 'cholula', nombre: 'Cholula', zona: 'San Pedro Cholula', activa: true },
  { id: 'la-paz', nombre: 'La Paz', zona: 'Colonia La Paz', activa: true },
  { id: 'zavaleta', nombre: 'Zavaleta', zona: 'Santa Cruz Buenavista', activa: true },
]

export const productos: Producto[] = [
  { id: 'espresso', nombre: 'Espresso', categoria: 'Café caliente', precio: 38, activo: true },
  { id: 'americano', nombre: 'Americano', categoria: 'Café caliente', precio: 42, activo: true },
  { id: 'capuchino', nombre: 'Capuchino', categoria: 'Café caliente', precio: 55, activo: true },
  { id: 'latte', nombre: 'Latte', categoria: 'Café caliente', precio: 58, activo: true },
  { id: 'flat-white', nombre: 'Flat white', categoria: 'Café caliente', precio: 60, activo: true },
  { id: 'cafe-olla', nombre: 'Café de olla', categoria: 'Café caliente', precio: 45, activo: true },
  { id: 'cold-brew', nombre: 'Cold brew', categoria: 'Café frío', precio: 62, activo: true },
  { id: 'latte-frio', nombre: 'Latte frío', categoria: 'Café frío', precio: 64, activo: true },
  { id: 'affogato', nombre: 'Affogato', categoria: 'Café frío', precio: 72, activo: true },
  { id: 'chai', nombre: 'Chai latte', categoria: 'Otras bebidas', precio: 58, activo: true },
  { id: 'chocolate', nombre: 'Chocolate caliente', categoria: 'Otras bebidas', precio: 52, activo: true },
  { id: 'matcha', nombre: 'Matcha latte', categoria: 'Otras bebidas', precio: 66, activo: true },
  { id: 'croissant', nombre: 'Croissant', categoria: 'Panadería', precio: 38, activo: true },
  { id: 'concha', nombre: 'Concha', categoria: 'Panadería', precio: 24, activo: true },
  { id: 'galleta', nombre: 'Galleta de avena', categoria: 'Panadería', precio: 28, activo: true },
  { id: 'pan-elote', nombre: 'Pan de elote', categoria: 'Panadería', precio: 42, activo: false },
]

export const usuarios: Usuario[] = [
  { id: 'u-admin', nombre: 'Rocío Vázquez', rol: 'admin', sucursalId: null, activo: true },

  { id: 'u-g-centro', nombre: 'Daniel Ortega', rol: 'gerente', sucursalId: 'centro', activo: true },
  { id: 'u-g-angelopolis', nombre: 'Mariana Fuentes', rol: 'gerente', sucursalId: 'angelopolis', activo: true },
  { id: 'u-g-cholula', nombre: 'Iván Sosa', rol: 'gerente', sucursalId: 'cholula', activo: true },
  { id: 'u-g-la-paz', nombre: 'Lucía Méndez', rol: 'gerente', sucursalId: 'la-paz', activo: true },
  { id: 'u-g-zavaleta', nombre: 'Andrés Cabrera', rol: 'gerente', sucursalId: 'zavaleta', activo: true },

  { id: 'u-b-centro-1', nombre: 'Sofía Ramírez', rol: 'barista', sucursalId: 'centro', activo: true },
  { id: 'u-b-centro-2', nombre: 'Emilio Torres', rol: 'barista', sucursalId: 'centro', activo: true },
  { id: 'u-b-angelopolis-1', nombre: 'Valeria Luna', rol: 'barista', sucursalId: 'angelopolis', activo: true },
  { id: 'u-b-angelopolis-2', nombre: 'Jorge Herrera', rol: 'barista', sucursalId: 'angelopolis', activo: false },
  { id: 'u-b-cholula-1', nombre: 'Paola Reyes', rol: 'barista', sucursalId: 'cholula', activo: true },
  { id: 'u-b-la-paz-1', nombre: 'Tomás Aguilar', rol: 'barista', sucursalId: 'la-paz', activo: true },
  { id: 'u-b-zavaleta-1', nombre: 'Camila Rojas', rol: 'barista', sucursalId: 'zavaleta', activo: true },
]

export const descuentos: Descuento[] = [
  { id: 'd-estudiante', nombre: 'Estudiante', tipo: 'porcentaje', valor: 10, activo: true, vigenteHasta: null },
  { id: 'd-empleado', nombre: 'Personal Café Raíz', tipo: 'porcentaje', valor: 20, activo: true, vigenteHasta: null },
  { id: 'd-cumple', nombre: 'Cumpleaños', tipo: 'monto', valor: 40, activo: true, vigenteHasta: null },
  { id: 'd-buen-fin', nombre: 'Buen Fin', tipo: 'porcentaje', valor: 15, activo: true, vigenteHasta: '2026-11-20' },
  { id: 'd-verano', nombre: 'Verano frío', tipo: 'porcentaje', valor: 12, activo: false, vigenteHasta: '2026-08-31' },
]
