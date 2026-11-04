import { AnimatePresence, motion } from 'motion/react'
import { Plus, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { useAviso } from '../components/ui/Toast'
import { useDatos } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { cn } from '../lib/cn'
import { esHoy, formatoFecha, formatoMoneda, iniciales } from '../lib/formato'
import type { Usuario } from '../types'

const suave = [0.25, 1, 0.5, 1] as const

interface Actividad {
  ventasHoy: number
  totalHoy: number
  ventasTotales: number
  ultima: string | null
}

export function Personal() {
  const { usuario, sucursal } = useSesion()
  const { usuarios, ventas, crearBarista, desactivarBarista } = useDatos()
  const avisar = useAviso()
  const [altaAbierta, setAltaAbierta] = useState(false)
  const [porDesactivar, setPorDesactivar] = useState<Usuario | null>(null)

  const sucursalId = sucursal?.id ?? ''

  // Solo personal de la propia sucursal (reglas 8 y 18).
  const baristas = usuarios.filter((u) => u.sucursalId === sucursalId && u.rol === 'barista')
  const activos = baristas.filter((u) => u.activo)
  const inactivos = baristas.filter((u) => !u.activo)

  const actividad = useMemo(() => {
    const mapa = new Map<string, Actividad>()
    for (const venta of ventas) {
      if (venta.sucursalId !== sucursalId || venta.cancelacion) continue
      const actual = mapa.get(venta.usuarioId) ?? { ventasHoy: 0, totalHoy: 0, ventasTotales: 0, ultima: null }
      const hoy = esHoy(venta.fecha)
      mapa.set(venta.usuarioId, {
        ventasHoy: actual.ventasHoy + (hoy ? 1 : 0),
        totalHoy: actual.totalHoy + (hoy ? venta.total : 0),
        ventasTotales: actual.ventasTotales + 1,
        ultima: !actual.ultima || venta.fecha > actual.ultima ? venta.fecha : actual.ultima,
      })
    }
    return mapa
  }, [ventas, sucursalId])

  const darDeAlta = (nombre: string) => {
    if (!usuario) return 'Sin sesión.'
    const resultado = crearBarista(usuario, nombre)
    if (!resultado.ok) return resultado.error
    avisar(`${nombre.trim()} ya puede entrar como barista`)
    setAltaAbierta(false)
    return null
  }

  const desactivar = () => {
    if (!usuario || !porDesactivar) return
    const resultado = desactivarBarista(usuario, porDesactivar.id)
    if (!resultado.ok) {
      avisar(resultado.error, 'error')
      return
    }
    avisar(`Se desactivó a ${porDesactivar.nombre}`)
    setPorDesactivar(null)
  }

  return (
    <Pagina
      titulo="Personal"
      descripcion={`Sucursal ${sucursal?.nombre ?? ''} · ${activos.length} ${activos.length === 1 ? 'barista activo' : 'baristas activos'}`}
      acciones={
        <Button onClick={() => setAltaAbierta(true)}>
          <Plus size={16} strokeWidth={1.5} />
          Agregar barista
        </Button>
      }
    >
      {usuario && (
        <Seccion titulo="Gerente">
          <FilaPersona persona={usuario} nota="Tú" actividad={actividad.get(usuario.id)} />
        </Seccion>
      )}

      <Seccion titulo="Baristas" className="mt-12">
        {activos.length === 0 ? (
          <EmptyState
            icono={Users}
            titulo="Sin baristas activos"
            descripcion="Agrega a la primera persona de tu equipo."
          />
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {activos.map((persona) => (
                <motion.li
                  key={persona.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: suave }}
                  className="overflow-hidden"
                >
                  <FilaPersona
                    persona={persona}
                    actividad={actividad.get(persona.id)}
                    accion={
                      <Button variante="secundario" tamano="sm" onClick={() => setPorDesactivar(persona)}>
                        Desactivar
                      </Button>
                    }
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Seccion>

      {inactivos.length > 0 && (
        <Seccion titulo="Desactivados" className="mt-12">
          <ul>
            <AnimatePresence initial={false}>
              {inactivos.map((persona) => (
                <motion.li
                  key={persona.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: suave }}
                >
                  <FilaPersona persona={persona} actividad={actividad.get(persona.id)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <p className="mt-4 text-[13px] text-tinta-tenue">
            Las personas desactivadas no pueden entrar al sistema. Su historial de ventas se conserva.
          </p>
        </Seccion>
      )}

      <Dialog
        abierto={altaAbierta}
        alCambiar={setAltaAbierta}
        titulo="Agregar barista"
        descripcion={`Sucursal ${sucursal?.nombre ?? ''}`}
      >
        {altaAbierta && <FormularioAlta alCerrar={() => setAltaAbierta(false)} alConfirmar={darDeAlta} />}
      </Dialog>

      <Dialog
        abierto={!!porDesactivar}
        alCambiar={(abierto) => !abierto && setPorDesactivar(null)}
        titulo="Desactivar barista"
        descripcion={porDesactivar?.nombre}
      >
        <div className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2 text-sm text-tinta-suave">
            <li>Ya no podrá entrar al sistema ni registrar ventas.</li>
            <li>Sus ventas y acciones anteriores se conservan.</li>
            <li>No se borra: aparecerá en la lista de desactivados.</li>
          </ul>
          <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">
            <Button variante="fantasma" onClick={() => setPorDesactivar(null)}>
              Volver
            </Button>
            <Button variante="peligro" onClick={desactivar}>
              Desactivar
            </Button>
          </div>
        </div>
      </Dialog>
    </Pagina>
  )
}

function Seccion({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: suave }}
      className={className}
    >
      <h2 className="mb-1 text-xs font-medium tracking-wide text-tinta-tenue uppercase">{titulo}</h2>
      <div className="border-t border-linea">{children}</div>
    </motion.section>
  )
}

function FilaPersona({
  persona,
  actividad,
  nota,
  accion,
}: {
  persona: Usuario
  actividad?: Actividad
  nota?: string
  accion?: ReactNode
}) {
  const inactivo = !persona.activo
  return (
    <div className="flex items-center gap-4 border-b border-linea py-4">
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-medium',
          persona.rol === 'gerente' ? 'bg-espresso text-crema' : 'bg-hueso text-tinta-suave',
          inactivo && 'opacity-50',
        )}
      >
        {iniciales(persona.nombre)}
      </span>

      <div className={cn('min-w-0 flex-1', inactivo && 'opacity-60')}>
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {persona.nombre}
          {nota && <span className="text-xs font-normal text-tinta-tenue">{nota}</span>}
        </p>
        <p className="cifra truncate text-xs text-tinta-tenue">
          {inactivo
            ? `${actividad?.ventasTotales ?? 0} ventas registradas${actividad?.ultima ? ` · última el ${formatoFecha(actividad.ultima)}` : ''}`
            : actividad?.ventasHoy
              ? `${actividad.ventasHoy} ${actividad.ventasHoy === 1 ? 'venta' : 'ventas'} hoy · ${formatoMoneda(actividad.totalHoy)}`
              : 'Sin ventas hoy'}
        </p>
      </div>

      <div className="hidden sm:block">
        <Badge estado={inactivo ? 'neutro' : 'disponible'}>{inactivo ? 'Desactivado' : 'Activo'}</Badge>
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  )
}

function FormularioAlta({
  alCerrar,
  alConfirmar,
}: {
  alCerrar: () => void
  alConfirmar: (nombre: string) => string | null
}) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(alConfirmar(nombre))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Input
        name="nombre"
        etiqueta="Nombre completo"
        placeholder="Ej. Ana López"
        autoFocus
        autoComplete="off"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value)
          setError(null)
        }}
        error={error ?? undefined}
      />
      <p className="text-[13px] text-tinta-suave">
        Tendrá el rol de <span className="font-medium text-tinta">barista</span>: podrá vender, ver sus ventas del
        día y marcar productos agotados en esta sucursal.
      </p>
      <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">
        <Button variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={nombre.trim().length < 3}>
          Dar de alta
        </Button>
      </div>
    </form>
  )
}
