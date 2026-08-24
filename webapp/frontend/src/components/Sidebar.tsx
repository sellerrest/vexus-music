import { Home, Radio, Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  /** Что подсвечено сверху: поиск, обзор или профиль. */
  active: 'browse' | 'search' | 'flow'
  onOpenBrowse: () => void
  onOpenFlow: () => void
  onToggleSearch: () => void
  /**
   * Что ищем прямо сейчас.
   *
   * Кнопка одна, а искать она может разное: в разделе радиовещания —
   * станции, везде остальном — музыку. Подпись обязана это показывать,
   * иначе человек жмёт «Найти музыку» и получает список радиостанций.
   */
  searchLabel: string
  /** Медиатека — занимает всю оставшуюся высоту панели. */
  children: ReactNode
}

/**
 * Боковая панель для широких экранов.
 *
 * Сверху кнопки строками (иконка + подпись), ниже — медиатека, которая
 * на компьютере видна всегда, а не прячется во вкладку.
 *
 * Профиля здесь нет: настройки открываются нажатием на аватарку рядом с
 * приветствием. Две двери в одну комнату — лишняя дверь. Сама строка поиска
 * живёт НЕ здесь, а в Dashboard: она должна тянуться до правого края экрана,
 * то есть выходить за пределы панели.
 */
function Sidebar({
  active,
  onOpenBrowse,
  onOpenFlow,
  onToggleSearch,
  searchLabel,
  children,
}: Props) {
  const items = [
    { key: 'search', label: searchLabel, icon: Search, onClick: onToggleSearch },
    { key: 'browse', label: 'Обзор', icon: Home, onClick: onOpenBrowse },
    { key: 'flow', label: 'Поток', icon: Radio, onClick: onOpenFlow },
  ] as const

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-item ${active === item.key ? 'active' : ''}`}
            onClick={item.onClick}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-library">{children}</div>
    </aside>
  )
}

export default Sidebar
