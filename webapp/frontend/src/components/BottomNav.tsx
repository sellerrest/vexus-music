import { Compass, Library, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TabKey = 'browse' | 'library' | 'profile'

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'browse', label: 'Обзор', icon: Compass },
  { key: 'library', label: 'Медиатека', icon: Library },
  { key: 'profile', label: 'Профиль', icon: User },
]

function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`bottom-nav-item ${active === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          <Icon size={23} strokeWidth={active === key ? 2.4 : 1.8} />
          <span className="bottom-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
