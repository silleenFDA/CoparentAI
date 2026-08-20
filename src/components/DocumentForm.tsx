import { useRef, useState } from 'react'
import { useStore } from '../store'
import type { SharedDocument } from '../types'
import { today } from '../lib/dates'
import { newId } from '../lib/storage'
import { deleteFile, formatBytes, putFile, requestPersistence } from '../lib/files'
import { Field, Modal } from './ui'

export const DOCUMENT_CATEGORIES: Record<SharedDocument['category'], string> = {
  juridique: 'Juridique',
  sante: 'Santé',
  scolaire: 'Scolaire',
  assurance: 'Assurance',
  autre: 'Autre',
}

/** Au-delà, la sauvegarde devient lourde et lente à relire. */
const TAILLE_MAX = 15 * 1024 * 1024

export default function DocumentForm({
  initial,
  onClose,
}: {
  initial?: SharedDocument
  onClose: () => void
}) {
  const { data, update } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const isEdit = Boolean(initial)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<SharedDocument['category']>(
    initial?.category ?? 'juridique',
  )
  const [childId, setChildId] = useState<string>(initial?.childId ?? 'all')
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function chooseFile(f: File) {
    if (f.size > TAILLE_MAX) {
      setError(
        `Ce fichier fait ${formatBytes(f.size)}. La limite est de ${formatBytes(TAILLE_MAX)} pour que les sauvegardes restent utilisables.`,
      )
      return
    }
    setError(null)
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const valid = title.trim().length > 0 && (isEdit || file !== null)

  async function submit() {
    if (!valid || saving) return
    setSaving(true)
    try {
      const id = initial?.id ?? newId()
      if (file) {
        await requestPersistence()
        await putFile(id, file)
      }
      const doc: SharedDocument = {
        id,
        title: title.trim(),
        category,
        childId,
        fileName: file?.name ?? initial!.fileName,
        mimeType: file?.type || initial?.mimeType || 'application/octet-stream',
        size: file?.size ?? initial!.size,
        addedAt: initial?.addedAt ?? today(),
        expiresAt: expiresAt || undefined,
        notes: notes.trim() || undefined,
      }
      update((d) => ({
        ...d,
        documents: isEdit
          ? d.documents.map((x) => (x.id === doc.id ? doc : x))
          : [doc, ...d.documents],
      }))
      onClose()
    } catch (err) {
      console.error(err)
      setError(
        "L'enregistrement a échoué. Le stockage de l'appareil est peut-être plein.",
      )
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    if (!confirm(`Supprimer « ${initial.title} » et le fichier joint ?`)) return
    await deleteFile(initial.id)
    update((d) => ({
      ...d,
      documents: d.documents.filter((x) => x.id !== initial.id),
    }))
    onClose()
  }

  return (
    <Modal title={isEdit ? 'Modifier le document' : 'Ajouter un document'} onClose={onClose}>
      {!isEdit && (
        <Field label="Fichier" hint="PDF ou photo, jusqu'à 15 Mo.">
          <button className="btn btn-block" onClick={() => fileRef.current?.click()}>
            {file ? `${file.name} — ${formatBytes(file.size)}` : 'Choisir un fichier'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) chooseFile(f)
              e.target.value = ''
            }}
          />
        </Field>
      )}

      {isEdit && (
        <p className="faint">
          Fichier joint : {initial!.fileName} — {formatBytes(initial!.size)}. Pour le
          remplacer, supprimez ce document et ajoutez-le à nouveau.
        </p>
      )}

      <Field label="Titre">
        <input
          type="text"
          value={title}
          placeholder="Ex. Jugement de divorce, ordonnance orthodontie…"
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <div className="field-row">
        <Field label="Catégorie">
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as SharedDocument['category'])
            }
          >
            {Object.entries(DOCUMENT_CATEGORIES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
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
      </div>

      <Field
        label="Valable jusqu'au (facultatif)"
        hint="Pour une ordonnance renouvelable ou une attestation : un rappel s'affichera à l'approche de l'échéance."
      >
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </Field>

      <Field label="Note (facultatif)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error && <div className="callout">⚠️ {error}</div>}

      <div className="modal-actions">
        {isEdit && (
          <button className="btn btn-danger" onClick={remove}>
            Supprimer
          </button>
        )}
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </Modal>
  )
}
