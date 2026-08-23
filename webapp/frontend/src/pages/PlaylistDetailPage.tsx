import { useEffect, useState } from 'react'
import axios from 'axios'
import { Heart } from 'lucide-react'
import CollectionHero from '../components/CollectionHero'
import TrackRow from '../components/TrackRow'
import { TrackRowSkeleton } from '../components/Skeleton'
import { usePlayer } from '../context/PlayerContext'
import type { Track } from '../types'
import { typo } from '../typography'

interface Props {
  token: string
  /** Число — обычный плейлист, 'favorites' — виртуальный список любимого. */
  playlistId: number | 'favorites'
}

function PlaylistDetailPage({ token, playlistId }: Props) {
  const [name, setName] = useState('')
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const { playQueue, toggleShuffle, shuffle } = usePlayer()

  const headers = { Authorization: `Bearer ${token}` }
  const isFavorites = playlistId === 'favorites'

  useEffect(() => {
    setTracks(null)
    const url = isFavorites ? '/api/favorites' : `/api/playlists/${playlistId}`
    axios
      .get(url, { headers })
      .then((res) => {
        setName(isFavorites ? 'Любимые треки' : res.data.playlist.name)
        setTracks(res.data.tracks)
      })
      .catch(() => setTracks([]))
  }, [playlistId])

  const removeFromPlaylist = async (trackId: number) => {
    setTracks((prev) => (prev ? prev.filter((t) => t.id !== trackId) : prev))
    try {
      await axios.delete(`/api/playlists/${playlistId}/tracks/${trackId}`, { headers })
    } catch {
      // молча — из списка уже убрали, при следующем открытии перечитается
    }
  }

  const handleFavoriteChange = (trackId: number, isFavorite: boolean) => {
    if (isFavorites && !isFavorite) setTracks((prev) => (prev ? prev.filter((t) => t.id !== trackId) : prev))
  }

  const startPlaying = (withShuffle: boolean) => {
    if (!tracks || tracks.length === 0) return
    if (withShuffle !== shuffle) toggleShuffle()
    playQueue(tracks, 0)
  }

  return (
    <div className="page playlist-page">
      {/* Своей стрелки «назад» тут нет — в Telegram работает системная
          кнопка, в браузере её рисует Dashboard (см. BackButton). */}
      <CollectionHero
        title={name}
        tracks={tracks}
        // Обложка «Любимых» — иконка на градиенте; у обычного плейлиста её
        // роль играет мозаика из обложек его треков (внутри CollectionHero).
        icon={isFavorites ? <Heart size={56} fill="currentColor" /> : undefined}
        gradient="favorites"
        onPlay={() => startPlaying(false)}
        onShuffle={() => startPlaying(true)}
      />

      {tracks === null ? (
        <div className="track-list">
          {[0, 1, 2, 3, 4].map((i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="empty-state">
          {typo(isFavorites ? 'Пока нет любимых треков' : 'В плейлисте пока нет треков')}
        </div>
      ) : (
        <div className="track-list">
          {tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              token={token}
              list={tracks}
              index={i}
              onFavoriteChange={handleFavoriteChange}
              onRemove={isFavorites ? undefined : () => removeFromPlaylist(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PlaylistDetailPage
