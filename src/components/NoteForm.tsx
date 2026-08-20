import { useState } from 'react'
import { useStore } from '../store'
import type { Note } from '../types'
import { today } from '../lib/dates'
import { newId } from '../lib/storage'
import { Field, Modal } from './ui'

export const NOTE_CATEGORIES: Record<Note['category'], string> = {
  reunion: 'Compte rendu',
  accord: 'Accord',
  info: 'Information',
  autre: 'Autre',
}

export const NOTE_ICONS: Record<Note['category'], string> = {
  reunion: '📝',
  accord: '🤝',
  info: 'ℹ️',
  autre: '📌',
}

export default function NoteForm({
  initial,
  onClose,
}: {
  initial?: Note
  onClose: () => void
}) {
  const { data, update } = useStore()
  const isEdit = Boolean(initial)

  const [date, setDate] = useState(initial?.date ?? today())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [category, setCategory] = useState<Note['category']>(
    initial?.category ?? 'reunion',
  )
  const [childId, setChildId] = useState<string>(initial?.childId ?? 'all')

  const valid = title.trim().length > 0

  function submit() {
    if (!valid) return
    const note: Note = {
      id: initial?.id ?? newId(),
      date,
      title: title.trim(),
      body: body.trim(),
      category,
      childId,
      createdAt: initial?.createdAt ?? today(),
    }
    update((d) => ({
      ...d,
      notes: isEdit
        ? d.notes.map((n) => (n.id === note.id ? note : n))
        : [note, ...d.notes],
    }))
    onClose()
  }

  function remove() {
    if (!initial) return
    if (!confirm(`Supprimer « ${initial.title} » ?`)) return
    update((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== initial.id) }))
    onClose()
  }

  return (
    <Modal title={isEdit ? 'Modifier la note' : 'Nouvelle note'} onClose={onClose}>
      <Field label="Titre">
        <input
          type="text"
          value={title}
          autoFocus
          placeholder="Ex. Point de rentrée, accord sur les vacances…"
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <div className="field-row">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Type">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Note['category'])}
          >
            {Object.entries(NOTE_CATEGORIES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Concerne">
        <select value={childId} onChange={(e) => setChildId(e.target.value)}>
          <option value="all">La famille</option>
          {data.children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Contenu">
        <textarea
          value={body}
          style={{ minHeight: 160 }}
          placeholder="Ce qui a été dit, décidé, transmis…"
          onChange={(e) => setBody(e.target.value)}
        />
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
