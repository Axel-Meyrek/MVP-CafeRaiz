import { motion } from 'motion/react'
import { Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pagina } from '../components/layout/Pagina'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { StatNumber } from '../components/ui/StatNumber'
import { Tabs } from '../components/ui/Tabs'
import { FilaVenta } from '../components/ventas/FilaVenta'
import { useDatos } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { esHoy, formatoFechaLarga, formatoMoneda } from '../lib/formato'

const suave = [0.25, 1, 0.5, 1] as const

export function MisVentas() {
  const { usuario, sucursal } = useSesion()
  const { ventas } = useDatos()
  const navegar = useNavigate()
  const [filtro, setFiltro] = useState('todas')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [fecha] = useState(() => formatoFechaLarga(new Date()))

  // Un barista solo ve sus propias ventas del día (regla 26).
  const delDia = useMemo(
    () =>
      ventas
        .filter((v) => v.usuarioId === usuario?.id && esHoy(v.fecha))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [ventas, usuario?.id],
  )

  const vigentes = delDia.filter((v) => !v.cancelacion)
  const total = vigentes.reduce((suma, v) => suma + v.total, 0)
  const enEfectivo = vigentes.filter((v) => v.metodoPago === 'efectivo').reduce((suma, v) => suma + v.total, 0)
  const canceladas = delDia.length - vigentes.length
  const visibles = filtro === 'todas' ? delDia : delDia.filter((v) => v.metodoPago === filtro)

  const descripcion = `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · Sucursal ${sucursal?.nombre ?? ''}`

  return (
    <Pagina titulo="Mis ventas" descripcion={descripcion}>
      {delDia.length === 0 ? (
        <div className="border-t border-linea">
          <EmptyState
            icono={Receipt}
            titulo="Aún no tienes ventas hoy"
            descripcion="Las ventas que registres aparecerán aquí."
            accion={<Button onClick={() => navegar('/venta')}>Ir a vender</Button>}
          />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-y-8 border-y border-linea py-8 md:grid-cols-3">
            <StatNumber
              etiqueta="Vendido hoy"
              valor={formatoMoneda(total)}
              nota={`Efectivo ${formatoMoneda(enEfectivo)} · Tarjeta ${formatoMoneda(total - enEfectivo)}`}
              className="col-span-2 md:col-span-1"
            />
            <StatNumber
              etiqueta="Ventas"
              valor={String(vigentes.length)}
              nota={canceladas > 0 ? `${canceladas} cancelada${canceladas > 1 ? 's' : ''}` : 'Ninguna cancelada'}
              className="md:border-l md:border-linea md:pl-8"
            />
            <StatNumber
              etiqueta="Ticket promedio"
              valor={formatoMoneda(vigentes.length ? total / vigentes.length : 0)}
              className="border-l border-linea pl-6 md:pl-8"
            />
          </section>

          <div className="mt-10 mb-2 flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium tracking-tight">Detalle</h2>
            <Tabs
              valor={filtro}
              alCambiar={(valor) => {
                setFiltro(valor)
                setAbierta(null)
              }}
              opciones={[
                { valor: 'todas', etiqueta: 'Todas' },
                { valor: 'efectivo', etiqueta: 'Efectivo' },
                { valor: 'tarjeta', etiqueta: 'Tarjeta' },
              ]}
            />
          </div>

          {visibles.length === 0 ? (
            <p className="border-t border-linea py-12 text-center text-sm text-tinta-suave">
              No hay ventas con este método de pago.
            </p>
          ) : (
            <motion.ul key={filtro} initial="oculto" animate="visible" className="border-t border-linea">
              {visibles.map((venta, indice) => (
                <motion.li
                  key={venta.id}
                  variants={{
                    oculto: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0, transition: { delay: Math.min(indice, 12) * 0.025, ease: suave } },
                  }}
                  className="border-b border-linea"
                >
                  <FilaVenta
                    venta={venta}
                    abierta={abierta === venta.id}
                    alAlternar={() => setAbierta(abierta === venta.id ? null : venta.id)}
                  />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </>
      )}
    </Pagina>
  )
}
