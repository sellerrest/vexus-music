import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { Check, Heart, ListMusic, ListPlus, Plus, Radio } from 'lucide-react'
import Cover from './Cover'
import { useNav } from '../context/NavContext'
import type { Playlist, Track } from '../types'

interface Props {
  token: string
  track: Track
  isFavorite: boolean
  onClose: () => void
  onFavoriteChange: (isFavorite: boolean) => void
}

function TrackActionsSheet({ token, track, isFavorite, onClose, onFavoriteChange }: Props) {
  const [view, setView] = useState<'menu' | 'playlists'>('menu')
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null)
  const [addedTo, setAddedTo] = useState<Set<number>>(new Set())
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const { openTrackRadio } = useNav()

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (view !== 'playlists' || playlists !== null) return
    axios.get('/api/playlists', { headers }).then((res) => setPlaylists(res.data.playlists))
  }, [view])

  const toggleFavorite = async () => {
    const next = !isFavorite
    try {
      if (next) await axios.post(`/api/tracks/${track.id}/favorite`, {}, { headers })
      else await axios.delete(`/api/tracks/${track.id}/favorite`, { headers })
      onFavoriteChange(next)
      onClose()
    } catch {
      // молча — состояние не поменяется, юзер увидит и нажмёт ещё раз
    }
  }

  const addToPlaylist = async (playlistId: number) => {
    try {
      await axios.post(`/api/playlists/${playlistId}/tracks/${track.id}`, {}, { headers })
      setAddedTo((prev) => new Set(prev).add(playlistId))
    } catch {
      // молча — не отметится галочкой, можно нажать ещё раз
    }
  }

  const createAndAdd = async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const res = await axios.post('/api/playlists', { name }, { headers })
      setPlaylists((prev) => [res.data, ...(prev || [])])
      await addToPlaylist(res.data.id)
      setNewName('')
    } finally {
      setCreating(false)
    }
  }

  /*
   * Шторка рисуется от <body>, а не там, где стоит строка трека.
   *
   * Иначе её накрывает мини-плеер — и только на некоторых экранах, что и
   * сбивало с толку. Строка трека лежит внутри .track-list, а тот на
   * странице плейлиста — прямой ребёнок .playlist-page, которому CSS даёт
   * position: relative и z-index: 1 (нужно, чтобы список был над цветной
   * подложкой из обложки). Это создаёт контекст наложения: любые z-index
   * ВНУТРИ него сравниваются только между собой, и заявленная тысяча у
   * шторки перестаёт что-либо значить — весь блок целиком стоит на отметке
   * 1 против 401 у плеера.
   *
   * Поднимать z-index было бы лечением симптома: та же ловушка стоит на
   * .public-page, и следующая такая же страница принесла бы её снова.
   * Портал убирает причину — шторка оказывается в корне документа, где её
   * z-index сравнивается с плеером и меню напрямую.
   */
  return createPortal(
    <motion.div
      className="sheet-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100) onClose()
        }}
      >
        <div className="sheet-grabber" />

        <div className="sheet-track">
          <Cover src={track.cover_url} size={44} radius={4} />
          <div className="sheet-track-info">
            <div className="sheet-track-title">{track.title}</div>
            {track.uploader && <div className="sheet-track-artist">{track.uploader}</div>}
          </div>
        </div>

        {view === 'menu' ? (
          <div className="sheet-list">
            <button type="button" className="sheet-row" onClick={toggleFavorite}>
              <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
              {isFavorite ? 'Убрать из любимых' : 'В любимые треки'}
            </button>
            <button
              type="button"
              className="sheet-row"
              onClick={() => {
                openTrackRadio(track)
                onClose()
              }}
            >
              <Radio size={20} />
              Радио по треку
            </button>
            <button type="button" className="sheet-row" onClick={() => setView('playlists')}>
              <ListPlus size={20} />
              Добавить в плейлист
            </button>
          </div>
        ) : (
          <div className="sheet-list">
            <div className="sheet-create-row">
              <input
                type="text"
                placeholder="Новый плейлист"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                maxLength={100}
              />
              <button type="button" onClick={createAndAdd} disabled={!newName.trim() || creating} aria-label="Создать">
                <Plus size={20} />
              </button>
            </div>

            {playlists === null ? (
              <div className="sheet-hint">Загрузка…</div>
            ) : playlists.length === 0 ? (
              <div className="sheet-hint">Плейлистов пока нет</div>
            ) : (
              playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="sheet-row"
                  onClick={() => addToPlaylist(p.id)}
                  disabled={addedTo.has(p.id)}
                >
                  <ListMusic size={20} />
                  <span className="sheet-row-grow">{p.name}</span>
                  {addedTo.has(p.id) && <Check size={18} />}
                </button>
              ))
            )}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export default TrackActionsSheet
