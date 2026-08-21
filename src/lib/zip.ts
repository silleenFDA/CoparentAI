// ---------------------------------------------------------------------------
// Lecture d'archives ZIP, sans bibliothèque.
//
// Un fichier .xlsx est une archive ZIP contenant du XML. Les navigateurs
// récents savent décompresser nativement (DecompressionStream) : inutile
// d'embarquer une bibliothèque, et rien d'extérieur à maintenir.
// ---------------------------------------------------------------------------

const SIGNATURE_FIN_CENTRAL = 0x06054b50
const SIGNATURE_ENTREE_CENTRALE = 0x02014b50

/** Le navigateur sait-il décompresser ? Safari ne le fait qu'à partir de 16.4. */
export function zipSupporte(): boolean {
  return typeof DecompressionStream !== 'undefined'
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const flux = new Blob([data as BlobPart]).stream().pipeThrough(
    new DecompressionStream('deflate-raw'),
  )
  return new Uint8Array(await new Response(flux).arrayBuffer())
}

/** Repère la fin du catalogue, en fin de fichier, commentaire éventuel compris. */
function trouverFinCentral(vue: DataView): number {
  const debutMin = Math.max(0, vue.byteLength - 66_000)
  for (let i = vue.byteLength - 22; i >= debutMin; i--) {
    if (vue.getUint32(i, true) === SIGNATURE_FIN_CENTRAL) return i
  }
  throw new Error("Ce fichier n'est pas une archive lisible.")
}

/** Extrait toutes les entrées de l'archive, indexées par nom. */
export async function lireZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const octets = new Uint8Array(buffer)
  const vue = new DataView(buffer)
  const fin = trouverFinCentral(vue)
  const nombre = vue.getUint16(fin + 10, true)
  let position = vue.getUint32(fin + 16, true)

  const entrees = new Map<string, Uint8Array>()

  for (let i = 0; i < nombre; i++) {
    if (vue.getUint32(position, true) !== SIGNATURE_ENTREE_CENTRALE) break
    const methode = vue.getUint16(position + 10, true)
    const tailleCompressee = vue.getUint32(position + 20, true)
    const tailleNom = vue.getUint16(position + 28, true)
    const tailleExtra = vue.getUint16(position + 30, true)
    const tailleCommentaire = vue.getUint16(position + 32, true)
    const decalageLocal = vue.getUint32(position + 42, true)
    const nom = new TextDecoder().decode(
      octets.subarray(position + 46, position + 46 + tailleNom),
    )

    // L'en-tête local redonne les tailles de ses propres champs variables.
    const nomLocal = vue.getUint16(decalageLocal + 26, true)
    const extraLocal = vue.getUint16(decalageLocal + 28, true)
    const debutDonnees = decalageLocal + 30 + nomLocal + extraLocal
    const brut = octets.subarray(debutDonnees, debutDonnees + tailleCompressee)

    entrees.set(nom, methode === 0 ? brut : await inflate(brut))
    position += 46 + tailleNom + tailleExtra + tailleCommentaire
  }

  return entrees
}

export function texteDe(entree: Uint8Array | undefined): string {
  return entree ? new TextDecoder('utf-8').decode(entree) : ''
}
