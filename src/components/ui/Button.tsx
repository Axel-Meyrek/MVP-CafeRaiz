import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
}

const variantes: Record<Variante, string> = {
  primario: 'bg-espresso text-crema hover:bg-espresso-oscuro',
  secundario: 'bg-papel text-tinta border border-linea-fuerte hover:border-tinta-tenue hover:bg-hueso/60',
  fantasma: 'text-tinta-suave hover:text-tinta hover:bg-hueso',
  peligro: 'bg-ladrillo text-crema hover:bg-ladrillo/90',
}

const tamanos: Record<Tamano, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = 'primario', tamano = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md font-medium whitespace-nowrap',
        'transition-[background-color,border-color,color,transform,opacity] duration-200 ease-suave',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
        variantes[variante],
        tamanos[tamano],
        className,
      )}
      {...props}
    />
  )
})
