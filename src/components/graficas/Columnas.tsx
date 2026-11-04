import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { formatoMoneda } from '../../lib/formato'

export interface PuntoColumna {
  clave: string
  /** Texto corto del eje X. Vacío para no mostrarlo. */
  etiqueta: string
  /** Encabezado del tooltip, por ejemplo "12:00 – 13:00" o "lun 2 nov". */
  rango: string
  total: number
  ventas: number
  /** Periodo que aún no termina: se pinta más claro. */
  enCurso?: boolean
  /** Periodo futuro: sin barra ni tooltip. */
  futuro?: boolean
}

const ALTO = 168

/** Columnas finas de un solo tono, con tooltip por columna y tabla accesible. */
export function Columnas({ datos, titulo }: { datos: PuntoColumna[]; titulo: string }) {
  const [activa, setActiva] = useState<string | null>(null)
  const maximo = Math.max(...datos.map((d) => d.total), 1)
  const paso = escalaRedonda(maximo)
  const tope = Math.ceil(maximo / paso) * paso
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso)

  return (
    <figure>
      <div className="relative flex" style={{ height: ALTO }} onMouseLeave={() => setActiva(null)}>
        {/* Rejilla y eje Y recesivos */}
        <div className="pointer-events-none absolute inset-0 left-12">
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
            const alto = (punto.total / tope) * 100
            return (
              <div
                key={punto.clave}
                className="relative flex h-full flex-1 cursor-default items-end justify-center px-px"
                onMouseEnter={() => setActiva(punto.clave)}
                onFocus={() => setActiva(punto.clave)}
                onBlur={() => setActiva(null)}
                tabIndex={punto.futuro ? -1 : 0}
                aria-label={`${punto.rango}: ${formatoMoneda(punto.total)}, ${punto.ventas} ventas`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${alto}%` }}
                  transition={{ duration: 0.6, delay: i * 0.03, ease: [0.25, 1, 0.5, 1] }}
                  className={cn(
                    'w-full max-w-6 rounded-t-[4px] transition-opacity duration-200',
                    punto.enCurso ? 'bg-espresso/60' : 'bg-espresso',
                    activa !== null && activa !== punto.clave && 'opacity-35',
                  )}
                />
                <AnimatePresence>
                  {activa === punto.clave && !punto.futuro && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="pointer-events-none absolute z-10 w-max rounded-md bg-tinta px-3 py-2 text-xs text-crema"
                      style={{ bottom: `calc(${alto}% + 10px)` }}
                    >
                      <span className="block text-crema/60">
                        {punto.rango}
                        {punto.enCurso && ' · en curso'}
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
          <span key={punto.clave} className="cifra flex-1 truncate text-center text-[11px] text-tinta-tenue">
            {punto.etiqueta}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">{titulo}</figcaption>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Ventas</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.clave}>
              <td>{d.rango}</td>
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
