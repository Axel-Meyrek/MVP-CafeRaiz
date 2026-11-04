import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icono: LucideIcon
  titulo: string
  descripcion?: string
  accion?: ReactNode
}

export function EmptyState({ icono: Icono, titulo, descripcion, accion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <Icono size={28} strokeWidth={1.25} className="mb-5 text-tinta-tenue" />
      <p className="font-serif text-2xl text-tinta">{titulo}</p>
      {descripcion && <p className="mt-2 max-w-sm text-sm text-tinta-suave">{descripcion}</p>}
      {accion && <div className="mt-6">{accion}</div>}
    </div>
  )
}
