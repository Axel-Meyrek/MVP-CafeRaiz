import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type EstadoBadge = 'neutro' | 'disponible' | 'bajo' | 'agotado'

const estilos: Record<EstadoBadge, { caja: string; punto: string }> = {
  neutro: { caja: 'text-tinta-suave bg-hueso', punto: 'bg-tinta-tenue' },
  disponible: { caja: 'text-oliva bg-oliva-fondo', punto: 'bg-oliva' },
  bajo: { caja: 'text-ambar bg-ambar-fondo', punto: 'bg-ambar' },
  agotado: { caja: 'text-ladrillo bg-ladrillo-fondo', punto: 'bg-ladrillo' },
}

export function Badge({ estado = 'neutro', children }: { estado?: EstadoBadge; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-xs font-medium whitespace-nowrap',
        estilos[estado].caja,
      )}
    >
      <span className={cn('size-1.5 rounded-full', estilos[estado].punto)} />
      {children}
    </span>
  )
}
