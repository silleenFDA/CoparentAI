import type { Weekday } from '../types'

export const WEEKDAYS = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
] as const

export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

export const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
] as const

/** "2026-08-20" -> Date locale (évite le décalage de fuseau de `new Date(str)`). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date -> "2026-08-20" */
export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today(): string {
  return toISO(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** 0 = lundi ... 6 = dimanche */
export function weekdayOf(iso: string): Weekday {
  return ((parseISO(iso).getDay() + 6) % 7) as Weekday
}

/** Lundi de la semaine contenant `iso`. */
export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayOf(iso))
}

/** Les 7 dates (lundi -> dimanche) de la semaine contenant `iso`. */
export function weekDates(iso: string): string[] {
  const monday = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/**
 * Numéro du jour depuis une origine fixe. Passer par UTC évite qu'un
 * changement d'heure fasse dériver un calcul d'écart d'une journée.
 */
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

/** Nombre de jours de `from` à `to` (négatif si `to` est avant). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

/** Numéro de semaine ISO (1 à 53). */
export function isoWeekNumber(iso: string): number {
  const d = parseISO(iso)
  // On se place sur le jeudi de la semaine : il définit l'année ISO.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  firstThursday.setDate(
    firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7),
  )
  const diff = d.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

export function formatLong(iso: string): string {
  const d = parseISO(iso)
  return `${WEEKDAYS[weekdayOf(iso)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatShort(iso: string): string {
  const d = parseISO(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-08-29" -> "samedi 29 août 2026" */
export function formatFull(iso: string): string {
  const d = parseISO(iso)
  return `${WEEKDAYS[weekdayOf(iso)].toLowerCase()} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

/** "2026-08-20" -> "2026-08" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function isToday(iso: string): boolean {
  return iso === today()
}

/** Compare deux heures "HH:MM". */
export function compareTime(a?: string, b?: string): number {
  return (a ?? '99:99').localeCompare(b ?? '99:99')
}
