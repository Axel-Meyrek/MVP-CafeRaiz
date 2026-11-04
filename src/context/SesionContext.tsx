import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { sucursales } from '../data/catalogo'
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
  const { usuarios } = useDatos()
  const [usuarioId, setUsuarioId] = useState<string | null>(() => sessionStorage.getItem(CLAVE))

  // Un usuario desactivado no puede entrar; si lo desactivan, su sesión termina (regla 12).
  const encontrado = usuarios.find((u) => u.id === usuarioId)
  const usuario = encontrado?.activo ? encontrado : null

  const iniciarSesion = useCallback(
    (id: string) => {
      if (!usuarios.find((u) => u.id === id)?.activo) return
      sessionStorage.setItem(CLAVE, id)
      setUsuarioId(id)
    },
    [usuarios],
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
