const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const hora = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Mexico_City',
})
const diaClave = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' })
const fechaLarga = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Mexico_City',
})
const fechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' })

export const formatoMoneda = (valor: number) => moneda.format(valor)
export const formatoHora = (iso: string) => hora.format(new Date(iso))
export const formatoFecha = (iso: string) => fechaCorta.format(new Date(iso))
export const formatoFechaLarga = (fecha: Date) => fechaLarga.format(fecha)

/** Compara días en la hora local de la cafetería. */
export const esHoy = (iso: string) => diaClave.format(new Date(iso)) === diaClave.format(new Date())

export function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}
