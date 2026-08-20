import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Note, SharedDocument } from '../types'
import { daysBetween, formatFull, formatLong, today } from '../lib/dates'
import { formatBytes, getFile } from '../lib/files'
import { Dot, Empty } from '../components/ui'
import DocumentForm, { DOCUMENT_CATEGORIES } from '../components/DocumentForm'
import NoteForm, { NOTE_CATEGORIES, NOTE_ICONS } from '../components/NoteForm'

const CATEGORY_ICONS: Record<SharedDocument['category'], string> = {
  juridique: '⚖️',
  sante: '🩺',
  scolaire: '🎓',
  assurance: '🛡️',
  autre: '📄',
}

/** Combien de jours avant l'échéance on commence à alerter. */
export const SEUIL_ALERTE_JOURS = 30

export function expiryState(doc: SharedDocument): 'ok' | 'bientot' | 'expire' | null {
  if (!doc.expiresAt) return null
  const restants = daysBetween(today(), doc.expiresAt)
  if (restants < 0) return 'expire'
  if (restants <= SEUIL_ALERTE_JOURS) return 'bientot'
  return 'ok'
}

export default function Dossier() {
  const { data, childName, childColor } = useStore()
  const [tab, setTab] = useState<'documents' | 'notes'>('documents')
  const [newDocument, setNewDocument] = useState(false)
  const [editDocument, setEditDocument] = useState<SharedDocument | null>(null)
  const [newNote, setNewNote] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [ouverture, setOuverture] = useState<string | null>(null)

  const documents = useMemo(
    () =>
      [...data.documents].sort((a, b) => {
        // Ce qui expire remonte : c'est ce qui demande une action.
        const rank = (d: SharedDocument) =>
          expiryState(d) === 'expire' ? 0 : expiryState(d) === 'bientot' ? 1 : 2
        return rank(a) - rank(b) || b.addedAt.localeCompare(a.addedAt)
      }),
    [data.documents],
  )

  const notes = useMemo(
    () => [...data.notes].sort((a, b) => b.date.localeCompare(a.date)),
    [data.notes],
  )

  /** Ouvre le fichier dans un nouvel onglet, depuis le stockage local. */
  async function ouvrir(doc: SharedDocument) {
    setOuverture(doc.id)
    try {
      const blob = await getFile(doc.id)
      if (!blob) {
        alert(
          "Le fichier joint est introuvable sur cet appareil. Restaurez une sauvegarde, ou ajoutez-le à nouveau.",
        )
        return
      }
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Le navigateur a besoin de l'adresse le temps d'ouvrir l'onglet.
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } finally {
      setOuverture(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dossier</h1>
          <div className="sub">
            Les documents de référence et les traces écrites de la coparentalité.
          </div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => (tab === 'documents' ? setNewDocument(true) : setNewNote(true))}
        >
          {tab === 'documents' ? '+ Document' : '+ Note'}
        </button>
      </div>

      <div className="segment" style={{ marginBottom: 14 }}>
        <button
          className={tab === 'documents' ? 'on' : ''}
          onClick={() => setTab('documents')}
        >
          Documents ({data.documents.length})
        </button>
        <button className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>
          Notes ({data.notes.length})
        </button>
      </div>

      {tab === 'documents' && (
        <>
          <div className="callout">
            ⚠️ Ces fichiers sont rangés sur cet appareil seulement, et un navigateur peut
            vider son stockage quand la place manque. <strong>Gardez toujours
            l'original ailleurs</strong> — c'est une copie sous la main, pas un
            coffre-fort.
          </div>

          {documents.length === 0 ? (
            <Empty>
              Aucun document. Ajoutez ici le jugement, les ordonnances renouvelables, les
              attestations d'assurance — tout ce que vous cherchez quand on vous le
              demande.
            </Empty>
          ) : (
            <div className="list">
              {documents.map((doc) => {
                const etat = expiryState(doc)
                return (
                  <div key={doc.id} className="item">
                    <span
                      className="stripe"
                      style={{ background: childColor(doc.childId) }}
                    />
                    <div className="body">
                      <div className="title">
                        {CATEGORY_ICONS[doc.category]} {doc.title}
                      </div>
                      <div className="meta">
                        {DOCUMENT_CATEGORIES[doc.category]} · {childName(doc.childId)} ·{' '}
                        {formatBytes(doc.size)}
                        {doc.notes ? ` · ${doc.notes}` : ''}
                      </div>
                      {etat && (
                        <div style={{ marginTop: 4 }}>
                          <span
                            className={`chip ${
                              etat === 'expire'
                                ? 'tag-red'
                                : etat === 'bientot'
                                  ? 'tag-amber'
                                  : 'tag-green'
                            }`}
                          >
                            {etat === 'expire'
                              ? `Expiré le ${formatFull(doc.expiresAt!)}`
                              : `Valable jusqu'au ${formatFull(doc.expiresAt!)}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-sm"
                      onClick={() => ouvrir(doc)}
                      disabled={ouverture === doc.id}
                    >
                      Ouvrir
                    </button>
                    <button
                      className="icon-btn"
                      title="Modifier"
                      onClick={() => setEditDocument(doc)}
                    >
                      ✎
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'notes' && (
        <>
          {notes.length === 0 ? (
            <Empty>
              Aucune note. Consignez ici les comptes rendus, les accords et les
              informations transmises : une trace datée vaut mieux qu'un souvenir.
            </Empty>
          ) : (
            <div className="list">
              {notes.map((note) => (
                <button
                  key={note.id}
                  className="item"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    alignItems: 'flex-start',
                  }}
                  onClick={() => setEditNote(note)}
                >
                  <Dot color={childColor(note.childId)} />
                  <div className="body">
                    <div className="title">
                      {NOTE_ICONS[note.category]} {note.title}
                    </div>
                    <div className="meta">
                      {formatLong(note.date)} · {NOTE_CATEGORIES[note.category]} ·{' '}
                      {childName(note.childId)}
                    </div>
                    {note.body && (
                      <div
                        className="muted"
                        style={{
                          marginTop: 6,
                          fontSize: '0.88rem',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {note.body}
                      </div>
                    )}
                  </div>
                  <span className="icon-btn">✎</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {newDocument && <DocumentForm onClose={() => setNewDocument(false)} />}
      {editDocument && (
        <DocumentForm initial={editDocument} onClose={() => setEditDocument(null)} />
      )}
      {newNote && <NoteForm onClose={() => setNewNote(false)} />}
      {editNote && <NoteForm initial={editNote} onClose={() => setEditNote(null)} />}
    </>
  )
}
