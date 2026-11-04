import { cn } from '../../lib/cn'

interface StatNumberProps {
  etiqueta: string
  valor: string
  nota?: string
  className?: string
}

export function StatNumber({ etiqueta, valor, nota, className }: StatNumberProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium tracking-wide text-tinta-tenue uppercase">{etiqueta}</span>
      <span className="cifra text-3xl font-medium tracking-tight text-tinta">{valor}</span>
      {nota && <span className="text-[13px] text-tinta-suave">{nota}</span>}
    </div>
  )
}
