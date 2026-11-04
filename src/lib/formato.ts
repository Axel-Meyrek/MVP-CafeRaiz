const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const hora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })
const fechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' })

export const formatoMoneda = (valor: number) => moneda.format(valor)
export const formatoHora = (iso: string) => hora.format(new Date(iso))
export const formatoFecha = (iso: string) => fechaCorta.format(new Date(iso))

export function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}
