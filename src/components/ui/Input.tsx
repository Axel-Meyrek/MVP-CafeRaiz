import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string
  ayuda?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { etiqueta, ayuda, error, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      {etiqueta && <span className="text-[13px] font-medium text-tinta-suave">{etiqueta}</span>}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 rounded-md border bg-papel px-3 text-sm text-tinta placeholder:text-tinta-tenue',
          'transition-[border-color,box-shadow] duration-200 ease-suave outline-none',
          'focus:border-espresso focus:shadow-[0_0_0_3px_rgb(91_58_41/0.08)]',
          error ? 'border-ladrillo' : 'border-linea-fuerte hover:border-tinta-tenue',
          className,
        )}
        {...props}
      />
      {(error || ayuda) && (
        <span className={cn('text-xs', error ? 'text-ladrillo' : 'text-tinta-tenue')}>{error ?? ayuda}</span>
      )}
    </label>
  )
})
