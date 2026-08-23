import { useState } from 'react'
import axios from 'axios'
import { Heart, Loader2, MoreVertical, Play, Volume2, X } from 'lucide-react'
import Cover from './Cover'
import TrackActionsSheet from './TrackActionsSheet'
import { usePlayer } from '../context/PlayerContext'
import { formatDuration } from '../types'
import type { Track } from '../types'

interface Props {
  track: Track
  token: string
  /** Весь список, частью которого является трек — станет очередью при тапе. */
  list: Track[]
  index: number
  onFavoriteChange?: (trackId: number, isFavorite: boolean) => void
  /** Только внутри плейлиста — убрать трек именно отсюда. */
  onRemove?: () => void
}

function TrackRow({ track, token, list, index, onFavoriteChange, onRemove }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(track.is_favorite)
  const [favBusy, setFavBusy] = useState(false)
  const { currentTrack, isPlaying, isPreparing, playQueue, toggle, readyIds, failedIds } = usePlayer()

  const isCurrent = currentTrack?.id === track.id
  // Список пришёл с сервера и о свежих загрузках не знает — сверяемся с
  // плеером, иначе плашка «не скачан» висела бы на уже играющем треке.
  const downloaded = track.is_downloaded || readyIds.has(track.id)
  const headers = { Authorization: `Bearer ${token}` }

  const applyFavorite = (next: boolean) => {
    setIsFavorite(next)
    onFavoriteChange?.(track.id, next)
  }

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (favBusy) return
    setFavBusy(true)
    const next = !isFavorite
    // Меняем вид сразу, не дожидаясь сети: сердечко должно загораться под
    // пальцем. Если запрос упадёт — вернём обратно.
    applyFavorite(next)
    try {
      if (next) await axios.post(`/api/tracks/${track.id}/favorite`, {}, { headers })
      else await axios.delete(`/api/tracks/${track.id}/favorite`, { headers })
    } catch {
      applyFavorite(!next)
    } finally {
      setFavBusy(false)
    }
  }

  // Скачать не вышло — убираем строку совсем: предлагать то, что заведомо
  // не заиграет, бессмысленно.
  if (failedIds.has(track.id)) return null

  return (
    <div className={`track-row ${isCurrent ? 'is-current' : ''}`}>
      <button
        type="button"
        className="track-row-main"
        // Повторное нажатие по играющему треку ставит на паузу, а не
        // запускает его заново с начала.
        onClick={() => (isCurrent ? toggle() : playQueue(list, index))}
      >
        <div className="track-row-cover">
          <Cover src={track.cover_url} size={48} radius={4} />
          {isCurrent && (
            <div className="track-row-cover-badge">
              {/* На паузе показываем «играть», а не значок звука: иначе
                  строка выглядит как звучащая, хотя музыка стоит. */}
              {isPreparing ? (
                <Loader2 size={16} className="spin" />
              ) : isPlaying ? (
                <Volume2 size={16} />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
            </div>
          )}
        </div>

        <div className="track-row-info">
          <div className="track-row-title">{track.title}</div>
          <div className="track-row-meta">
            {!downloaded && <span className="track-row-badge">не скачан</span>}
            {track.uploader && <span className="track-row-artist">{track.uploader}</span>}
            <span className="track-row-time">{formatDuration(track.duration)}</span>
          </div>
        </div>
      </button>

      <button
        type="button"
        className={`track-heart ${isFavorite ? 'active' : ''}`}
        onClick={toggleFavorite}
        aria-label={isFavorite ? 'Убрать из любимых' : 'В любимые'}
      >
        <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>

      {onRemove && (
        <button type="button" className="track-row-icon" onClick={onRemove} aria-label="Убрать">
          <X size={18} />
        </button>
      )}

      <button type="button" className="track-row-icon" onClick={() => setSheetOpen(true)} aria-label="Ещё">
        <MoreVertical size={18} />
      </button>

      {sheetOpen && (
        <TrackActionsSheet
          token={token}
          track={track}
          isFavorite={isFavorite}
          onClose={() => setSheetOpen(false)}
          onFavoriteChange={applyFavorite}
        />
      )}
    </div>
  )
}

export default TrackRow
