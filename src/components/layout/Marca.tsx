import { cn } from '../../lib/cn'

export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn('font-serif text-2xl leading-none tracking-tight', className)}>
      Café <em className="text-espresso">Raíz</em>
    </span>
  )
}
