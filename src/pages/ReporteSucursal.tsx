import { motion } from 'motion/react'
import { ChartColumn, Download } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Columnas, type PuntoColumna } from '../components/graficas/Columnas'
import { Pagina } from '../components/layout/Pagina'
import { SelectorRango, rangoInicial } from '../components/reportes/SelectorRango'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { StatNumber } from '../components/ui/StatNumber'
import { useDatos } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { cn } from '../lib/cn'
import { claveDia, formatoMoneda } from '../lib/formato'
import { calcularReporte, descargarCsv, type RangoFechas } from '../lib/reporte'

const suave = [0.25, 1, 0.5, 1] as const
const diaCorto = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
const diaNumero = new Intl.DateTimeFormat('es-MX', { day: 'numeric' })
const fechaDe = (clave: string) => new Date(`${clave}T12:00:00`)
const porcentaje = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0)

export function ReporteSucursal() {
  const { sucursal } = useSesion()
  const { ventas, usuarios, productos } = useDatos()
  const [rango, setRango] = useState<RangoFechas>(rangoInicial)
  const sucursalId = sucursal?.id ?? ''

  // El gerente solo genera reportes de su propia sucursal (regla 75).
  const reporte = useMemo(() => calcularReporte(ventas, productos, sucursalId, rango), [ventas, productos, sucursalId, rango])
  // Las ventas están en orden cronológico: la primera marca el inicio de los datos.
  const primerDia = useMemo(() => (ventas[0] ? claveDia(ventas[0].fecha) : rango.desde), [ventas, rango.desde])

  const unSoloDia = rango.desde === rango.hasta
  const grafica: PuntoColumna[] = unSoloDia
    ? Array.from({ length: 13 }, (_, i) => {
        const hora = 7 + i
        const punto = reporte.porHora.find((h) => h.hora === hora) ?? { total: 0, ventas: 0 }
        return {
          clave: String(hora),
          etiqueta: hora % 2 === 1 ? String(hora) : '',
          rango: `${hora}:00 – ${hora + 1}:00`,
          ...punto,
        }
      })
    : reporte.porDia.map((d, i, todos) => ({
        clave: d.dia,
        etiqueta: todos.length <= 10 || i % Math.ceil(todos.length / 8) === 0 ? diaNumero.format(fechaDe(d.dia)) : '',
        rango: diaCorto.format(fechaDe(d.dia)),
        total: d.total,
        ventas: d.ventas,
      }))

  const nombrePersona = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? 'Usuario'
  const periodo =
    unSoloDia ? diaCorto.format(fechaDe(rango.desde)) : `${diaCorto.format(fechaDe(rango.desde))} – ${diaCorto.format(fechaDe(rango.hasta))}`

  const descargar = () =>
    descargarCsv(`reporte-${sucursalId}-${rango.desde}-a-${rango.hasta}.csv`, [
      ['Reporte de sucursal', sucursal?.nombre ?? ''],
      ['Periodo', rango.desde, rango.hasta],
      [],
      ['Ingresos', reporte.ingresos.toFixed(2)],
      ['Ventas', reporte.ventas],
      ['Ticket promedio', reporte.ticketPromedio.toFixed(2)],
      ['Descuentos', reporte.descuentos.monto.toFixed(2)],
      ['Ventas canceladas', reporte.canceladas.ventas, reporte.canceladas.monto.toFixed(2)],
      [],
      ['Producto', 'Categoría', 'Unidades', 'Ingresos'],
      ...reporte.productos.map((f) => [f.producto.nombre, f.producto.categoria, f.unidades, f.ingresos.toFixed(2)]),
    ])

  return (
    <Pagina
      titulo="Reporte"
      descripcion={`Sucursal ${sucursal?.nombre ?? ''} · ${periodo}`}
      acciones={
        <Button variante="secundario" onClick={descargar} disabled={reporte.ventas === 0}>
          <Download size={15} strokeWidth={1.5} />
          Descargar CSV
        </Button>
      }
    >
      <div className="mb-8">
        <SelectorRango rango={rango} alCambiar={setRango} minimo={primerDia} />
      </div>

      <section className="grid grid-cols-2 gap-y-8 border-y border-linea py-8 md:grid-cols-4">
        <StatNumber etiqueta="Ingresos" valor={formatoMoneda(reporte.ingresos)} className="col-span-2 md:col-span-1" />
        <StatNumber etiqueta="Ventas" valor={String(reporte.ventas)} className="md:border-l md:border-linea md:pl-8" />
        <StatNumber
          etiqueta="Ticket promedio"
          valor={formatoMoneda(reporte.ticketPromedio)}
          className="border-l border-linea pl-6 md:pl-8"
        />
        <StatNumber
          etiqueta="Descuentos"
          valor={formatoMoneda(reporte.descuentos.monto)}
          nota={`${reporte.descuentos.ventas} ${reporte.descuentos.ventas === 1 ? 'venta' : 'ventas'} con descuento`}
          className="md:border-l md:border-linea md:pl-8"
        />
      </section>

      {reporte.ventas === 0 ? (
        <EmptyState icono={ChartColumn} titulo="Sin ventas en el periodo" descripcion="Prueba con otro rango de fechas." />
      ) : (
        <motion.div key={`${rango.desde}-${rango.hasta}`} initial="oculto" animate="visible">
          <Bloque titulo={unSoloDia ? 'Ventas por hora' : 'Ventas por día'} orden={0} className="mt-12">
            <Columnas datos={grafica} titulo={unSoloDia ? 'Ventas por hora' : 'Ventas por día'} />
          </Bloque>

          <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
            <Bloque titulo="Productos más vendidos" orden={1}>
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_6.5rem] gap-x-4 border-b border-linea pb-2 text-xs font-medium tracking-wide text-tinta-tenue uppercase md:grid-cols-[2rem_minmax(0,1fr)_5rem_7rem_3.5rem]">
                <span>#</span>
                <span>Producto</span>
                <span className="text-right">Pzs</span>
                <span className="text-right">Ingresos</span>
                <span className="hidden text-right md:block">%</span>
              </div>
              <ol>
                {reporte.productos.map((fila, i) => (
                  <li
                    key={fila.producto.id}
                    className="cifra grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_6.5rem] items-center gap-x-4 border-b border-linea py-3 text-sm md:grid-cols-[2rem_minmax(0,1fr)_5rem_7rem_3.5rem]"
                  >
                    <span className="text-tinta-tenue">{i + 1}</span>
                    <span className="min-w-0">
                      <span className={cn('block truncate', i < 5 && 'font-medium')}>{fila.producto.nombre}</span>
                      <span className="mt-1.5 flex h-1">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${(fila.unidades / reporte.productos[0].unidades) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.1 + Math.min(i, 10) * 0.03, ease: suave }}
                          className={cn('h-full rounded-r-[4px]', i < 5 ? 'bg-espresso' : 'bg-linea-fuerte')}
                        />
                      </span>
                    </span>
                    <span className="text-right">{fila.unidades}</span>
                    <span className="text-right">{formatoMoneda(fila.ingresos)}</span>
                    <span className="hidden text-right text-tinta-tenue md:block">
                      {porcentaje(fila.ingresos, reporte.productos.reduce((s, f) => s + f.ingresos, 0))}%
                    </span>
                  </li>
                ))}
              </ol>
            </Bloque>

            <div className="flex flex-col gap-12">
              <Bloque titulo="Método de pago" orden={2}>
                {(['tarjeta', 'efectivo'] as const).map((metodo) => (
                  <Proporcion
                    key={metodo}
                    etiqueta={metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
                    valor={formatoMoneda(reporte.porMetodo[metodo].total)}
                    nota={`${reporte.porMetodo[metodo].ventas} ventas`}
                    parte={porcentaje(reporte.porMetodo[metodo].total, reporte.ingresos)}
                  />
                ))}
              </Bloque>

              <Bloque titulo="Por persona" orden={3}>
                {reporte.porPersona.map((p) => (
                  <Proporcion
                    key={p.usuarioId}
                    etiqueta={nombrePersona(p.usuarioId)}
                    valor={formatoMoneda(p.total)}
                    nota={`${p.ventas} ventas`}
                    parte={porcentaje(p.total, reporte.ingresos)}
                  />
                ))}
              </Bloque>

              <Bloque titulo="Canceladas" orden={4}>
                <p className="cifra text-sm text-tinta-suave">
                  {reporte.canceladas.ventas === 0
                    ? 'Ninguna venta cancelada en el periodo.'
                    : `${reporte.canceladas.ventas} ${reporte.canceladas.ventas === 1 ? 'venta' : 'ventas'} por ${formatoMoneda(reporte.canceladas.monto)}. No se suman a los ingresos.`}
                </p>
              </Bloque>
            </div>
          </div>
        </motion.div>
      )}
    </Pagina>
  )
}

function Bloque({
  titulo,
  children,
  orden,
  className,
}: {
  titulo: string
  children: ReactNode
  orden: number
  className?: string
}) {
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

function Proporcion({ etiqueta, valor, nota, parte }: { etiqueta: string; valor: string; nota: string; parte: number }) {
  return (
    <div className="border-b border-linea py-3 first:border-t">
      <div className="cifra flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium">{etiqueta}</span>
        <span>
          {valor}
          <span className="ml-2 text-tinta-tenue">{parte}%</span>
        </span>
      </div>
      <div className="mt-2 flex h-1 rounded-full bg-hueso">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${parte}%` }}
          transition={{ duration: 0.6, ease: suave }}
          className="h-full rounded-full bg-espresso"
        />
      </div>
      <p className="cifra mt-1.5 text-xs text-tinta-tenue">{nota}</p>
    </div>
  )
}
