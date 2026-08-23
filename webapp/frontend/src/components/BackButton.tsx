import { ChevronLeft } from 'lucide-react'

interface Props {
  onClick: () => void
}

/**
 * Кнопка «назад» для браузера.
 *
 * Внутри Telegram её рисует сам мессенджер в своей шапке (см.
 * useTelegramBack), а снаружи возвращаться было нечем: полноэкранный плеер и
 * открытые подборки не закрывались вообще.
 */
function BackButton({ onClick }: Props) {
  return (
    <button type="button" className="app-back" onClick={onClick} aria-label="Назад">
      <ChevronLeft size={22} />
    </button>
  )
}

export default BackButton
