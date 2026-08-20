// ---------------------------------------------------------------------------
// Stockage des fichiers joints (PDF, images).
//
// Le reste des données tient dans localStorage, qui plafonne autour de 5 Mo :
// bien trop peu pour des PDF. On les range donc dans IndexedDB, prévu pour le
// binaire et beaucoup plus vaste. Seules les fiches descriptives restent avec
// le reste des données, ce qui garde l'application rapide au démarrage.
// ---------------------------------------------------------------------------

const DB_NAME = 'coparentai-fichiers'
const DB_VERSION = 1
const STORE = 'fichiers'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = action(tx.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
      }),
  )
}

export function putFile(id: string, blob: Blob): Promise<unknown> {
  return run('readwrite', (s) => s.put(blob, id))
}

export function getFile(id: string): Promise<Blob | undefined> {
  return run('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>)
}

export function deleteFile(id: string): Promise<unknown> {
  return run('readwrite', (s) => s.delete(id))
}

export function listFileIds(): Promise<string[]> {
  return run('readonly', (s) => s.getAllKeys() as IDBRequest<string[]>).then(
    (keys) => keys.map(String),
  )
}

/** Supprime les fichiers dont plus aucune fiche ne parle. */
export async function pruneFiles(knownIds: string[]): Promise<number> {
  const ids = await listFileIds()
  const orphans = ids.filter((id) => !knownIds.includes(id))
  await Promise.all(orphans.map(deleteFile))
  return orphans.length
}

/**
 * Demande au navigateur de ne pas vider ce stockage quand la place manque.
 * L'accord n'est jamais garanti : il ne dispense pas de garder l'original.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    /* le navigateur ne sait pas faire : on continue sans */
  }
  return false
}

export interface StorageEstimate {
  used: number
  quota: number
  persistent: boolean
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (!est) return null
    const persistent = (await navigator.storage?.persisted?.()) ?? false
    return { used: est.usage ?? 0, quota: est.quota ?? 0, persistent }
  } catch {
    return null
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

// --- Conversion pour les sauvegardes ---------------------------------------

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      // "data:application/pdf;base64,XXXX" -> on ne garde que la charge utile.
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}
