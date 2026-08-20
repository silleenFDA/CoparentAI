import { useRef, useState } from 'react'
import { useStore } from '../store'
import type { ParentId } from '../types'
import { addDays, formatFull, weekdayOf, WEEKDAYS } from '../lib/dates'
import { custodyParent, otherParent } from '../lib/schedule'
import {
  emptyData,
  exportData,
  newId,
  parseImported,
} from '../lib/storage'
import { demoData } from '../lib/demo'
import { today as todayFn } from '../lib/dates'
import { Field, Segment } from '../components/ui'

const CHILD_COLORS = ['#e11d48', '#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#ec4899']

export default function Settings() {
  const { data, update, replace, meName, otherName } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [newCategory, setNewCategory] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const currentCustodian = custodyParent(
    todayFn(),
    data.custody,
    data.custodyOverrides,
  )

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage(null), 4000)
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseImported(String(reader.result))
        if (
          !confirm(
            'Remplacer toutes les données actuelles par le contenu de ce fichier ?',
          )
        )
          return
        replace(imported)
        flash('Sauvegarde restaurée.')
      } catch {
        alert("Ce fichier n'est pas une sauvegarde CoparentAI valide.")
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Réglages</h1>
          <div className="sub">Personnalisez l'application et sauvegardez vos données.</div>
        </div>
      </div>

      {message && <div className="callout">✅ {message}</div>}

      <div className="card">
        <div className="card-title">
          <h2>Les parents</h2>
        </div>
        <div className="field-row">
          <Field label="Vous">
            <input
              type="text"
              value={data.parents.me.name}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  parents: {
                    ...d.parents,
                    me: { ...d.parents.me, name: e.target.value },
                  },
                }))
              }
            />
          </Field>
          <Field label="L'autre parent">
            <input
              type="text"
              value={data.parents.other.name}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  parents: {
                    ...d.parents,
                    other: { ...d.parents.other, name: e.target.value },
                  },
                }))
              }
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Les enfants</h2>
          <button
            className="btn btn-sm"
            onClick={() =>
              update((d) => ({
                ...d,
                children: [
                  ...d.children,
                  {
                    id: newId(),
                    name: `Enfant ${d.children.length + 1}`,
                    color: CHILD_COLORS[d.children.length % CHILD_COLORS.length],
                  },
                ],
              }))
            }
          >
            + Ajouter
          </button>
        </div>

        {data.children.map((c) => (
          <div key={c.id} className="item" style={{ marginBottom: 8 }}>
            <input
              type="color"
              value={c.color}
              style={{ width: 34, height: 34, padding: 0, border: 'none', background: 'none' }}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  children: d.children.map((x) =>
                    x.id === c.id ? { ...x, color: e.target.value } : x,
                  ),
                }))
              }
            />
            <div className="body">
              <input
                type="text"
                value={c.name}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    children: d.children.map((x) =>
                      x.id === c.id ? { ...x, name: e.target.value } : x,
                    ),
                  }))
                }
              />
            </div>
            <button
              className="icon-btn"
              title="Supprimer"
              onClick={() => {
                if (data.children.length <= 1) {
                  alert('Il faut garder au moins un enfant.')
                  return
                }
                if (
                  !confirm(
                    `Supprimer ${c.name} ? Ses activités seront également supprimées.`,
                  )
                )
                  return
                update((d) => ({
                  ...d,
                  children: d.children.filter((x) => x.id !== c.id),
                  activities: d.activities.filter((a) => a.childId !== c.id),
                }))
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Calendrier de garde</h2>
        </div>
        <Field label="Mode">
          <Segment<'alternate-weekly' | 'off'>
            value={data.custody.mode}
            onChange={(mode) =>
              update((d) => ({ ...d, custody: { ...d.custody, mode } }))
            }
            options={[
              { value: 'alternate-weekly', label: 'Une semaine sur deux' },
              { value: 'off', label: 'Ne pas suivre' },
            ]}
          />
        </Field>

        {data.custody.mode === 'alternate-weekly' && (
          <>
            <div className="field-row">
              <Field
                label="L'alternance démarre le"
                hint={`Le ${WEEKDAYS[weekdayOf(data.custody.anchorDate)].toLowerCase()} devient le jour de bascule.`}
              >
                <input
                  type="date"
                  value={data.custody.anchorDate}
                  onChange={(e) =>
                    e.target.value &&
                    update((d) => ({
                      ...d,
                      custody: { ...d.custody, anchorDate: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field
                label="Jusqu'au"
                hint="Fin de l'accord en cours. Un rappel s'affiche ensuite."
              >
                <input
                  type="date"
                  value={data.custody.endDate ?? ''}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      custody: { ...d.custody, endDate: e.target.value || undefined },
                    }))
                  }
                />
              </Field>
            </div>

            <Field
              label="Cette première semaine, les enfants sont chez"
              hint="Si tout le calendrier est décalé d'une semaine, changez ce réglage."
            >
              <Segment<ParentId>
                value={data.custody.anchorParent}
                onChange={(anchorParent) =>
                  update((d) => ({ ...d, custody: { ...d.custody, anchorParent } }))
                }
                options={[
                  { value: 'me', label: meName },
                  { value: 'other', label: otherName },
                ]}
              />
            </Field>

            <div className="callout">
              Semaine du <strong>{formatFull(data.custody.anchorDate)}</strong> chez{' '}
              <strong>
                {data.custody.anchorParent === 'me' ? meName : otherName}
              </strong>
              , puis semaine du{' '}
              <strong>{formatFull(addDays(data.custody.anchorDate, 7))}</strong> chez{' '}
              <strong>
                {otherParent(data.custody.anchorParent) === 'me' ? meName : otherName}
              </strong>
              , et ainsi de suite
              {data.custody.endDate
                ? ` jusqu'au ${formatFull(data.custody.endDate)}`
                : ''}
              . Aujourd'hui, les enfants sont chez{' '}
              <strong>
                {currentCustodian === 'me'
                  ? meName
                  : currentCustodian === 'other'
                    ? otherName
                    : '—'}
              </strong>
              .
            </div>

            {data.custodyOverrides.length > 0 && (
              <div className="row" style={{ marginTop: 10 }}>
                <span className="faint">
                  {data.custodyOverrides.length} exception
                  {data.custodyOverrides.length > 1 ? 's' : ''} enregistrée
                  {data.custodyOverrides.length > 1 ? 's' : ''}.
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => update((d) => ({ ...d, custodyOverrides: [] }))}
                >
                  Tout effacer
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Catégories de dépenses</h2>
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          {data.categories.map((c) => (
            <span key={c} className="chip">
              {c}
              <button
                className="icon-btn"
                style={{ padding: '0 2px' }}
                onClick={() =>
                  update((d) => ({
                    ...d,
                    categories: d.categories.filter((x) => x !== c),
                  }))
                }
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="row">
          <input
            type="text"
            value={newCategory}
            placeholder="Nouvelle catégorie"
            style={{ flex: 1, minWidth: 180 }}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button
            className="btn btn-sm"
            onClick={() => {
              const name = newCategory.trim()
              if (!name || data.categories.includes(name)) return
              update((d) => ({ ...d, categories: [...d.categories, name] }))
              setNewCategory('')
            }}
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Sauvegarde</h2>
        </div>
        <p className="muted">
          Vos données sont enregistrées <strong>uniquement sur cet appareil</strong>, dans
          ce navigateur. Personne d'autre n'y a accès. Exportez régulièrement un fichier de
          sauvegarde : c'est aussi comme cela que vous transférez vos données du téléphone
          vers l'ordinateur.
        </p>
        <div className="row">
          <button className="btn" onClick={() => exportData(data)}>
            ⬇ Exporter une sauvegarde
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⬆ Restaurer une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="card danger-zone">
        <div className="card-title">
          <h2>Repartir de zéro</h2>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              if (
                !confirm(
                  "Charger le jeu d'exemple ? Vos données actuelles seront remplacées.",
                )
              )
                return
              replace(demoData())
              flash("Données d'exemple chargées.")
            }}
          >
            Charger un exemple
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (
                !confirm(
                  'Effacer TOUTES les données ? Cette action est définitive. Pensez à exporter une sauvegarde avant.',
                )
              )
                return
              replace(emptyData())
              flash('Données effacées.')
            }}
          >
            Tout effacer
          </button>
        </div>
      </div>

      <p className="faint center" style={{ marginTop: 20 }}>
        CoparentAI · version 1.1
      </p>
    </>
  )
}
