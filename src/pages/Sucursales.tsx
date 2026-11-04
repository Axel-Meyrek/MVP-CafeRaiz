import * as Menu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'motion/react'
import { Ellipsis, Plus, UserPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { useAviso } from '../components/ui/Toast'
import { useDatos, type Resultado } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { cn } from '../lib/cn'
import { esHoy, formatoMoneda, iniciales } from '../lib/formato'
import type { Sucursal, Usuario } from '../types'

const suave = [0.25, 1, 0.5, 1] as const

type Dialogo =
  | { tipo: 'sucursal' }
  | { tipo: 'gerente'; sucursalId: string | null }
  | { tipo: 'desactivar'; gerente: Usuario }
  | { tipo: 'baja'; sucursal: Sucursal }

export function Sucursales() {
  const { usuario } = useSesion()
  const { sucursales, usuarios, ventas, altaSucursal, bajaSucursal, crearGerente, desactivarGerente } = useDatos()
  const avisar = useAviso()
  const [vista, setVista] = useState('sucursales')
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)

  const vendidoHoy = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const v of ventas) {
      if (v.cancelacion || !esHoy(v.fecha)) continue
      mapa.set(v.sucursalId, (mapa.get(v.sucursalId) ?? 0) + v.total)
    }
    return mapa
  }, [ventas])

  const gerenteDe = (id: string) => usuarios.find((u) => u.rol === 'gerente' && u.activo && u.sucursalId === id)
  const baristasDe = (id: string) => usuarios.filter((u) => u.rol === 'barista' && u.activo && u.sucursalId === id).length
  const nombreSucursal = (id: string | null) => sucursales.find((s) => s.id === id)?.nombre ?? '—'

  const ordenadas = [...sucursales].sort((a, b) => Number(b.activa) - Number(a.activa))
  const activas = sucursales.filter((s) => s.activa)
  const sinGerente = activas.filter((s) => !gerenteDe(s.id))
  const gerentes = usuarios
    .filter((u) => u.rol === 'gerente')
    .sort((a, b) => Number(b.activo) - Number(a.activo) || nombreSucursal(a.sucursalId).localeCompare(nombreSucursal(b.sucursalId)))

  const ejecutar = (accion: () => Resultado, mensaje: string) => {
    const resultado = accion()
    if (!resultado.ok) return resultado.error
    avisar(mensaje)
    setDialogo(null)
    return null
  }

  return (
    <Pagina
      titulo="Sucursales"
      descripcion={`${activas.length} ${activas.length === 1 ? 'sucursal activa' : 'sucursales activas'} · cada una con su caja e inventario`}
      acciones={
        <div className="flex gap-2">
          <Button variante="secundario" onClick={() => setDialogo({ tipo: 'gerente', sucursalId: sinGerente[0]?.id ?? null })}>
            <UserPlus size={16} strokeWidth={1.5} />
            Nuevo gerente
          </Button>
          <Button onClick={() => setDialogo({ tipo: 'sucursal' })}>
            <Plus size={16} strokeWidth={1.5} />
            Nueva sucursal
          </Button>
        </div>
      }
    >
      <div className="mb-6">
        <Tabs
          valor={vista}
          alCambiar={setVista}
          opciones={[
            { valor: 'sucursales', etiqueta: `Sucursales ${sucursales.length}` },
            { valor: 'gerentes', etiqueta: `Gerentes ${gerentes.length}` },
          ]}
        />
      </div>

      {vista === 'sucursales' ? (
        <>
          <Encabezado columnas="md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_7rem_8rem_2rem]">
            <span>Sucursal</span>
            <span>Gerente</span>
            <span className="text-right">Baristas</span>
            <span className="text-right">Vendido hoy</span>
            <span />
          </Encabezado>
          <Lista clave="sucursales">
            {ordenadas.map((s, i) => {
              const gerente = gerenteDe(s.id)
              return (
                <Fila key={s.id} indice={i} className="md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_7rem_8rem_2rem]">
                  <div className={cn('min-w-0', !s.activa && 'opacity-60')}>
                    <p className="flex items-center gap-2.5 text-sm font-medium">
                      <span className="truncate">{s.nombre}</span>
                      {!s.activa && <Badge>Dada de baja</Badge>}
                    </p>
                    <p className="truncate text-xs text-tinta-tenue">{s.zona}</p>
                  </div>

                  <div className="col-span-2 min-w-0 md:col-span-1">
                    {!s.activa ? (
                      <span className="text-[13px] text-tinta-tenue">—</span>
                    ) : gerente ? (
                      <Persona nombre={gerente.nombre} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDialogo({ tipo: 'gerente', sucursalId: s.id })}
                        className="flex items-center gap-2 text-[13px] text-ambar transition-colors hover:text-espresso"
                      >
                        <span className="size-1.5 rounded-full bg-ambar" />
                        Sin gerente · Asignar
                      </button>
                    )}
                  </div>

                  <p className={cn('cifra text-[13px] text-tinta-suave md:text-right md:text-sm md:text-tinta', !s.activa && 'opacity-60')}>
                    <span className="md:hidden">Baristas </span>
                    {baristasDe(s.id)}
                  </p>
                  <p className={cn('cifra text-right text-sm', !s.activa && 'text-tinta-tenue')}>
                    <span className="text-[13px] text-tinta-tenue md:hidden">Hoy </span>
                    {formatoMoneda(vendidoHoy.get(s.id) ?? 0)}
                  </p>

                  <div className="col-start-2 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">
                    {s.activa && (
                      <Acciones etiqueta={`Más acciones para ${s.nombre}`}>
                        {gerente && (
                          <Opcion onSelect={() => setDialogo({ tipo: 'desactivar', gerente })}>Desactivar gerente</Opcion>
                        )}
                        <Opcion peligro onSelect={() => setDialogo({ tipo: 'baja', sucursal: s })}>
                          Dar de baja sucursal
                        </Opcion>
                      </Acciones>
                    )}
                  </div>
                </Fila>
              )
            })}
          </Lista>
        </>
      ) : (
        <>
          <Encabezado columnas="md:grid-cols-[minmax(0,1fr)_12rem_8rem_8rem]">
            <span>Gerente</span>
            <span>Sucursal</span>
            <span>Estado</span>
            <span />
          </Encabezado>
          <Lista clave="gerentes">
            {gerentes.map((g, i) => (
              <Fila key={g.id} indice={i} className="md:grid-cols-[minmax(0,1fr)_12rem_8rem_8rem]">
                <div className={cn('min-w-0', !g.activo && 'opacity-60')}>
                  <Persona nombre={g.nombre} />
                </div>
                <p className="col-span-2 truncate text-[13px] text-tinta-suave md:col-span-1 md:text-sm">
                  {nombreSucursal(g.sucursalId)}
                </p>
                <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                  {!g.activo ? (
                    <Badge>Desactivado</Badge>
                  ) : sucursales.find((s) => s.id === g.sucursalId)?.activa ? (
                    <Badge estado="disponible">Activo</Badge>
                  ) : (
                    <Badge estado="bajo">Sucursal de baja</Badge>
                  )}
                </div>
                <div className="col-span-2 md:col-span-1 md:text-right">
                  {g.activo && (
                    <Button variante="fantasma" tamano="sm" onClick={() => setDialogo({ tipo: 'desactivar', gerente: g })}>
                      Desactivar
                    </Button>
                  )}
                </div>
              </Fila>
            ))}
          </Lista>
          <p className="mt-6 text-[13px] text-tinta-tenue">
            Un gerente desactivado no puede entrar y nunca se borra: su historial se conserva.
          </p>
        </>
      )}

      <Dialog
        abierto={dialogo?.tipo === 'sucursal'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Nueva sucursal"
        descripcion="Tendrá su propia caja e inventario."
      >
        {dialogo?.tipo === 'sucursal' && (
          <FormularioSucursal
            alCerrar={() => setDialogo(null)}
            alConfirmar={(nombre, zona) =>
              usuario ? ejecutar(() => altaSucursal(usuario, nombre, zona), `Sucursal ${nombre.trim()} dada de alta`) : null
            }
          />
        )}
      </Dialog>

      <Dialog
        abierto={dialogo?.tipo === 'gerente'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Nuevo gerente"
        descripcion="Pertenecerá solo a la sucursal que elijas."
      >
        {dialogo?.tipo === 'gerente' && (
          <FormularioGerente
            sucursales={sinGerente}
            inicial={dialogo.sucursalId}
            alCerrar={() => setDialogo(null)}
            alConfirmar={(nombre, sucursalId) =>
              usuario
                ? ejecutar(
                    () => crearGerente(usuario, nombre, sucursalId),
                    `${nombre.trim()} es gerente de ${nombreSucursal(sucursalId)}`,
                  )
                : null
            }
          />
        )}
      </Dialog>

      <Dialog
        abierto={dialogo?.tipo === 'desactivar'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Desactivar gerente"
        descripcion={dialogo?.tipo === 'desactivar' ? `${dialogo.gerente.nombre} · ${nombreSucursal(dialogo.gerente.sucursalId)}` : undefined}
      >
        {dialogo?.tipo === 'desactivar' && (
          <Confirmacion
            puntos={[
              'Ya no podrá entrar al sistema.',
              'No se borra: sus ventas y acciones se conservan.',
              'Después puedes asignar otro gerente a la sucursal.',
            ]}
            boton="Desactivar"
            alCerrar={() => setDialogo(null)}
            alConfirmar={() =>
              usuario
                ? ejecutar(() => desactivarGerente(usuario, dialogo.gerente.id), `Se desactivó a ${dialogo.gerente.nombre}`)
                : null
            }
          />
        )}
      </Dialog>

      <Dialog
        abierto={dialogo?.tipo === 'baja'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Dar de baja sucursal"
        descripcion={dialogo?.tipo === 'baja' ? dialogo.sucursal.nombre : undefined}
      >
        {dialogo?.tipo === 'baja' && (
          <Confirmacion
            puntos={[
              'Su caja deja de vender.',
              'Su gerente y sus baristas ya no podrán entrar.',
              'Sus ventas se conservan en los reportes.',
            ]}
            boton="Dar de baja"
            alCerrar={() => setDialogo(null)}
            alConfirmar={() =>
              usuario
                ? ejecutar(() => bajaSucursal(usuario, dialogo.sucursal.id), `${dialogo.sucursal.nombre} se dio de baja`)
                : null
            }
          />
        )}
      </Dialog>
    </Pagina>
  )
}

function Encabezado({ columnas, children }: { columnas: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'hidden gap-x-6 border-b border-linea pb-2 text-xs font-medium tracking-wide text-tinta-tenue uppercase md:grid',
        columnas,
      )}
    >
      {children}
    </div>
  )
}

function Lista({ clave, children }: { clave: string; children: ReactNode }) {
  return (
    <motion.ul key={clave} initial="oculto" animate="visible" className="border-t border-linea md:border-0">
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </motion.ul>
  )
}

function Fila({ indice, className, children }: { indice: number; className: string; children: ReactNode }) {
  return (
    <motion.li
      layout
      variants={{
        oculto: { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0, transition: { delay: indice * 0.03, ease: suave } },
      }}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-linea py-4 md:gap-x-6',
        className,
      )}
    >
      {children}
    </motion.li>
  )
}

function Persona({ nombre }: { nombre: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-hueso text-[11px] font-medium text-tinta-suave">
        {iniciales(nombre)}
      </span>
      <span className="truncate text-sm">{nombre}</span>
    </span>
  )
}

function Acciones({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={etiqueta}
        className="grid size-8 place-items-center rounded-md text-tinta-suave transition-colors outline-none hover:bg-hueso hover:text-tinta data-[state=open]:bg-hueso"
      >
        <Ellipsis size={16} strokeWidth={1.5} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-52 rounded-md border border-linea bg-papel p-1 shadow-[0_8px_24px_-12px_rgb(28_25_23/0.18)] animar-emerger"
        >
          {children}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

function Opcion({ peligro, onSelect, children }: { peligro?: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className={cn(
        'flex h-9 cursor-default select-none items-center rounded-sm px-3 text-sm outline-none data-[highlighted]:bg-hueso',
        peligro && 'text-ladrillo',
      )}
    >
      {children}
    </Menu.Item>
  )
}

function Pie({ children }: { children: ReactNode }) {
  return <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">{children}</div>
}

function FormularioSucursal({
  alCerrar,
  alConfirmar,
}: {
  alCerrar: () => void
  alConfirmar: (nombre: string, zona: string) => string | null
}) {
  const [nombre, setNombre] = useState('')
  const [zona, setZona] = useState('')
  const [error, setError] = useState<string | null>(null)
  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(alConfirmar(nombre, zona))
  }
  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Input name="nombre" etiqueta="Nombre" placeholder="Ej. Atlixcáyotl" autoFocus autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Input name="zona" etiqueta="Zona o colonia" placeholder="Ej. Reserva Territorial" autoComplete="off" value={zona} onChange={(e) => setZona(e.target.value)} />
      <p className="text-[13px] text-tinta-suave">
        Empieza con todo el catálogo en existencia 0. Después asígnale un gerente para que registre su mercancía.
      </p>
      {error && <p className="text-[13px] text-ladrillo">{error}</p>}
      <Pie>
        <Button variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={nombre.trim().length < 2 || zona.trim().length < 2}>
          Dar de alta
        </Button>
      </Pie>
    </form>
  )
}

function FormularioGerente({
  sucursales,
  inicial,
  alCerrar,
  alConfirmar,
}: {
  sucursales: Sucursal[]
  inicial: string | null
  alCerrar: () => void
  alConfirmar: (nombre: string, sucursalId: string) => string | null
}) {
  const [nombre, setNombre] = useState('')
  const [sucursalId, setSucursalId] = useState(inicial ?? sucursales[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(alConfirmar(nombre, sucursalId))
  }

  if (sucursales.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-tinta-suave">
          Todas las sucursales activas ya tienen gerente. Para reemplazar a uno, desactívalo primero.
        </p>
        <Pie>
          <Button variante="secundario" onClick={alCerrar}>
            Entendido
          </Button>
        </Pie>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Input name="nombre" etiqueta="Nombre completo" placeholder="Ej. Laura Domínguez" autoFocus autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Select
        etiqueta="Sucursal"
        valor={sucursalId}
        alCambiar={setSucursalId}
        opciones={sucursales.map((s) => ({ valor: s.id, etiqueta: s.nombre }))}
        className="w-full"
      />
      <p className="text-[13px] text-tinta-suave">Solo aparecen las sucursales que no tienen gerente.</p>
      {error && <p className="text-[13px] text-ladrillo">{error}</p>}
      <Pie>
        <Button variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={nombre.trim().length < 3 || !sucursalId}>
          Crear gerente
        </Button>
      </Pie>
    </form>
  )
}

function Confirmacion({
  puntos,
  boton,
  alCerrar,
  alConfirmar,
}: {
  puntos: string[]
  boton: string
  alCerrar: () => void
  alConfirmar: () => string | null
}) {
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2 text-sm text-tinta-suave">
        {puntos.map((punto) => (
          <li key={punto}>{punto}</li>
        ))}
      </ul>
      {error && <p className="text-[13px] text-ladrillo">{error}</p>}
      <Pie>
        <Button variante="fantasma" onClick={alCerrar}>
          Volver
        </Button>
        <Button variante="peligro" onClick={() => setError(alConfirmar())}>
          {boton}
        </Button>
      </Pie>
    </div>
  )
}
