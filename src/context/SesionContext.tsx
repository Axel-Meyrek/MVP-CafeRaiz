import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { sucursales, usuarios } from '../data/catalogo'
import type { Sucursal, Usuario } from '../types'

const CLAVE = 'cafe-raiz:sesion'

interface Sesion {
  usuario: Usuario | null
  sucursal: Sucursal | null
  iniciarSesion: (usuarioId: string) => void
  cerrarSesion: () => void
}

const SesionContext = createContext<Sesion | null>(null)

function leerSesionGuardada(): Usuario | null {
  const id = sessionStorage.getItem(CLAVE)
  const usuario = usuarios.find((u) => u.id === id)
  // Un usuario desactivado no puede entrar (regla 12).
  return usuario?.activo ? usuario : null
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerSesionGuardada)

  const iniciarSesion = useCallback((usuarioId: string) => {
    const encontrado = usuarios.find((u) => u.id === usuarioId)
    if (!encontrado?.activo) return
    sessionStorage.setItem(CLAVE, encontrado.id)
    setUsuario(encontrado)
  }, [])

  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem(CLAVE)
    setUsuario(null)
  }, [])

  const valor = useMemo<Sesion>(
    () => ({
      usuario,
      sucursal: sucursales.find((s) => s.id === usuario?.sucursalId) ?? null,
      iniciarSesion,
      cerrarSesion,
    }),
    [usuario, iniciarSesion, cerrarSesion],
  )

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return contexto
}
