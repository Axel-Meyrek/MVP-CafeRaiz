import * as Tooltip from '@radix-ui/react-tooltip'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { EmptyState } from '../components/ui/EmptyState'
import { Select } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { useDatos } from '../context/DatosContext'
import { cn } from '../lib/cn'
import { estadoExistencia, type EstadoExistencia } from '../lib/reglas'
import type { Existencia, Producto } from '../types'

const suave = [0.25, 1, 0.5, 1] as const
const categorias = ['Café caliente', 'Café frío', 'Otras bebidas', 'Panadería']

interface Celda {
  existencia: Existencia
  estado: EstadoExistencia
}

interface FilaMatriz {
  producto: Producto
  celdas: Record<string, Celda | undefined>
  total: number
  faltantes: number
  /** Sucursal con más existencia cuando hay faltantes en otra. */
  sobraEn: { nombre: string; cantidad: number } | null
}

const estilos: Record<EstadoExistencia | 'manual', { celda: string; punto: string; texto: string }> = {
  disponible: { celda: 'text-tinta', punto: 'bg-oliva', texto: 'Disponible' },
  bajo: { celda: 'bg-ambar-fondo text-ambar', punto: 'bg-ambar', texto: 'Stock bajo' },
  agotado: { celda: 'bg-ladrillo-fondo text-ladrillo', punto: 'bg-ladrillo', texto: 'Agotado' },
  manual: { celda: 'bg-ladrillo-fondo text-ladrillo', punto: 'bg-ladrillo', texto: 'Agotado a mano' },
}

export function InventarioGlobal() {
  const { existencias, usuarios, productos, sucursales } = useDatos()
  const [vista, setVista] = useState('todos')
  const [categoria, setCategoria] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  const activas = useMemo(() => sucursales.filter((s) => s.activa), [sucursales])

  // El admin ve el inventario de todas las sucursales, solo lectura (reglas 15 y 17).
  const filas: FilaMatriz[] = useMemo(
    () =>
      productos
        .filter((p) => p.activo)
        .map((producto) => {
          const celdas: FilaMatriz['celdas'] = {}
          for (const sucursal of activas) {
            const existencia = existencias.find((e) => e.sucursalId === sucursal.id && e.productoId === producto.id)
            celdas[sucursal.id] = existencia ? { existencia, estado: estadoExistencia(existencia) } : undefined
          }
          const lista = Object.values(celdas).filter((c): c is Celda => !!c)
          const faltantes = lista.filter((c) => c.estado !== 'disponible').length
          const mayor = activas
            .map((s) => ({ s, c: celdas[s.id] }))
            .filter(({ c }) => c && c.estado === 'disponible')
            .sort((a, b) => (b.c?.existencia.cantidad ?? 0) - (a.c?.existencia.cantidad ?? 0))[0]
          return {
            producto,
            celdas,
            total: lista.reduce((suma, c) => suma + c.existencia.cantidad, 0),
            faltantes,
            sobraEn:
              faltantes > 0 && mayor?.c ? { nombre: mayor.s.nombre, cantidad: mayor.c.existencia.cantidad } : null,
          }
        }),
    [existencias, productos, activas],
  )

  const termino = busqueda.trim().toLowerCase()
  const visibles = filas
    .filter((f) => vista === 'todos' || f.faltantes > 0)
    .filter((f) => categoria === 'todas' || f.producto.categoria === categoria)
    .filter((f) => !termino || f.producto.nombre.toLowerCase().includes(termino))
    .sort((a, b) => (vista === 'faltantes' ? b.faltantes - a.faltantes : 0))

  const conFaltantes = filas.filter((f) => f.faltantes > 0).length
  const totalPorSucursal = (id: string) =>
    visibles.reduce((suma, f) => suma + (f.celdas[id]?.existencia.cantidad ?? 0), 0)
  const nombreUsuario = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? ''

  return (
    <Pagina titulo="Inventario" descripcion={`${filas.length} productos en ${activas.length} sucursales · solo lectura`}>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          valor={vista}
          alCambiar={setVista}
          opciones={[
            { valor: 'todos', etiqueta: `Todos ${filas.length}` },
            { valor: 'faltantes', etiqueta: `Con faltantes ${conFaltantes}` },
          ]}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[11rem_14rem]">
          <Select
            valor={categoria}
            alCambiar={setCategoria}
            opciones={[{ valor: 'todas', etiqueta: 'Todas las categorías' }, ...categorias.map((c) => ({ valor: c, etiqueta: c }))]}
            className="w-full"
          />
          <label className="relative flex items-center">
            <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 text-tinta-tenue" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto"
              aria-label="Buscar producto"
              className="h-10 w-full rounded-md border border-linea-fuerte bg-papel pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-tinta-tenue hover:border-tinta-tenue focus:border-espresso"
            />
          </label>
        </div>
      </div>

      {/* Leyenda: el estado nunca depende solo del color */}
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-tinta-suave">
        {(['disponible', 'bajo', 'agotado', 'manual'] as const).map((clave) => (
          <li key={clave} className="flex items-center gap-1.5">
            <span className={cn('size-1.5 rounded-full', estilos[clave].punto)} />
            {estilos[clave].texto}
            {clave === 'manual' && <span className="text-tinta-tenue">(marcado con •)</span>}
          </li>
        ))}
      </ul>

      {visibles.length === 0 ? (
        <EmptyState icono={Search} titulo="Sin resultados" descripcion="Prueba con otro filtro o nombre." />
      ) : (
        <Tooltip.Provider delayDuration={150}>
          <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
            <table className="cifra w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-linea text-xs font-medium tracking-wide text-tinta-tenue uppercase">
                  <th className="sticky left-0 z-10 bg-crema py-3 pr-4 text-left font-medium">Producto</th>
                  {activas.map((s) => (
                    <th key={s.id} className="w-24 px-1 py-3 text-center font-medium">
                      {s.nombre}
                    </th>
                  ))}
                  <th className="w-20 py-3 pl-3 text-right font-medium">Total</th>
                  <th className="hidden w-44 py-3 pl-6 text-left font-medium xl:table-cell">Dónde sobra</th>
                </tr>
              </thead>
              <motion.tbody key={`${vista}-${categoria}`} initial="oculto" animate="visible">
                {visibles.map((fila, i) => (
                  <motion.tr
                    key={fila.producto.id}
                    variants={{
                      oculto: { opacity: 0 },
                      visible: { opacity: 1, transition: { delay: Math.min(i, 15) * 0.02, duration: 0.3, ease: suave } },
                    }}
                    className="group border-b border-linea"
                  >
                    <td className="sticky left-0 z-10 bg-crema py-2.5 pr-4 transition-colors group-hover:bg-hueso">
                      <span className="block truncate font-sans font-medium">{fila.producto.nombre}</span>
                      <span className="block truncate font-sans text-xs text-tinta-tenue">{fila.producto.categoria}</span>
                    </td>
                    {activas.map((s) => {
                      const celda = fila.celdas[s.id]
                      if (!celda) return <td key={s.id} className="text-center text-tinta-tenue">—</td>
                      const manual = !!celda.existencia.agotadoManual
                      const estilo = estilos[manual ? 'manual' : celda.estado]
                      return (
                        <td key={s.id} className="px-1 py-1.5 transition-colors group-hover:bg-hueso/60">
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <span
                                tabIndex={0}
                                aria-label={`${fila.producto.nombre} en ${s.nombre}: ${celda.existencia.cantidad} piezas, ${estilo.texto}`}
                                className={cn(
                                  'mx-auto flex h-9 w-16 cursor-default items-center justify-center gap-1 rounded-sm outline-none transition-transform duration-150 hover:scale-105',
                                  estilo.celda,
                                )}
                              >
                                {manual && <span className="size-1.5 rounded-full bg-ladrillo" />}
                                {celda.existencia.cantidad}
                              </span>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                side="top"
                                sideOffset={6}
                                className="z-50 max-w-56 rounded-md bg-tinta px-3 py-2 text-xs text-crema animar-emerger"
                              >
                                <span className="block font-medium">
                                  {s.nombre} · {estilo.texto}
                                </span>
                                <span className="cifra block text-crema/70">
                                  {celda.existencia.cantidad} pzs · límite {celda.existencia.limiteStockBajo}
                                </span>
                                {celda.existencia.agotadoManual && (
                                  <span className="mt-1 block text-crema/70">
                                    {celda.existencia.agotadoManual.motivo} ·{' '}
                                    {nombreUsuario(celda.existencia.agotadoManual.usuarioId)}
                                  </span>
                                )}
                                <Tooltip.Arrow className="fill-tinta" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </td>
                      )
                    })}
                    <td className="py-2.5 pl-3 text-right font-medium">{fila.total}</td>
                    <td className="hidden py-2.5 pl-6 text-[13px] text-tinta-suave xl:table-cell">
                      {fila.sobraEn ? (
                        <>
                          {fila.sobraEn.nombre}
                          <span className="ml-1.5 text-tinta-tenue">{fila.sobraEn.cantidad} pzs</span>
                        </>
                      ) : (
                        <span className="text-tinta-tenue">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
              <tfoot>
                <tr className="text-xs text-tinta-suave">
                  <td className="sticky left-0 z-10 bg-crema py-3 pr-4 font-sans font-medium tracking-wide uppercase">
                    Total
                  </td>
                  {activas.map((s) => (
                    <td key={s.id} className="py-3 text-center text-sm font-medium text-tinta">
                      {totalPorSucursal(s.id)}
                    </td>
                  ))}
                  <td className="py-3 pl-3 text-right text-sm font-medium text-tinta">
                    {visibles.reduce((suma, f) => suma + f.total, 0)}
                  </td>
                  <td className="hidden xl:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Tooltip.Provider>
      )}

      <p className="mt-8 text-[13px] text-tinta-tenue">
        Las entradas y correcciones de inventario las registra el gerente de cada sucursal.
      </p>
    </Pagina>
  )
}
