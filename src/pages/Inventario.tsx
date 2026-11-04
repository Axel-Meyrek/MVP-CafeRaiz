import * as Menu from '@radix-ui/react-dropdown-menu'
import { motion } from 'motion/react'
import { Ellipsis, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { DialogoInventario, type AccionInventario, type DatosAccion } from '../components/inventario/DialogoInventario'
import { Pagina } from '../components/layout/Pagina'
import { Badge, type EstadoBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Tabs } from '../components/ui/Tabs'
import { useAviso } from '../components/ui/Toast'
import { useDatos, type Resultado } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { cn } from '../lib/cn'
import { estadoExistencia } from '../lib/reglas'
import type { Existencia, Producto } from '../types'

const suave = [0.25, 1, 0.5, 1] as const

interface Fila {
  producto: Producto
  existencia: Existencia
  estado: ReturnType<typeof estadoExistencia>
}

const avisos: Record<AccionInventario, string> = {
  entrada: 'Entrada registrada',
  correccion: 'Conteo corregido',
  limite: 'Límite actualizado',
  agotar: 'Marcado como agotado',
  reactivar: 'Disponible otra vez',
}

export function Inventario() {
  const { usuario, sucursal } = useSesion()
  const datos = useDatos()
  const { productos } = datos
  const avisar = useAviso()
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<{ accion: AccionInventario; productoId: string } | null>(null)

  const esGerente = usuario?.rol === 'gerente'
  const sucursalId = sucursal?.id ?? ''

  // Solo productos activos del catálogo, en la sucursal del usuario (reglas 18, 24 y 32).
  const filas: Fila[] = useMemo(
    () =>
      productos
        .filter((p) => p.activo)
        .flatMap((producto) => {
          const existencia = datos.existenciaDe(sucursalId, producto.id)
          return existencia ? [{ producto, existencia, estado: estadoExistencia(existencia) }] : []
        }),
    [datos, productos, sucursalId],
  )

  const conteo = {
    bajo: filas.filter((f) => f.estado === 'bajo').length,
    agotado: filas.filter((f) => f.estado === 'agotado').length,
  }

  const termino = busqueda.trim().toLowerCase()
  const visibles = filas
    .filter((f) => filtro === 'todos' || f.estado === filtro)
    .filter((f) => !termino || f.producto.nombre.toLowerCase().includes(termino))

  const seleccion = abierto ? filas.find((f) => f.producto.id === abierto.productoId) : undefined

  const confirmar = ({ cantidad, motivo }: DatosAccion): string | null => {
    if (!usuario || !abierto) return null
    const { accion, productoId } = abierto
    const acciones: Record<AccionInventario, () => Resultado> = {
      entrada: () => datos.registrarEntrada(usuario, productoId, cantidad),
      correccion: () => datos.corregirConteo(usuario, productoId, cantidad, motivo),
      limite: () => datos.cambiarLimite(usuario, productoId, cantidad),
      agotar: () => datos.marcarAgotado(usuario, productoId, motivo),
      reactivar: () => datos.quitarAgotado(usuario, productoId),
    }
    const resultado = acciones[accion]()
    if (!resultado.ok) return resultado.error
    avisar(`${avisos[accion]} · ${seleccion?.producto.nombre ?? ''}`)
    setAbierto(null)
    return null
  }

  const abrir = (accion: AccionInventario, productoId: string) => setAbierto({ accion, productoId })

  return (
    <Pagina titulo="Inventario" descripcion={`Sucursal ${sucursal?.nombre ?? ''} · ${filas.length} productos`}>
      {/* Alerta de stock bajo para el gerente (regla 52) */}
      {esGerente && conteo.bajo > 0 && filtro !== 'bajo' && (
        <motion.button
          type="button"
          onClick={() => setFiltro('bajo')}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: suave }}
          className="mb-8 flex w-full items-center gap-3 rounded-md bg-ambar-fondo px-4 py-3 text-left text-sm text-ambar transition-opacity hover:opacity-85"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-ambar" />
          <span className="flex-1">
            {conteo.bajo === 1 ? 'Un producto está' : `${conteo.bajo} productos están`} en stock bajo:{' '}
            {filas
              .filter((f) => f.estado === 'bajo')
              .map((f) => f.producto.nombre)
              .join(', ')}
            .
          </span>
          <span className="shrink-0 font-medium">Ver</span>
        </motion.button>
      )}

      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          valor={filtro}
          alCambiar={setFiltro}
          opciones={[
            { valor: 'todos', etiqueta: `Todos ${filas.length}` },
            { valor: 'bajo', etiqueta: `Stock bajo ${conteo.bajo}` },
            { valor: 'agotado', etiqueta: `Agotados ${conteo.agotado}` },
          ]}
        />
        <label className="relative flex items-center sm:w-56">
          <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 text-tinta-tenue" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto"
            aria-label="Buscar producto"
            className="h-10 w-full rounded-md border border-linea-fuerte bg-papel pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-tinta-tenue hover:border-tinta-tenue focus:border-espresso"
          />
        </label>
      </div>

      {/* Encabezados (escritorio) */}
      <div className="mt-6 hidden grid-cols-[minmax(0,1fr)_6rem_6rem_10rem_9rem] items-center border-b border-linea pb-3 text-xs font-medium tracking-wide text-tinta-tenue uppercase md:grid">
        <span>Producto</span>
        <span className="text-right">Existencia</span>
        <span className="text-right">Límite</span>
        <span className="pl-8">Estado</span>
        <span />
      </div>

      {visibles.length === 0 ? (
        <div className="border-t border-linea md:border-0">
          <EmptyState
            icono={Search}
            titulo={termino ? 'Sin resultados' : 'Nada por aquí'}
            descripcion={termino ? 'Prueba con otro nombre.' : 'No hay productos en este estado.'}
          />
        </div>
      ) : (
        <motion.ul key={filtro} initial="oculto" animate="visible" className="border-t border-linea md:border-0">
          {visibles.map((fila, indice) => (
            <motion.li
              key={fila.producto.id}
              variants={{
                oculto: { opacity: 0, y: 6 },
                visible: { opacity: 1, y: 0, transition: { delay: Math.min(indice, 14) * 0.02, ease: suave } },
              }}
            >
              <FilaInventario
                fila={fila}
                acciones={
                  esGerente ? (
                    <MenuGerente fila={fila} alElegir={(accion) => abrir(accion, fila.producto.id)} />
                  ) : fila.estado !== 'agotado' ? (
                    <Button variante="secundario" tamano="sm" onClick={() => abrir('agotar', fila.producto.id)}>
                      Marcar agotado
                    </Button>
                  ) : null
                }
              />
            </motion.li>
          ))}
        </motion.ul>
      )}

      {!esGerente && (
        <p className="mt-8 text-[13px] text-tinta-tenue">
          Las entradas de mercancía y las correcciones de conteo las registra el gerente de la sucursal.
        </p>
      )}

      <DialogoInventario
        accion={abierto?.accion ?? null}
        producto={seleccion?.producto ?? null}
        existencia={seleccion?.existencia ?? null}
        alCerrar={() => setAbierto(null)}
        alConfirmar={confirmar}
      />
    </Pagina>
  )
}

function etiquetaEstado({ estado, existencia }: Fila): { texto: string; badge: EstadoBadge } {
  if (existencia.agotadoManual) return { texto: 'Agotado a mano', badge: 'agotado' }
  if (estado === 'agotado') return { texto: 'Agotado', badge: 'agotado' }
  if (estado === 'bajo') return { texto: 'Stock bajo', badge: 'bajo' }
  return { texto: 'Disponible', badge: 'disponible' }
}

function FilaInventario({ fila, acciones }: { fila: Fila; acciones: ReactNode }) {
  const { producto, existencia, estado } = fila
  const { usuarios } = useDatos()
  const etiqueta = etiquetaEstado(fila)
  const marca = existencia.agotadoManual
  const autor = marca && usuarios.find((u) => u.id === marca.usuarioId)?.nombre.split(' ')[0]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-linea py-4 transition-colors hover:bg-hueso/40 md:grid-cols-[minmax(0,1fr)_6rem_6rem_10rem_9rem] md:gap-y-0 md:px-0">
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-medium', estado === 'agotado' && 'text-tinta-suave')}>{producto.nombre}</p>
        <p className="truncate text-xs text-tinta-tenue">
          {marca ? `${marca.motivo} · ${autor}` : producto.categoria}
        </p>
      </div>

      {/* Móvil: estado a la derecha */}
      <div className="flex justify-end md:hidden">
        <Badge estado={etiqueta.badge}>{etiqueta.texto}</Badge>
      </div>

      <p className="cifra text-[13px] text-tinta-suave md:text-right md:text-[15px] md:text-tinta">
        <span className="md:hidden">Existencia </span>
        <span className={cn(existencia.cantidad === 0 && 'text-ladrillo', estado === 'bajo' && 'text-ambar')}>
          {existencia.cantidad}
        </span>
        <span className="text-tinta-tenue md:hidden"> · Límite {existencia.limiteStockBajo}</span>
      </p>
      <p className="cifra hidden text-right text-tinta-tenue md:block">{existencia.limiteStockBajo}</p>

      <div className="hidden pl-8 md:block">
        <Badge estado={etiqueta.badge}>{etiqueta.texto}</Badge>
      </div>

      <div className="flex justify-end">{acciones}</div>
    </div>
  )
}

function MenuGerente({ fila, alElegir }: { fila: Fila; alElegir: (accion: AccionInventario) => void }) {
  const item =
    'flex h-9 cursor-default select-none items-center rounded-sm px-3 text-sm outline-none data-[highlighted]:bg-hueso'
  return (
    <div className="flex items-center gap-1">
      <Button variante="secundario" tamano="sm" onClick={() => alElegir('entrada')}>
        Entrada
      </Button>
      <Menu.Root modal={false}>
        <Menu.Trigger
          aria-label={`Más acciones para ${fila.producto.nombre}`}
          className="grid size-8 place-items-center rounded-md text-tinta-suave transition-colors outline-none hover:bg-hueso hover:text-tinta data-[state=open]:bg-hueso"
        >
          <Ellipsis size={16} strokeWidth={1.5} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-48 rounded-md border border-linea bg-papel p-1 shadow-[0_8px_24px_-12px_rgb(28_25_23/0.18)] animar-emerger"
          >
            <Menu.Item className={item} onSelect={() => alElegir('correccion')}>
              Corregir conteo
            </Menu.Item>
            <Menu.Item className={item} onSelect={() => alElegir('limite')}>
              Cambiar límite
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-linea" />
            {fila.existencia.agotadoManual ? (
              <Menu.Item className={item} onSelect={() => alElegir('reactivar')}>
                Quitar agotado
              </Menu.Item>
            ) : (
              <Menu.Item className={cn(item, 'text-ladrillo')} onSelect={() => alElegir('agotar')}>
                Marcar agotado
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
