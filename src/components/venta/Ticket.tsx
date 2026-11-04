import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, Receipt } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { formatoMoneda } from '../../lib/formato'
import { etiquetaDescuento } from '../../lib/reglas'
import type { Descuento, MetodoPago, Producto } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Tabs } from '../ui/Tabs'

export interface LineaTicket {
  producto: Producto
  cantidad: number
  maximo: number
}

interface TicketProps {
  lineas: LineaTicket[]
  descuentos: Descuento[]
  descuentoId: string | null
  metodoPago: MetodoPago
  recibido: string
  subtotal: number
  montoDescuento: number
  total: number
  alCambiarCantidad: (productoId: string, cantidad: number) => void
  alCambiarDescuento: (id: string | null) => void
  alCambiarMetodo: (metodo: MetodoPago) => void
  alCambiarRecibido: (valor: string) => void
  alVaciar: () => void
  alCobrar: () => void
  /** Oculta el título cuando el contenedor ya lo muestra (panel en móvil). */
  ocultarTitulo?: boolean
}

const SIN_DESCUENTO = 'ninguno'

export function Ticket(props: TicketProps) {
  const { lineas, descuentos, descuentoId, metodoPago, recibido, subtotal, montoDescuento, total } = props
  const piezas = lineas.reduce((suma, l) => suma + l.cantidad, 0)
  const efectivoRecibido = Number(recibido) || 0
  const faltaEfectivo = metodoPago === 'efectivo' && recibido !== '' && efectivoRecibido < total
  const vacio = lineas.length === 0
  const cambio =
    metodoPago === 'efectivo' && !vacio && recibido !== '' && efectivoRecibido >= total ? efectivoRecibido - total : null

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline justify-between pb-4">
        <h2 className={cn('text-lg font-medium tracking-tight', props.ocultarTitulo && 'sr-only')}>Ticket</h2>
        <span className={cn('cifra mr-auto text-sm text-tinta-tenue', !props.ocultarTitulo && 'ml-2')}>{piezas > 0 && `${piezas} ${piezas === 1 ? 'pieza' : 'piezas'}`}</span>
        {!vacio && (
          <button
            type="button"
            onClick={props.alVaciar}
            className="text-[13px] text-tinta-tenue transition-colors hover:text-ladrillo"
          >
            Vaciar
          </button>
        )}
      </header>

      <div className="-mx-1 min-h-40 flex-1 overflow-y-auto px-1">
        {vacio ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
            <Receipt size={22} strokeWidth={1.25} className="mb-3 text-tinta-tenue" />
            <p className="text-sm text-tinta-suave">Toca un producto para agregarlo.</p>
          </div>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {lineas.map(({ producto, cantidad, maximo }) => (
                <motion.li
                  key={producto.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 border-b border-linea py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{producto.nombre}</p>
                      <p className="cifra text-xs text-tinta-tenue">{formatoMoneda(producto.precio)}</p>
                    </div>
                    <div className="flex items-center rounded-md border border-linea">
                      <BotonCantidad
                        etiqueta={`Quitar un ${producto.nombre}`}
                        onClick={() => props.alCambiarCantidad(producto.id, cantidad - 1)}
                      >
                        <Minus size={13} strokeWidth={1.75} />
                      </BotonCantidad>
                      <span className="cifra w-7 text-center text-sm">{cantidad}</span>
                      <BotonCantidad
                        etiqueta={`Agregar un ${producto.nombre}`}
                        disabled={cantidad >= maximo}
                        onClick={() => props.alCambiarCantidad(producto.id, cantidad + 1)}
                      >
                        <Plus size={13} strokeWidth={1.75} />
                      </BotonCantidad>
                    </div>
                    <span className="cifra w-20 text-right text-sm">{formatoMoneda(producto.precio * cantidad)}</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 pt-5">
        <Select
          etiqueta="Descuento"
          valor={descuentoId ?? SIN_DESCUENTO}
          alCambiar={(v) => props.alCambiarDescuento(v === SIN_DESCUENTO ? null : v)}
          opciones={[
            { valor: SIN_DESCUENTO, etiqueta: 'Sin descuento' },
            ...descuentos.map((d) => ({ valor: d.id, etiqueta: etiquetaDescuento(d) })),
          ]}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-tinta-suave">Método de pago</span>
          <Tabs
            valor={metodoPago}
            alCambiar={(v) => props.alCambiarMetodo(v as MetodoPago)}
            opciones={[
              { valor: 'efectivo', etiqueta: 'Efectivo' },
              { valor: 'tarjeta', etiqueta: 'Tarjeta' },
            ]}
            className="w-full"
          />
        </div>

        <AnimatePresence initial={false}>
          {metodoPago === 'efectivo' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden"
            >
              <Input
                name="recibido"
                etiqueta="Efectivo recibido"
                inputMode="decimal"
                placeholder="0.00"
                value={recibido}
                onChange={(e) => props.alCambiarRecibido(e.target.value.replace(/[^\d.]/g, ''))}
                error={faltaEfectivo ? 'El efectivo no cubre el total.' : undefined}
                className="cifra"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <dl className="cifra flex flex-col gap-1.5 border-t border-linea pt-4 text-sm">
          <Fila etiqueta="Subtotal" valor={formatoMoneda(subtotal)} />
          {montoDescuento > 0 && <Fila etiqueta="Descuento" valor={`−${formatoMoneda(montoDescuento)}`} acento />}
          {cambio !== null && <Fila etiqueta="Cambio" valor={formatoMoneda(cambio)} />}
          <div className="mt-2 flex items-baseline justify-between">
            <dt className="text-tinta-suave">Total</dt>
            <dd className="text-3xl font-medium tracking-tight">{formatoMoneda(total)}</dd>
          </div>
        </dl>

        <Button tamano="lg" onClick={props.alCobrar} disabled={vacio || faltaEfectivo} className="w-full">
          Cobrar {formatoMoneda(total)}
        </Button>
      </div>
    </div>
  )
}

function Fila({ etiqueta, valor, acento }: { etiqueta: string; valor: string; acento?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className={cn(acento && 'text-oliva')}>{valor}</dd>
    </div>
  )
}

function BotonCantidad({
  etiqueta,
  ...props
}: { etiqueta: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      className="grid size-8 place-items-center text-tinta-suave transition-colors hover:text-tinta disabled:opacity-30"
      {...props}
    />
  )
}
