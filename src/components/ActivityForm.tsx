import { useState } from 'react'
import { useStore } from '../store'
import type { Activity, ActivityScope, ParentId, Weekday } from '../types'
import { WEEKDAYS } from '../lib/dates'
import { newId } from '../lib/storage'
import { ACTIVITY_KIND_LABEL } from '../lib/schedule'
import { Field, Modal, Segment } from './ui'

export default function ActivityForm({
  initial,
  defaultScope,
  defaultChildId,
  onClose,
}: {
  initial?: Activity
  defaultScope?: ActivityScope
  defaultChildId?: string
  onClose: () => void
}) {
  const { data, update, meName, otherName } = useStore()
  const isEdit = Boolean(initial)

  const [childId, setChildId] = useState(
    initial?.childId ?? defaultChildId ?? data.children[0]?.id ?? '',
  )
  const [title, setTitle] = useState(initial?.title ?? '')
  const [scope, setScope] = useState<ActivityScope>(
    initial?.scope ?? defaultScope ?? 'hors-cours',
  )
  const [kind, setKind] = useState<Activity['kind']>(
    initial?.kind ?? (defaultScope === 'cours' ? 'ecole' : 'sport'),
  )
  const [weekday, setWeekday] = useState<Weekday>(initial?.weekday ?? 2)
  const [start, setStart] = useState(initial?.start ?? '17:00')
  const [end, setEnd] = useState(initial?.end ?? '18:30')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [driverId, setDriverId] = useState<ParentId | 'none'>(initial?.driverId ?? 'none')
  const [frequency, setFrequency] = useState<Activity['frequency']>(
    initial?.frequency ?? 'weekly',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [active, setActive] = useState(initial?.active ?? true)

  const valid = title.trim().length > 0 && childId !== ''

  function submit() {
    if (!valid) return
    const activity: Activity = {
      id: initial?.id ?? newId(),
      childId,
      title: title.trim(),
      scope,
      kind,
      weekday,
      start,
      end,
      location: location.trim() || undefined,
      driverId: driverId === 'none' ? null : driverId,
      frequency,
      notes: notes.trim() || undefined,
      active,
    }
    update((d) => ({
      ...d,
      activities: isEdit
        ? d.activities.map((a) => (a.id === activity.id ? activity : a))
        : [...d.activities, activity],
    }))
    onClose()
  }

  function remove() {
    if (!initial) return
    if (!confirm(`Supprimer « ${initial.title} » ?`)) return
    update((d) => ({
      ...d,
      activities: d.activities.filter((a) => a.id !== initial.id),
    }))
    onClose()
  }

  return (
    <Modal
      title={
        isEdit
          ? scope === 'cours'
            ? 'Modifier le cours'
            : `Modifier l'activité`
          : 'Nouveau créneau hebdomadaire'
      }
      onClose={onClose}
    >
      <Field
        label="Type de créneau"
        hint="Les cours forment l'emploi du temps scolaire ; le reste apparaît dans l'onglet « Activités hors cours »."
      >
        <Segment<ActivityScope>
          value={scope}
          onChange={(next) => {
            setScope(next)
            setKind(next === 'cours' ? 'ecole' : 'sport')
          }}
          options={[
            { value: 'cours', label: 'Cours' },
            { value: 'hors-cours', label: 'Hors cours' },
          ]}
        />
      </Field>

      <Field label={scope === 'cours' ? 'Matière ou intitulé' : "Nom de l'activité"}>
        <input
          type="text"
          value={title}
          autoFocus
          placeholder={
            scope === 'cours'
              ? 'Ex. Cours, Mathématiques, Permanence…'
              : 'Ex. Basket, piano, soutien maths…'
          }
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <div className="field-row">
        <Field label="Pour qui ?">
          <select value={childId} onChange={(e) => setChildId(e.target.value)}>
            {data.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Activity['kind'])}
          >
            {Object.entries(ACTIVITY_KIND_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Jour">
        <select
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value) as Weekday)}
        >
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </Field>

      <div className="field-row">
        <Field label="Début">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Fin">
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      <Field
        label="Fréquence"
        hint="Une semaine sur deux ? Choisissez chez quel parent le créneau a lieu."
      >
        <Segment<Activity['frequency']>
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: 'weekly', label: 'Chaque semaine' },
            { value: 'week-me', label: `Semaines chez ${meName}` },
            { value: 'week-other', label: `Semaines chez ${otherName}` },
          ]}
        />
      </Field>

      <Field label="Lieu (facultatif)">
        <input
          type="text"
          value={location}
          placeholder="Ex. Gymnase Jean-Moulin"
          onChange={(e) => setLocation(e.target.value)}
        />
      </Field>

      <Field label="Qui emmène ?" hint="Laissez « À définir » si cela change chaque semaine.">
        <Segment<ParentId | 'none'>
          value={driverId}
          onChange={setDriverId}
          options={[
            { value: 'none', label: 'À définir' },
            { value: 'me', label: meName },
            { value: 'other', label: otherName },
          ]}
        />
      </Field>

      <Field label="Note (facultatif)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Activité en cours (décochez pendant les vacances ou à l'arrêt)
      </label>

      <div className="modal-actions">
        {isEdit && (
          <button className="btn btn-danger" onClick={remove}>
            Supprimer
          </button>
        )}
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={!valid}>
          {isEdit ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </Modal>
  )
}
