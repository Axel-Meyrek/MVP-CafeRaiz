import * as Tooltip from '@radix-ui/react-tooltip'
import { motion } from 'motion/react'
import { ChartColumn, Download } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { SelectorRango, rangoInicial } from '../components/reportes/SelectorRango'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { StatNumber } from '../components/ui/StatNumber'
import { useDatos } from '../context/DatosContext'
import { cn } from '../lib/cn'
import { claveDia, formatoMoneda } from '../lib/formato'
import { calcularReporte, descargarCsv, diasEntre, enRango, type RangoFechas } from '../lib/reporte'

const suave = [0.25, 1, 0.5, 1] as const
const diaCorto = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
const diaSemana = new Intl.DateTimeFormat('es-MX', { weekday: 'narrow' })
const diaNumero = new Intl.DateTimeFormat('es-MX', { day: 'numeric' })
const fechaDe = (clave: string) => new Date(`${clave}T12:00:00`)
const porcentaje = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0)
/** Cinco pasos de un solo tono (espresso) para la intensidad: más oscuro, más ingresos. */
const pasos = ['bg-hueso', 'bg-espresso/20', 'bg-espresso/40', 'bg-espresso/65', 'bg-espresso']

export function ReporteComparativo() {
  const { ventas, productos, sucursales } = useDatos()
  const [rango, setRango] = useState<RangoFechas>(rangoInicial)
  const primerDia = useMemo(() => (ventas[0] ? claveDia(ventas[0].fecha) : rango.desde), [ventas, rango.desde])

  // Solo el admin ve el comparativo de todas las sucursales (reglas 73 y 74).
  // Las dadas de baja aparecen si tuvieron ventas en el periodo: su historial se conserva.
  const filas = useMemo(
    () =>
      sucursales
        .map((sucursal) => ({ sucursal, reporte: calcularReporte(ventas, productos, sucursal.id, rango) }))
        .filter((f) => f.sucursal.activa || f.reporte.ventas > 0 || f.reporte.canceladas.ventas > 0)
        .sort((a, b) => b.reporte.ingresos - a.reporte.ingresos),
    [ventas, productos, sucursales, rango],
  )

  const total = filas.reduce((s, f) => s + f.reporte.ingresos, 0)
  const numeroVentas = filas.reduce((s, f) => s + f.reporte.ventas, 0)
  const canceladas = filas.reduce((s, f) => s + f.reporte.canceladas.ventas, 0)
  const montoCancelado = filas.reduce((s, f) => s + f.reporte.canceladas.monto, 0)
  const maximo = Math.max(...filas.map((f) => f.reporte.ingresos), 1)

  // Productos más vendidos en la cadena, con sus unidades por sucursal.
  const topProductos = useMemo(() => {
    const mapa = new Map<string, { unidades: number; ingresos: number; porSucursal: Map<string, number> }>()
    for (const { sucursal, reporte } of filas) {
      for (const fila of reporte.productos) {
        const actual = mapa.get(fila.producto.id) ?? { unidades: 0, ingresos: 0, porSucursal: new Map() }
        actual.unidades += fila.unidades
        actual.ingresos += fila.ingresos
        actual.porSucursal.set(sucursal.id, fila.unidades)
        mapa.set(fila.producto.id, actual)
      }
    }
    return [...mapa.entries()]
      .map(([id, datos]) => ({ producto: productos.find((p) => p.id === id)!, ...datos }))
      .filter((f) => f.producto)
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 8)
  }, [filas, productos])

  // Ingresos por día y sucursal para el mapa de calor.
  const dias = diasEntre(rango)
  const porDia = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const v of ventas) {
      if (v.cancelacion || !enRango(v, rango)) continue
      const clave = `${v.sucursalId}|${claveDia(v.fecha)}`
      mapa.set(clave, (mapa.get(clave) ?? 0) + v.total)
    }
    return mapa
  }, [ventas, rango])
  // La escala va del día más bajo al más alto del periodo para que las diferencias se distingan.
  const valoresDia = [...porDia.values()]
  const maximoDia = Math.max(...valoresDia, 1)
  const minimoDia = Math.min(...valoresDia, maximoDia)
  const paso = (valor: number) => {
    if (valor <= 0) return 0
    if (maximoDia === minimoDia) return 4
    return Math.min(4, 1 + Math.floor(((valor - minimoDia) / (maximoDia - minimoDia)) * 3.999))
  }

  const unSoloDia = rango.desde === rango.hasta
  const periodo = unSoloDia
    ? diaCorto.format(fechaDe(rango.desde))
    : `${diaCorto.format(fechaDe(rango.desde))} – ${diaCorto.format(fechaDe(rango.hasta))}`

  const descargar = () =>
    descargarCsv(`comparativo-${rango.desde}-a-${rango.hasta}.csv`, [
      ['Reporte comparativo de sucursales'],
      ['Periodo', rango.desde, rango.hasta],
      [],
      ['Sucursal', 'Ingresos', '% del total', 'Ventas', 'Ticket promedio', 'Descuentos', 'Canceladas', 'Más vendido'],
      ...filas.map(({ sucursal, reporte }) => [
        sucursal.nombre,
        reporte.ingresos.toFixed(2),
        porcentaje(reporte.ingresos, total),
        reporte.ventas,
        reporte.ticketPromedio.toFixed(2),
        reporte.descuentos.monto.toFixed(2),
        reporte.canceladas.ventas,
        reporte.productos[0]?.producto.nombre ?? '',
      ]),
      ['Total', total.toFixed(2), 100, numeroVentas, (numeroVentas ? total / numeroVentas : 0).toFixed(2)],
      [],
      ['Producto', 'Unidades', 'Ingresos', ...filas.map((f) => f.sucursal.nombre)],
      ...topProductos.map((p) => [
        p.producto.nombre,
        p.unidades,
        p.ingresos.toFixed(2),
        ...filas.map((f) => p.porSucursal.get(f.sucursal.id) ?? 0),
      ]),
    ])

  return (
    <Pagina
      titulo="Comparativo"
      descripcion={`Todas las sucursales · ${periodo}`}
      acciones={
        <Button variante="secundario" onClick={descargar} disabled={numeroVentas === 0}>
          <Download size={15} strokeWidth={1.5} />
          Descargar CSV
        </Button>
      }
    >
      <div className="mb-8">
        <SelectorRango rango={rango} alCambiar={setRango} minimo={primerDia} />
      </div>

      <section className="grid grid-cols-2 gap-y-8 border-y border-linea py-8 md:grid-cols-4">
        <StatNumber etiqueta="Ingresos" valor={formatoMoneda(total)} className="col-span-2 md:col-span-1" />
        <StatNumber etiqueta="Ventas" valor={String(numeroVentas)} className="md:border-l md:border-linea md:pl-8" />
        <StatNumber
          etiqueta="Ticket promedio"
          valor={formatoMoneda(numeroVentas ? total / numeroVentas : 0)}
          className="border-l border-linea pl-6 md:pl-8"
        />
        <StatNumber
          etiqueta="Canceladas"
          valor={String(canceladas)}
          nota={canceladas ? `${formatoMoneda(montoCancelado)} fuera de ingresos` : 'Ninguna en el periodo'}
          className="md:border-l md:border-linea md:pl-8"
        />
      </section>

      {numeroVentas === 0 ? (
        <EmptyState icono={ChartColumn} titulo="Sin ventas en el periodo" descripcion="Prueba con otro rango de fechas." />
      ) : (
        <motion.div key={`${rango.desde}-${rango.hasta}`} initial="oculto" animate="visible">
          <Bloque titulo="Por sucursal" orden={0} className="mt-12">
            <div className="hidden grid-cols-[2rem_minmax(0,10rem)_minmax(0,1fr)_4rem_5rem_7rem_minmax(0,10rem)] gap-x-6 border-b border-linea pb-2 text-xs font-medium tracking-wide text-tinta-tenue uppercase lg:grid">
              <span>#</span>
              <span>Sucursal</span>
              <span>Ingresos</span>
              <span className="text-right">%</span>
              <span className="text-right">Ventas</span>
              <span className="text-right">Ticket</span>
              <span>Más vendido</span>
            </div>
            <ol>
              {filas.map(({ sucursal, reporte }, i) => (
                <li
                  key={sucursal.id}
                  className="cifra grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-linea py-4 text-sm lg:grid-cols-[2rem_minmax(0,10rem)_minmax(0,1fr)_4rem_5rem_7rem_minmax(0,10rem)] lg:gap-x-6"
                >
                  <span className="text-tinta-tenue">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-sans font-medium">{sucursal.nombre}</span>
                    {!sucursal.activa && <Badge>De baja</Badge>}
                  </span>
                  <span className="col-span-3 col-start-1 flex items-center gap-3 lg:col-span-1 lg:col-start-auto">
                    <span className="flex h-2 flex-1 items-center">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${(reporte.ingresos / maximo) * 100}%` }}
                        transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: suave }}
                        className="h-full rounded-r-[4px] bg-espresso"
                      />
                    </span>
                    <span className="w-24 text-right">{formatoMoneda(reporte.ingresos)}</span>
                  </span>
                  <span className="col-start-3 row-start-1 text-right text-tinta-tenue lg:col-start-auto lg:row-start-auto">
                    {porcentaje(reporte.ingresos, total)}%
                  </span>
                  <span className="col-span-3 col-start-1 flex gap-4 text-[13px] text-tinta-suave lg:contents lg:text-sm lg:text-tinta">
                    <span className="lg:text-right">
                      <span className="lg:hidden">Ventas </span>
                      {reporte.ventas}
                    </span>
                    <span className="lg:text-right">
                      <span className="lg:hidden">Ticket </span>
                      {formatoMoneda(reporte.ticketPromedio)}
                    </span>
                    <span className="min-w-0 truncate font-sans lg:text-[13px] lg:text-tinta-suave">
                      <span className="text-tinta-tenue lg:hidden">· </span>
                      {reporte.productos[0]?.producto.nombre ?? '—'}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Bloque>

          {!unSoloDia && (
            <Bloque titulo="Ingresos por día" orden={1} className="mt-14">
              <Tooltip.Provider delayDuration={100}>
                <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
                  <table className="cifra w-full border-separate border-spacing-[3px] text-xs" style={{ minWidth: `${8 + dias.length * 2.25}rem` }}>
                    <caption className="sr-only">Ingresos por día y sucursal</caption>
                    <thead>
                      <tr className="text-tinta-tenue">
                        <th className="w-28 text-left font-normal" />
                        {dias.map((d) => (
                          <th key={d} className="pb-1 text-center font-normal">
                            <span className="block uppercase">{diaSemana.format(fechaDe(d))}</span>
                            <span className="block">{diaNumero.format(fechaDe(d))}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map(({ sucursal }) => (
                        <tr key={sucursal.id}>
                          <th scope="row" className="truncate pr-3 text-left font-sans text-[13px] font-normal text-tinta-suave">
                            {sucursal.nombre}
                          </th>
                          {dias.map((d) => {
                            const valor = porDia.get(`${sucursal.id}|${d}`) ?? 0
                            return (
                              <td key={d} className="p-0">
                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <span
                                      tabIndex={0}
                                      aria-label={`${sucursal.nombre}, ${diaCorto.format(fechaDe(d))}: ${formatoMoneda(valor)}`}
                                      className={cn(
                                        'block h-8 min-w-8 rounded-[3px] outline-none transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-espresso/40',
                                        pasos[paso(valor)],
                                      )}
                                    />
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      side="top"
                                      sideOffset={6}
                                      className="z-50 rounded-md bg-tinta px-3 py-2 text-xs text-crema animar-emerger"
                                    >
                                      <span className="block font-medium">
                                        {sucursal.nombre} · {diaCorto.format(fechaDe(d))}
                                      </span>
                                      <span className="cifra block text-crema/70">{formatoMoneda(valor)}</span>
                                      <Tooltip.Arrow className="fill-tinta" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="cifra mt-3 flex flex-wrap items-center gap-2 text-xs text-tinta-tenue">
                  <span className={cn('size-3 rounded-[2px]', pasos[0])} />
                  Sin ventas
                  <span className="ml-3">{formatoMoneda(minimoDia)}</span>
                  {pasos.slice(1).map((clase) => (
                    <span key={clase} className={cn('size-3 rounded-[2px]', clase)} />
                  ))}
                  {formatoMoneda(maximoDia)}
                  <span className="ml-1">por día</span>
                </div>
              </Tooltip.Provider>
            </Bloque>
          )}

          <Bloque titulo="Productos más vendidos" orden={2} className="mt-14">
            <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
              <table className="cifra w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-linea text-xs font-medium tracking-wide text-tinta-tenue uppercase">
                    <th className="w-8 py-2 text-left font-medium">#</th>
                    <th className="py-2 text-left font-medium">Producto</th>
                    <th className="w-20 py-2 text-right font-medium">Pzs</th>
                    {filas.map((f) => (
                      <th key={f.sucursal.id} className="w-24 py-2 text-right font-medium normal-case tracking-normal">
                        {f.sucursal.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProductos.map((p, i) => {
                    const mejor = Math.max(...filas.map((f) => p.porSucursal.get(f.sucursal.id) ?? 0))
                    return (
                      <tr key={p.producto.id} className="border-b border-linea">
                        <td className="py-3 text-tinta-tenue">{i + 1}</td>
                        <td className="py-3 font-sans font-medium">{p.producto.nombre}</td>
                        <td className="py-3 text-right font-medium">{p.unidades}</td>
                        {filas.map((f) => {
                          const unidades = p.porSucursal.get(f.sucursal.id) ?? 0
                          return (
                            <td
                              key={f.sucursal.id}
                              className={cn('py-3 text-right', unidades === mejor && unidades > 0 ? 'text-espresso font-medium' : 'text-tinta-suave')}
                            >
                              {unidades}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-tinta-tenue">
              Resaltada, la sucursal que más vendió cada producto. Las ventas canceladas no cuentan.
            </p>
          </Bloque>
        </motion.div>
      )}
    </Pagina>
  )
}

function Bloque({ titulo, children, orden, className }: { titulo: string; children: ReactNode; orden: number; className?: string }) {
  return (
    <motion.section
      variants={{
        oculto: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: orden * 0.06, ease: suave } },
      }}
      className={cn('min-w-0', className)}
    >
      <h2 className="mb-5 text-lg font-medium tracking-tight">{titulo}</h2>
      {children}
    </motion.section>
  )
}
