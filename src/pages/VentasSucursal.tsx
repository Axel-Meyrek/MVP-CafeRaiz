import { motion } from 'motion/react'
import { Receipt, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { StatNumber } from '../components/ui/StatNumber'
import { Tabs } from '../components/ui/Tabs'
import { useAviso } from '../components/ui/Toast'
import { FilaVenta } from '../components/ventas/FilaVenta'
import { useDatos } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { cn } from '../lib/cn'
import { claveDia, esAyer, esHoy, formatoMoneda } from '../lib/formato'
import type { Venta } from '../types'

const suave = [0.25, 1, 0.5, 1] as const
const POR_PAGINA = 30
const motivosCancelacion = ['Cobro duplicado', 'Error en el pedido', 'Método de pago equivocado', 'Cliente se arrepintió']

function enPeriodo(venta: Venta, periodo: string) {
  if (periodo === 'hoy') return esHoy(venta.fecha)
  if (periodo === 'ayer') return esAyer(venta.fecha)
  const limite = new Date()
  limite.setDate(limite.getDate() - 6)
  return claveDia(venta.fecha) >= claveDia(limite)
}

export function VentasSucursal() {
  const { usuario, sucursal } = useSesion()
  const { ventas, usuarios, cancelarVenta } = useDatos()
  const avisar = useAviso()

  const [periodo, setPeriodo] = useState('hoy')
  const [persona, setPersona] = useState('todos')
  const [metodo, setMetodo] = useState('todos')
  const [folio, setFolio] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [limite, setLimite] = useState(POR_PAGINA)
  const [porCancelar, setPorCancelar] = useState<Venta | null>(null)

  const sucursalId = sucursal?.id ?? ''
  const equipo = usuarios.filter((u) => u.sucursalId === sucursalId && u.rol !== 'admin')

  // El gerente ve todas las ventas de su sucursal y de ninguna otra (regla 18).
  const filtradas = useMemo(
    () =>
      ventas
        .filter((v) => v.sucursalId === sucursalId && enPeriodo(v, periodo))
        .filter((v) => persona === 'todos' || v.usuarioId === persona)
        .filter((v) => metodo === 'todos' || v.metodoPago === metodo)
        .filter((v) => !folio || String(v.folio).includes(folio))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [ventas, sucursalId, periodo, persona, metodo, folio],
  )

  const vigentes = filtradas.filter((v) => !v.cancelacion)
  const total = vigentes.reduce((suma, v) => suma + v.total, 0)
  const canceladas = filtradas.filter((v) => v.cancelacion)
  const visibles = filtradas.slice(0, limite)

  const cambiarFiltro = (aplicar: () => void) => {
    aplicar()
    setAbierta(null)
    setLimite(POR_PAGINA)
  }

  const confirmarCancelacion = (motivo: string) => {
    if (!usuario || !porCancelar) return 'Sin sesión.'
    const resultado = cancelarVenta(usuario, porCancelar.id, motivo)
    if (!resultado.ok) return resultado.error
    avisar(`Venta ${porCancelar.folio} cancelada · unidades devueltas al inventario`)
    setPorCancelar(null)
    return null
  }

  return (
    <Pagina titulo="Ventas" descripcion={`Sucursal ${sucursal?.nombre ?? ''}`}>
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Tabs
          valor={periodo}
          alCambiar={(v) => cambiarFiltro(() => setPeriodo(v))}
          opciones={[
            { valor: 'hoy', etiqueta: 'Hoy' },
            { valor: 'ayer', etiqueta: 'Ayer' },
            { valor: 'semana', etiqueta: 'Últimos 7 días' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[12rem_9rem_9rem]">
          <Select
            valor={persona}
            alCambiar={(v) => cambiarFiltro(() => setPersona(v))}
            opciones={[
              { valor: 'todos', etiqueta: 'Todo el equipo' },
              ...equipo.map((u) => ({ valor: u.id, etiqueta: u.nombre })),
            ]}
            className="w-full"
          />
          <Select
            valor={metodo}
            alCambiar={(v) => cambiarFiltro(() => setMetodo(v))}
            opciones={[
              { valor: 'todos', etiqueta: 'Todo pago' },
              { valor: 'efectivo', etiqueta: 'Efectivo' },
              { valor: 'tarjeta', etiqueta: 'Tarjeta' },
            ]}
            className="w-full"
          />
          <label className="relative col-span-2 flex items-center sm:col-span-1">
            <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 text-tinta-tenue" />
            <input
              inputMode="numeric"
              value={folio}
              onChange={(e) => cambiarFiltro(() => setFolio(e.target.value.replace(/\D/g, '')))}
              placeholder="Folio"
              aria-label="Buscar por folio"
              className="cifra h-10 w-full rounded-md border border-linea-fuerte bg-papel pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-tinta-tenue hover:border-tinta-tenue focus:border-espresso"
            />
          </label>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-y-8 border-y border-linea py-8 md:grid-cols-4">
        <StatNumber etiqueta="Vendido" valor={formatoMoneda(total)} className="col-span-2 md:col-span-1" />
        <StatNumber etiqueta="Ventas" valor={String(vigentes.length)} className="md:border-l md:border-linea md:pl-8" />
        <StatNumber
          etiqueta="Ticket promedio"
          valor={formatoMoneda(vigentes.length ? total / vigentes.length : 0)}
          className="border-l border-linea pl-6 md:pl-8"
        />
        <StatNumber
          etiqueta="Canceladas"
          valor={String(canceladas.length)}
          nota={canceladas.length ? formatoMoneda(canceladas.reduce((s, v) => s + v.total, 0)) : undefined}
          className="md:border-l md:border-linea md:pl-8"
        />
      </section>

      {filtradas.length === 0 ? (
        <EmptyState icono={Receipt} titulo="Sin ventas" descripcion="No hay ventas con estos filtros." />
      ) : (
        <>
          <motion.ul
            key={`${periodo}-${persona}-${metodo}`}
            initial="oculto"
            animate="visible"
            className="mt-2"
          >
            {visibles.map((venta, indice) => {
              const cancelable = !venta.cancelacion && esHoy(venta.fecha)
              return (
                <motion.li
                  key={venta.id}
                  variants={{
                    oculto: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0, transition: { delay: Math.min(indice, 12) * 0.02, ease: suave } },
                  }}
                  className="border-b border-linea"
                >
                  <FilaVenta
                    venta={venta}
                    abierta={abierta === venta.id}
                    alAlternar={() => setAbierta(abierta === venta.id ? null : venta.id)}
                    mostrarVendedor
                    mostrarFecha={periodo === 'semana'}
                    pie={
                      cancelable ? (
                        <div className="mt-3 flex border-t border-linea pt-3">
                          <Button variante="secundario" tamano="sm" onClick={() => setPorCancelar(venta)}>
                            Cancelar venta
                          </Button>
                        </div>
                      ) : !venta.cancelacion ? (
                        <p className="mt-2 border-t border-linea pt-3 text-xs text-tinta-tenue">
                          Solo se pueden cancelar ventas del día.
                        </p>
                      ) : null
                    }
                  />
                </motion.li>
              )
            })}
          </motion.ul>

          {filtradas.length > limite && (
            <div className="mt-6 flex justify-center">
              <Button variante="fantasma" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Mostrar más · quedan {filtradas.length - limite}
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog
        abierto={!!porCancelar}
        alCambiar={(abierto) => !abierto && setPorCancelar(null)}
        titulo="Cancelar venta"
        descripcion={porCancelar ? `Folio ${porCancelar.folio} · ${formatoMoneda(porCancelar.total)}` : undefined}
      >
        {porCancelar && (
          <FormularioCancelacion
            key={porCancelar.id}
            venta={porCancelar}
            alCerrar={() => setPorCancelar(null)}
            alConfirmar={confirmarCancelacion}
          />
        )}
      </Dialog>
    </Pagina>
  )
}

function FormularioCancelacion({
  venta,
  alCerrar,
  alConfirmar,
}: {
  venta: Venta
  alCerrar: () => void
  alConfirmar: (motivo: string) => string | null
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const piezas = venta.lineas.reduce((suma, l) => suma + l.cantidad, 0)

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(alConfirmar(motivo))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <Input
          name="motivo"
          etiqueta="Motivo"
          placeholder="Escribe o elige un motivo"
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {motivosCancelacion.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setMotivo(opcion)}
              className={cn(
                'h-7 rounded-sm border px-2.5 text-xs transition-colors duration-200',
                motivo === opcion
                  ? 'border-espresso bg-espresso text-crema'
                  : 'border-linea text-tinta-suave hover:border-linea-fuerte hover:text-tinta',
              )}
            >
              {opcion}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[13px] text-tinta-suave">
        La venta quedará como cancelada (no se borra) y{' '}
        <span className="cifra font-medium text-tinta">
          {piezas} {piezas === 1 ? 'pieza regresará' : 'piezas regresarán'}
        </span>{' '}
        al inventario. No contará en los ingresos.
      </p>

      {error && <p className="text-[13px] text-ladrillo">{error}</p>}

      <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">
        <Button variante="fantasma" onClick={alCerrar}>
          Volver
        </Button>
        <Button type="submit" variante="peligro" disabled={!motivo.trim()}>
          Cancelar venta
        </Button>
      </div>
    </form>
  )
}
