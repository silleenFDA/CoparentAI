import { useState } from 'react'
import { useStore } from '../store'
import type { Allowance, ParentId } from '../types'
import { today } from '../lib/dates'
import { newId } from '../lib/storage'
import { euros, round2 } from '../lib/finance'
import { Field, Modal, Segment } from './ui'

export const ALLOWANCE_KINDS: Record<Allowance['kind'], string> = {
  allocation: 'Allocation',
  bourse: 'Bourse',
  remboursement: 'Remboursement',
  autre: 'Autre',
}

const SHARE_PRESETS = [
  { value: '0.5', label: '50 / 50' },
  { value: '1', label: '100 % moi' },
  { value: '0', label: `100 % l'autre` },
  { value: 'custom', label: 'Autre %' },
]

export default function AllowanceForm({
  initial,
  onClose,
}: {
  initial?: Allowance
  onClose: () => void
}) {
  const { data, update, meName, otherName } = useStore()
  const isEdit = Boolean(initial)

  const [date, setDate] = useState(initial?.date ?? today())
  const [label, setLabel] = useState(initial?.label ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [kind, setKind] = useState<Allowance['kind']>(initial?.kind ?? 'allocation')
  const [receivedBy, setReceivedBy] = useState<ParentId>(initial?.receivedBy ?? 'me')
  const [childId, setChildId] = useState<string>(initial?.childId ?? 'all')
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
  const du = round2(
    receivedBy === 'me' ? amountNum * (1 - shareMe) : amountNum * shareMe,
  )
  const valid = label.trim().length > 0 && amountNum > 0

  /** Dépenses déjà rattachées : les délier si l'aide disparaît. */
  const liees = data.expenses.filter((e) => e.allowanceId === initial?.id)

  function submit() {
    if (!valid) return
    const allowance: Allowance = {
      id: initial?.id ?? newId(),
      date,
      label: label.trim(),
      amount: round2(amountNum),
      kind,
      receivedBy,
      shareMe,
      childId,
      notes: notes.trim() || undefined,
    }
    update((d) => ({
      ...d,
      allowances: isEdit
        ? d.allowances.map((a) => (a.id === allowance.id ? allowance : a))
        : [allowance, ...d.allowances],
    }))
    onClose()
  }

  function remove() {
    if (!initial) return
    const suite = liees.length
      ? ` Les ${liees.length} dépense(s) rattachées seront conservées, mais plus reliées à aucune aide.`
      : ''
    if (!confirm(`Supprimer « ${initial.label} » ?${suite}`)) return
    update((d) => ({
      ...d,
      allowances: d.allowances.filter((a) => a.id !== initial.id),
      expenses: d.expenses.map((e) =>
        e.allowanceId === initial.id ? { ...e, allowanceId: undefined } : e,
      ),
    }))
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Modifier la somme perçue' : 'Nouvelle somme perçue'}
      onClose={onClose}
    >
      <Field
        label="Quoi ?"
        hint="Allocation de rentrée, allocations familiales, bourse, remboursement de mutuelle…"
      >
        <input
          type="text"
          value={label}
          autoFocus
          placeholder="Ex. Allocation de rentrée scolaire"
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
        <Field label="Type">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Allowance['kind'])}
          >
            {Object.entries(ALLOWANCE_KINDS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
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

      <Field label="Qui l'a perçue ?">
        <Segment<ParentId>
          value={receivedBy}
          onChange={setReceivedBy}
          options={[
            { value: 'me', label: meName },
            { value: 'other', label: otherName },
          ]}
        />
      </Field>

      <Field label="Répartition" hint="Quelle part de cette somme me revient ?">
        <Segment value={sharePreset} onChange={setSharePreset} options={SHARE_PRESETS} />
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
          {du < 0.01 ? (
            <>Cette somme n’a aucun impact sur le solde.</>
          ) : receivedBy === 'me' ? (
            <>
              Vous détenez <strong>{euros(du)}</strong> qui reviennent à{' '}
              <strong>{otherName}</strong>. Les dépenses que vous rattacherez à cette
              somme viendront diminuer ce montant d’autant.
            </>
          ) : (
            <>
              <strong>{otherName}</strong> détient <strong>{euros(du)}</strong> qui vous
              reviennent.
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
