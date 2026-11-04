import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Sucursal, Usuario } from '../types'
import { useDatos } from './DatosContext'

const CLAVE = 'cafe-raiz:sesion'

interface Sesion {
  usuario: Usuario | null
  sucursal: Sucursal | null
  iniciarSesion: (usuarioId: string) => void
  cerrarSesion: () => void
}

const SesionContext = createContext<Sesion | null>(null)

export function SesionProvider({ children }: { children: ReactNode }) {
  const { usuarios, sucursales } = useDatos()
  const [usuarioId, setUsuarioId] = useState<string | null>(() => sessionStorage.getItem(CLAVE))

  // Un usuario desactivado no puede entrar; si lo desactivan, su sesión termina (regla 12).
  // Tampoco entra el personal de una sucursal dada de baja.
  const puedeEntrar = useCallback(
    (u: Usuario | undefined) =>
      !!u?.activo && (u.sucursalId === null || !!sucursales.find((s) => s.id === u.sucursalId)?.activa),
    [sucursales],
  )
  const encontrado = usuarios.find((u) => u.id === usuarioId)
  const usuario = encontrado && puedeEntrar(encontrado) ? encontrado : null

  const iniciarSesion = useCallback(
    (id: string) => {
      if (!puedeEntrar(usuarios.find((u) => u.id === id))) return
      sessionStorage.setItem(CLAVE, id)
      setUsuarioId(id)
    },
    [usuarios, puedeEntrar],
  )

  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem(CLAVE)
    setUsuarioId(null)
  }, [])

  const valor = useMemo<Sesion>(
    () => ({
      usuario,
      sucursal: sucursales.find((s) => s.id === usuario?.sucursalId) ?? null,
      iniciarSesion,
      cerrarSesion,
    }),
    [usuario, sucursales, iniciarSesion, cerrarSesion],
  )

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return contexto
}
