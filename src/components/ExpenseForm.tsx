import { useState } from 'react'
import { useStore } from '../store'
import type { Expense, ParentId } from '../types'
import { today } from '../lib/dates'
import { newId } from '../lib/storage'
import { euros, round2 } from '../lib/finance'
import { Field, Modal, Segment } from './ui'

const SHARE_PRESETS = [
  { value: '0.5', label: '50 / 50' },
  { value: '1', label: '100 % moi' },
  { value: '0', label: `100 % l'autre` },
  { value: 'custom', label: 'Autre %' },
]

export default function ExpenseForm({
  initial,
  onClose,
}: {
  initial?: Expense
  onClose: () => void
}) {
  const { data, update, meName, otherName } = useStore()
  const isEdit = Boolean(initial)

  const [date, setDate] = useState(initial?.date ?? today())
  const [label, setLabel] = useState(initial?.label ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category ?? data.categories[0])
  const [childId, setChildId] = useState<string>(initial?.childId ?? 'all')
  const [paidBy, setPaidBy] = useState<ParentId>(initial?.paidBy ?? 'me')
  const [sharePreset, setSharePreset] = useState(() => {
    const s = initial?.shareMe ?? 0.5
    return s === 0.5 ? '0.5' : s === 1 ? '1' : s === 0 ? '0' : 'custom'
  })
  const [customShare, setCustomShare] = useState(
    String(Math.round((initial?.shareMe ?? 0.5) * 100)),
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const shareMe =
    sharePreset === 'custom'
      ? Math.min(1, Math.max(0, (Number(customShare) || 0) / 100))
      : Number(sharePreset)

  const amountNum = Number(amount.replace(',', '.')) || 0
  const owed = round2(
    paidBy === 'me' ? amountNum * (1 - shareMe) : amountNum * shareMe,
  )
  const valid = label.trim().length > 0 && amountNum > 0

  function submit() {
    if (!valid) return
    const expense: Expense = {
      id: initial?.id ?? newId(),
      date,
      label: label.trim(),
      amount: round2(amountNum),
      category,
      childId,
      paidBy,
      shareMe,
      notes: notes.trim() || undefined,
    }
    update((d) => ({
      ...d,
      expenses: isEdit
        ? d.expenses.map((e) => (e.id === expense.id ? expense : e))
        : [expense, ...d.expenses],
    }))
    onClose()
  }

  function remove() {
    if (!initial) return
    if (!confirm(`Supprimer « ${initial.label} » ?`)) return
    update((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== initial.id) }))
    onClose()
  }

  return (
    <Modal title={isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'} onClose={onClose}>
      <Field label="Quoi ?">
        <input
          type="text"
          value={label}
          autoFocus
          placeholder="Ex. Licence de basket, dentiste, cartable…"
          onChange={(e) => setLabel(e.target.value)}
        />
      </Field>

      <div className="field-row">
        <Field label="Montant (€)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            placeholder="0,00"
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="field-row">
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {data.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
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
      </div>

      <Field label="Qui a payé ?">
        <Segment<ParentId>
          value={paidBy}
          onChange={setPaidBy}
          options={[
            { value: 'me', label: meName },
            { value: 'other', label: otherName },
          ]}
        />
      </Field>

      <Field label="Répartition" hint="Quelle part de cette dépense est à ma charge ?">
        <Segment
          value={sharePreset}
          onChange={setSharePreset}
          options={SHARE_PRESETS}
        />
      </Field>

      {sharePreset === 'custom' && (
        <Field label="Ma part (%)">
          <input
            type="number"
            min="0"
            max="100"
            value={customShare}
            onChange={(e) => setCustomShare(e.target.value)}
          />
        </Field>
      )}

      <Field label="Note (facultatif)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {amountNum > 0 && (
        <div className="callout">
          {owed < 0.01 ? (
            <>Cette dépense n’a aucun impact sur le solde.</>
          ) : paidBy === 'me' ? (
            <>
              <strong>{otherName}</strong> vous devra <strong>{euros(owed)}</strong> pour
              cette dépense.
            </>
          ) : (
            <>
              Vous devrez <strong>{euros(owed)}</strong> à <strong>{otherName}</strong>{' '}
              pour cette dépense.
            </>
          )}
        </div>
      )}

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
