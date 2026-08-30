import { useEffect, useState } from 'react'
import { tracksWord } from '../typography'
import axios from 'axios'
import { Globe, Heart, MoreVertical, Plus, Radio } from 'lucide-react'
import Cover from '../components/Cover'
import CoverMosaic from '../components/CoverMosaic'
import { tileGradient } from '../gradients'
import PlaylistActionsSheet from '../components/PlaylistActionsSheet'
import Skeleton from '../components/Skeleton'
import type { Playlist } from '../types'

interface Props {
  token: string
  onOpenPlaylist: (id: number | 'favorites') => void
  onOpenRadio: () => void
}

function LibraryPage({ token, onOpenPlaylist, onOpenRadio }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [menuFor, setMenuFor] = useState<Playlist | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  const load = async () => {
    const [pl, fav] = await Promise.all([
      axios.get('/api/playlists', { headers }),
      axios.get('/api/favorites', { headers }),
    ])
    setPlaylists(pl.data.playlists)
    setFavoritesCount(fav.data.tracks.length)
  }

  useEffect(() => {
    load().catch(() => setPlaylists([]))
  }, [token])

  const createPlaylist = async () => {
    const name = newName.trim()
    if (!name) return
    const res = await axios.post('/api/playlists', { name }, { headers })
    setPlaylists((prev) => [res.data, ...(prev || [])])
    setNewName('')
    setCreating(false)
  }

  return (
    <div className="page">
      <div className="browse-head">
        <h1 className="page-heading">Медиатека</h1>
        <button
          type="button"
          className="np-icon-btn"
          onClick={() => setCreating((v) => !v)}
          aria-label="Новый плейлист"
        >
          <Plus size={24} />
        </button>
      </div>

      {creating && (
        <div className="create-row">
          <input
            type="text"
            autoFocus
            placeholder="Название плейлиста"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
            maxLength={100}
          />
          <button type="button" onClick={createPlaylist} disabled={!newName.trim()}>
            Создать
          </button>
        </div>
      )}

      <div className="library-list">
        {/* Над любимыми треками: радио — такая же часть медиатеки, а не
            отдельный раздел где-то сбоку. */}
        <button type="button" className="library-row" onClick={onOpenRadio}>
          <div className="library-liked-tile" style={{ background: tileGradient('radio') }}>
            <Radio size={22} />
          </div>
          <div className="library-row-info">
            <div className="library-row-title">Радиовещание</div>
            <div className="library-row-sub">Станции со всего мира</div>
          </div>
        </button>

        <button type="button" className="library-row" onClick={() => onOpenPlaylist('favorites')}>
          <div className="library-liked-tile" style={{ background: tileGradient('favorites') }}>
            <Heart size={22} fill="currentColor" />
          </div>
          <div className="library-row-info">
            <div className="library-row-title">Любимые треки</div>
            <div className="library-row-sub">Плейлист • {favoritesCount} треков</div>
          </div>
        </button>

        {playlists === null
          ? [0, 1, 2].map((i) => (
              <div key={i} className="library-row">
                <Skeleton width={56} height={56} radius={4} />
                <div className="library-row-info">
                  <Skeleton width="60%" height={13} />
                  <Skeleton width="35%" height={11} />
                </div>
              </div>
            ))
          : playlists.map((p) => (
              <div key={p.id} className="library-row-wrap">
                <button type="button" className="library-row" onClick={() => onOpenPlaylist(p.id)}>
                  {p.cover_urls.length > 0 ? (
                    <CoverMosaic covers={p.cover_urls} size={56} radius={4} />
                  ) : (
                    <Cover src={p.cover_url} size={56} radius={4} />
                  )}
                  <div className="library-row-info">
                    <div className="library-row-title">{p.name}</div>
                    <div className="library-row-sub">
                      {p.is_public && <Globe size={11} className="inline-icon" />}
                      Плейлист • {tracksWord(p.track_count)}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="track-row-icon"
                  onClick={() => setMenuFor(p)}
                  aria-label="Действия с плейлистом"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
      </div>

      {menuFor && (
        <PlaylistActionsSheet
          token={token}
          playlist={menuFor}
          onClose={() => setMenuFor(null)}
          onChanged={(updated) => {
            setPlaylists((prev) => (prev || []).map((p) => (p.id === updated.id ? updated : p)))
            setMenuFor(updated)
          }}
          onDeleted={() => setPlaylists((prev) => (prev || []).filter((p) => p.id !== menuFor.id))}
        />
      )}
    </div>
  )
}

export default LibraryPage
