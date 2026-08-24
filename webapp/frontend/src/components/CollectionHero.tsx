import type { ReactNode } from 'react'
import { Play, Shuffle } from 'lucide-react'
import CoverMosaic from './CoverMosaic'
import { apiUrl } from '../api'
import { tileGradient } from '../gradients'
import { typo } from '../typography'
import type { Track } from '../types'

interface Props {
  title: string
  subtitle?: string
  tracks: Track[] | null
  /** Готовая обложка одной картинкой. Старше и значка, и мозаики: если у
   *  подборки есть своё лицо — например, снимок исполнителя, — показывать
   *  вместо него абстрактный значок незачем. */
  cover?: string | null
  /** Иконка на градиентной обложке — для подборок без своих картинок. */
  icon?: ReactNode
  /** Ключ градиента (см. gradients.ts). Без иконки не используется. */
  gradient?: string
  onPlay: () => void
  onShuffle: () => void
  /** Набрать заголовок крупным капсом Unbounded — как на широкой шапке
   *  «Потока» и на приветственной странице. Для подборок с именем-названием,
   *  а не с чужим текстом вроде «Похоже на …». */
  display?: boolean
  /** Показывать ли «N треков • M мин». У бесконечной ленты счётчик врёт: он
   *  считает не подборку, а то, сколько успело подгрузиться. */
  countable?: boolean
}

function totalDuration(tracks: Track[]): string {
  const seconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0)
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`
}

/**
 * Шапка любой подборки: обложка, название, счётчик и кнопки запуска.
 *
 * Одна на плейлисты и на ленты (радио, открытие, похожее, жанры) — раньше у
 * лент была своя простая шапка, и выглядели они как чужие в приложении.
 * Общий компонент ещё и не даёт им разъехаться при следующей правке.
 */
function CollectionHero({
  title,
  subtitle,
  tracks,
  cover,
  icon,
  gradient,
  onPlay,
  onShuffle,
  countable = true,
  display = false,
}: Props) {
  // Запасной цвет — уровень «на карточке» из палитры, а не случайный серый:
  // подложка подборки без обложек должна попадать в ту же лесенку.
  const accent = tracks?.[0]?.cover_color || 'var(--surface-3)'
  const ready = tracks !== null && tracks.length > 0

  return (
    <>
      <div
        className="playlist-bg"
        style={{ background: `linear-gradient(180deg, ${accent} 0%, transparent 100%)` }}
      />

      <div className="playlist-hero">
        {cover ? (
          <img className="playlist-hero-cover" src={apiUrl(cover) ?? undefined} alt="" />
        ) : icon ? (
          <div className="playlist-hero-liked" style={{ background: tileGradient(gradient || title) }}>
            {icon}
          </div>
        ) : (
          // Мозаика собирается из обложек самих треков — отдельного запроса
          // за ними не нужно, список уже загружен.
          <CoverMosaic covers={(tracks ?? []).map((t) => t.cover_url).filter(Boolean)} size={180} radius={8} />
        )}
        <h1 className={`playlist-hero-title ${display ? 'display' : ''}`}>
          {title ? typo(title) : ' '}
        </h1>
        <div className="playlist-hero-meta">
          {typo(ready && countable ? `${tracks!.length} треков • ${totalDuration(tracks!)}` : subtitle || '')}
        </div>
      </div>

      {ready && (
        <div className="playlist-actions">
          <button type="button" className="playlist-shuffle" onClick={onShuffle} aria-label="Вперемешку">
            <Shuffle size={20} />
          </button>
          <button type="button" className="playlist-play" onClick={onPlay} aria-label="Играть">
            <Play size={26} fill="currentColor" />
          </button>
        </div>
      )}
    </>
  )
}

export default CollectionHero
