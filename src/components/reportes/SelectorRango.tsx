import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { claveDia } from '../../lib/formato'
import type { RangoFechas } from '../../lib/reporte'
import { Tabs } from '../ui/Tabs'

type Preajuste = 'hoy' | 'ayer' | 'semana' | 'personalizado'

const desplazar = (dias: number) => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return claveDia(fecha)
}

function rangoDe(preajuste: Exclude<Preajuste, 'personalizado'>): RangoFechas {
  if (preajuste === 'hoy') return { desde: desplazar(0), hasta: desplazar(0) }
  if (preajuste === 'ayer') return { desde: desplazar(1), hasta: desplazar(1) }
  return { desde: desplazar(6), hasta: desplazar(0) }
}

// oxlint-disable-next-line react/only-export-components
export const rangoInicial = () => rangoDe('semana')

interface SelectorRangoProps {
  rango: RangoFechas
  alCambiar: (rango: RangoFechas) => void
  /** Primer día con datos (AAAA-MM-DD). */
  minimo: string
}

/** Filtro por rango de fechas con atajos (regla 76). */
export function SelectorRango({ rango, alCambiar, minimo }: SelectorRangoProps) {
  const [preajuste, setPreajuste] = useState<Preajuste>('semana')
  const hoy = desplazar(0)

  const elegir = (valor: string) => {
    const nuevo = valor as Preajuste
    setPreajuste(nuevo)
    if (nuevo !== 'personalizado') alCambiar(rangoDe(nuevo))
  }

  const campo =
    'cifra h-10 rounded-md border border-linea-fuerte bg-papel px-3 text-sm outline-none transition-colors hover:border-tinta-tenue focus:border-espresso'

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <Tabs
          valor={preajuste}
          alCambiar={elegir}
          opciones={[
            { valor: 'hoy', etiqueta: 'Hoy' },
            { valor: 'ayer', etiqueta: 'Ayer' },
            { valor: 'semana', etiqueta: 'Últimos 7 días' },
            { valor: 'personalizado', etiqueta: 'Personalizado' },
          ]}
        />
      </div>
      <AnimatePresence initial={false}>
        {preajuste === 'personalizado' && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="flex items-center gap-2"
          >
            <input
              type="date"
              aria-label="Desde"
              className={campo}
              value={rango.desde}
              min={minimo}
              max={rango.hasta}
              onChange={(e) => e.target.value && alCambiar({ ...rango, desde: e.target.value })}
            />
            <span className="text-sm text-tinta-tenue">a</span>
            <input
              type="date"
              aria-label="Hasta"
              className={campo}
              value={rango.hasta}
              min={rango.desde}
              max={hoy}
              onChange={(e) => e.target.value && alCambiar({ ...rango, hasta: e.target.value })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
