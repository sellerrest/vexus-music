import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Check, Download, Music, Pause, Play, Smartphone } from 'lucide-react'
import Cover from '../components/Cover'
import { formatDuration } from '../types'
import type { Track } from '../types'
import { tracksWord, typo } from '../typography'
import { playlistDeepLink } from '../deepLink'
import { isDesktopApp } from '../desktop'
import { showToast } from '../toast'

interface Props {
  slug: string
  /**
   * Токен, если страницу открыли внутри приложения.
   *
   * От него зависит, что предложить: с токеном плейлист забирается себе прямо
   * тут, без — сначала нужно войти.
   */
  token?: string
}

/**
 * Публичная страница плейлиста — открывается по короткой ссылке в обычном
 * браузере, без Telegram и без авторизации.
 *
 * Плеер тут свой, простой: полноценный PlayerProvider завязан на токен и
 * очередь, а здесь достаточно «нажал — играет».
 */
function PublicPage({ slug, token }: Props) {
  // Что происходит с кнопкой «Забрать себе»: ждём нажатия, сохраняем, готово.
  const [saving, setSaving] = useState<'idle' | 'busy' | 'done'>('idle')
  const [name, setName] = useState('')
  const [cover, setCover] = useState<string | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [paused, setPaused] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    axios
      .get(`/api/public/playlist/${slug}`)
      .then((res) => {
        setName(res.data.playlist.name)
        setCover(res.data.playlist.cover_url)
        setTracks(res.data.tracks)
        setState('ready')
      })
      .catch(() => setState('missing'))
  }, [slug])

  const play = (track: Track) => {
    const audio = audioRef.current
    if (!audio || !track.url) return
    if (playingId === track.id) {
      if (audio.paused) audio.play().catch(() => {})
      else audio.pause()
      return
    }
    audio.src = track.url
    audio.play().catch(() => {})
    setPlayingId(track.id)
  }

  if (state === 'loading') {
    return (
      <div className="public-page">
        <div className="loader-wrap">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (state === 'missing') {
    return (
      <div className="public-page">
        <div className="empty-state">{typo('Такого плейлиста нет или он скрыт')}</div>
      </div>
    )
  }

  const accent = tracks[0]?.cover_color || '#41bccf'

  return (
    <div className="public-page">
      <div className="public-bg" style={{ background: `linear-gradient(180deg, ${accent} 0%, transparent 100%)` }} />

      <div className="public-hero">
        <Cover src={cover} size={160} radius={10} className="public-cover" />
        <h1 className="public-title">{name}</h1>
        <p className="public-bio">{typo(tracksWord(tracks.length))}</p>

        <div className="public-actions">
          {token ? (
            <button
              type="button"
              className="feed-btn primary"
              disabled={saving !== 'idle'}
              onClick={async () => {
                setSaving('busy')
                try {
                  await axios.post(
                    `/api/public/playlist/${slug}/save`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } },
                  )
                  setSaving('done')
                  showToast('Плейлист добавлен в медиатеку')
                } catch {
                  setSaving('idle')
                  showToast('Не удалось добавить плейлист')
                }
              }}
            >
              {saving === 'done' ? <Check size={17} /> : <Download size={17} />}
              {saving === 'done' ? 'В медиатеке' : saving === 'busy' ? 'Добавляю…' : 'Забрать себе'}
            </button>
          ) : (
            /* Без входа копировать некуда: плейлист кладётся в чей-то
               аккаунт, а его ещё нет. */
            <a className="feed-btn primary" href="/">
              <Download size={17} />
              Войти и забрать себе
            </a>
          )}

          {/* В самом приложении эта кнопка не нужна: оно уже открыто. */}
          {!isDesktopApp() && (
            <a className="feed-btn" href={playlistDeepLink(slug)}>
              <Smartphone size={17} />
              Открыть в приложении
            </a>
          )}
        </div>
      </div>

      {tracks.length > 0 && (
        <section className="public-section">
          <h2 className="public-section-title">Треки</h2>
          <div className="track-list">
            {tracks.map((t) => (
              <div key={t.id} className="track-row">
                <button type="button" className="track-row-main" onClick={() => play(t)}>
                  <div className="track-row-cover">
                    <Cover src={t.cover_url} size={48} radius={4} />
                    {t.url && (
                      <div className="track-row-cover-badge public-play-badge">
                        {playingId === t.id && !paused ? (
                          <Pause size={16} fill="currentColor" />
                        ) : (
                          <Play size={16} fill="currentColor" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="track-row-info">
                    <div className="track-row-title">{t.title}</div>
                    <div className="track-row-meta">
                      {t.uploader && <span className="track-row-artist">{t.uploader}</span>}
                      <span className="track-row-time">{formatDuration(t.duration)}</span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="public-footer">
        <Music size={14} />
        Vexus Music
      </div>

      <audio
        ref={audioRef}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={() => {
          setPaused(true)
          setPlayingId(null)
        }}
      />
    </div>
  )
}

export default PublicPage
