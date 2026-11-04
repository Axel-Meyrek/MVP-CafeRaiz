import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface OpcionSelect {
  valor: string
  etiqueta: string
  deshabilitada?: boolean
}

interface SelectProps {
  valor?: string
  alCambiar: (valor: string) => void
  opciones: OpcionSelect[]
  marcador?: string
  etiqueta?: string
  className?: string
}

export function Select({ valor, alCambiar, opciones, marcador = 'Selecciona…', etiqueta, className }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {etiqueta && <span className="text-[13px] font-medium text-tinta-suave">{etiqueta}</span>}
      <RadixSelect.Root value={valor} onValueChange={alCambiar}>
        <RadixSelect.Trigger
          className={cn(
            'group inline-flex h-10 items-center justify-between gap-2 rounded-md border border-linea-fuerte bg-papel px-3 text-sm',
            'transition-colors duration-200 ease-suave hover:border-tinta-tenue outline-none',
            'focus-visible:border-espresso data-[placeholder]:text-tinta-tenue',
            className,
          )}
        >
          <span className="min-w-0 truncate text-left whitespace-nowrap">
            <RadixSelect.Value placeholder={marcador} />
          </span>
          <RadixSelect.Icon className="shrink-0">
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className="text-tinta-tenue transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-linea bg-papel shadow-[0_8px_24px_-12px_rgb(28_25_23/0.18)] animar-emerger"
          >
            <RadixSelect.Viewport className="p-1">
              {opciones.map((opcion) => (
                <RadixSelect.Item
                  key={opcion.valor}
                  value={opcion.valor}
                  disabled={opcion.deshabilitada}
                  className="relative flex h-9 cursor-default select-none items-center rounded-sm pr-8 pl-3 text-sm outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-hueso"
                >
                  <RadixSelect.ItemText>{opcion.etiqueta}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2.5">
                    <Check size={14} strokeWidth={1.75} className="text-espresso" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}
