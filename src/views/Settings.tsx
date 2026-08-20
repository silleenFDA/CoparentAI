import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { ParentId } from '../types'
import { addDays, formatFull, weekdayOf, WEEKDAYS } from '../lib/dates'
import { custodyParent, otherParent } from '../lib/schedule'
import { emptyData, exportData, parseImported } from '../lib/storage'
import { demoData } from '../lib/demo'
import { estimateStorage, formatBytes, pruneFiles, type StorageEstimate } from '../lib/files'
import { today as todayFn } from '../lib/dates'
import { Field, Segment } from '../components/ui'

export default function Settings() {
  const { data, update, replace, meName, otherName } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [newCategory, setNewCategory] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const [storage, setStorage] = useState<StorageEstimate | null>(null)
  useEffect(() => {
    estimateStorage().then(setStorage)
  }, [data.documents.length])

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
    reader.onload = async () => {
      if (
        !confirm(
          'Remplacer toutes les données actuelles par le contenu de ce fichier ?',
        )
      )
        return
      try {
        const imported = await parseImported(String(reader.result))
        replace(imported)
        await pruneFiles(imported.documents.map((d) => d.id))
        const manquants =
          (JSON.parse(String(reader.result)).documents?.length ?? 0) -
          imported.documents.length
        flash(
          manquants > 0
            ? `✅ Sauvegarde restaurée. ${manquants} document(s) sans fichier joint ont été ignorés.`
            : '✅ Sauvegarde restaurée.',
        )
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

      {message && <div className="callout">{message}</div>}

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
        </div>

        <p className="faint" style={{ marginTop: -4, marginBottom: 12 }}>
          Modifiez le prénom ou la couleur ; la couleur sert de repère dans tout
          l'emploi du temps.
        </p>

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
        {storage && (
          <p className="faint">
            Espace utilisé sur cet appareil : {formatBytes(storage.used)}
            {storage.quota > 0 && ` sur environ ${formatBytes(storage.quota)}`}.{' '}
            {storage.persistent
              ? 'Le navigateur a accepté de conserver ces données en priorité.'
              : "Le navigateur peut vider ce stockage s'il manque de place."}
          </p>
        )}

        <div className="row">
          <button
            className="btn"
            onClick={async () => {
              const result = await exportData(data)
              if (result === 'ok') flash('✅ Sauvegarde enregistrée.')
              else if (result === 'refuse') flash('Enregistrement annulé.')
              else alert("La sauvegarde n'a pas pu être enregistrée.")
            }}
          >
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
              flash("✅ Données d'exemple chargées.")
            }}
          >
            Charger un exemple
          </button>
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (
                !confirm(
                  'Effacer TOUTES les données ? Cette action est définitive. Pensez à exporter une sauvegarde avant.',
                )
              )
                return
              replace(emptyData())
              await pruneFiles([])
              flash('✅ Données effacées.')
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
