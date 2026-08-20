// ---------------------------------------------------------------------------
// Lecture d'un fichier iCalendar (.ics) exporté par Pronote ou École Directe.
//
// Ces exports ne contiennent pas « cours de maths, tous les mardis à 10h » mais
// la liste de toutes les séances datées du trimestre. On reconstitue donc la
// semaine type en repérant les créneaux qui reviennent.
// ---------------------------------------------------------------------------

import type { Weekday } from '../types'

export interface IcsEvent {
  date: string // "2026-09-01"
  start: string // "08:00"
  end: string
  summary: string
  location?: string
}

/**
 * Un créneau de la semaine type, avec le nombre de séances qui l'ont fait
 * apparaître — c'est ce compte qui permet de juger si le créneau est régulier.
 */
export interface TimetableSlot {
  key: string
  weekday: Weekday
  start: string
  end: string
  title: string
  location?: string
  occurrences: number
  firstDate: string
  lastDate: string
}

export interface ParsedTimetable {
  slots: TimetableSlot[]
  /** Séances vues une seule fois : ponctuelles, écartées de la semaine type. */
  isolated: number
  totalEvents: number
  from?: string
  to?: string
}

/** Les lignes longues sont coupées et reprises avec une espace initiale. */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .filter((l) => l.trim() !== '')
}

/** "SUMMARY;LANGUAGE=fr:Maths" -> { name, params, value } */
function parseLine(line: string) {
  const colon = line.indexOf(':')
  if (colon === -1) return null
  const left = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const [name, ...paramParts] = left.split(';')
  const params: Record<string, string> = {}
  for (const p of paramParts) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1)
  }
  return { name: name.toUpperCase(), params, value }
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

interface Moment {
  date: string
  time: string
}

/**
 * Convertit une date iCalendar en date et heure locales.
 *
 * Un horodatage en UTC (suffixe Z) est ramené à l'heure locale du lecteur ;
 * une heure accompagnée d'un fuseau, ou sans indication, est déjà l'heure
 * affichée sur l'emploi du temps et se lit telle quelle.
 */
function parseDateTime(value: string, isUtc: boolean): Moment | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/)
  if (!m) return null
  const [, y, mo, d, hh, mm] = m
  if (hh === undefined) return null // journée entière : pas un cours

  if (isUtc) {
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm))
    return {
      date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
      time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    }
  }
  return { date: `${y}-${mo}-${d}`, time: `${hh}:${mm}` }
}

/** Extrait les séances datées d'un fichier .ics. */
export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = []
  let current: Partial<IcsEvent> | null = null

  for (const line of unfold(text)) {
    const parsed = parseLine(line)
    if (!parsed) continue
    const { name, params, value } = parsed

    if (name === 'BEGIN' && value === 'VEVENT') {
      current = {}
      continue
    }
    if (name === 'END' && value === 'VEVENT') {
      if (current?.date && current.start && current.end && current.summary) {
        events.push(current as IcsEvent)
      }
      current = null
      continue
    }
    if (!current) continue

    if (name === 'DTSTART') {
      const m = parseDateTime(value, value.endsWith('Z'))
      if (m) {
        current.date = m.date
        current.start = m.time
      }
    } else if (name === 'DTEND') {
      const m = parseDateTime(value, value.endsWith('Z'))
      if (m) current.end = m.time
    } else if (name === 'SUMMARY') {
      current.summary = unescapeText(value)
    } else if (name === 'LOCATION') {
      const loc = unescapeText(value)
      if (loc) current.location = loc
    } else if (name === 'X-WR-CALNAME' || params.VALUE === 'DATE') {
      // ignoré
    }
  }
  return events
}

function weekdayOfIso(iso: string): Weekday {
  const [y, m, d] = iso.split('-').map(Number)
  return ((new Date(y, m - 1, d).getDay() + 6) % 7) as Weekday
}

/**
 * Repère la semaine type. Un créneau retenu doit apparaître au moins deux fois :
 * une séance isolée est un événement ponctuel, pas un cours hebdomadaire.
 */
export function buildTimetable(events: IcsEvent[]): ParsedTimetable {
  const groups = new Map<string, TimetableSlot>()

  for (const e of events) {
    const weekday = weekdayOfIso(e.date)
    const title = e.summary.trim()
    const key = `${weekday}|${e.start}|${e.end}|${title.toLowerCase()}`
    const existing = groups.get(key)
    if (existing) {
      existing.occurrences += 1
      if (e.date < existing.firstDate) existing.firstDate = e.date
      if (e.date > existing.lastDate) existing.lastDate = e.date
      if (!existing.location && e.location) existing.location = e.location
    } else {
      groups.set(key, {
        key,
        weekday,
        start: e.start,
        end: e.end,
        title,
        location: e.location,
        occurrences: 1,
        firstDate: e.date,
        lastDate: e.date,
      })
    }
  }

  const all = [...groups.values()]
  const slots = all
    .filter((s) => s.occurrences >= 2)
    .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))

  const dates = events.map((e) => e.date).sort()

  return {
    slots,
    isolated: all.filter((s) => s.occurrences < 2).length,
    totalEvents: events.length,
    from: dates[0],
    to: dates[dates.length - 1],
  }
}
