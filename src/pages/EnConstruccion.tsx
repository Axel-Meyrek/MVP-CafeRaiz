import { Hammer } from 'lucide-react'
import { Pagina } from '../components/layout/Pagina'
import { EmptyState } from '../components/ui/EmptyState'

export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <Pagina titulo={titulo}>
      <div className="border-t border-linea">
        <EmptyState
          icono={Hammer}
          titulo="Pantalla en construcción"
          descripcion="La diseñaremos en una de las siguientes entregas."
        />
      </div>
    </Pagina>
  )
}
