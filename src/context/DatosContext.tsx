import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { descuentos, productos, usuarios as usuariosIniciales } from '../data/catalogo'
import {
  existencias as existenciasIniciales,
  registroAcciones as registroInicial,
  ventas as ventasIniciales,
} from '../data/movimientos'
import { esHoy } from '../lib/formato'
import { calcularDescuento, descuentoVigente, estaDisponible } from '../lib/reglas'
import type { Existencia, LineaVenta, MetodoPago, RegistroAccion, Usuario, Venta } from '../types'

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
}

const DatosContext = createContext<Datos | null>(null)

const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? id
const esEntero = (n: number) => Number.isInteger(n) && n >= 0

/** Almacén en memoria que sustituye al backend mientras construimos la interfaz. */
export function DatosProvider({ children }: { children: ReactNode }) {
  const [existencias, setExistencias] = useState(existenciasIniciales)
  const [ventas, setVentas] = useState(ventasIniciales)
  const [registro, setRegistro] = useState(registroInicial)
  const [usuarios, setUsuarios] = useState(usuariosIniciales)

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
    [existencias, ventas],
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
    [modificar, anotar],
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
    [modificar, anotar],
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
    [modificar, anotar],
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
    [modificar, anotar],
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
    [modificar, anotar],
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
