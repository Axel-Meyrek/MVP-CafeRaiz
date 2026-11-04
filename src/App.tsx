import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'
import { DatosProvider } from './context/DatosContext'
import { SesionProvider, useSesion } from './context/SesionContext'
import { navegacion, rutaInicial } from './lib/navegacion'
import type { Rol } from './types'
import { EnConstruccion } from './pages/EnConstruccion'
import { Descuentos } from './pages/Descuentos'
import { Inventario } from './pages/Inventario'
import { InventarioGlobal } from './pages/InventarioGlobal'
import { Login } from './pages/Login'
import { MisVentas } from './pages/MisVentas'
import { PanelSucursal } from './pages/PanelSucursal'
import { Personal } from './pages/Personal'
import { Productos } from './pages/Productos'
import { Sucursales } from './pages/Sucursales'
import { PuntoDeVenta } from './pages/PuntoDeVenta'
import { ReporteSucursal } from './pages/ReporteSucursal'
import { VentasSucursal } from './pages/VentasSucursal'
import { VistaGeneral } from './pages/VistaGeneral'

/** Pantallas terminadas; las demás muestran "en construcción". */
const pantallas: Record<string, ReactNode> = {
  '/venta': <PuntoDeVenta />,
  '/mis-ventas': <MisVentas />,
  '/inventario': <Inventario />,
  '/panel': <PanelSucursal />,
  '/ventas': <VentasSucursal />,
  '/personal': <Personal />,
  '/reporte': <ReporteSucursal />,
  '/general': <VistaGeneral />,
  '/inventario-global': <InventarioGlobal />,
  '/productos': <Productos />,
  '/descuentos': <Descuentos />,
  '/sucursales': <Sucursales />,
}

/** Solo deja pasar a los roles autorizados para la ruta. */
function Protegida({ roles, children }: { roles?: Rol[]; children: ReactNode }) {
  const { usuario } = useSesion()
  if (!usuario) return <Navigate to="/login" replace />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={rutaInicial[usuario.rol]} replace />
  return children
}

function Inicio() {
  const { usuario } = useSesion()
  return <Navigate to={usuario ? rutaInicial[usuario.rol] : '/login'} replace />
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <DatosProvider>
        <SesionProvider>
          <ToastProvider>
            <HashRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  element={
                    <Protegida>
                      <AppLayout />
                    </Protegida>
                  }
                >
                  {navegacion.map(({ ruta, etiqueta, roles }) => (
                    <Route
                      key={ruta}
                      path={ruta}
                      element={
                        <Protegida roles={roles}>
                          {pantallas[ruta] ?? <EnConstruccion titulo={etiqueta} />}
                        </Protegida>
                      }
                    />
                  ))}
                </Route>
                <Route path="*" element={<Inicio />} />
              </Routes>
            </HashRouter>
          </ToastProvider>
        </SesionProvider>
      </DatosProvider>
    </MotionConfig>
  )
}
