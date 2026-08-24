import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import CollectionHero from '../components/CollectionHero'
import TrackRow from '../components/TrackRow'
import { TrackRowSkeleton } from '../components/Skeleton'
import { usePlayer } from '../context/PlayerContext'
import type { Track } from '../types'
import { typo } from '../typography'

export interface FeedPageResult {
  tracks: Track[]
  hasMore: boolean
}

interface Props {
  token: string
  title: string
  subtitle?: string
  /** Готовая обложка одной картинкой — старше значка. */
  cover?: string | null
  /** Иконка на градиентной обложке — подборка выглядит как плейлист. */
  icon?: ReactNode
  gradient?: string
  /** Грузит очередную порцию. offset — сколько треков уже показано. */
  loadPage: (offset: number) => Promise<FeedPageResult>
  /**
   * Своя широкая шапка вместо обычной.
   *
   * Нужна «Потоку» на компьютере: у бесконечной ленты нет обложки, а счётчик
   * треков у неё бессмыслен — она не кончается. Получает готовые обработчики
   * запуска, чтобы кнопки внутри вели себя ровно как штатные.
   */
  banner?: (props: { onPlay: () => void; onShuffle: () => void; ready: boolean }) => ReactNode
  /** Есть ли смысл считать треки. У бесконечного потока — нет. */
  countable?: boolean
  /** Крупный капс Unbounded в заголовке — см. CollectionHero. */
  display?: boolean
}

const PAGE_SIZE = 30

/**
 * Лента треков с догрузкой по мере прокрутки.
 *
 * Одна на все подборки: радио «Для тебя», «Открытие» и «Похожее на трек»
 * отличаются только источником данных, а поведение списка у них одинаковое.
 */
function FeedPage({
  token,
  title,
  subtitle,
  cover,
  icon,
  gradient,
  loadPage,
  banner,
  countable = true,
  display = false,
}: Props) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const sentinel = useRef<HTMLDivElement | null>(null)
  const { playQueue, toggleShuffle, shuffle } = usePlayer()

  // Держим в ref, чтобы обработчик наблюдателя не пересоздавался на каждый
  // догруженный трек — иначе IntersectionObserver переподключался бы
  // постоянно и мог пропустить пересечение.
  const state = useRef({ loading: false, hasMore: true, count: 0 })
  state.current = { loading, hasMore, count: tracks.length }

  const loadMore = useCallback(async () => {
    if (state.current.loading || !state.current.hasMore) return
    setLoading(true)
    setFailed(false)
    try {
      const page = await loadPage(state.current.count)
      // Один и тот же трек может прийти дважды, если пул успел
      // достроиться между запросами: ключи в React должны остаться
      // уникальными, иначе строки начнут прыгать.
      setTracks((prev) => {
        const seen = new Set(prev.map((t) => t.id))
        return [...prev, ...page.tracks.filter((t) => !seen.has(t.id))]
      })
      setHasMore(page.hasMore && page.tracks.length > 0)
    } catch {
      setFailed(true)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loadPage])

  useEffect(() => {
    loadMore()
    // Намеренно один раз: дальше подгрузка идёт от наблюдателя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const node = sentinel.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      // Запускаем подгрузку заранее, за экран до низа: так список не
      // упирается в пустоту и прокрутка не дёргается.
      { rootMargin: '600px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore])

  const empty = !loading && tracks.length === 0

  const start = (withShuffle: boolean) => {
    if (tracks.length === 0) return
    if (withShuffle !== shuffle) toggleShuffle()
    playQueue(tracks, 0)
  }

  return (
    <div className="page playlist-page">
      {banner ? (
        banner({ onPlay: () => start(false), onShuffle: () => start(true), ready: tracks.length > 0 })
      ) : (
        <CollectionHero
          title={title}
          subtitle={subtitle}
          tracks={loading && tracks.length === 0 ? null : tracks}
          cover={cover}
          icon={icon}
          gradient={gradient}
          onPlay={() => start(false)}
          onShuffle={() => start(true)}
          countable={countable}
          display={display}
        />
      )}

      <div className="track-list">
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} token={token} list={tracks} index={i} />
        ))}
        {loading && Array.from({ length: tracks.length ? 3 : PAGE_SIZE / 3 }, (_, i) => <TrackRowSkeleton key={`s${i}`} />)}
      </div>

      {empty && (
        <div className="empty-state">
          {typo(failed ? 'Не удалось загрузить' : 'Пока пусто - послушай что-нибудь, и подборка соберётся')}
        </div>
      )}
      {failed && tracks.length > 0 && (
        <button type="button" className="feed-retry" onClick={() => { setHasMore(true); loadMore() }}>
          Не догрузилось. Попробовать ещё раз
        </button>
      )}

      <div ref={sentinel} />
    </div>
  )
}

export default FeedPage
