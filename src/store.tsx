import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppData, Child, ID } from './types'
import { loadData, saveData } from './lib/storage'

interface Store {
  data: AppData
  update: (fn: (draft: AppData) => AppData) => void
  replace: (next: AppData) => void
  childById: (id: ID | 'all') => Child | null
  childName: (id: ID | 'all') => string
  childColor: (id: ID | 'all') => string
  meName: string
  otherName: string
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const update = useCallback((fn: (draft: AppData) => AppData) => {
    setData((prev) => fn({ ...prev }))
  }, [])

  const replace = useCallback((next: AppData) => setData(next), [])

  const value = useMemo<Store>(() => {
    const childById = (id: ID | 'all') =>
      id === 'all' ? null : (data.children.find((c) => c.id === id) ?? null)
    return {
      data,
      update,
      replace,
      childById,
      childName: (id) => (id === 'all' ? 'Les deux' : (childById(id)?.name ?? 'Enfant')),
      childColor: (id) => (id === 'all' ? '#94a3b8' : (childById(id)?.color ?? '#94a3b8')),
      meName: data.parents.me.name,
      otherName: data.parents.other.name,
    }
  }, [data, update, replace])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}
