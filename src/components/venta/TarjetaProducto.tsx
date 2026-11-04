import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../lib/cn'
import { formatoMoneda } from '../../lib/formato'
import type { EstadoExistencia } from '../../lib/reglas'
import type { Producto } from '../../types'

interface TarjetaProductoProps {
  producto: Producto
  estado: EstadoExistencia
  existencia: number
  enTicket: number
  alAgregar: () => void
}

export function TarjetaProducto({ producto, estado, existencia, enTicket, alAgregar }: TarjetaProductoProps) {
  const agotado = estado === 'agotado'
  const sinMas = enTicket >= existencia

  return (
    <motion.button
      layout="position"
      type="button"
      onClick={alAgregar}
      disabled={agotado || sinMas}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative flex h-full min-h-28 w-full flex-col justify-between rounded-md border bg-papel p-4 text-left',
        'transition-[border-color,background-color] duration-200 ease-suave',
        enTicket > 0 ? 'border-espresso/40' : 'border-linea hover:border-linea-fuerte',
        agotado && 'bg-transparent',
        'disabled:cursor-not-allowed',
      )}
    >
      <span className={cn('pr-8 text-[15px] leading-snug font-medium', agotado && 'text-tinta-tenue')}>
        {producto.nombre}
      </span>

      <span className="mt-4 flex items-end justify-between gap-2">
        <span className={cn('cifra text-sm', agotado ? 'text-tinta-tenue line-through' : 'text-tinta-suave')}>
          {formatoMoneda(producto.precio)}
        </span>
        {agotado ? (
          <span className="text-xs font-medium text-ladrillo">Agotado</span>
        ) : estado === 'bajo' ? (
          <span className="cifra text-xs font-medium text-ambar">Quedan {existencia - enTicket}</span>
        ) : null}
      </span>

      <AnimatePresence>
        {enTicket > 0 && (
          <motion.span
            key={enTicket}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className="cifra absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-espresso text-xs font-medium text-crema"
          >
            {enTicket}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
