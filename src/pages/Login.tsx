import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Marca } from '../components/layout/Marca'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { useSesion } from '../context/SesionContext'
import { sucursales, usuarios } from '../data/catalogo'
import { cn } from '../lib/cn'
import { iniciales } from '../lib/formato'
import { rutaInicial } from '../lib/navegacion'
import type { Rol } from '../types'

const opcionesRol: { valor: Rol; etiqueta: string }[] = [
  { valor: 'admin', etiqueta: 'Admin general' },
  { valor: 'gerente', etiqueta: 'Gerente' },
  { valor: 'barista', etiqueta: 'Barista' },
]

const nombreSucursal = (id: string | null) => sucursales.find((s) => s.id === id)?.nombre ?? 'Todas las sucursales'

const suave = [0.25, 1, 0.5, 1] as const

export function Login() {
  const { usuario, iniciarSesion } = useSesion()
  const navegar = useNavigate()
  const [rol, setRol] = useState<Rol>('barista')
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  if (usuario) return <Navigate to={rutaInicial[usuario.rol]} replace />

  const disponibles = usuarios.filter((u) => u.rol === rol)

  const cambiarRol = (valor: string) => {
    setRol(valor as Rol)
    setSeleccionado(null)
  }

  const entrar = (evento: FormEvent) => {
    evento.preventDefault()
    const elegido = usuarios.find((u) => u.id === seleccionado)
    if (!elegido?.activo) return
    iniciarSesion(elegido.id)
    navegar(rutaInicial[elegido.rol], { replace: true })
  }

  return (
    <div className="grid min-h-dvh md:grid-cols-[1.15fr_1fr]">
      {/* Columna editorial */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: suave }}
        className="flex flex-col justify-between border-b border-linea px-6 py-8 md:border-r md:border-b-0 md:px-14 md:py-12"
      >
        <Marca className="text-xl" />

        <div className="pt-10 pb-2 md:py-0">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: suave }}
            className="font-serif text-[2.75rem] leading-[0.95] tracking-tight md:text-7xl"
          >
            Cinco barras,
            <br />
            <em className="text-espresso">una sola cuenta.</em>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: suave }}
            className="mt-4 max-w-sm text-sm text-tinta-suave md:mt-6 md:text-[15px]"
          >
            Ventas e inventario de todas las sucursales de Café Raíz en un mismo lugar.
          </motion.p>
        </div>

        <ul className="hidden flex-wrap gap-x-5 gap-y-1 text-[13px] text-tinta-tenue md:flex">
          {sucursales.map((s) => (
            <li key={s.id}>{s.nombre}</li>
          ))}
        </ul>
      </motion.section>

      {/* Formulario */}
      <section className="flex items-start justify-center px-6 py-10 md:items-center md:px-14">
        <motion.form
          onSubmit={entrar}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: suave }}
          className="w-full max-w-sm"
        >
          <p className="text-xs font-medium tracking-wide text-tinta-tenue uppercase">Modo demostración</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-tinta-suave">Elige un rol y una persona para entrar.</p>

          <Tabs valor={rol} alCambiar={cambiarRol} opciones={opcionesRol} className="mt-8 w-full" />

          <div className="mt-6 min-h-[17rem]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.ul
                key={rol}
                role="radiogroup"
                aria-label="Personas"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                transition={{ duration: 0.25, ease: suave }}
                className="flex flex-col"
              >
                {disponibles.map((persona) => {
                  const activo = persona.id === seleccionado
                  return (
                    <li key={persona.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        disabled={!persona.activo}
                        onClick={() => setSeleccionado(persona.id)}
                        className={cn(
                          'group flex w-full items-center gap-3 border-b border-linea py-3 text-left transition-colors duration-200',
                          'disabled:cursor-not-allowed',
                          persona.activo && 'hover:border-linea-fuerte',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-9 shrink-0 place-items-center rounded-full text-xs font-medium transition-colors duration-200',
                            activo ? 'bg-espresso text-crema' : 'bg-hueso text-tinta-suave',
                            !persona.activo && 'opacity-50',
                          )}
                        >
                          {iniciales(persona.nombre)}
                        </span>
                        <span className={cn('min-w-0 flex-1', !persona.activo && 'opacity-50')}>
                          <span className="block truncate text-sm font-medium">{persona.nombre}</span>
                          <span className="block truncate text-xs text-tinta-tenue">
                            {nombreSucursal(persona.sucursalId)}
                          </span>
                        </span>
                        {persona.activo ? (
                          <span
                            className={cn(
                              'grid size-5 place-items-center rounded-full border transition-all duration-200',
                              activo ? 'border-espresso bg-espresso' : 'border-linea-fuerte group-hover:border-tinta-tenue',
                            )}
                          >
                            <Check
                              size={12}
                              strokeWidth={2.25}
                              className={cn('text-crema transition-opacity duration-200', activo ? 'opacity-100' : 'opacity-0')}
                            />
                          </span>
                        ) : (
                          <span className="text-xs text-tinta-tenue">Desactivado</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </motion.ul>
            </AnimatePresence>
          </div>

          <Button type="submit" tamano="lg" disabled={!seleccionado} className="mt-6 w-full">
            Entrar
            <ArrowRight size={16} strokeWidth={1.5} />
          </Button>
        </motion.form>
      </section>
    </div>
  )
}
