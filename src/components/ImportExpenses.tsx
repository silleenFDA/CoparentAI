import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import type { ParentId } from '../types'
import { formatShort } from '../lib/dates'
import { euros } from '../lib/finance'
import { decoder, lireCsv } from '../lib/csv'
import { lireClasseur, type Feuille } from '../lib/xlsx'
import { CHAMPS, construire, deviner, type Champ } from '../lib/tableImport'
import { Field, Modal, Segment } from './ui'

export default function ImportExpenses({ onClose }: { onClose: () => void }) {
  const { data, update, meName, otherName } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [feuilles, setFeuilles] = useState<Feuille[] | null>(null)
  const [feuilleIndex, setFeuilleIndex] = useState(0)
  const [nomFichier, setNomFichier] = useState('')
  const [mapping, setMapping] = useState<Partial<Record<Champ, number>>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [garderDoublons, setGarderDoublons] = useState(false)

  // Valeurs retenues quand la colonne est absente du fichier.
  const [paidBy, setPaidBy] = useState<ParentId>('me')
  const [shareMe, setShareMe] = useState('0.5')
  const [category, setCategory] = useState(data.categories[0] ?? 'Autre')
  const [childId, setChildId] = useState('all')

  const feuille = feuilles?.[feuilleIndex]
  const entetes = feuille?.lignes[0] ?? []
  const corps = useMemo(() => feuille?.lignes.slice(1) ?? [], [feuille])

  async function ouvrir(file: File) {
    setChargement(true)
    setErreur(null)
    try {
      const buffer = await file.arrayBuffer()
      let lues: Feuille[]

      if (/\.(xlsx|xlsm)$/i.test(file.name)) {
        lues = await lireClasseur(buffer)
      } else if (/\.xls$/i.test(file.name)) {
        throw new Error(
          "L'ancien format .xls n'est pas lisible. Depuis Excel, faites « Enregistrer sous » et choisissez .xlsx ou CSV.",
        )
      } else {
        lues = [{ nom: file.name, lignes: lireCsv(decoder(buffer)) }]
      }

      if (lues.length === 0 || lues[0].lignes.length < 2) {
        throw new Error(
          'Ce fichier ne contient pas de tableau exploitable : il faut une ligne d’en-têtes et au moins une ligne de dépense.',
        )
      }

      setFeuilles(lues)
      setFeuilleIndex(0)
      setNomFichier(file.name)
      setMapping(deviner(lues[0].lignes[0]))
    } catch (err) {
      setFeuilles(null)
      setErreur(err instanceof Error ? err.message : 'Ce fichier n’a pas pu être lu.')
    } finally {
      setChargement(false)
    }
  }

  function choisirFeuille(index: number) {
    setFeuilleIndex(index)
    setMapping(deviner(feuilles?.[index].lignes[0] ?? []))
  }

  const resultat = useMemo(() => {
    if (!feuille) return null
    return construire(corps, mapping, data, {
      paidBy,
      shareMe: Number(shareMe),
      category,
      childId,
    })
  }, [feuille, corps, mapping, data, paidBy, shareMe, category, childId])

  const manquants = CHAMPS.filter((c) => c.requis && mapping[c.id] === undefined)
  /** Les doublons sont écartés sauf demande explicite. */
  const aImporter =
    resultat?.lignes.filter(
      (l) => l.expense && (garderDoublons || !l.doublon),
    ) ?? []
  const pretAImporter =
    resultat !== null && manquants.length === 0 && aImporter.length > 0

  function importer() {
    if (!resultat || !pretAImporter) return
    const nouvelles = aImporter.map((l) => l.expense!)
    update((d) => ({
      ...d,
      categories: [...d.categories, ...resultat.categoriesNouvelles.filter((c) => !d.categories.includes(c))],
      expenses: [...nouvelles, ...d.expenses],
    }))
    onClose()
  }

  return (
    <Modal title="Importer des dépenses" onClose={onClose}>
      {!feuilles && (
        <>
          <p className="muted">
            Reprenez un tableau Excel ou un CSV. Le fichier doit avoir une{' '}
            <strong>ligne d'en-têtes</strong> et une dépense par ligne. Rien n'est
            enregistré avant votre validation.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => fileRef.current?.click()}
            disabled={chargement}
          >
            {chargement ? 'Lecture…' : 'Choisir un fichier .xlsx ou .csv'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm,.xls,.csv,.txt,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) ouvrir(f)
              e.target.value = ''
            }}
          />
          {erreur && <div className="callout" style={{ marginTop: 14 }}>⚠️ {erreur}</div>}
        </>
      )}

      {feuilles && resultat && (
        <>
          <div className="callout">
            <strong>{corps.length} lignes</strong> lues dans {nomFichier}
            {feuilles.length > 1 && ` (onglet « ${feuille!.nom} »)`}.
          </div>

          {feuilles.length > 1 && (
            <Field label="Onglet à importer">
              <select
                value={feuilleIndex}
                onChange={(e) => choisirFeuille(Number(e.target.value))}
              >
                {feuilles.map((f, i) => (
                  <option key={f.nom + i} value={i}>
                    {f.nom} ({Math.max(0, f.lignes.length - 1)} lignes)
                  </option>
                ))}
              </select>
            </Field>
          )}

          <h3 style={{ margin: '16px 0 8px' }}>Correspondance des colonnes</h3>
          <p className="faint" style={{ marginTop: 0 }}>
            J'ai reconnu ce que j'ai pu d'après vos en-têtes. Corrigez si besoin.
          </p>

          {CHAMPS.map((champ) => (
            <Field
              key={champ.id}
              label={`${champ.nom}${champ.requis ? ' *' : ''}`}
            >
              <select
                value={mapping[champ.id] ?? ''}
                onChange={(e) =>
                  setMapping((m) => ({
                    ...m,
                    [champ.id]:
                      e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
              >
                <option value="">
                  {champ.requis ? '— à choisir —' : '— absente du fichier —'}
                </option>
                {entetes.map((entete, i) => (
                  <option key={i} value={i}>
                    {entete || `Colonne ${i + 1}`}
                  </option>
                ))}
              </select>
            </Field>
          ))}

          {(mapping.paidBy === undefined ||
            mapping.shareMe === undefined ||
            mapping.category === undefined ||
            mapping.child === undefined) && (
            <>
              <h3 style={{ margin: '16px 0 8px' }}>Valeurs par défaut</h3>
              <p className="faint" style={{ marginTop: 0 }}>
                Appliquées aux colonnes absentes du fichier.
              </p>

              {mapping.paidBy === undefined && (
                <Field label="Payé par">
                  <Segment<ParentId>
                    value={paidBy}
                    onChange={setPaidBy}
                    options={[
                      { value: 'me', label: meName },
                      { value: 'other', label: otherName },
                    ]}
                  />
                </Field>
              )}

              {mapping.shareMe === undefined && (
                <Field label="Répartition">
                  <Segment
                    value={shareMe}
                    onChange={setShareMe}
                    options={[
                      { value: '0.5', label: '50 / 50' },
                      { value: '1', label: '100 % moi' },
                      { value: '0', label: `100 % l'autre` },
                    ]}
                  />
                </Field>
              )}

              <div className="field-row">
                {mapping.category === undefined && (
                  <Field label="Catégorie">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {data.categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {mapping.child === undefined && (
                  <Field label="Pour qui">
                    <select value={childId} onChange={(e) => setChildId(e.target.value)}>
                      <option value="all">Les deux / la famille</option>
                      {data.children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            </>
          )}

          {manquants.length > 0 && (
            <div className="callout">
              ⚠️ Choisissez la colonne pour :{' '}
              <strong>{manquants.map((c) => c.nom).join(', ')}</strong>.
            </div>
          )}

          {manquants.length === 0 && (
            <>
              <h3 style={{ margin: '16px 0 8px' }}>
                Aperçu — {aImporter.length} dépense
                {aImporter.length > 1 ? 's' : ''} à importer
                {resultat.refusees > 0 && `, ${resultat.refusees} refusée${resultat.refusees > 1 ? 's' : ''}`}
              </h3>

              {resultat.doublons > 0 && (
                <div className="callout">
                  ⚠️ {resultat.doublons} ligne{resultat.doublons > 1 ? 's' : ''}{' '}
                  correspond{resultat.doublons > 1 ? 'ent' : ''} à une dépense déjà
                  enregistrée (même date, même libellé, même montant)
                  {garderDoublons
                    ? ' et ser' + (resultat.doublons > 1 ? 'ont' : 'a') + ' réimportée' + (resultat.doublons > 1 ? 's' : '') + '.'
                    : ' et ' + (resultat.doublons > 1 ? 'sont écartées' : 'est écartée') + '.'}
                  <label className="checkbox" style={{ marginTop: 8 }}>
                    <input
                      type="checkbox"
                      checked={garderDoublons}
                      onChange={(e) => setGarderDoublons(e.target.checked)}
                    />
                    Les importer quand même
                  </label>
                </div>
              )}

              {resultat.categoriesNouvelles.length > 0 && (
                <p className="faint" style={{ marginTop: 0 }}>
                  Nouvelles catégories créées :{' '}
                  {resultat.categoriesNouvelles.join(', ')}.
                </p>
              )}

              <div className="list">
                {resultat.lignes
                  .filter((l) => l.erreur)
                  .slice(0, 6)
                  .map((l) => (
                    <div key={`e${l.numero}`} className="item">
                      <span className="chip tag-red nowrap">L{l.numero}</span>
                      <div className="body">
                        <div className="meta">{l.erreur}</div>
                      </div>
                    </div>
                  ))}

                {aImporter
                  .slice(0, 8)
                  .map((l) => (
                    <div key={l.expense!.id} className="item">
                      <div className="body">
                        <div className="title">{l.expense!.label}</div>
                        <div className="meta">
                          {formatShort(l.expense!.date)} · {l.expense!.category} · payé par{' '}
                          {l.expense!.paidBy === 'me' ? meName : otherName} ·{' '}
                          {Math.round(l.expense!.shareMe * 100)} % à ma charge
                        </div>
                      </div>
                      <div className="amount">{euros(l.expense!.amount)}</div>
                    </div>
                  ))}
              </div>

              {aImporter.length > 8 && (
                <p className="faint">
                  … et {aImporter.length - 8} autre
                  {aImporter.length - 8 > 1 ? 's' : ''}.
                </p>
              )}
              {resultat.refusees > 6 && (
                <p className="faint">
                  … et {resultat.refusees - 6} autre ligne
                  {resultat.refusees - 6 > 1 ? 's' : ''} refusée
                  {resultat.refusees - 6 > 1 ? 's' : ''}.
                </p>
              )}
            </>
          )}

          <div className="modal-actions">
            <button className="btn" onClick={() => setFeuilles(null)}>
              Autre fichier
            </button>
            <button
              className="btn btn-primary"
              onClick={importer}
              disabled={!pretAImporter}
            >
              Importer {aImporter.length}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
