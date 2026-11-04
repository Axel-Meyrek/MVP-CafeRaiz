import { motion } from 'motion/react'
import { ArrowUpRight, CircleCheck } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Columnas, type PuntoColumna } from '../components/graficas/Columnas'
import { Pagina } from '../components/layout/Pagina'
import { Badge } from '../components/ui/Badge'
import { StatNumber } from '../components/ui/StatNumber'
import { useDatos } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { productos } from '../data/catalogo'
import { cn } from '../lib/cn'
import { esAyer, esHoy, formatoFechaLarga, formatoMoneda, minutoDelDia } from '../lib/formato'
import { estadoExistencia } from '../lib/reglas'

const suave = [0.25, 1, 0.5, 1] as const
const sumar = (lista: { total: number }[]) => lista.reduce((suma, v) => suma + v.total, 0)

export function PanelSucursal() {
  const { sucursal } = useSesion()
  const { ventas, existencias } = useDatos()
  const [ahora] = useState(() => new Date())
  const sucursalId = sucursal?.id ?? ''

  const resumen = useMemo(() => {
    // El gerente solo ve datos de su sucursal (regla 18).
    const propias = ventas.filter((v) => v.sucursalId === sucursalId)
    const hoy = propias.filter((v) => esHoy(v.fecha))
    const vigentes = hoy.filter((v) => !v.cancelacion)
    const minutoActual = minutoDelDia(ahora)
    const ayerALaHora = propias.filter(
      (v) => !v.cancelacion && esAyer(v.fecha) && minutoDelDia(v.fecha) <= minutoActual,
    )

    const horaActual = Math.floor(minutoActual / 60)
    const ultimaHora = Math.max(19, horaActual)
    const porHora: PuntoColumna[] = Array.from({ length: ultimaHora - 7 + 1 }, (_, i) => {
      const hora = 7 + i
      const enHora = vigentes.filter((v) => Math.floor(minutoDelDia(v.fecha) / 60) === hora)
      return {
        clave: String(hora),
        etiqueta: hora % 2 === 1 ? String(hora) : '',
        rango: `${hora}:00 – ${hora + 1}:00`,
        total: sumar(enHora),
        ventas: enHora.length,
        enCurso: hora === horaActual,
        futuro: hora > horaActual,
      }
    })

    const unidades = new Map<string, { cantidad: number; ingreso: number }>()
    for (const venta of vigentes) {
      for (const linea of venta.lineas) {
        const actual = unidades.get(linea.productoId) ?? { cantidad: 0, ingreso: 0 }
        unidades.set(linea.productoId, {
          cantidad: actual.cantidad + linea.cantidad,
          ingreso: actual.ingreso + linea.cantidad * linea.precioUnitario,
        })
      }
    }
    const masVendidos = [...unidades.entries()]
      .map(([productoId, datos]) => ({ producto: productos.find((p) => p.id === productoId)!, ...datos }))
      .sort((a, b) => b.cantidad - a.cantidad || b.ingreso - a.ingreso)
      .slice(0, 5)

    return {
      total: sumar(vigentes),
      ventas: vigentes.length,
      canceladas: hoy.length - vigentes.length,
      montoCancelado: sumar(hoy.filter((v) => v.cancelacion)),
      totalAyer: sumar(ayerALaHora),
      porHora,
      masVendidos,
    }
  }, [ventas, sucursalId, ahora])

  const atencion = productos
    .filter((p) => p.activo)
    .flatMap((producto) => {
      const existencia = existencias.find((e) => e.sucursalId === sucursalId && e.productoId === producto.id)
      if (!existencia) return []
      const estado = estadoExistencia(existencia)
      return estado === 'disponible' ? [] : [{ producto, existencia, estado }]
    })
    .sort((a, b) => Number(b.estado === 'agotado') - Number(a.estado === 'agotado') || a.existencia.cantidad - b.existencia.cantidad)

  const variacion = resumen.totalAyer > 0 ? ((resumen.total - resumen.totalAyer) / resumen.totalAyer) * 100 : null
  const fecha = formatoFechaLarga(ahora)

  return (
    <Pagina
      titulo="Panel"
      descripcion={`${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · Sucursal ${sucursal?.nombre ?? ''}`}
    >
      <section className="grid grid-cols-2 gap-y-8 border-y border-linea py-8 md:grid-cols-4">
        <StatNumber
          etiqueta="Vendido hoy"
          valor={formatoMoneda(resumen.total)}
          nota={
            variacion === null
              ? 'Sin ventas ayer a esta hora'
              : `${variacion >= 0 ? '+' : '−'}${Math.abs(Math.round(variacion))}% vs. ayer a esta hora`
          }
          className="col-span-2 md:col-span-1"
        />
        <StatNumber etiqueta="Ventas" valor={String(resumen.ventas)} className="md:border-l md:border-linea md:pl-8" />
        <StatNumber
          etiqueta="Ticket promedio"
          valor={formatoMoneda(resumen.ventas ? resumen.total / resumen.ventas : 0)}
          className="border-l border-linea pl-6 md:pl-8"
        />
        <StatNumber
          etiqueta="Canceladas"
          valor={String(resumen.canceladas)}
          nota={resumen.canceladas ? formatoMoneda(resumen.montoCancelado) : 'Ninguna hoy'}
          className="md:border-l md:border-linea md:pl-8"
        />
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        <Bloque titulo="Ventas por hora" retraso={0.05}>
          <Columnas datos={resumen.porHora} titulo="Ventas por hora de hoy" />
        </Bloque>

        <Bloque
          titulo="Necesita atención"
          retraso={0.1}
          enlace={atencion.length > 0 ? { a: '/inventario', texto: 'Inventario' } : undefined}
        >
          {atencion.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-tinta-suave">
              <CircleCheck size={16} strokeWidth={1.5} className="text-oliva" />
              Todo el inventario está en orden.
            </p>
          ) : (
            <ul className="border-t border-linea">
              {atencion.map(({ producto, existencia, estado }) => (
                <li key={producto.id} className="flex items-center gap-4 border-b border-linea py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{producto.nombre}</span>
                    <span className="block truncate text-xs text-tinta-tenue">
                      {existencia.agotadoManual
                        ? existencia.agotadoManual.motivo
                        : estado === 'agotado'
                          ? 'Sin existencia'
                          : `Quedan ${existencia.cantidad} de ${existencia.limiteStockBajo} mínimo`}
                    </span>
                  </span>
                  <Badge estado={estado === 'agotado' ? 'agotado' : 'bajo'}>
                    {existencia.agotadoManual ? 'Agotado a mano' : estado === 'agotado' ? 'Agotado' : 'Stock bajo'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </div>

      <Bloque titulo="Lo más vendido hoy" retraso={0.15} className="mt-14">
        {resumen.masVendidos.length === 0 ? (
          <p className="text-sm text-tinta-suave">Todavía no hay ventas hoy.</p>
        ) : (
          <ol className="flex flex-col">
            {resumen.masVendidos.map(({ producto, cantidad, ingreso }, i) => (
              <li
                key={producto.id}
                className="grid grid-cols-[1.5rem_minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-4 border-b border-linea py-3 md:grid-cols-[2rem_12rem_minmax(0,1fr)_8rem]"
              >
                <span className="cifra text-sm text-tinta-tenue">{i + 1}</span>
                <span className="truncate text-sm font-medium">{producto.nombre}</span>
                <span className="flex h-2 items-center">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${(cantidad / resumen.masVendidos[0].cantidad) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: suave }}
                    className="h-full rounded-r-[4px] bg-espresso"
                  />
                </span>
                <span className="cifra text-right text-sm">
                  {cantidad} <span className="text-tinta-tenue">pzs</span>
                  <span className="ml-3 hidden text-tinta-suave md:inline">{formatoMoneda(ingreso)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Bloque>
    </Pagina>
  )
}

function Bloque({
  titulo,
  children,
  enlace,
  retraso = 0,
  className,
}: {
  titulo: string
  children: ReactNode
  enlace?: { a: string; texto: string }
  retraso?: number
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: retraso, ease: suave }}
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
