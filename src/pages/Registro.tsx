import { motion } from 'motion/react'
import {
  Building2,
  Download,
  History,
  Lock,
  Package,
  Search,
  Tag,
  Users,
  Warehouse,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Select } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { useDatos } from '../context/DatosContext'
import { cn } from '../lib/cn'
import { claveDia, esAyer, esHoy, formatoFechaLarga, formatoHora } from '../lib/formato'
import { descargarCsv } from '../lib/reporte'
import { nombreRol } from '../lib/roles'
import type { RegistroAccion } from '../types'

const suave = [0.25, 1, 0.5, 1] as const

type Grupo = 'catalogo' | 'inventario' | 'ventas' | 'personal'

const grupos: Record<Grupo, { etiqueta: string; icono: LucideIcon }> = {
  catalogo: { etiqueta: 'Precios y catálogo', icono: Tag },
  inventario: { etiqueta: 'Inventario', icono: Warehouse },
  ventas: { etiqueta: 'Ventas', icono: Receipt },
  personal: { etiqueta: 'Personal y sucursales', icono: Users },
}

/** Agrupa cada acción registrada en una de las cuatro familias del filtro. */
function grupoDe(accion: string): Grupo {
  if (/precio|producto|descuento/i.test(accion)) return 'catalogo'
  if (/venta/i.test(accion)) return 'ventas'
  if (/barista|gerente|sucursal/i.test(accion)) return 'personal'
  return 'inventario'
}

const iconoDe = (accion: string): LucideIcon =>
  /sucursal/i.test(accion) ? Building2 : /producto/i.test(accion) ? Package : grupos[grupoDe(accion)].icono

export function Registro() {
  const { registro, usuarios, sucursales } = useDatos()
  const [grupo, setGrupo] = useState<'todo' | Grupo>('todo')
  const [sucursalId, setSucursalId] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  const persona = (id: string) => usuarios.find((u) => u.id === id)
  const nombreSucursal = (id: string | null) => (id ? (sucursales.find((s) => s.id === id)?.nombre ?? id) : 'General')

  const termino = busqueda.trim().toLowerCase()
  // Más reciente primero; el registro original nunca se reordena ni se modifica.
  const visibles = useMemo(
    () =>
      [...registro]
        .reverse()
        .filter((r) => grupo === 'todo' || grupoDe(r.accion) === grupo)
        .filter((r) => sucursalId === 'todas' || (sucursalId === 'general' ? r.sucursalId === null : r.sucursalId === sucursalId))
        .filter((r) => {
          if (!termino) return true
          const quien = usuarios.find((u) => u.id === r.usuarioId)?.nombre ?? ''
          return `${r.accion} ${r.detalle} ${quien}`.toLowerCase().includes(termino)
        }),
    [registro, grupo, sucursalId, termino, usuarios],
  )

  const porDia = useMemo(() => {
    const mapa = new Map<string, RegistroAccion[]>()
    for (const r of visibles) {
      const dia = claveDia(r.fecha)
      mapa.set(dia, [...(mapa.get(dia) ?? []), r])
    }
    return [...mapa.entries()]
  }, [visibles])

  const contar = (g: Grupo) => registro.filter((r) => grupoDe(r.accion) === g).length

  const tituloDia = (clave: string, fecha: string) => {
    if (esHoy(fecha)) return 'Hoy'
    if (esAyer(fecha)) return 'Ayer'
    const texto = formatoFechaLarga(new Date(`${clave}T12:00:00`))
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }

  const descargar = () =>
    descargarCsv(`registro-de-acciones-${claveDia(new Date())}.csv`, [
      ['Fecha', 'Hora', 'Acción', 'Detalle', 'Usuario', 'Rol', 'Sucursal'],
      ...visibles.map((r) => {
        const p = persona(r.usuarioId)
        return [
          claveDia(r.fecha),
          formatoHora(r.fecha),
          r.accion,
          r.detalle,
          p?.nombre ?? r.usuarioId,
          p ? nombreRol[p.rol] : '',
          nombreSucursal(r.sucursalId),
        ]
      }),
    ])

  return (
    <Pagina
      titulo="Registro"
      descripcion={`${registro.length} acciones registradas · quién hizo qué y cuándo`}
      acciones={
        <Button variante="secundario" onClick={descargar} disabled={visibles.length === 0}>
          <Download size={15} strokeWidth={1.5} />
          Descargar CSV
        </Button>
      }
    >
      <div className="mb-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <Tabs
            valor={grupo}
            alCambiar={(v) => setGrupo(v as 'todo' | Grupo)}
            opciones={[
              { valor: 'todo', etiqueta: `Todo ${registro.length}` },
              ...(Object.keys(grupos) as Grupo[]).map((g) => ({ valor: g, etiqueta: `${grupos[g].etiqueta} ${contar(g)}` })),
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[11rem_14rem]">
          <Select
            valor={sucursalId}
            alCambiar={setSucursalId}
            opciones={[
              { valor: 'todas', etiqueta: 'Todas las sucursales' },
              { valor: 'general', etiqueta: 'General (admin)' },
              ...sucursales.map((s) => ({ valor: s.id, etiqueta: s.nombre })),
            ]}
            className="w-full"
          />
          <label className="relative flex items-center">
            <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 text-tinta-tenue" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar en el registro"
              className="h-10 w-full rounded-md border border-linea-fuerte bg-papel pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-tinta-tenue hover:border-tinta-tenue focus:border-espresso"
            />
          </label>
        </div>
      </div>

      {porDia.length === 0 ? (
        <EmptyState icono={History} titulo="Sin acciones" descripcion="Nada coincide con estos filtros." />
      ) : (
        <motion.div key={`${grupo}-${sucursalId}`} initial="oculto" animate="visible" className="flex flex-col gap-10">
          {porDia.map(([dia, entradas], d) => (
            <motion.section
              key={dia}
              variants={{
                oculto: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: Math.min(d, 6) * 0.05, ease: suave } },
              }}
            >
              <h2 className="sticky top-0 z-10 flex items-baseline justify-between border-b border-linea bg-crema py-2 md:top-0">
                <span className="text-sm font-medium">{tituloDia(dia, entradas[0].fecha)}</span>
                <span className="cifra text-xs text-tinta-tenue">
                  {entradas.length} {entradas.length === 1 ? 'acción' : 'acciones'}
                </span>
              </h2>
              <ol>
                {entradas.map((r) => {
                  const Icono = iconoDe(r.accion)
                  const p = persona(r.usuarioId)
                  return (
                    <li
                      key={r.id}
                      className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-linea py-3.5 md:grid-cols-[3.5rem_1.75rem_minmax(0,1fr)_minmax(0,16rem)_7rem] md:items-center md:gap-x-5"
                    >
                      <span className="cifra row-span-2 pt-0.5 text-[13px] text-tinta-tenue md:row-span-1 md:pt-0">
                        {formatoHora(r.fecha)}
                      </span>
                      <span className="hidden size-7 place-items-center rounded-full bg-hueso text-tinta-suave md:grid">
                        <Icono size={14} strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{r.accion}</span>
                        <span className="cifra block truncate text-[13px] text-tinta-suave">{r.detalle}</span>
                      </span>
                      <span className="min-w-0 text-[13px]">
                        <span className="text-tinta">{p?.nombre ?? r.usuarioId}</span>
                        <span className="text-tinta-tenue"> · {p ? nombreRol[p.rol] : ''}</span>
                        <span className="text-tinta-tenue md:hidden"> · {nombreSucursal(r.sucursalId)}</span>
                      </span>
                      <span className={cn('hidden text-[13px] text-tinta-tenue md:block md:text-right', !r.sucursalId && 'italic')}>
                        {nombreSucursal(r.sucursalId)}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </motion.section>
          ))}
        </motion.div>
      )}

      <p className="mt-10 flex items-center gap-2 text-[13px] text-tinta-tenue">
        <Lock size={13} strokeWidth={1.5} />
        Las acciones registradas no se pueden modificar ni borrar.
      </p>
    </Pagina>
  )
}
