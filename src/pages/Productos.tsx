import * as Menu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Ellipsis, Package, Plus, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Pagina } from '../components/layout/Pagina'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { useAviso } from '../components/ui/Toast'
import { useDatos, type Resultado } from '../context/DatosContext'
import { useSesion } from '../context/SesionContext'
import { cn } from '../lib/cn'
import { claveDia, formatoFecha, formatoMoneda } from '../lib/formato'
import type { Categoria, Producto } from '../types'

const suave = [0.25, 1, 0.5, 1] as const
const categorias: Categoria[] = ['Café caliente', 'Café frío', 'Otras bebidas', 'Panadería']

type Dialogo = { tipo: 'nuevo' } | { tipo: 'precio'; producto: Producto } | { tipo: 'baja'; producto: Producto }

export function Productos() {
  const { usuario } = useSesion()
  const { productos, ventas, existencias, registro, sucursales, crearProducto, cambiarPrecio, darDeBajaProducto } = useDatos()
  const avisar = useAviso()
  const [vista, setVista] = useState('activos')
  const [categoria, setCategoria] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)

  // Unidades vendidas en los últimos 7 días, sin contar canceladas.
  const [hoy] = useState(() => new Date())
  const vendidos = useMemo(() => {
    const limite = new Date(hoy)
    limite.setDate(limite.getDate() - 6)
    const desde = claveDia(limite)
    const mapa = new Map<string, number>()
    for (const venta of ventas) {
      if (venta.cancelacion || claveDia(venta.fecha) < desde) continue
      for (const linea of venta.lineas) mapa.set(linea.productoId, (mapa.get(linea.productoId) ?? 0) + linea.cantidad)
    }
    return mapa
  }, [ventas, hoy])

  const ultimoCambio = (producto: Producto) =>
    [...registro]
      .reverse()
      .find((r) => r.accion === 'Cambio de precio' && r.detalle.startsWith(`${producto.nombre}:`))

  const activos = productos.filter((p) => p.activo)
  const deBaja = productos.filter((p) => !p.activo)
  const termino = busqueda.trim().toLowerCase()
  const visibles = (vista === 'activos' ? activos : deBaja)
    .filter((p) => categoria === 'todas' || p.categoria === categoria)
    .filter((p) => !termino || p.nombre.toLowerCase().includes(termino))
    .sort((a, b) => categorias.indexOf(a.categoria) - categorias.indexOf(b.categoria) || a.nombre.localeCompare(b.nombre))

  const ejecutar = (accion: () => Resultado, mensaje: string) => {
    const resultado = accion()
    if (!resultado.ok) return resultado.error
    avisar(mensaje)
    setDialogo(null)
    return null
  }

  return (
    <Pagina
      titulo="Productos"
      descripcion={`Catálogo único para las ${sucursales.filter((s) => s.activa).length} sucursales · ${activos.length} a la venta`}
      acciones={
        <Button onClick={() => setDialogo({ tipo: 'nuevo' })}>
          <Plus size={16} strokeWidth={1.5} />
          Nuevo producto
        </Button>
      }
    >
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          valor={vista}
          alCambiar={setVista}
          opciones={[
            { valor: 'activos', etiqueta: `A la venta ${activos.length}` },
            { valor: 'baja', etiqueta: `Dados de baja ${deBaja.length}` },
          ]}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[11rem_14rem]">
          <Select
            valor={categoria}
            alCambiar={setCategoria}
            opciones={[{ valor: 'todas', etiqueta: 'Todas las categorías' }, ...categorias.map((c) => ({ valor: c, etiqueta: c }))]}
            className="w-full"
          />
          <label className="relative flex items-center">
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
      </div>

      <div className="hidden grid-cols-[minmax(0,1fr)_8rem_7rem_7rem_11rem] gap-x-6 border-b border-linea pb-2 text-xs font-medium tracking-wide text-tinta-tenue uppercase md:grid">
        <span>Producto</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Vendidos 7 d</span>
        <span className="text-right">Existencia</span>
        <span />
      </div>

      {visibles.length === 0 ? (
        <div className="border-t border-linea md:border-0">
          <EmptyState
            icono={Package}
            titulo={vista === 'baja' && !termino ? 'Ningún producto dado de baja' : 'Sin resultados'}
            descripcion={vista === 'baja' && !termino ? 'Los productos dados de baja aparecerán aquí.' : 'Prueba con otro filtro.'}
          />
        </div>
      ) : (
        <motion.ul key={`${vista}-${categoria}`} initial="oculto" animate="visible" className="border-t border-linea md:border-0">
          <AnimatePresence initial={false}>
            {visibles.map((producto, i) => {
              const cambio = ultimoCambio(producto)
              const existenciaTotal = existencias
                .filter((e) => e.productoId === producto.id)
                .reduce((suma, e) => suma + e.cantidad, 0)
              return (
                <motion.li
                  key={producto.id}
                  layout
                  variants={{
                    oculto: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0, transition: { delay: Math.min(i, 15) * 0.02, ease: suave } },
                  }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 overflow-hidden border-b border-linea py-4 md:grid-cols-[minmax(0,1fr)_8rem_7rem_7rem_11rem] md:gap-x-6"
                >
                  <div className="min-w-0">
                    <p className={cn('truncate text-sm font-medium', !producto.activo && 'text-tinta-suave')}>
                      {producto.nombre}
                    </p>
                    <p className="truncate text-xs text-tinta-tenue">
                      {producto.categoria}
                      {cambio && (
                        <span className="cifra">
                          {' '}
                          · precio cambiado el {formatoFecha(cambio.fecha)}
                        </span>
                      )}
                    </p>
                  </div>

                  <p
                    className={cn(
                      'cifra text-right text-[15px] font-medium',
                      !producto.activo && 'text-tinta-tenue line-through',
                    )}
                  >
                    {formatoMoneda(producto.precio)}
                  </p>

                  <p className="cifra col-span-2 text-[13px] text-tinta-suave md:col-span-1 md:text-right md:text-sm md:text-tinta">
                    <span className="md:hidden">Vendidos 7 días </span>
                    {vendidos.get(producto.id) ?? 0}
                    <span className="text-tinta-tenue md:hidden"> · Existencia {existenciaTotal}</span>
                  </p>
                  <p className="cifra hidden text-right text-sm text-tinta-suave md:block">{existenciaTotal}</p>

                  <div className="col-span-2 flex items-center justify-start gap-1 md:col-span-1 md:justify-end">
                    {producto.activo ? (
                      <>
                        <Button variante="secundario" tamano="sm" onClick={() => setDialogo({ tipo: 'precio', producto })}>
                          Cambiar precio
                        </Button>
                        <Menu.Root modal={false}>
                          <Menu.Trigger
                            aria-label={`Más acciones para ${producto.nombre}`}
                            className="grid size-8 place-items-center rounded-md text-tinta-suave transition-colors outline-none hover:bg-hueso hover:text-tinta data-[state=open]:bg-hueso"
                          >
                            <Ellipsis size={16} strokeWidth={1.5} />
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Content
                              align="end"
                              sideOffset={6}
                              className="z-50 w-44 rounded-md border border-linea bg-papel p-1 shadow-[0_8px_24px_-12px_rgb(28_25_23/0.18)] animar-emerger"
                            >
                              <Menu.Item
                                onSelect={() => setDialogo({ tipo: 'baja', producto })}
                                className="flex h-9 cursor-default select-none items-center rounded-sm px-3 text-sm text-ladrillo outline-none data-[highlighted]:bg-hueso"
                              >
                                Dar de baja
                              </Menu.Item>
                            </Menu.Content>
                          </Menu.Portal>
                        </Menu.Root>
                      </>
                    ) : (
                      <span className="text-xs text-tinta-tenue">Sin venta en ninguna sucursal</span>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <Dialog
        abierto={dialogo?.tipo === 'nuevo'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Nuevo producto"
        descripcion="Se agrega al catálogo de todas las sucursales."
      >
        {dialogo?.tipo === 'nuevo' && (
          <FormularioNuevo
            alCerrar={() => setDialogo(null)}
            alConfirmar={(datos) =>
              usuario ? ejecutar(() => crearProducto(usuario, datos), `${datos.nombre.trim()} agregado al catálogo`) : null
            }
          />
        )}
      </Dialog>

      <Dialog
        abierto={dialogo?.tipo === 'precio'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Cambiar precio"
        descripcion={dialogo?.tipo === 'precio' ? dialogo.producto.nombre : undefined}
      >
        {dialogo?.tipo === 'precio' && (
          <FormularioPrecio
            key={dialogo.producto.id}
            producto={dialogo.producto}
            alCerrar={() => setDialogo(null)}
            alConfirmar={(precio) =>
              usuario
                ? ejecutar(
                    () => cambiarPrecio(usuario, dialogo.producto.id, precio),
                    `${dialogo.producto.nombre} ahora cuesta ${formatoMoneda(precio)}`,
                  )
                : null
            }
          />
        )}
      </Dialog>

      <Dialog
        abierto={dialogo?.tipo === 'baja'}
        alCambiar={(abierto) => !abierto && setDialogo(null)}
        titulo="Dar de baja"
        descripcion={dialogo?.tipo === 'baja' ? dialogo.producto.nombre : undefined}
      >
        {dialogo?.tipo === 'baja' && (
          <Confirmacion
            puntos={[
              'Dejará de venderse en todas las sucursales.',
              'Sus ventas anteriores se conservan en los reportes.',
              'No se borra: aparecerá en "Dados de baja".',
            ]}
            boton="Dar de baja"
            alCerrar={() => setDialogo(null)}
            alConfirmar={() =>
              usuario
                ? ejecutar(
                    () => darDeBajaProducto(usuario, dialogo.producto.id),
                    `${dialogo.producto.nombre} se dio de baja`,
                  )
                : null
            }
          />
        )}
      </Dialog>
    </Pagina>
  )
}

/** Campo de precio en pesos: acepta solo números con hasta dos decimales. */
function CampoPrecio({ valor, alCambiar, autoFocus }: { valor: string; alCambiar: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-tinta-suave">Precio</span>
      <span className="relative flex items-center">
        <span className="cifra pointer-events-none absolute left-3 text-sm text-tinta-tenue">$</span>
        <input
          inputMode="decimal"
          autoFocus={autoFocus}
          value={valor}
          placeholder="0.00"
          onChange={(e) => {
            const limpio = e.target.value.replace(/[^\d.]/g, '')
            if (/^\d*\.?\d{0,2}$/.test(limpio)) alCambiar(limpio)
          }}
          className="cifra h-10 w-full rounded-md border border-linea-fuerte bg-papel pr-3 pl-7 text-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-tinta-tenue hover:border-tinta-tenue focus:border-espresso focus:shadow-[0_0_0_3px_rgb(91_58_41/0.08)]"
        />
        <span className="pointer-events-none absolute right-3 text-xs text-tinta-tenue">MXN</span>
      </span>
    </label>
  )
}

function Pie({ children }: { children: ReactNode }) {
  return <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-linea px-6 py-4">{children}</div>
}

function FormularioNuevo({
  alCerrar,
  alConfirmar,
}: {
  alCerrar: () => void
  alConfirmar: (datos: { nombre: string; categoria: Categoria; precio: number }) => string | null
}) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState<Categoria>('Café caliente')
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState<string | null>(null)

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(alConfirmar({ nombre, categoria, precio: Number(precio) }))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Input
        name="nombre"
        etiqueta="Nombre"
        placeholder="Ej. Mocha"
        autoFocus
        autoComplete="off"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          etiqueta="Categoría"
          valor={categoria}
          alCambiar={(v) => setCategoria(v as Categoria)}
          opciones={categorias.map((c) => ({ valor: c, etiqueta: c }))}
          className="w-full"
        />
        <CampoPrecio valor={precio} alCambiar={setPrecio} />
      </div>
      <p className="text-[13px] text-tinta-suave">
        Empezará con existencia 0 en todas las sucursales. Cada gerente registra su entrada de mercancía para
        empezar a venderlo.
      </p>
      {error && <p className="text-[13px] text-ladrillo">{error}</p>}
      <Pie>
        <Button variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={nombre.trim().length < 2 || !(Number(precio) > 0)}>
          Agregar producto
        </Button>
      </Pie>
    </form>
  )
}

function FormularioPrecio({
  producto,
  alCerrar,
  alConfirmar,
}: {
  producto: Producto
  alCerrar: () => void
  alConfirmar: (precio: number) => string | null
}) {
  const [precio, setPrecio] = useState(producto.precio.toFixed(2))
  const [error, setError] = useState<string | null>(null)
  const nuevo = Number(precio)
  const diferencia = nuevo > 0 ? ((nuevo - producto.precio) / producto.precio) * 100 : 0

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setError(alConfirmar(nuevo))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <CampoPrecio valor={precio} alCambiar={setPrecio} autoFocus />
      <div className="cifra flex items-center gap-3 rounded-md bg-hueso px-4 py-3 text-sm">
        <span className="text-tinta-suave">Precio</span>
        <span className="ml-auto">{formatoMoneda(producto.precio)}</span>
        <ArrowRight size={14} strokeWidth={1.5} className="text-tinta-tenue" />
        <span className="font-medium">{nuevo > 0 ? formatoMoneda(nuevo) : '—'}</span>
        {nuevo > 0 && nuevo !== producto.precio && (
          <span className={cn('text-xs', diferencia > 0 ? 'text-oliva' : 'text-ladrillo')}>
            {diferencia > 0 ? '+' : '−'}
            {Math.abs(diferencia).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[13px] text-tinta-suave">
        Aplica en todas las sucursales a partir de la siguiente venta. Las ventas ya registradas conservan su precio.
      </p>
      {error && <p className="text-[13px] text-ladrillo">{error}</p>}
      <Pie>
        <Button variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!(nuevo > 0) || nuevo === producto.precio}>
          Guardar precio
        </Button>
      </Pie>
    </form>
  )
}

function Confirmacion({
  puntos,
  boton,
  alCerrar,
  alConfirmar,
}: {
  puntos: string[]
  boton: string
  alCerrar: () => void
  alConfirmar: () => string | null
}) {
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2 text-sm text-tinta-suave">
        {puntos.map((punto) => (
          <li key={punto}>{punto}</li>
        ))}
      </ul>
      {error && <p className="text-[13px] text-ladrillo">{error}</p>}
      <Pie>
        <Button variante="fantasma" onClick={alCerrar}>
          Volver
        </Button>
        <Button variante="peligro" onClick={() => setError(alConfirmar())}>
          {boton}
        </Button>
      </Pie>
    </div>
  )
}
