import { useRef, useState } from 'react'
import { useStore } from '../store'
import type { Activity } from '../types'
import { WEEKDAYS, formatFull } from '../lib/dates'
import { newId } from '../lib/storage'
import { buildTimetable, parseIcs, type ParsedTimetable } from '../lib/ics'
import { Field, Modal } from './ui'

export default function ImportTimetable({
  defaultChildId,
  onClose,
}: {
  defaultChildId?: string
  onClose: () => void
}) {
  const { data, update } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [childId, setChildId] = useState(
    defaultChildId ?? data.children[0]?.id ?? '',
  )
  const [parsed, setParsed] = useState<ParsedTimetable | null>(null)
  const [fileName, setFileName] = useState('')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [replace, setReplace] = useState(true)
  const [shorten, setShorten] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File) {
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const events = parseIcs(String(reader.result))
        if (events.length === 0) {
          setParsed(null)
          setError(
            "Aucun cours n'a été trouvé dans ce fichier. Vérifiez qu'il s'agit bien de l'export iCal de l'emploi du temps.",
          )
          return
        }
        const result = buildTimetable(events)
        if (result.slots.length === 0) {
          setParsed(null)
          setError(
            "Ce fichier ne contient aucun créneau qui se répète : impossible d'en déduire une semaine type.",
          )
          return
        }
        setParsed(result)
        setFileName(file.name)
        setExcluded(new Set())
      } catch {
        setParsed(null)
        setError("Ce fichier n'a pas pu être lu.")
      }
    }
    reader.readAsText(file)
  }

  function toggle(key: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /**
   * Pronote intitule ses cours « MATHEMATIQUES - Mme MARTIN, professeur ».
   * On propose de ne garder que la matière : le tiret doit être entouré
   * d'espaces, pour ne pas couper « HISTOIRE-GEOGRAPHIE ».
   */
  function displayTitle(title: string): string {
    if (!shorten) return title
    return title.split(/\s+[-–—]\s+/)[0].trim() || title
  }

  const kept = parsed?.slots.filter((s) => !excluded.has(s.key)) ?? []

  function confirmImport() {
    if (!parsed || !childId || kept.length === 0) return
    const imported: Activity[] = kept.map((s) => ({
      id: newId(),
      childId,
      title: displayTitle(s.title),
      scope: 'cours',
      kind: 'ecole',
      weekday: s.weekday,
      start: s.start,
      end: s.end,
      location: s.location,
      driverId: null,
      frequency: 'weekly',
      active: true,
    }))

    update((d) => ({
      ...d,
      activities: [
        // Le remplacement ne touche que les cours de cet enfant : ses
        // activités hors cours et celles de l'autre enfant sont préservées.
        ...d.activities.filter(
          (a) => !(replace && a.scope === 'cours' && a.childId === childId),
        ),
        ...imported,
      ],
    }))
    onClose()
  }

  const childName = data.children.find((c) => c.id === childId)?.name ?? ''
  const existingCourses = data.activities.filter(
    (a) => a.scope === 'cours' && a.childId === childId,
  ).length

  return (
    <Modal title="Importer un emploi du temps" onClose={onClose}>
      {!parsed && (
        <>
          <p className="muted">
            Depuis Pronote ou École Directe, récupérez l'export iCal de l'emploi du
            temps (fichier <code>.ics</code>), puis ouvrez-le ici. Rien n'est
            enregistré avant votre validation.
          </p>

          <Field label="Emploi du temps de">
            <select value={childId} onChange={(e) => setChildId(e.target.value)}>
              {data.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <button
            className="btn btn-primary btn-block"
            onClick={() => fileRef.current?.click()}
          >
            Choisir un fichier .ics
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />

          {error && (
            <div className="callout" style={{ marginTop: 14 }}>
              ⚠️ {error}
            </div>
          )}
        </>
      )}

      {parsed && (
        <>
          <div className="callout">
            <strong>{parsed.totalEvents} séances</strong> lues dans {fileName}
            {parsed.from && parsed.to && (
              <>
                , du {formatFull(parsed.from)} au {formatFull(parsed.to)}
              </>
            )}
            . J'en déduis <strong>{parsed.slots.length} créneaux</strong> de la
            semaine type pour <strong>{childName}</strong>.
            {parsed.isolated > 0 && (
              <>
                {' '}
                {parsed.isolated} séance{parsed.isolated > 1 ? 's' : ''} isolée
                {parsed.isolated > 1 ? 's' : ''} {parsed.isolated > 1 ? 'ont' : 'a'}{' '}
                été écartée{parsed.isolated > 1 ? 's' : ''}.
              </>
            )}
          </div>

          <p className="faint">
            Décochez ce que vous ne voulez pas garder — les permanences ou les
            options, par exemple. La colonne de droite indique combien de fois le
            créneau revient sur la période : un nombre faible signale un cours en
            semaine A / semaine B, à vérifier.
          </p>

          <div className="list" style={{ marginTop: 10 }}>
            {parsed.slots.map((s) => (
              <label key={s.key} className="item" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!excluded.has(s.key)}
                  onChange={() => toggle(s.key)}
                  style={{ width: 'auto' }}
                />
                <div className="body">
                  <div className="title">{displayTitle(s.title)}</div>
                  <div className="meta">
                    {WEEKDAYS[s.weekday]} {s.start}–{s.end}
                    {s.location ? ` · ${s.location}` : ''}
                  </div>
                </div>
                <span className="chip nowrap">{s.occurrences}×</span>
              </label>
            ))}
          </div>

          <label className="checkbox" style={{ marginTop: 14 }}>
            <input
              type="checkbox"
              checked={shorten}
              onChange={(e) => setShorten(e.target.checked)}
            />
            Raccourcir les intitulés (garder la matière, retirer le professeur)
          </label>

          {existingCourses > 0 && (
            <label className="checkbox" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              Remplacer les {existingCourses} cours déjà enregistrés pour {childName}
            </label>
          )}

          <div className="modal-actions">
            <button className="btn" onClick={() => setParsed(null)}>
              Autre fichier
            </button>
            <button
              className="btn btn-primary"
              onClick={confirmImport}
              disabled={kept.length === 0}
            >
              Importer {kept.length} créneaux
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
