/** Une clases de Tailwind ignorando valores vacíos. */
export function cn(...clases: Array<string | false | null | undefined>) {
  return clases.filter(Boolean).join(' ')
}
