import { useState } from 'react'
import { useStore } from '../store'
import type { OneOffEvent } from '../types'
import { today } from '../lib/dates'
import { newId } from '../lib/storage'
import { Field, Modal, Segment } from './ui'

export default function EventForm({
  initial,
  defaultDate,
  defaultTitle,
  defaultChildId,
  onSwitchToWeekly,
  onClose,
}: {
  initial?: OneOffEvent
  defaultDate?: string
  defaultTitle?: string
  defaultChildId?: string
  /** Bascule vers le formulaire hebdomadaire, en gardant la saisie en cours. */
  onSwitchToWeekly?: (draft: { title: string; childId: string }) => void
  onClose: () => void
}) {
  const { data, update } = useStore()
  const isEdit = Boolean(initial)

  const [title, setTitle] = useState(initial?.title ?? defaultTitle ?? '')
  const [childId, setChildId] = useState<string>(
    initial?.childId ?? defaultChildId ?? 'all',
  )
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? today())
  const [start, setStart] = useState(initial?.start ?? '')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const valid = title.trim().length > 0

  function submit() {
    if (!valid) return
    const event: OneOffEvent = {
      id: initial?.id ?? newId(),
      title: title.trim(),
      childId,
      date,
      start: start || undefined,
      end: end || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    update((d) => ({
      ...d,
      events: isEdit
        ? d.events.map((e) => (e.id === event.id ? event : e))
        : [...d.events, event],
    }))
    onClose()
  }

  function remove() {
    if (!initial) return
    if (!confirm(`Supprimer « ${initial.title} » ?`)) return
    update((d) => ({ ...d, events: d.events.filter((e) => e.id !== initial.id) }))
    onClose()
  }

  return (
    <Modal
      title={isEdit ? `Modifier l'événement` : 'Nouvel événement ponctuel'}
      onClose={onClose}
    >
      {onSwitchToWeekly && (
        <Field
          label="Est-ce que ça revient ?"
          hint="Le ping-pong du samedi revient ; une compétition ou un rendez-vous médical, non."
        >
          <Segment<'hebdo' | 'ponctuel'>
            value="ponctuel"
            onChange={(next) => {
              if (next === 'hebdo') onSwitchToWeekly({ title, childId })
            }}
            options={[
              { value: 'hebdo', label: 'Chaque semaine' },
              { value: 'ponctuel', label: 'Une seule fois' },
            ]}
          />
        </Field>
      )}

      <Field label="Quoi ?">
        <input
          type="text"
          value={title}
          autoFocus
          placeholder="Ex. Rendez-vous orthodontiste, tournoi, réunion parents…"
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <div className="field-row">
        <Field label="Pour qui ?">
          <select value={childId} onChange={(e) => setChildId(e.target.value)}>
            <option value="all">Les deux / la famille</option>
            {data.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="field-row">
        <Field label="Début (facultatif)">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Fin (facultatif)">
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      <Field label="Lieu (facultatif)">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </Field>

      <Field label="Note (facultatif)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

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
