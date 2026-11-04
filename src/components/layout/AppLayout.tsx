import * as Menu from '@radix-ui/react-dropdown-menu'
import { motion } from 'motion/react'
import { ChevronsUpDown, LogOut } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from '../../context/SesionContext'
import { cn } from '../../lib/cn'
import { iniciales } from '../../lib/formato'
import { navegacionPara } from '../../lib/navegacion'
import { nombreRol } from '../../lib/roles'
import { Marca } from './Marca'

export function AppLayout() {
  const { usuario, sucursal, cerrarSesion } = useSesion()
  const { pathname } = useLocation()
  if (!usuario) return null

  const elementos = navegacionPara(usuario.rol)
  const contexto = sucursal ? `Sucursal ${sucursal.nombre}` : 'Todas las sucursales'

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-linea md:flex">
        <div className="px-6 pt-7 pb-8">
          <Marca />
          <p className="mt-2 text-xs text-tinta-tenue">{contexto}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {elementos.map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                cn(
                  'relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-200',
                  isActive ? 'text-tinta' : 'text-tinta-suave hover:text-tinta',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-activo"
                      className="absolute inset-0 rounded-md bg-hueso"
                      transition={{ type: 'spring', stiffness: 500, damping: 42 }}
                    />
                  )}
                  <Icono size={16} strokeWidth={1.5} className="relative" />
                  <span className="relative">{etiqueta}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <Menu.Root>
          <Menu.Trigger className="m-3 flex items-center gap-3 rounded-md p-2 text-left transition-colors outline-none hover:bg-hueso data-[state=open]:bg-hueso">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-espresso text-xs font-medium text-crema">
              {iniciales(usuario.nombre)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{usuario.nombre}</span>
              <span className="block truncate text-xs text-tinta-tenue">{nombreRol[usuario.rol]}</span>
            </span>
            <ChevronsUpDown size={14} strokeWidth={1.5} className="text-tinta-tenue" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              side="top"
              align="start"
              sideOffset={6}
              className="z-50 w-52 rounded-md border border-linea bg-papel p-1 shadow-[0_8px_24px_-12px_rgb(28_25_23/0.18)] animar-emerger"
            >
              <Menu.Item
                onSelect={cerrarSesion}
                className="flex h-9 cursor-default items-center gap-2.5 rounded-sm px-3 text-sm outline-none data-[highlighted]:bg-hueso"
              >
                <LogOut size={14} strokeWidth={1.5} />
                Cerrar sesión
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Encabezado (móvil) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-linea bg-crema/95 px-5 backdrop-blur-sm md:hidden">
          <div className="flex items-baseline gap-2">
            <Marca className="text-xl" />
            <span className="text-xs text-tinta-tenue">{sucursal?.nombre ?? 'General'}</span>
          </div>
          <button
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
            className="rounded-md p-2 text-tinta-suave transition-colors hover:bg-hueso"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </header>

        <main key={pathname} className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Navegación inferior (móvil) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-linea bg-crema/95 backdrop-blur-sm md:hidden">
          {elementos.map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors',
                  isActive ? 'text-espresso' : 'text-tinta-tenue',
                )
              }
            >
              <Icono size={18} strokeWidth={1.5} />
              {etiqueta}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
