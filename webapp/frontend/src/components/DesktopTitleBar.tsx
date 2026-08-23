import { useEffect } from 'react'
import MarqueeText from './MarqueeText'
import { usePlayer } from '../context/PlayerContext'
import { onDesktopCommand, reportPlayback } from '../desktop'

/**
 * Своя полоса заголовка в приложении для Windows.
 *
 * Системная подпись с иконкой убрана (см. titleBarStyle в main.js), а кнопки
 * «свернуть / развернуть / закрыть» остались родными — их рисует сама
 * Windows поверх страницы справа. Здесь только то, что левее них.
 *
 * Слева название приложения, по центру окна — название трека, справа пустая
 * распорка. Распорка не для красоты: она уравновешивает левую часть, иначе
 * текст встаёт по центру свободной области, а не окна, и заметно уезжает
 * влево на ширину системных кнопок (см. titlebar-grid в стилях).
 */
function TitleBarView({ title, isPlaying }: { title: string; isPlaying: boolean }) {
  return (
    <div className="titlebar">
      <div className="titlebar-grid">
        <div className="titlebar-brand">Vexus Music</div>
        <div className="titlebar-now">
          {title && <MarqueeText text={title} active={isPlaying} speed={28} />}
        </div>
        {/* Распорка справа уравновешивает название приложения слева: без неё
            текст встал бы по центру свободной области, а не окна. */}
        <div className="titlebar-spacer" />
      </div>
    </div>
  )
}

/**
 * Полоса без плеера — для экрана входа и загрузки.
 *
 * Нужна не ради надписи: без неё в окне не остаётся области, за которую его
 * можно таскать, и до входа приложение нельзя было бы даже подвинуть.
 */
export function StaticTitleBar() {
  return <TitleBarView title="" isPlaying={false} />
}

/**
 * Полоса с названием играющего трека.
 *
 * Отсюда же поддерживаются кнопки управления в предпросмотре окна на панели
 * задач: состояние уходит в систему, нажатия приходят обратно. Место выбрано
 * не случайно — компонент и так живёт внутри плеера ровно столько же, сколько
 * само приложение.
 */
function DesktopTitleBar() {
  const { currentTrack, isPlaying, toggle, next, prev } = usePlayer()

  useEffect(() => {
    reportPlayback({ isPlaying, hasTrack: currentTrack !== null })
  }, [isPlaying, currentTrack])

  useEffect(() => {
    // Обработчики берутся из плеера и меняются вместе с ним, поэтому
    // подписка пересоздаётся — отписка обязательна, иначе одно нажатие на
    // панели задач срабатывало бы столько раз, сколько было перерисовок.
    return onDesktopCommand((command) => {
      if (command === 'toggle') toggle()
      else if (command === 'next') next()
      else if (command === 'prev') prev()
    })
  }, [toggle, next, prev])

  const title = currentTrack
    ? `${currentTrack.title} — ${currentTrack.uploader || 'Неизвестный исполнитель'}`
    : ''

  return <TitleBarView title={title} isPlaying={isPlaying} />
}

export default DesktopTitleBar
