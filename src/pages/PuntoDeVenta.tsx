import { AnimatePresence, motion } from 'motion/react'
import { Search, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Tabs } from '../components/ui/Tabs'
import { useAviso } from '../components/ui/Toast'
import { TarjetaProducto } from '../components/venta/TarjetaProducto'
import { Ticket, type LineaTicket } from '../components/venta/Ticket'
import { useDatos } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { descuentos, productos } from '../data/catalogo'
import { formatoMoneda } from '../lib/formato'
import { calcularDescuento, descuentoVigente, estadoExistencia } from '../lib/reglas'
import type { Categoria, MetodoPago } from '../types'

const categorias: Array<Categoria | 'Todo'> = ['Todo', 'Café caliente', 'Café frío', 'Otras bebidas', 'Panadería']

export function PuntoDeVenta() {
  const { usuario, sucursal } = useSesion()
  const { existenciaDe, registrarVenta } = useDatos()
  const avisar = useAviso()

  const [categoria, setCategoria] = useState<string>('Todo')
  const [busqueda, setBusqueda] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [descuentoId, setDescuentoId] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('tarjeta')
  const [recibido, setRecibido] = useState('')
  const [ticketAbierto, setTicketAbierto] = useState(false)

  const sucursalId = sucursal?.id ?? ''

  // Solo productos activos del catálogo (regla 32); los agotados se muestran al final, sin poder venderse.
  const catalogo = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => p.activo)
      .filter((p) => categoria === 'Todo' || p.categoria === categoria)
      .filter((p) => !termino || p.nombre.toLowerCase().includes(termino))
      .map((producto) => {
        const existencia = existenciaDe(sucursalId, producto.id)
        return {
          producto,
          cantidad: existencia?.cantidad ?? 0,
          estado: existencia ? estadoExistencia(existencia) : ('agotado' as const),
        }
      })
      .sort((a, b) => Number(a.estado === 'agotado') - Number(b.estado === 'agotado'))
  }, [busqueda, categoria, existenciaDe, sucursalId])

  const lineas: LineaTicket[] = Object.entries(cantidades).map(([productoId, cantidad]) => ({
    producto: productos.find((p) => p.id === productoId)!,
    cantidad,
    maximo: existenciaDe(sucursalId, productoId)?.cantidad ?? 0,
  }))

  const descuentosValidos = descuentos.filter((d) => descuentoVigente(d))
  const subtotal = lineas.reduce((suma, l) => suma + l.producto.precio * l.cantidad, 0)
  const montoDescuento = calcularDescuento(subtotal, descuentos.find((d) => d.id === descuentoId))
  const total = subtotal - montoDescuento
  const piezas = lineas.reduce((suma, l) => suma + l.cantidad, 0)

  const cambiarCantidad = (productoId: string, cantidad: number) =>
    setCantidades((actuales) => {
      const { [productoId]: _, ...resto } = actuales
      return cantidad > 0 ? { ...resto, [productoId]: cantidad } : resto
    })

  const vaciar = () => {
    setCantidades({})
    setDescuentoId(null)
    setRecibido('')
  }

  const cobrar = () => {
    if (!usuario) return
    const resultado = registrarVenta({
      sucursalId,
      usuarioId: usuario.id,
      lineas: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
      descuentoId,
      metodoPago,
    })
    if (!resultado.ok) {
      avisar(resultado.error, 'error')
      return
    }
    avisar(`Venta ${resultado.venta.folio} registrada · ${formatoMoneda(resultado.venta.total)}`)
    vaciar()
    setTicketAbierto(false)
  }

  const ticket = (ocultarTitulo = false) => (
    <Ticket
      ocultarTitulo={ocultarTitulo}
      lineas={lineas}
      descuentos={descuentosValidos}
      descuentoId={descuentoId}
      metodoPago={metodoPago}
      recibido={recibido}
      subtotal={subtotal}
      montoDescuento={montoDescuento}
      total={total}
      alCambiarCantidad={cambiarCantidad}
      alCambiarDescuento={setDescuentoId}
      alCambiarMetodo={setMetodoPago}
      alCambiarRecibido={setRecibido}
      alVaciar={vaciar}
      alCobrar={cobrar}
    />
  )

  return (
    <Pagina titulo="Vender" descripcion={`Sucursal ${sucursal?.nombre ?? ''}`} ancho="completo">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 pb-20 lg:pb-0">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-5 min-w-0 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <Tabs
                valor={categoria}
                alCambiar={setCategoria}
                opciones={categorias.map((c) => ({ valor: c, etiqueta: c }))}
              />
            </div>
            <label className="relative flex shrink-0 items-center sm:w-56">
              <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 text-tinta-tenue" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto"
                aria-label="Buscar producto"
                className="h-10 w-full rounded-md border border-linea-fuerte bg-papel pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-tinta-tenue hover:border-tinta-tenue focus:border-espresso"
              />
            </label>
          </div>

          {catalogo.length === 0 ? (
            <EmptyState icono={Search} titulo="Sin resultados" descripcion="Prueba con otro nombre o categoría." />
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {catalogo.map(({ producto, cantidad, estado }, indice) => (
                  <motion.div
                    key={producto.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: indice * 0.015, duration: 0.25 } }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  >
                    <TarjetaProducto
                      producto={producto}
                      estado={estado}
                      existencia={cantidad}
                      enTicket={cantidades[producto.id] ?? 0}
                      alAgregar={() => cambiarCantidad(producto.id, (cantidades[producto.id] ?? 0) + 1)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* Ticket fijo en escritorio */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 max-h-[calc(100dvh-4rem)] rounded-md border border-linea bg-papel p-6">
            {ticket()}
          </div>
        </aside>
      </div>

      {/* Barra de ticket en móvil y tablet */}
      <AnimatePresence>
        {piezas > 0 && (
          <motion.button
            type="button"
            onClick={() => setTicketAbierto(true)}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="fixed inset-x-4 bottom-20 z-30 flex h-14 items-center justify-between rounded-md bg-espresso px-5 text-crema md:bottom-6 lg:hidden"
          >
            <span className="flex items-center gap-2.5 text-sm">
              <ShoppingBag size={16} strokeWidth={1.5} />
              <span className="cifra">{piezas} en el ticket</span>
            </span>
            <span className="cifra text-[15px] font-medium">{formatoMoneda(total)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <Dialog abierto={ticketAbierto} alCambiar={setTicketAbierto} titulo="Ticket" forma="lateral">
        {ticket(true)}
      </Dialog>
    </Pagina>
  )
}
