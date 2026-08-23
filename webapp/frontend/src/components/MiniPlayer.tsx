import { useEffect, useState } from 'react'
import { Heart, Loader2, Pause, Play } from 'lucide-react'
import Cover from './Cover'
import MarqueeText from './MarqueeText'
import { usePlayer } from '../context/PlayerContext'

interface Props {
  onOpen: () => void
}

/**
 * Плавающая капсула над таб-баром. Тап — разворачивает полноэкранный плеер.
 *
 * При прокрутке вниз она сжимается (уходит с дороги, освобождая экран под
 * контент), при прокрутке вверх — разворачивается обратно.
 */
function MiniPlayer({ onOpen }: Props) {
  const { currentTrack, isPlaying, isPreparing, prepareLabel, position, duration, toggle, toggleCurrentFavorite } = usePlayer()
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      // Небольшой порог, иначе капсула дёргается от микродвижений пальца.
      if (Math.abs(y - lastY) < 12) return
      setCompact(y > lastY && y > 60)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!currentTrack) return null

  const progress = duration > 0 ? (position / duration) * 100 : 0

  return (
    <div className={`mini-player ${compact ? 'compact' : ''}`} onClick={onOpen}>
      <div className="mini-player-bg" style={{ background: currentTrack.cover_color || 'var(--surface-2)' }} />

      <Cover src={currentTrack.cover_url} size={compact ? 32 : 40} radius={6} />

      <div className="mini-player-info">
        <MarqueeText className="mini-player-title" text={currentTrack.title} active={isPlaying} />
        <div className="mini-player-artist">
          {isPreparing ? prepareLabel : currentTrack.uploader || 'Неизвестный исполнитель'}
        </div>
      </div>

      <button
        type="button"
        className="mini-player-btn primary"
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        aria-label={isPlaying ? 'Пауза' : 'Играть'}
      >
        {isPreparing ? (
          <Loader2 size={19} className="spin" />
        ) : isPlaying ? (
          <Pause size={19} fill="currentColor" />
        ) : (
          <Play size={19} fill="currentColor" />
        )}
      </button>

      <button
        type="button"
        className={`mini-player-btn heart ${currentTrack.is_favorite ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          toggleCurrentFavorite()
        }}
        aria-label={currentTrack.is_favorite ? 'Убрать из любимых' : 'В любимые'}
      >
        <Heart size={18} fill={currentTrack.is_favorite ? 'currentColor' : 'none'} />
      </button>

      {/* У эфира полоса не нужна: заполнять её нечем, а замершая на нуле
          выглядит как зависшая загрузка. */}
      {!currentTrack.is_radio && (
        <div className="mini-player-progress">
          <div className="mini-player-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

export default MiniPlayer
