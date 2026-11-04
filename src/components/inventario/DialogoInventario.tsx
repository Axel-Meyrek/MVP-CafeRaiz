import { ArrowRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useDatos } from '../../context/DatosContext'
import { cn } from '../../lib/cn'
import { formatoFecha, formatoHora } from '../../lib/formato'
import type { Existencia, Producto } from '../../types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'

export type AccionInventario = 'entrada' | 'correccion' | 'limite' | 'agotar' | 'reactivar'

export interface DatosAccion {
  cantidad: number
  motivo: string
}

interface DialogoInventarioProps {
  accion: AccionInventario | null
  producto: Producto | null
  existencia: Existencia | null
  alCerrar: () => void
  alConfirmar: (datos: DatosAccion) => string | null
}

const textos: Record<AccionInventario, { titulo: string; boton: string }> = {
  entrada: { titulo: 'Registrar entrada', boton: 'Registrar entrada' },
  correccion: { titulo: 'Corregir conteo', boton: 'Guardar corrección' },
  limite: { titulo: 'Límite de stock bajo', boton: 'Guardar límite' },
  agotar: { titulo: 'Marcar como agotado', boton: 'Marcar agotado' },
  reactivar: { titulo: 'Quitar agotado', boton: 'Volver a vender' },
}

const motivosCorreccion = ['Merma', 'Daño', 'Pérdida', 'Corrección de conteo']
const motivosAgotado = ['Producto dañado', 'Equipo descompuesto', 'Caducado', 'Pérdida']

export function DialogoInventario({ accion, producto, existencia, alCerrar, alConfirmar }: DialogoInventarioProps) {
  return (
    <Dialog
      abierto={!!accion}
      alCambiar={(abierto) => !abierto && alCerrar()}
      titulo={accion ? textos[accion].titulo : ''}
      descripcion={producto?.nombre}
    >
      {accion && existencia && (
        // La llave reinicia el formulario cada vez que se abre con otro producto o acción.
        <Formulario
          key={`${accion}-${existencia.productoId}`}
          accion={accion}
          existencia={existencia}
          alCerrar={alCerrar}
          alConfirmar={alConfirmar}
        />
      )}
    </Dialog>
  )
}

function Formulario({
  accion,
  existencia,
  alCerrar,
  alConfirmar,
}: {
  accion: AccionInventario
  existencia: Existencia
  alCerrar: () => void
  alConfirmar: (datos: DatosAccion) => string | null
}) {
  const valorInicial = accion === 'limite' ? String(existencia.limiteStockBajo) : accion === 'correccion' ? String(existencia.cantidad) : ''
  const { usuarios } = useDatos()
  const [valor, setValor] = useState(valorInicial)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const numero = valor === '' ? NaN : Number(valor)
  const pideNumero = accion === 'entrada' || accion === 'correccion' || accion === 'limite'
  const pideMotivo = accion === 'correccion' || accion === 'agotar'
  const resultado =
    accion === 'entrada' ? existencia.cantidad + (numero || 0) : accion === 'correccion' ? numero : existencia.cantidad

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const fallo = alConfirmar({ cantidad: numero, motivo: motivo.trim() })
    setError(fallo)
  }

  const listo = (!pideNumero || !Number.isNaN(numero)) && (!pideMotivo || motivo.trim() !== '')

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      {pideNumero && (
        <Input
          name="cantidad"
          etiqueta={
            accion === 'entrada' ? 'Unidades recibidas' : accion === 'correccion' ? 'Conteo real' : 'Avisar cuando queden'
          }
          inputMode="numeric"
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))}
          ayuda={accion === 'limite' ? 'Unidades o menos. Por defecto son 5.' : undefined}
          className="cifra"
        />
      )}

      {(accion === 'entrada' || accion === 'correccion') && (
        <div className="cifra flex items-center gap-3 rounded-md bg-hueso px-4 py-3 text-sm">
          <span className="text-tinta-suave">Existencia</span>
          <span className="ml-auto">{existencia.cantidad}</span>
          <ArrowRight size={14} strokeWidth={1.5} className="text-tinta-tenue" />
          <span className="min-w-8 text-right font-medium">{Number.isNaN(resultado) ? '—' : resultado}</span>
        </div>
      )}

      {pideMotivo && (
        <div className="flex flex-col gap-2.5">
          <Input
            name="motivo"
            etiqueta="Motivo"
            placeholder="Escribe o elige un motivo"
            autoFocus={accion === 'agotar'}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {(accion === 'agotar' ? motivosAgotado : motivosCorreccion).map((opcion) => (
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
      )}

      {accion === 'agotar' && (
        <p className="text-[13px] text-tinta-suave">
          Dejará de venderse en esta sucursal. La existencia se queda en{' '}
          <span className="cifra font-medium text-tinta">{existencia.cantidad}</span>; solo el gerente puede volver a
          activarlo.
        </p>
      )}

      {accion === 'reactivar' && existencia.agotadoManual && (
        <div className="flex flex-col gap-1 border-l-2 border-linea-fuerte pl-4 text-sm">
          <span>{existencia.agotadoManual.motivo}</span>
          <span className="text-xs text-tinta-tenue">
            {usuarios.find((u) => u.id === existencia.agotadoManual?.usuarioId)?.nombre} ·{' '}
            {formatoFecha(existencia.agotadoManual.fecha)}, {formatoHora(existencia.agotadoManual.fecha)}
          </span>
          {existencia.cantidad === 0 && (
            <span className="mt-2 text-xs text-ambar">
              La existencia es 0: seguirá agotado hasta que registres una entrada.
            </span>
          )}
        </div>
      )}

      {error && <p className="text-[13px] text-ladrillo">{error}</p>}

      <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">
        <Button variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" variante={accion === 'agotar' ? 'peligro' : 'primario'} disabled={!listo}>
          {textos[accion].boton}
        </Button>
      </div>
    </form>
  )
}
