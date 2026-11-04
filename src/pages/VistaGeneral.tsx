import { motion } from 'motion/react'
import { ArrowUpRight, CircleCheck } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Pagina } from '../components/layout/Pagina'
import { Badge } from '../components/ui/Badge'
import { StatNumber } from '../components/ui/StatNumber'
import { useDatos } from '../context/DatosContext'
import { productos, sucursales } from '../data/catalogo'
import { cn } from '../lib/cn'
import { claveDia, esAyer, formatoFechaLarga, formatoMoneda, minutoDelDia } from '../lib/formato'
import { estadoExistencia } from '../lib/reglas'
import { calcularReporte } from '../lib/reporte'

const suave = [0.25, 1, 0.5, 1] as const

export function VistaGeneral() {
  const { ventas, existencias } = useDatos()
  const [ahora] = useState(() => new Date())

  // El admin ve ventas e inventario de todas las sucursales, solo lectura (reglas 14, 15 y 17).
  const filas = useMemo(() => {
    const hoy = claveDia(ahora)
    const minutoActual = minutoDelDia(ahora)
    return sucursales
      .filter((s) => s.activa)
      .map((sucursal) => {
        const reporte = calcularReporte(ventas, sucursal.id, { desde: hoy, hasta: hoy })
        const ayer = ventas
          .filter(
            (v) =>
              v.sucursalId === sucursal.id &&
              !v.cancelacion &&
              esAyer(v.fecha) &&
              minutoDelDia(v.fecha) <= minutoActual,
          )
          .reduce((suma, v) => suma + v.total, 0)

        const pendientes = productos
          .filter((p) => p.activo)
          .flatMap((producto) => {
            const existencia = existencias.find((e) => e.sucursalId === sucursal.id && e.productoId === producto.id)
            if (!existencia) return []
            const estado = estadoExistencia(existencia)
            return estado === 'disponible' ? [] : [{ producto, existencia, estado }]
          })
          .sort((a, b) => Number(b.estado === 'agotado') - Number(a.estado === 'agotado'))

        return {
          sucursal,
          reporte,
          variacion: ayer > 0 ? ((reporte.ingresos - ayer) / ayer) * 100 : null,
          masVendido: reporte.productos[0] ?? null,
          pendientes,
          agotados: pendientes.filter((p) => p.estado === 'agotado').length,
          bajos: pendientes.filter((p) => p.estado === 'bajo').length,
        }
      })
      .sort((a, b) => b.reporte.ingresos - a.reporte.ingresos)
  }, [ventas, existencias, ahora])

  const total = filas.reduce((suma, f) => suma + f.reporte.ingresos, 0)
  const numeroVentas = filas.reduce((suma, f) => suma + f.reporte.ventas, 0)
  const agotados = filas.reduce((suma, f) => suma + f.agotados, 0)
  const bajos = filas.reduce((suma, f) => suma + f.bajos, 0)
  const maximo = Math.max(...filas.map((f) => f.reporte.ingresos), 1)
  const fecha = formatoFechaLarga(ahora)

  return (
    <Pagina
      titulo="Vista general"
      descripcion={`${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · ${filas.length} sucursales`}
    >
      <section className="grid grid-cols-2 gap-y-8 border-y border-linea py-8 md:grid-cols-4">
        <StatNumber etiqueta="Vendido hoy" valor={formatoMoneda(total)} className="col-span-2 md:col-span-1" />
        <StatNumber etiqueta="Ventas" valor={String(numeroVentas)} className="md:border-l md:border-linea md:pl-8" />
        <StatNumber
          etiqueta="Ticket promedio"
          valor={formatoMoneda(numeroVentas ? total / numeroVentas : 0)}
          className="border-l border-linea pl-6 md:pl-8"
        />
        <StatNumber
          etiqueta="Por atender"
          valor={String(agotados + bajos)}
          nota={`${agotados} agotados · ${bajos} en stock bajo`}
          className="md:border-l md:border-linea md:pl-8"
        />
      </section>

      <Bloque titulo="Sucursales hoy" orden={0} className="mt-12">
        {/* Encabezados (escritorio) */}
        <div className="hidden grid-cols-[2rem_minmax(0,11rem)_minmax(0,1fr)_5rem_6rem_minmax(0,10rem)] gap-x-6 border-b border-linea pb-2 text-xs font-medium tracking-wide text-tinta-tenue uppercase lg:grid">
          <span>#</span>
          <span>Sucursal</span>
          <span>Vendido</span>
          <span className="text-right">Ventas</span>
          <span className="text-right">vs. ayer</span>
          <span>Más vendido</span>
        </div>
        <ol>
          {filas.map((fila, i) => (
            <motion.li
              key={fila.sucursal.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 + i * 0.05, ease: suave }}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-linea py-4 lg:grid-cols-[2rem_minmax(0,11rem)_minmax(0,1fr)_5rem_6rem_minmax(0,10rem)] lg:gap-x-6"
            >
              <span className="cifra text-sm text-tinta-tenue">{i + 1}</span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{fila.sucursal.nombre}</span>
                <span className="block truncate text-xs text-tinta-tenue">{fila.sucursal.zona}</span>
              </span>

              {/* Vendido con barra proporcional */}
              <span className="col-span-3 col-start-1 flex items-center gap-3 lg:col-span-1 lg:col-start-auto">
                <span className="flex h-2 flex-1 items-center">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${(fila.reporte.ingresos / maximo) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: suave }}
                    className="h-full rounded-r-[4px] bg-espresso"
                  />
                </span>
                <span className="cifra w-24 text-right text-sm">{formatoMoneda(fila.reporte.ingresos)}</span>
              </span>

              <span className="cifra hidden text-right text-sm lg:block">{fila.reporte.ventas}</span>
              <span className="row-start-1 col-start-3 lg:row-start-auto lg:col-start-auto">
                <Variacion valor={fila.variacion} />
              </span>

              <span className="col-span-3 col-start-1 min-w-0 truncate text-[13px] text-tinta-suave lg:col-span-1 lg:col-start-auto">
                <span className="text-tinta-tenue lg:hidden">Más vendido: </span>
                {fila.masVendido ? `${fila.masVendido.producto.nombre} · ${fila.masVendido.unidades} pzs` : 'Sin ventas'}
              </span>
            </motion.li>
          ))}
        </ol>
      </Bloque>

      <Bloque
        titulo="Inventario por atender"
        orden={1}
        className="mt-14"
        enlace={{ a: '/inventario-global', texto: 'Inventario global' }}
      >
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {[...filas]
            .sort((a, b) => b.agotados - a.agotados || b.bajos - a.bajos)
            .map(({ sucursal, pendientes, agotados: sinStock, bajos: pocos }) => (
              <div key={sucursal.id} className="min-w-0">
                <div className="flex items-baseline justify-between border-b border-linea pb-2">
                  <h3 className="text-sm font-medium">{sucursal.nombre}</h3>
                  <span className="cifra text-xs text-tinta-tenue">
                    {pendientes.length === 0
                      ? 'Al día'
                      : `${sinStock} ${sinStock === 1 ? 'agotado' : 'agotados'} · ${pocos} ${pocos === 1 ? 'bajo' : 'bajos'}`}
                  </span>
                </div>
                {pendientes.length === 0 ? (
                  <p className="flex items-center gap-2 py-3 text-sm text-tinta-suave">
                    <CircleCheck size={15} strokeWidth={1.5} className="text-oliva" />
                    Todo en orden.
                  </p>
                ) : (
                  <ul>
                    {pendientes.map(({ producto, existencia, estado }) => (
                      <li key={producto.id} className="flex items-center gap-3 border-b border-linea py-2.5">
                        <span className="min-w-0 flex-1 truncate text-sm">{producto.nombre}</span>
                        <span className="cifra text-xs text-tinta-tenue">{existencia.cantidad} pzs</span>
                        <Badge estado={estado === 'agotado' ? 'agotado' : 'bajo'}>
                          {existencia.agotadoManual ? 'A mano' : estado === 'agotado' ? 'Agotado' : 'Bajo'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      </Bloque>
    </Pagina>
  )
}

function Variacion({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="block text-right text-xs text-tinta-tenue">—</span>
  const redondeado = Math.round(valor)
  return (
    <span
      className={cn(
        'cifra block text-right text-[13px]',
        redondeado > 0 ? 'text-oliva' : redondeado < 0 ? 'text-ladrillo' : 'text-tinta-tenue',
      )}
      title="Contra lo vendido ayer a esta misma hora"
    >
      {redondeado > 0 ? '+' : redondeado < 0 ? '−' : ''}
      {Math.abs(redondeado)}%
    </span>
  )
}

function Bloque({
  titulo,
  children,
  orden,
  enlace,
  className,
}: {
  titulo: string
  children: ReactNode
  orden: number
  enlace?: { a: string; texto: string }
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: orden * 0.08, ease: suave }}
      className={cn('min-w-0', className)}
    >
      <header className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-medium tracking-tight">{titulo}</h2>
        {enlace && (
          <Link
            to={enlace.a}
            className="group inline-flex items-center gap-1 text-[13px] text-tinta-suave transition-colors hover:text-espresso"
          >
            {enlace.texto}
            <ArrowUpRight
              size={14}
              strokeWidth={1.5}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        )}
      </header>
      {children}
    </motion.section>
  )
}
