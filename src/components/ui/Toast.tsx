import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Aviso {
  id: number
  mensaje: string
}

const ToastContext = createContext<(mensaje: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const avisar = useCallback((mensaje: string) => {
    const id = Date.now()
    setAvisos((actuales) => [...actuales, { id, mensaje }])
    setTimeout(() => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 md:bottom-6">
        <AnimatePresence>
          {avisos.map((aviso) => (
            <motion.div
              key={aviso.id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="flex items-center gap-2.5 rounded-md bg-tinta px-4 py-2.5 text-sm text-crema"
            >
              <Check size={14} strokeWidth={2} className="text-crema/70" />
              {aviso.mensaje}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export const useAviso = () => useContext(ToastContext)
