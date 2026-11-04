import * as RadixTabs from '@radix-ui/react-tabs'
import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '../../lib/cn'

interface TabsProps {
  valor: string
  alCambiar: (valor: string) => void
  opciones: { valor: string; etiqueta: string }[]
  className?: string
}

/** Control segmentado con un indicador que se desliza entre opciones. */
export function Tabs({ valor, alCambiar, opciones, className }: TabsProps) {
  const grupo = useId()
  return (
    <RadixTabs.Root value={valor} onValueChange={alCambiar}>
      <RadixTabs.List className={cn('relative inline-flex rounded-md bg-hueso p-1', className)}>
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor
          return (
            <RadixTabs.Trigger
              key={opcion.valor}
              value={opcion.valor}
              className={cn(
                'relative h-8 flex-1 rounded-sm px-3 text-[13px] font-medium whitespace-nowrap outline-none',
                'transition-colors duration-200',
                activo ? 'text-tinta' : 'text-tinta-suave hover:text-tinta',
              )}
            >
              {activo && (
                <motion.span
                  layoutId={`indicador-${grupo}`}
                  className="absolute inset-0 rounded-sm bg-papel shadow-[0_1px_2px_rgb(28_25_23/0.08)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">{opcion.etiqueta}</span>
            </RadixTabs.Trigger>
          )
        })}
      </RadixTabs.List>
    </RadixTabs.Root>
  )
}
