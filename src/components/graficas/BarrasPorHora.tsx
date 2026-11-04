import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { formatoMoneda } from '../../lib/formato'

export interface PuntoHora {
  hora: number
  total: number
  ventas: number
}

interface BarrasPorHoraProps {
  datos: PuntoHora[]
  /** Hora en curso: las horas futuras se muestran vacías. */
  horaActual: number
  titulo: string
}

const ALTO = 168

/** Columnas finas, un solo tono, con tooltip por columna y tabla accesible. */
export function BarrasPorHora({ datos, horaActual, titulo }: BarrasPorHoraProps) {
  const [activa, setActiva] = useState<number | null>(null)
  const maximo = Math.max(...datos.map((d) => d.total), 1)
  const paso = escalaRedonda(maximo)
  const tope = Math.ceil(maximo / paso) * paso
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso)

  return (
    <figure>
      <div className="relative flex" style={{ height: ALTO }} onMouseLeave={() => setActiva(null)}>
        {/* Rejilla y eje Y recesivos */}
        <div className="pointer-events-none absolute inset-0 right-0 left-12">
          {marcas.map((marca) => (
            <div
              key={marca}
              className="absolute inset-x-0 border-t border-linea"
              style={{ bottom: `${(marca / tope) * 100}%` }}
            />
          ))}
        </div>
        <div className="relative w-12 shrink-0">
          {marcas.map((marca) => (
            <span
              key={marca}
              className="cifra absolute right-3 translate-y-1/2 text-[11px] text-tinta-tenue"
              style={{ bottom: `${(marca / tope) * 100}%` }}
            >
              {marca >= 1000 ? `${marca / 1000}k` : marca}
            </span>
          ))}
        </div>

        <div className="relative flex flex-1 items-end">
          {datos.map((punto, i) => {
            const futura = punto.hora > horaActual
            const alto = (punto.total / tope) * 100
            return (
              <div
                key={punto.hora}
                className="relative flex h-full flex-1 cursor-default items-end justify-center px-px"
                onMouseEnter={() => setActiva(punto.hora)}
                onFocus={() => setActiva(punto.hora)}
                onBlur={() => setActiva(null)}
                tabIndex={futura ? -1 : 0}
                aria-label={`${punto.hora}:00, ${formatoMoneda(punto.total)}, ${punto.ventas} ventas`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${alto}%` }}
                  transition={{ duration: 0.6, delay: i * 0.03, ease: [0.25, 1, 0.5, 1] }}
                  className={cn(
                    'w-full max-w-6 rounded-t-[4px] transition-opacity duration-200',
                    punto.hora === horaActual ? 'bg-espresso/60' : 'bg-espresso',
                    activa !== null && activa !== punto.hora && 'opacity-35',
                  )}
                />
                <AnimatePresence>
                  {activa === punto.hora && !futura && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="pointer-events-none absolute z-10 w-max rounded-md bg-tinta px-3 py-2 text-xs text-crema"
                      style={{ bottom: `calc(${alto}% + 10px)` }}
                    >
                      <span className="block text-crema/60">
                        {punto.hora}:00 – {punto.hora + 1}:00
                        {punto.hora === horaActual && ' · en curso'}
                      </span>
                      <span className="cifra block font-medium">
                        {formatoMoneda(punto.total)} · {punto.ventas} {punto.ventas === 1 ? 'venta' : 'ventas'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* Eje X */}
      <div className="mt-2 flex pl-12">
        {datos.map((punto) => (
          <span key={punto.hora} className="cifra flex-1 text-center text-[11px] text-tinta-tenue">
            {punto.hora % 2 === 1 ? punto.hora : ''}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">{titulo}</figcaption>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Ventas</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.hora}>
              <td>{d.hora}:00</td>
              <td>{d.ventas}</td>
              <td>{formatoMoneda(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** Paso de rejilla "redondo" (100, 200, 500, 1000…) para unas 3–4 líneas. */
function escalaRedonda(maximo: number) {
  const bruto = maximo / 3
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const normal = bruto / potencia
  return (normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 5 ? 5 : 10) * potencia
}
