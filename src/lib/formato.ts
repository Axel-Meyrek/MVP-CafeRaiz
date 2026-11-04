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

const horaNumero = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Mexico_City' })
const minutoNumero = new Intl.DateTimeFormat('en-US', { minute: 'numeric', timeZone: 'America/Mexico_City' })

/** Clave AAAA-MM-DD en la hora local de la cafetería. */
export const claveDia = (fecha: Date | string) => diaClave.format(new Date(fecha))

/** Compara días en la hora local de la cafetería. */
export const esHoy = (iso: string) => claveDia(iso) === claveDia(new Date())

export function esAyer(iso: string) {
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  return claveDia(iso) === claveDia(ayer)
}

/** Minutos transcurridos desde la medianoche, en hora local. */
export function minutoDelDia(fecha: Date | string) {
  const d = new Date(fecha)
  return Number(horaNumero.format(d)) * 60 + Number(minutoNumero.format(d))
}

export function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}
