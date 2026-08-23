import { useEffect, useMemo, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { typo } from '../typography'
import type { LyricsState } from '../hooks/useLyrics'

interface Props {
  state: LyricsState
  position: number
  onSeek: (seconds: number) => void
}

/** Сколько не трогаем прокрутку после того, как её листал человек. */
const MANUAL_SCROLL_PAUSE = 4000

/**
 * Текст песни, который едет вместе с музыкой.
 *
 * Подсвечивается строка целиком, а не слово: источник даёт метку времени на
 * строку, пословных меток в нём нет. Растянуть заливку по словам «на глазок»,
 * поделив строку до следующей метки, можно — но на строках с паузами она
 * уезжает и выглядит сломанной, поэтому честнее подсвечивать построчно.
 */
function LyricsStage({ state, position, onSeek }: Props) {
  const activeRef = useRef<HTMLButtonElement | null>(null)
  // Время последней ручной прокрутки: пока человек листает сам, автопрокрутка
  // не должна вырывать текст у него из-под пальца.
  const touchedAt = useRef(0)
  const lastActive = useRef(-1)

  const lines = state.status === 'ready' ? state.lyrics.lines : []
  const synced = state.status === 'ready' && state.lyrics.kind === 'synced'

  /** Строка, которая звучит сейчас. */
  const activeIndex = useMemo(() => {
    if (!synced) return -1
    // С конца: нужна последняя строка, чьё время уже наступило.
    for (let i = lines.length - 1; i >= 0; i--) {
      const time = lines[i].time
      if (time !== null && time <= position) return i
    }
    return -1
  }, [lines, synced, position])

  useEffect(() => {
    if (activeIndex < 0 || activeIndex === lastActive.current) return
    lastActive.current = activeIndex
    if (Date.now() - touchedAt.current < MANUAL_SCROLL_PAUSE) return
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  if (state.status === 'loading') {
    return (
      <div className="lyrics-box lyrics-empty">
        <Loader2 size={22} className="spin" />
      </div>
    )
  }
  if (state.status === 'failed') {
    return <div className="lyrics-box lyrics-empty">{typo('Не удалось загрузить текст')}</div>
  }
  if (lines.length === 0) {
    return <div className="lyrics-box lyrics-empty">{typo('Для этого трека текста нет')}</div>
  }

  return (
    <div
      className="lyrics-box"
      onWheel={() => (touchedAt.current = Date.now())}
      onTouchMove={() => (touchedAt.current = Date.now())}
    >
      {lines.map((line, i) => {
        const isActive = synced && i === activeIndex
        const isPast = synced && activeIndex >= 0 && i < activeIndex
        return (
          <button
            key={`${line.time ?? 'p'}-${i}`}
            type="button"
            ref={isActive ? activeRef : undefined}
            // Тап по строке перематывает на неё — привычный способ вернуться
            // к нужному месту, не целясь в тонкую полоску перемотки.
            onClick={() => line.time !== null && onSeek(line.time)}
            className={[
              'lyrics-line',
              isActive ? 'active' : '',
              isPast ? 'past' : '',
              synced ? '' : 'plain',
            ].join(' ')}
          >
            {/* Пустая строка — это пауза между куплетами; сохраняем её
                высоту, иначе текст слипается в сплошную стену. */}
            {line.text || ' '}
          </button>
        )
      })}
    </div>
  )
}

export default LyricsStage
