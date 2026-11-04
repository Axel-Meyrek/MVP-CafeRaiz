import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface DialogProps {
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  titulo: string
  descripcion?: string
  children: ReactNode
  acciones?: ReactNode
  /** "lateral" abre un panel desde la derecha (Sheet). */
  forma?: 'centrado' | 'lateral'
}

export function Dialog({ abierto, alCambiar, titulo, descripcion, children, acciones, forma = 'centrado' }: DialogProps) {
  const lateral = forma === 'lateral'
  return (
    <RadixDialog.Root open={abierto} onOpenChange={alCambiar}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-tinta/20 animar-fundido" />
        <RadixDialog.Content
          className={cn(
            'fixed z-50 flex flex-col bg-papel outline-none',
            lateral
              ? 'inset-y-0 right-0 w-full max-w-md border-l border-linea animar-deslizar'
              : 'top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-linea shadow-[0_24px_48px_-24px_rgb(28_25_23/0.25)] animar-emerger',
          )}
        >
          <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <RadixDialog.Title className="text-lg font-medium tracking-tight">{titulo}</RadixDialog.Title>
              {descripcion && (
                <RadixDialog.Description className="mt-1 text-sm text-tinta-suave">{descripcion}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Cerrar"
              className="-mr-2 rounded-md p-2 text-tinta-tenue transition-colors hover:bg-hueso hover:text-tinta"
            >
              <X size={16} strokeWidth={1.5} />
            </RadixDialog.Close>
          </header>
          <div className={cn('px-6 pb-6', lateral && 'flex-1 overflow-y-auto')}>{children}</div>
          {acciones && (
            <footer className="flex justify-end gap-2 border-t border-linea px-6 py-4">{acciones}</footer>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
