import { useState } from 'react'
import { useStore } from '../store'
import type { ParentId, Transfer } from '../types'
import { today } from '../lib/dates'
import { newId } from '../lib/storage'
import { round2 } from '../lib/finance'
import { Field, Modal, Segment } from './ui'

export default function TransferForm({
  initial,
  onClose,
}: {
  initial?: Transfer
  onClose: () => void
}) {
  const { update, meName, otherName } = useStore()
  const isEdit = Boolean(initial)

  const [date, setDate] = useState(initial?.date ?? today())
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [direction, setDirection] = useState<'in' | 'out'>(
    initial ? (initial.to === 'me' ? 'in' : 'out') : 'in',
  )
  const [kind, setKind] = useState<Transfer['kind']>(initial?.kind ?? 'remboursement')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [countsInBalance, setCounts] = useState(initial?.countsInBalance ?? true)

  const amountNum = Number(amount.replace(',', '.')) || 0
  const valid = amountNum > 0

  function submit() {
    if (!valid) return
    const from: ParentId = direction === 'in' ? 'other' : 'me'
    const to: ParentId = direction === 'in' ? 'me' : 'other'
    const transfer: Transfer = {
      id: initial?.id ?? newId(),
      date,
      amount: round2(amountNum),
      from,
      to,
      kind,
      label: label.trim() || undefined,
      countsInBalance,
    }
    update((d) => ({
      ...d,
      transfers: isEdit
        ? d.transfers.map((t) => (t.id === transfer.id ? transfer : t))
        : [transfer, ...d.transfers],
    }))
    onClose()
  }

  function remove() {
    if (!initial) return
    if (!confirm('Supprimer ce versement ?')) return
    update((d) => ({ ...d, transfers: d.transfers.filter((t) => t.id !== initial.id) }))
    onClose()
  }

  return (
    <Modal title={isEdit ? 'Modifier le versement' : 'Nouveau versement'} onClose={onClose}>
      <Field label="Sens du versement">
        <Segment<'in' | 'out'>
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'in', label: `${otherName} → ${meName}` },
            { value: 'out', label: `${meName} → ${otherName}` },
          ]}
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
            autoFocus
            placeholder="0,00"
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Type">
        <Segment<Transfer['kind']>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'remboursement', label: 'Remboursement' },
            { value: 'pension', label: 'Pension' },
            { value: 'autre', label: 'Autre' },
          ]}
        />
      </Field>

      <Field label="Libellé (facultatif)">
        <input
          type="text"
          value={label}
          placeholder="Ex. Virement du 5, régularisation trimestre…"
          onChange={(e) => setLabel(e.target.value)}
        />
      </Field>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={countsInBalance}
          onChange={(e) => setCounts(e.target.checked)}
        />
        Déduire ce versement du solde à rembourser
      </label>
      <p className="faint" style={{ marginTop: 6 }}>
        Décochez si ce versement est indépendant du partage des dépenses (par exemple une
        pension alimentaire que vous suivez à part).
      </p>

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
