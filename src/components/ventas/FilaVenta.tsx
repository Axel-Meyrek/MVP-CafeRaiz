import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { useDatos } from '../../context/DatosContext'
import { descuentos, productos } from '../../data/catalogo'
import { cn } from '../../lib/cn'
import { formatoFecha, formatoHora, formatoMoneda } from '../../lib/formato'
import type { Venta } from '../../types'
import { Badge } from '../ui/Badge'

const suave = [0.25, 1, 0.5, 1] as const
const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? 'Producto'
const nombreMetodo = { efectivo: 'Efectivo', tarjeta: 'Tarjeta' } as const

interface FilaVentaProps {
  venta: Venta
  abierta: boolean
  alAlternar: () => void
  /** Muestra quién registró la venta (vista del gerente). */
  mostrarVendedor?: boolean
  /** Muestra la fecha además de la hora (rangos de varios días). */
  mostrarFecha?: boolean
  /** Contenido extra al final del detalle, como el botón de cancelar. */
  pie?: ReactNode
}

export function FilaVenta({ venta, abierta, alAlternar, mostrarVendedor, mostrarFecha, pie }: FilaVentaProps) {
  const cancelada = !!venta.cancelacion
  const resumen = venta.lineas
    .map((l) => (l.cantidad > 1 ? `${l.cantidad} ${nombreProducto(l.productoId)}` : nombreProducto(l.productoId)))
    .join(', ')
  const subtotal = venta.lineas.reduce((suma, l) => suma + l.cantidad * l.precioUnitario, 0)
  const descuento = descuentos.find((d) => d.id === venta.descuentoId)
  const { usuarios } = useDatos()
  const vendedor = usuarios.find((u) => u.id === venta.usuarioId)?.nombre

  return (
    <>
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={abierta}
        className="group flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-hueso/50 md:gap-6 md:px-2"
      >
        <span className={cn('cifra shrink-0 text-sm text-tinta-tenue', mostrarFecha ? 'w-16' : 'w-12')}>
          {mostrarFecha && <span className="block text-xs">{formatoFecha(venta.fecha)}</span>}
          {formatoHora(venta.fecha)}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-medium', cancelada && 'text-tinta-tenue')}>{resumen}</span>
          <span className="cifra mt-0.5 block text-xs text-tinta-tenue">
            Folio {venta.folio} · {nombreMetodo[venta.metodoPago]}
            {mostrarVendedor && vendedor && ` · ${vendedor}`}
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
            <div
              className={cn(
                'cifra mb-5 flex max-w-md flex-col gap-2 pt-1 text-sm',
                mostrarFecha ? 'ml-20 md:ml-24' : 'ml-16 md:ml-20',
              )}
            >
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
              {pie}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
