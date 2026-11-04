import { AnimatePresence, motion } from 'motion/react'
import { Plus, Tag } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Tabs } from '../components/ui/Tabs'
import { useAviso } from '../components/ui/Toast'
import { useDatos, type DatosDescuento, type Resultado } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { cn } from '../lib/cn'
import { claveDia, formatoMoneda } from '../lib/formato'
import { calcularDescuento, descuentoVigente } from '../lib/reglas'
import type { Descuento } from '../types'

const suave = [0.25, 1, 0.5, 1] as const
const fechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const mostrarFecha = (clave: string) => fechaCorta.format(new Date(`${clave}T12:00:00`))

type Estado = 'vigente' | 'vencido' | 'inactivo'
const estadoDe = (d: Descuento, ahora: Date): Estado =>
  !d.activo ? 'inactivo' : descuentoVigente(d, ahora) ? 'vigente' : 'vencido'

type Dialogo = { tipo: 'nuevo' } | { tipo: 'editar'; descuento: Descuento } | { tipo: 'desactivar'; descuento: Descuento }

export function Descuentos() {
  const { usuario } = useSesion()
  const { descuentos, ventas, guardarDescuento, cambiarEstadoDescuento } = useDatos()
  const avisar = useAviso()
  const [ahora] = useState(() => new Date())
  const [vista, setVista] = useState('aplicables')
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)

  // Uso en los últimos 30 días, sin contar canceladas.
  const uso = useMemo(() => {
    const limite = new Date(ahora)
    limite.setDate(limite.getDate() - 29)
    const desde = claveDia(limite)
    const mapa = new Map<string, { ventas: number; monto: number }>()
    for (const v of ventas) {
      if (!v.descuentoId || v.cancelacion || claveDia(v.fecha) < desde) continue
      const actual = mapa.get(v.descuentoId) ?? { ventas: 0, monto: 0 }
      mapa.set(v.descuentoId, { ventas: actual.ventas + 1, monto: actual.monto + v.montoDescuento })
    }
    return mapa
  }, [ventas, ahora])

  const aplicables = descuentos.filter((d) => estadoDe(d, ahora) === 'vigente')
  const otros = descuentos.filter((d) => estadoDe(d, ahora) !== 'vigente')
  const visibles = vista === 'aplicables' ? aplicables : otros

  const ejecutar = (accion: () => Resultado, mensaje: string) => {
    const resultado = accion()
    if (!resultado.ok) return resultado.error
    avisar(mensaje)
    setDialogo(null)
    return null
  }

  const reactivar = (d: Descuento) => {
    if (!usuario) return
    const resultado = cambiarEstadoDescuento(usuario, d.id, true)
    avisar(resultado.ok ? `${d.nombre} está activo de nuevo` : resultado.error, resultado.ok ? 'exito' : 'error')
  }

  return (
    <Pagina
      titulo="Descuentos"
      descripcion="Solo los descuentos de este catálogo se pueden aplicar en caja. Uno por venta, sobre el total."
      acciones={
        <Button onClick={() => setDialogo({ tipo: 'nuevo' })}>
          <Plus size={16} strokeWidth={1.5} />
          Nuevo descuento
        </Button>
      }
    >
      <div className="mb-6">
        <Tabs
          valor={vista}
          alCambiar={setVista}
          opciones={[
            { valor: 'aplicables', etiqueta: `Se pueden aplicar ${aplicables.length}` },
            { valor: 'otros', etiqueta: `Vencidos o inactivos ${otros.length}` },
          ]}
        />
      </div>

      <div className="hidden grid-cols-[minmax(0,1fr)_6rem_9rem_9rem_12rem] gap-x-6 border-b border-linea pb-2 text-xs font-medium tracking-wide text-tinta-tenue uppercase md:grid">
        <span>Descuento</span>
        <span className="text-right">Valor</span>
        <span>Vigencia</span>
        <span className="text-right">Uso 30 días</span>
        <span />
      </div>

      {visibles.length === 0 ? (
        <div className="border-t border-linea md:border-0">
          <EmptyState
            icono={Tag}
            titulo={vista === 'aplicables' ? 'Ningún descuento aplicable' : 'Nada por aquí'}
            descripcion={
              vista === 'aplicables'
                ? 'Crea uno para que caja pueda aplicarlo.'
                : 'Los descuentos vencidos o desactivados aparecerán aquí.'
            }
          />
        </div>
      ) : (
        <motion.ul key={vista} initial="oculto" animate="visible" className="border-t border-linea md:border-0">
          <AnimatePresence initial={false}>
            {visibles.map((d, i) => {
              const estado = estadoDe(d, ahora)
              const usado = uso.get(d.id)
              return (
                <motion.li
                  key={d.id}
                  layout
                  variants={{
                    oculto: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0, transition: { delay: i * 0.03, ease: suave } },
                  }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 overflow-hidden border-b border-linea py-4 md:grid-cols-[minmax(0,1fr)_6rem_9rem_9rem_12rem] md:gap-x-6"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <p className={cn('truncate text-sm font-medium', estado !== 'vigente' && 'text-tinta-suave')}>
                      {d.nombre}
                    </p>
                    {estado === 'vencido' && <Badge estado="bajo">Vencido</Badge>}
                    {estado === 'inactivo' && <Badge>Inactivo</Badge>}
                  </div>

                  <p className={cn('cifra text-right text-[15px] font-medium', estado !== 'vigente' && 'text-tinta-tenue')}>
                    {d.tipo === 'porcentaje' ? `−${d.valor}%` : `−${formatoMoneda(d.valor)}`}
                  </p>

                  <p className="cifra col-span-2 text-[13px] text-tinta-suave md:col-span-1">
                    {d.vigenteHasta ? `Hasta el ${mostrarFecha(d.vigenteHasta)}` : 'Sin vencimiento'}
                  </p>

                  <p className="cifra col-span-2 text-[13px] text-tinta-tenue md:col-span-1 md:text-right md:text-sm md:text-tinta">
                    {usado ? (
                      <>
                        {usado.ventas} {usado.ventas === 1 ? 'venta' : 'ventas'}
                        <span className="block text-xs text-tinta-tenue max-md:inline max-md:before:content-['_·_']">
                          {formatoMoneda(usado.monto)} descontados
                        </span>
                      </>
                    ) : (
                      'Sin uso'
                    )}
                  </p>

                  <div className="col-span-2 flex items-center gap-1 md:col-span-1 md:justify-end">
                    <Button variante="secundario" tamano="sm" onClick={() => setDialogo({ tipo: 'editar', descuento: d })}>
                      Editar
                    </Button>
                    {d.activo ? (
                      <Button variante="fantasma" tamano="sm" onClick={() => setDialogo({ tipo: 'desactivar', descuento: d })}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button variante="fantasma" tamano="sm" onClick={() => reactivar(d)}>
                        Reactivar
                      </Button>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <Dialog
        abierto={dialogo?.tipo === 'nuevo' || dialogo?.tipo === 'editar'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo={dialogo?.tipo === 'editar' ? 'Editar descuento' : 'Nuevo descuento'}
        descripcion={
          dialogo?.tipo === 'editar'
            ? 'Las ventas ya registradas conservan el descuento que tenían.'
            : 'Estará disponible en caja en todas las sucursales.'
        }
      >
        {(dialogo?.tipo === 'nuevo' || dialogo?.tipo === 'editar') && (
          <FormularioDescuento
            key={dialogo.tipo === 'editar' ? dialogo.descuento.id : 'nuevo'}
            inicial={dialogo.tipo === 'editar' ? dialogo.descuento : undefined}
            hoy={claveDia(ahora)}
            alCerrar={() => setDialogo(null)}
            alConfirmar={(datos) =>
              usuario
                ? ejecutar(
                    () => guardarDescuento(usuario, datos, dialogo.tipo === 'editar' ? dialogo.descuento.id : undefined),
                    dialogo.tipo === 'editar' ? 'Descuento actualizado' : `${datos.nombre.trim()} agregado`,
                  )
                : null
            }
          />
        )}
      </Dialog>

      <Dialog
        abierto={dialogo?.tipo === 'desactivar'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Desactivar descuento"
        descripcion={dialogo?.tipo === 'desactivar' ? dialogo.descuento.nombre : undefined}
      >
        {dialogo?.tipo === 'desactivar' && (
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-2 text-sm text-tinta-suave">
              <li>Dejará de aparecer en caja de inmediato.</li>
              <li>Las ventas que ya lo usaron no cambian.</li>
              <li>Puedes reactivarlo después.</li>
            </ul>
            <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">
              <Button variante="fantasma" onClick={() => setDialogo(null)}>
                Volver
              </Button>
              <Button
                variante="peligro"
                onClick={() =>
                  usuario &&
                  ejecutar(
                    () => cambiarEstadoDescuento(usuario, dialogo.descuento.id, false),
                    `${dialogo.descuento.nombre} se desactivó`,
                  )
                }
              >
                Desactivar
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Pagina>
  )
}

function FormularioDescuento({
  inicial,
  hoy,
  alCerrar,
  alConfirmar,
}: {
  inicial?: Descuento
  hoy: string
  alCerrar: () => void
  alConfirmar: (datos: DatosDescuento) => string | null
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [tipo, setTipo] = useState<Descuento['tipo']>(inicial?.tipo ?? 'porcentaje')
  const [valor, setValor] = useState(inicial ? String(inicial.valor) : '')
  const [conVencimiento, setConVencimiento] = useState(!!inicial?.vigenteHasta)
  const [hasta, setHasta] = useState(inicial?.vigenteHasta ?? hoy)
  const [error, setError] = useState<string | null>(null)

  const numero = Number(valor)
  const valido =
    nombre.trim().length >= 2 && numero > 0 && (tipo === 'monto' || numero <= 100) && (!conVencimiento || !!hasta)
  // Ejemplo con un ticket de $150 para que se entienda el efecto (regla 72: nunca menor que cero).
  const ejemplo = 150
  const descontado = valido ? calcularDescuento(ejemplo, { id: '', nombre, tipo, valor: numero, activo: true, vigenteHasta: null }) : 0

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(alConfirmar({ nombre, tipo, valor: numero, vigenteHasta: conVencimiento ? hasta : null }))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Input
        name="nombre"
        etiqueta="Nombre"
        placeholder="Ej. Estudiante"
        autoFocus
        autoComplete="off"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-medium text-tinta-suave">Tipo</legend>
          <div className="grid h-10 grid-cols-2 rounded-md bg-hueso p-1">
            {(['porcentaje', 'monto'] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-pressed={tipo === opcion}
                onClick={() => setTipo(opcion)}
                className={cn(
                  'rounded-[4px] text-sm transition-colors',
                  tipo === opcion ? 'bg-papel text-tinta shadow-[0_1px_2px_rgb(28_25_23/0.08)]' : 'text-tinta-suave hover:text-tinta',
                )}
              >
                {opcion === 'porcentaje' ? '%' : '$ fijo'}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-tinta-suave">Valor</span>
          <span className="relative flex items-center">
            {tipo === 'monto' && <span className="cifra pointer-events-none absolute left-3 text-sm text-tinta-tenue">$</span>}
            <input
              inputMode="decimal"
              value={valor}
              placeholder={tipo === 'porcentaje' ? '10' : '40.00'}
              onChange={(e) => {
                const limpio = e.target.value.replace(/[^\d.]/g, '')
                if (/^\d*\.?\d{0,2}$/.test(limpio)) setValor(limpio)
              }}
              className={cn(
                'cifra h-10 w-full rounded-md border border-linea-fuerte bg-papel pr-8 text-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-tinta-tenue hover:border-tinta-tenue focus:border-espresso focus:shadow-[0_0_0_3px_rgb(91_58_41/0.08)]',
                tipo === 'monto' ? 'pl-7' : 'pl-3',
              )}
            />
            {tipo === 'porcentaje' && <span className="pointer-events-none absolute right-3 text-sm text-tinta-tenue">%</span>}
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={conVencimiento}
            onChange={(e) => setConVencimiento(e.target.checked)}
            className="size-4 accent-espresso"
          />
          Tiene fecha de vencimiento
        </label>
        <AnimatePresence initial={false}>
          {conVencimiento && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: suave }}
              className="overflow-hidden"
            >
              <Input
                name="hasta"
                type="date"
                etiqueta="Válido hasta (incluido)"
                min={hoy}
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="cifra"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="cifra flex items-center justify-between rounded-md bg-hueso px-4 py-3 text-sm">
        <span className="text-tinta-suave">Ticket de {formatoMoneda(ejemplo)}</span>
        <span>
          {valido ? (
            <>
              <span className="text-tinta-tenue">−{formatoMoneda(descontado)}</span>
              <span className="ml-3 font-medium">{formatoMoneda(ejemplo - descontado)}</span>
            </>
          ) : (
            <span className="text-tinta-tenue">—</span>
          )}
        </span>
      </div>
      {tipo === 'monto' && numero > ejemplo && (
        <p className="-mt-3 text-xs text-tinta-tenue">Si el monto supera el ticket, el total queda en $0.00.</p>
      )}

      {error && <p className="text-[13px] text-ladrillo">{error}</p>}
      <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">
        <Button variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valido}>
          {inicial ? 'Guardar cambios' : 'Agregar descuento'}
        </Button>
      </div>
    </form>
  )
}

