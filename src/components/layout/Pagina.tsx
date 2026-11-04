import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface PaginaProps {
  titulo: string
  descripcion?: string
  acciones?: ReactNode
  children: ReactNode
  ancho?: 'normal' | 'completo'
}

/** Contenedor de cada pantalla: encabezado editorial y entrada suave. */
export function Pagina({ titulo, descripcion, acciones, children, ancho = 'normal' }: PaginaProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
      className={cn('mx-auto w-full px-5 py-8 md:px-10 md:py-12', ancho === 'normal' ? 'max-w-6xl' : 'max-w-[96rem]')}
    >
      <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-4xl leading-none tracking-tight md:text-5xl">{titulo}</h1>
          {descripcion && <p className="mt-3 text-tinta-suave">{descripcion}</p>}
        </div>
        {acciones && <div className="flex gap-2">{acciones}</div>}
      </header>
      {children}
    </motion.div>
  )
}
