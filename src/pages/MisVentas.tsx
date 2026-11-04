import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pagina } from '../components/layout/Pagina'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { StatNumber } from '../components/ui/StatNumber'
import { Tabs } from '../components/ui/Tabs'
import { useDatos } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { descuentos, productos, usuarios } from '../data/catalogo'
import { cn } from '../lib/cn'
import { esHoy, formatoFechaLarga, formatoHora, formatoMoneda } from '../lib/formato'
import type { Venta } from '../types'

const suave = [0.25, 1, 0.5, 1] as const
const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? 'Producto'
const nombreMetodo = { efectivo: 'Efectivo', tarjeta: 'Tarjeta' } as const

export function MisVentas() {
  const { usuario, sucursal } = useSesion()
  const { ventas } = useDatos()
  const navegar = useNavigate()
  const [filtro, setFiltro] = useState('todas')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [fecha] = useState(() => formatoFechaLarga(new Date()))

  // Un barista solo ve sus propias ventas del día (regla 26).
  const delDia = useMemo(
    () =>
      ventas
        .filter((v) => v.usuarioId === usuario?.id && esHoy(v.fecha))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [ventas, usuario?.id],
  )

  const vigentes = delDia.filter((v) => !v.cancelacion)
  const total = vigentes.reduce((suma, v) => suma + v.total, 0)
  const enEfectivo = vigentes.filter((v) => v.metodoPago === 'efectivo').reduce((suma, v) => suma + v.total, 0)
  const canceladas = delDia.length - vigentes.length
  const visibles = filtro === 'todas' ? delDia : delDia.filter((v) => v.metodoPago === filtro)

  const descripcion = `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · Sucursal ${sucursal?.nombre ?? ''}`

  return (
    <Pagina titulo="Mis ventas" descripcion={descripcion}>
      {delDia.length === 0 ? (
        <div className="border-t border-linea">
          <EmptyState
            icono={Receipt}
            titulo="Aún no tienes ventas hoy"
            descripcion="Las ventas que registres aparecerán aquí."
            accion={<Button onClick={() => navegar('/venta')}>Ir a vender</Button>}
          />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-y-8 border-y border-linea py-8 md:grid-cols-3">
            <StatNumber
              etiqueta="Vendido hoy"
              valor={formatoMoneda(total)}
              nota={`Efectivo ${formatoMoneda(enEfectivo)} · Tarjeta ${formatoMoneda(total - enEfectivo)}`}
              className="col-span-2 md:col-span-1"
            />
            <StatNumber
              etiqueta="Ventas"
              valor={String(vigentes.length)}
              nota={canceladas > 0 ? `${canceladas} cancelada${canceladas > 1 ? 's' : ''}` : 'Ninguna cancelada'}
              className="md:border-l md:border-linea md:pl-8"
            />
            <StatNumber
              etiqueta="Ticket promedio"
              valor={formatoMoneda(vigentes.length ? total / vigentes.length : 0)}
              className="border-l border-linea pl-6 md:pl-8"
            />
          </section>

          <div className="mt-10 mb-2 flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium tracking-tight">Detalle</h2>
            <Tabs
              valor={filtro}
              alCambiar={(valor) => {
                setFiltro(valor)
                setAbierta(null)
              }}
              opciones={[
                { valor: 'todas', etiqueta: 'Todas' },
                { valor: 'efectivo', etiqueta: 'Efectivo' },
                { valor: 'tarjeta', etiqueta: 'Tarjeta' },
              ]}
            />
          </div>

          {visibles.length === 0 ? (
            <p className="border-t border-linea py-12 text-center text-sm text-tinta-suave">
              No hay ventas con este método de pago.
            </p>
          ) : (
            <motion.ul key={filtro} initial="oculto" animate="visible" className="border-t border-linea">
              {visibles.map((venta, indice) => (
                <motion.li
                  key={venta.id}
                  variants={{
                    oculto: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0, transition: { delay: Math.min(indice, 12) * 0.025, ease: suave } },
                  }}
                  className="border-b border-linea"
                >
                  <FilaVenta
                    venta={venta}
                    abierta={abierta === venta.id}
                    alAlternar={() => setAbierta(abierta === venta.id ? null : venta.id)}
                  />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </>
      )}
    </Pagina>
  )
}

function FilaVenta({ venta, abierta, alAlternar }: { venta: Venta; abierta: boolean; alAlternar: () => void }) {
  const cancelada = !!venta.cancelacion
  const resumen = venta.lineas
    .map((l) => (l.cantidad > 1 ? `${l.cantidad} ${nombreProducto(l.productoId)}` : nombreProducto(l.productoId)))
    .join(', ')
  const subtotal = venta.lineas.reduce((suma, l) => suma + l.cantidad * l.precioUnitario, 0)
  const descuento = descuentos.find((d) => d.id === venta.descuentoId)

  return (
    <>
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={abierta}
        className="group flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-hueso/50 md:gap-6 md:px-2"
      >
        <span className="cifra w-12 shrink-0 text-sm text-tinta-tenue">{formatoHora(venta.fecha)}</span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-medium', cancelada && 'text-tinta-tenue')}>{resumen}</span>
          <span className="cifra mt-0.5 block text-xs text-tinta-tenue">
            Folio {venta.folio} · {nombreMetodo[venta.metodoPago]}
            {descuento && ` · ${descuento.nombre}`}
          </span>
        </span>
        {cancelada && (
          <span className="hidden sm:block">
            <Badge estado="agotado">Cancelada</Badge>
          </span>
        )}
        <span className={cn('cifra w-24 text-right text-[15px]', cancelada && 'text-tinta-tenue line-through')}>
          {formatoMoneda(venta.total)}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn(
            'shrink-0 text-tinta-tenue transition-transform duration-300 ease-suave',
            abierta && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: suave }}
            className="overflow-hidden"
          >
            <div className="cifra mb-5 ml-16 flex max-w-md pt-1 flex-col gap-2 text-sm md:ml-20">
              {venta.lineas.map((linea, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="text-tinta-suave">
                    {linea.cantidad} × {nombreProducto(linea.productoId)}
                    <span className="ml-2 text-tinta-tenue">{formatoMoneda(linea.precioUnitario)}</span>
                  </span>
                  <span>{formatoMoneda(linea.cantidad * linea.precioUnitario)}</span>
                </div>
              ))}
              {venta.montoDescuento > 0 && (
                <>
                  <div className="mt-1 flex justify-between border-t border-linea pt-2">
                    <span className="text-tinta-suave">Subtotal</span>
                    <span>{formatoMoneda(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-oliva">
                    <span>{descuento?.nombre ?? 'Descuento'}</span>
                    <span>−{formatoMoneda(venta.montoDescuento)}</span>
                  </div>
                </>
              )}
              {venta.cancelacion && (
                <p className="mt-2 border-t border-linea pt-3 text-[13px] text-ladrillo">
                  Cancelada a las {formatoHora(venta.cancelacion.fecha)} por{' '}
                  {usuarios.find((u) => u.id === venta.cancelacion?.usuarioId)?.nombre ?? 'el gerente'} ·{' '}
                  {venta.cancelacion.motivo}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
