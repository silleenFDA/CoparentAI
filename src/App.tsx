import { useState } from 'react'
import Home from './views/Home'
import Planning from './views/Planning'
import Activities from './views/Activities'
import Finances from './views/Finances'
import Settings from './views/Settings'

const TABS = [
  { id: 'home', label: 'Accueil', icon: '🏠' },
  { id: 'planning', label: 'Emploi du temps', icon: '🗓️' },
  { id: 'activities', label: 'Activités', icon: '⚽' },
  { id: 'finances', label: 'Finances', icon: '💶' },
  { id: 'settings', label: 'Réglages', icon: '⚙️' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [tab, setTab] = useState<TabId>('home')

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          CoparentAI
          <small>Organisation & comptes de la famille</small>
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-btn${t.id === tab ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'home' && <Home goTo={setTab} />}
        {tab === 'planning' && <Planning />}
        {tab === 'activities' && <Activities />}
        {tab === 'finances' && <Finances />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export type { TabId }
