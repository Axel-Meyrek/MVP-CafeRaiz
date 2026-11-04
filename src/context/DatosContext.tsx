import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  descuentos as descuentosIniciales,
  productos as productosIniciales,
  sucursales,
  usuarios as usuariosIniciales,
} from '../data/catalogo'
import {
  existencias as existenciasIniciales,
  registroAcciones as registroInicial,
  ventas as ventasIniciales,
} from '../data/movimientos'
import { esHoy } from '../lib/formato'
import { calcularDescuento, descuentoVigente, estaDisponible } from '../lib/reglas'
import type {
  Categoria,
  Descuento,
  Existencia,
  LineaVenta,
  MetodoPago,
  Producto,
  RegistroAccion,
  Usuario,
  Venta,
} from '../types'

export interface NuevaVenta {
  sucursalId: string
  usuarioId: string
  lineas: { productoId: string; cantidad: number }[]
  descuentoId: string | null
  metodoPago: MetodoPago
}

type ResultadoVenta = { ok: true; venta: Venta } | { ok: false; error: string }
export type Resultado = { ok: true } | { ok: false; error: string }

interface Datos {
  existencias: Existencia[]
  ventas: Venta[]
  registro: RegistroAccion[]
  existenciaDe: (sucursalId: string, productoId: string) => Existencia | undefined
  registrarVenta: (nueva: NuevaVenta) => ResultadoVenta
  marcarAgotado: (usuario: Usuario, productoId: string, motivo: string) => Resultado
  quitarAgotado: (usuario: Usuario, productoId: string) => Resultado
  registrarEntrada: (usuario: Usuario, productoId: string, cantidad: number) => Resultado
  corregirConteo: (usuario: Usuario, productoId: string, cantidad: number, motivo: string) => Resultado
  cambiarLimite: (usuario: Usuario, productoId: string, limite: number) => Resultado
  cancelarVenta: (usuario: Usuario, ventaId: string, motivo: string) => Resultado
  usuarios: Usuario[]
  crearBarista: (gerente: Usuario, nombre: string) => Resultado
  desactivarBarista: (gerente: Usuario, baristaId: string) => Resultado
  productos: Producto[]
  descuentos: Descuento[]
  crearProducto: (admin: Usuario, nuevo: { nombre: string; categoria: Categoria; precio: number }) => Resultado
  cambiarPrecio: (admin: Usuario, productoId: string, precio: number) => Resultado
  darDeBajaProducto: (admin: Usuario, productoId: string) => Resultado
  guardarDescuento: (admin: Usuario, datos: DatosDescuento, id?: string) => Resultado
  cambiarEstadoDescuento: (admin: Usuario, id: string, activo: boolean) => Resultado
}

export type DatosDescuento = Omit<Descuento, 'id' | 'activo'>

const DatosContext = createContext<Datos | null>(null)

const esEntero = (n: number) => Number.isInteger(n) && n >= 0

/** Almacén en memoria que sustituye al backend mientras construimos la interfaz. */
export function DatosProvider({ children }: { children: ReactNode }) {
  const [existencias, setExistencias] = useState(existenciasIniciales)
  const [ventas, setVentas] = useState(ventasIniciales)
  const [registro, setRegistro] = useState(registroInicial)
  const [usuarios, setUsuarios] = useState(usuariosIniciales)
  const [productos, setProductos] = useState(productosIniciales)
  const [descuentos, setDescuentos] = useState(descuentosIniciales)

  const nombreProducto = useCallback((id: string) => productos.find((p) => p.id === id)?.nombre ?? id, [productos])

  const existenciaDe = useCallback(
    (sucursalId: string, productoId: string) =>
      existencias.find((e) => e.sucursalId === sucursalId && e.productoId === productoId),
    [existencias],
  )

  const anotar = useCallback((usuario: Usuario, accion: string, detalle: string) => {
    setRegistro((actual) => [
      ...actual,
      {
        id: `r-${Date.now()}-${actual.length}`,
        fecha: new Date().toISOString(),
        usuarioId: usuario.id,
        sucursalId: usuario.sucursalId,
        accion,
        detalle,
      },
    ])
  }, [])

  /** Aplica un cambio a una existencia de la sucursal del usuario, validando su rol. */
  const modificar = useCallback(
    (
      usuario: Usuario,
      roles: Usuario['rol'][],
      productoId: string,
      cambio: (e: Existencia) => Existencia | string,
    ): Resultado & { previa?: Existencia } => {
      if (!roles.includes(usuario.rol) || !usuario.sucursalId) {
        return { ok: false, error: 'No tienes permiso para hacer esto.' }
      }
      const actual = existencias.find((e) => e.sucursalId === usuario.sucursalId && e.productoId === productoId)
      if (!actual) return { ok: false, error: 'El producto no existe en esta sucursal.' }
      const nueva = cambio(actual)
      if (typeof nueva === 'string') return { ok: false, error: nueva }
      setExistencias((todas) => todas.map((e) => (e === actual ? nueva : e)))
      return { ok: true, previa: actual }
    },
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
    [existencias, ventas, productos, descuentos],
  )

  // Barista o gerente; requiere motivo y no cambia la existencia (reglas 44 a 47).
  const marcarAgotado = useCallback(
    (usuario: Usuario, productoId: string, motivo: string) => {
      const limpio = motivo.trim()
      const resultado = modificar(usuario, ['barista', 'gerente'], productoId, (e) => {
        if (!limpio) return 'Indica un motivo.'
        if (e.agotadoManual) return 'El producto ya está marcado como agotado.'
        return { ...e, agotadoManual: { motivo: limpio, usuarioId: usuario.id, fecha: new Date().toISOString() } }
      })
      if (resultado.ok) anotar(usuario, 'Agotado manual', `${nombreProducto(productoId)} · ${limpio}`)
      return resultado
    },
    [modificar, anotar, nombreProducto],
  )

  // Solo el gerente quita la marca puesta a mano (regla 48).
  const quitarAgotado = useCallback(
    (usuario: Usuario, productoId: string) => {
      const resultado = modificar(usuario, ['gerente'], productoId, (e) =>
        e.agotadoManual ? { ...e, agotadoManual: null } : 'El producto no tiene agotado manual.',
      )
      if (resultado.ok) anotar(usuario, 'Agotado manual retirado', nombreProducto(productoId))
      return resultado
    },
    [modificar, anotar, nombreProducto],
  )

  const registrarEntrada = useCallback(
    (usuario: Usuario, productoId: string, cantidad: number) => {
      const resultado = modificar(usuario, ['gerente'], productoId, (e) => {
        if (!esEntero(cantidad) || cantidad === 0) return 'La cantidad debe ser un número entero mayor que cero.'
        return { ...e, cantidad: e.cantidad + cantidad }
      })
      if (resultado.ok) {
        const antes = resultado.previa?.cantidad ?? 0
        anotar(usuario, 'Entrada de mercancía', `${nombreProducto(productoId)} · +${cantidad} (${antes} → ${antes + cantidad})`)
      }
      return resultado
    },
    [modificar, anotar, nombreProducto],
  )

  // La existencia nunca es negativa y toda corrección lleva motivo (reglas 21 y 37).
  const corregirConteo = useCallback(
    (usuario: Usuario, productoId: string, cantidad: number, motivo: string) => {
      const resultado = modificar(usuario, ['gerente'], productoId, (e) => {
        if (!esEntero(cantidad)) return 'El conteo debe ser un número entero de cero o más.'
        if (!motivo) return 'Indica un motivo.'
        if (cantidad === e.cantidad) return 'El conteo es igual al actual.'
        return { ...e, cantidad }
      })
      if (resultado.ok) {
        const antes = resultado.previa?.cantidad
        anotar(usuario, 'Corrección de conteo', `${nombreProducto(productoId)} · ${antes} → ${cantidad} · ${motivo}`)
      }
      return resultado
    },
    [modificar, anotar, nombreProducto],
  )

  const cambiarLimite = useCallback(
    (usuario: Usuario, productoId: string, limite: number) => {
      const resultado = modificar(usuario, ['gerente'], productoId, (e) => {
        if (!esEntero(limite)) return 'El límite debe ser un número entero de cero o más.'
        return { ...e, limiteStockBajo: limite }
      })
      if (resultado.ok) {
        const antes = resultado.previa?.limiteStockBajo
        anotar(usuario, 'Límite de stock bajo', `${nombreProducto(productoId)} · ${antes} → ${limite}`)
      }
      return resultado
    },
    [modificar, anotar, nombreProducto],
  )

  // Solo el gerente de la sucursal, el mismo día, con motivo; devuelve las unidades (reglas 61 a 64).
  const cancelarVenta = useCallback(
    (usuario: Usuario, ventaId: string, motivo: string): Resultado => {
      const venta = ventas.find((v) => v.id === ventaId)
      const limpio = motivo.trim()
      if (!venta) return { ok: false, error: 'La venta no existe.' }
      if (usuario.rol !== 'gerente' || usuario.sucursalId !== venta.sucursalId) {
        return { ok: false, error: 'Solo el gerente de la sucursal puede cancelar esta venta.' }
      }
      if (venta.cancelacion) return { ok: false, error: 'La venta ya está cancelada.' }
      if (!esHoy(venta.fecha)) return { ok: false, error: 'Solo se pueden cancelar ventas del día.' }
      if (!limpio) return { ok: false, error: 'Indica un motivo.' }

      const cancelacion = { motivo: limpio, usuarioId: usuario.id, fecha: new Date().toISOString() }
      setVentas((actuales) => actuales.map((v) => (v.id === ventaId ? { ...v, cancelacion } : v)))
      setExistencias((actuales) =>
        actuales.map((e) => {
          const linea = venta.lineas.find((l) => l.productoId === e.productoId)
          return linea && e.sucursalId === venta.sucursalId ? { ...e, cantidad: e.cantidad + linea.cantidad } : e
        }),
      )
      anotar(usuario, 'Cancelación de venta', `Folio ${venta.folio} · ${limpio}`)
      return { ok: true }
    },
    [ventas, anotar],
  )

  // Un gerente solo da de alta baristas de su propia sucursal (regla 11).
  const crearBarista = useCallback(
    (gerente: Usuario, nombre: string): Resultado => {
      const limpio = nombre.trim().replace(/\s+/g, ' ')
      if (gerente.rol !== 'gerente' || !gerente.sucursalId) {
        return { ok: false, error: 'Solo un gerente puede dar de alta baristas.' }
      }
      if (limpio.length < 3) return { ok: false, error: 'Escribe el nombre completo.' }
      const repetido = usuarios.some(
        (u) => u.sucursalId === gerente.sucursalId && u.nombre.toLowerCase() === limpio.toLowerCase(),
      )
      if (repetido) return { ok: false, error: 'Ya existe una persona con ese nombre en la sucursal.' }

      const nuevo: Usuario = {
        id: `u-b-${gerente.sucursalId}-${Date.now()}`,
        nombre: limpio,
        rol: 'barista',
        sucursalId: gerente.sucursalId,
        activo: true,
      }
      setUsuarios((actuales) => [...actuales, nuevo])
      anotar(gerente, 'Alta de barista', limpio)
      return { ok: true }
    },
    [usuarios, anotar],
  )

  // Desactivar, nunca borrar: el historial se conserva (reglas 11 a 13).
  const desactivarBarista = useCallback(
    (gerente: Usuario, baristaId: string): Resultado => {
      const barista = usuarios.find((u) => u.id === baristaId)
      if (!barista || barista.rol !== 'barista') return { ok: false, error: 'La persona no es barista.' }
      if (gerente.rol !== 'gerente' || gerente.sucursalId !== barista.sucursalId) {
        return { ok: false, error: 'Solo el gerente de su sucursal puede desactivarla.' }
      }
      if (!barista.activo) return { ok: false, error: 'Ya está desactivada.' }
      setUsuarios((actuales) => actuales.map((u) => (u.id === baristaId ? { ...u, activo: false } : u)))
      anotar(gerente, 'Desactivación de barista', barista.nombre)
      return { ok: true }
    },
    [usuarios, anotar],
  )

  // Catálogo y precios: únicamente el admin general (reglas 29 a 31).
  const soloAdmin = (usuario: Usuario): Resultado | null =>
    usuario.rol === 'admin' ? null : { ok: false, error: 'Solo el admin general puede modificar el catálogo.' }

  const crearProducto = useCallback(
    (admin: Usuario, nuevo: { nombre: string; categoria: Categoria; precio: number }): Resultado => {
      const negado = soloAdmin(admin)
      if (negado) return negado
      const nombre = nuevo.nombre.trim().replace(/\s+/g, ' ')
      const precio = Math.round(nuevo.precio * 100) / 100
      if (nombre.length < 2) return { ok: false, error: 'Escribe el nombre del producto.' }
      if (!(precio > 0)) return { ok: false, error: 'El precio debe ser mayor que cero.' }
      if (productos.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        return { ok: false, error: 'Ya existe un producto con ese nombre.' }
      }
      const id = `${nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`

      setProductos((actuales) => [...actuales, { id, nombre, categoria: nuevo.categoria, precio, activo: true }])
      // Un producto nuevo empieza con existencia cero en todas las sucursales (regla 40).
      setExistencias((actuales) => [
        ...actuales,
        ...sucursales
          .filter((s) => s.activa)
          .map((s) => ({ productoId: id, sucursalId: s.id, cantidad: 0, limiteStockBajo: 5, agotadoManual: null })),
      ])
      anotar(admin, 'Alta de producto', `${nombre} · ${nuevo.categoria} · $${precio.toFixed(2)}`)
      return { ok: true }
    },
    [productos, anotar],
  )

  // El cambio de precio solo afecta ventas nuevas y queda registrado (reglas 34 y 78).
  const cambiarPrecio = useCallback(
    (admin: Usuario, productoId: string, precio: number): Resultado => {
      const negado = soloAdmin(admin)
      if (negado) return negado
      const producto = productos.find((p) => p.id === productoId)
      const nuevo = Math.round(precio * 100) / 100
      if (!producto) return { ok: false, error: 'El producto no existe.' }
      if (!producto.activo) return { ok: false, error: 'El producto está dado de baja.' }
      if (!(nuevo > 0)) return { ok: false, error: 'El precio debe ser mayor que cero.' }
      if (nuevo === producto.precio) return { ok: false, error: 'El precio es igual al actual.' }
      setProductos((actuales) => actuales.map((p) => (p.id === productoId ? { ...p, precio: nuevo } : p)))
      anotar(admin, 'Cambio de precio', `${producto.nombre}: $${producto.precio.toFixed(2)} → $${nuevo.toFixed(2)}`)
      return { ok: true }
    },
    [productos, anotar],
  )

  // La baja es lógica: deja de venderse en todas las sucursales y conserva su historial (reglas 32 y 33).
  const darDeBajaProducto = useCallback(
    (admin: Usuario, productoId: string): Resultado => {
      const negado = soloAdmin(admin)
      if (negado) return negado
      const producto = productos.find((p) => p.id === productoId)
      if (!producto) return { ok: false, error: 'El producto no existe.' }
      if (!producto.activo) return { ok: false, error: 'El producto ya está dado de baja.' }
      setProductos((actuales) => actuales.map((p) => (p.id === productoId ? { ...p, activo: false } : p)))
      anotar(admin, 'Baja de producto', producto.nombre)
      return { ok: true }
    },
    [productos, anotar],
  )

  const describir = (d: DatosDescuento) =>
    `${d.tipo === 'porcentaje' ? `${d.valor}%` : `$${d.valor.toFixed(2)}`}${d.vigenteHasta ? ` hasta ${d.vigenteHasta}` : ' sin vencimiento'}`

  // Solo el admin crea, modifica o desactiva descuentos (regla 66). Las ventas ya hechas guardan su monto.
  const guardarDescuento = useCallback(
    (admin: Usuario, datos: DatosDescuento, id?: string): Resultado => {
      const negado = soloAdmin(admin)
      if (negado) return negado
      const nombre = datos.nombre.trim().replace(/\s+/g, ' ')
      const valor = Math.round(datos.valor * 100) / 100
      if (nombre.length < 2) return { ok: false, error: 'Escribe el nombre del descuento.' }
      if (!(valor > 0)) return { ok: false, error: 'El valor debe ser mayor que cero.' }
      if (datos.tipo === 'porcentaje' && valor > 100) return { ok: false, error: 'El porcentaje no puede pasar de 100.' }
      if (descuentos.some((d) => d.id !== id && d.nombre.toLowerCase() === nombre.toLowerCase())) {
        return { ok: false, error: 'Ya existe un descuento con ese nombre.' }
      }
      const limpio = { nombre, tipo: datos.tipo, valor, vigenteHasta: datos.vigenteHasta || null }
      if (id) {
        const previo = descuentos.find((d) => d.id === id)
        if (!previo) return { ok: false, error: 'El descuento no existe.' }
        setDescuentos((actuales) => actuales.map((d) => (d.id === id ? { ...d, ...limpio } : d)))
        anotar(admin, 'Cambio de descuento', `${nombre}: ${describir(previo)} → ${describir(limpio)}`)
      } else {
        setDescuentos((actuales) => [...actuales, { id: `d-${Date.now().toString(36)}`, activo: true, ...limpio }])
        anotar(admin, 'Alta de descuento', `${nombre} · ${describir(limpio)}`)
      }
      return { ok: true }
    },
    [descuentos, anotar],
  )

  const cambiarEstadoDescuento = useCallback(
    (admin: Usuario, id: string, activo: boolean): Resultado => {
      const negado = soloAdmin(admin)
      if (negado) return negado
      const descuento = descuentos.find((d) => d.id === id)
      if (!descuento) return { ok: false, error: 'El descuento no existe.' }
      if (descuento.activo === activo) return { ok: false, error: 'El descuento ya está en ese estado.' }
      setDescuentos((actuales) => actuales.map((d) => (d.id === id ? { ...d, activo } : d)))
      anotar(admin, activo ? 'Reactivación de descuento' : 'Desactivación de descuento', descuento.nombre)
      return { ok: true }
    },
    [descuentos, anotar],
  )

  const valor = useMemo(
    () => ({
      existencias,
      ventas,
      registro,
      existenciaDe,
      registrarVenta,
      marcarAgotado,
      quitarAgotado,
      registrarEntrada,
      corregirConteo,
      cambiarLimite,
      cancelarVenta,
      usuarios,
      crearBarista,
      desactivarBarista,
      productos,
      descuentos,
      crearProducto,
      cambiarPrecio,
      darDeBajaProducto,
      guardarDescuento,
      cambiarEstadoDescuento,
    }),
    [
      existencias,
      ventas,
      registro,
      existenciaDe,
      registrarVenta,
      marcarAgotado,
      quitarAgotado,
      registrarEntrada,
      corregirConteo,
      cambiarLimite,
      cancelarVenta,
      usuarios,
      crearBarista,
      desactivarBarista,
      productos,
      descuentos,
      crearProducto,
      cambiarPrecio,
      darDeBajaProducto,
      guardarDescuento,
      cambiarEstadoDescuento,
    ],
  )
  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useDatos() {
  const contexto = useContext(DatosContext)
  if (!contexto) throw new Error('useDatos debe usarse dentro de DatosProvider')
  return contexto
}
