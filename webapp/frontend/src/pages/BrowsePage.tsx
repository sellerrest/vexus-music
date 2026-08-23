import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Compass, Disc3, Heart, Radio, Search, X } from 'lucide-react'
import Carousel, { CardTile } from '../components/Carousel'
import { CarouselSkeleton } from '../components/Skeleton'
import SearchResults from '../components/SearchResults'
import TrackRow from '../components/TrackRow'
import { usePlayer } from '../context/PlayerContext'
import { useNav } from '../context/NavContext'
import { useIsDesktop } from '../hooks/useIsDesktop'
import type { Playlist, Track } from '../types'

interface Props {
  token: string
  onOpenPlaylist: (id: number | 'favorites') => void
}

export interface TopArtist {
  name: string
  seed_track_id: number
  cover_url: string
}

export interface Category {
  slug: string
  title: string
}

interface HomeData {
  for_you: Track[]
  discovery: Track[]
  top_artists: TopArtist[]
  categories: Category[]
  recently_played: Track[]
  playlists: Playlist[]
  recent: Track[]
  popular: Track[]
}

const EMPTY_HOME: HomeData = {
  for_you: [], discovery: [], top_artists: [], categories: [],
  recently_played: [], playlists: [], recent: [], popular: [],
}

/** Размер плиток в строках «Рекомендации по категориям» — заметно меньше,
 *  чем у крупных подборок сверху. */
const SMALL_TILE = 104

function BrowsePage({ token, onOpenPlaylist }: Props) {
  const [data, setData] = useState<HomeData | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { playQueue, currentTrack, toggle } = usePlayer()

  // Нажатие по уже играющей карточке ставит на паузу, а не запускает трек
  // заново — то же поведение, что и в списках.
  const startOrToggle = (tracks: Track[], index: number) => {
    if (currentTrack?.id === tracks[index]?.id) toggle()
    else playQueue(tracks, index)
  }
  const { openRadio, openDiscovery, openArtistRadio, openCategory } = useNav()
  const isDesktop = useIsDesktop()

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios
      .get('/api/home', { headers })
      .then((res) => setData({ ...EMPTY_HOME, ...res.data }))
      .catch(() => setData(EMPTY_HOME))
  }, [token])

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <div className="page">
      <div className="browse-head">
        {/* На широком экране поиск живёт в боковой панели — своя кнопка тут
            была бы вторым таким же элементом на одном экране. */}
        {isDesktop ? (
          <h1 className="page-heading">Обзор</h1>
        ) : searchOpen ? (
          <motion.div
            className="search-island"
            initial={{ opacity: 0, scaleX: 0.85 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.18 }}
          >
            <Search size={18} className="search-island-icon" />
            <input
              ref={inputRef}
              type="text"
              autoFocus
              placeholder="Трек или исполнитель"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="search-island-close" onClick={closeSearch} aria-label="Закрыть">
              <X size={18} />
            </button>
          </motion.div>
        ) : (
          <>
            <h1 className="page-heading">Обзор</h1>
            <button type="button" className="np-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Поиск">
              <Search size={23} />
            </button>
          </>
        )}
      </div>

      {!isDesktop && searchOpen && query.trim() ? (
        <SearchResults token={token} query={query} />
      ) : !data ? (
        <>
          <section className="section">
            <h2 className="section-title">Твоя музыка</h2>
            <CarouselSkeleton />
          </section>
          <section className="section">
            <h2 className="section-title">Популярное</h2>
            <CarouselSkeleton />
          </section>
        </>
      ) : (
        <>
          {/* «Для тебя» — одна строка на все персональные подборки: радио,
              открытие и «похоже на» по самым слушаемым исполнителям. */}
          {(data.for_you.length > 0 || data.discovery.length > 0 || data.top_artists.length > 0) && (
            <Carousel title="Для тебя">
              {data.for_you.length > 0 && (
                <CardTile
                  icon={<Radio size={44} strokeWidth={1.5} />}
                  gradient="radio"
                  title="Радио"
                  subtitle="Бесконечный поток"
                  onClick={openRadio}
                />
              )}
              {data.discovery.length > 0 && (
                <CardTile
                  icon={<Compass size={44} strokeWidth={1.5} />}
                  gradient="discovery"
                  title="Открытие"
                  subtitle="Новые имена"
                  onClick={openDiscovery}
                />
              )}
              {data.top_artists.map((a) => (
                <CardTile
                  key={a.seed_track_id}
                  cover={a.cover_url}
                  title={`Похоже на ${a.name}`}
                  subtitle="Подборка"
                  onClick={() => openArtistRadio(a.seed_track_id, `Похоже на ${a.name}`)}
                />
              ))}
            </Carousel>
          )}

          {data.categories.length > 0 && (
            <Carousel title="Рекомендации по категориям">
              {data.categories.map((c) => (
                <CardTile
                  key={c.slug}
                  size={SMALL_TILE}
                  gradient={c.slug}
                  icon={<Disc3 size={34} strokeWidth={1.5} />}
                  title={c.title}
                  onClick={() => openCategory(c.slug, c.title)}
                />
              ))}
            </Carousel>
          )}

          {data.recently_played.length > 0 && (
            <Carousel title="Недавно слушал">
              {data.recently_played.map((t, i) => (
                <CardTile
                  key={t.id}
                  size={SMALL_TILE}
                  cover={t.cover_url}
                  title={t.title}
                  subtitle={t.uploader}
                  onClick={() => startOrToggle(data.recently_played, i)}
                />
              ))}
            </Carousel>
          )}

          <Carousel title="Твоя музыка">
            <CardTile
              icon={<Heart size={44} strokeWidth={1.5} fill="currentColor" />}
              gradient="favorites"
              title="Любимые треки"
              subtitle="Плейлист"
              onClick={() => onOpenPlaylist('favorites')}
            />
            {data.playlists.map((p) => (
              <CardTile
                key={p.id}
                cover={p.cover_url}
                covers={p.cover_urls}
                title={p.name}
                subtitle={`${p.track_count} треков`}
                onClick={() => onOpenPlaylist(p.id)}
              />
            ))}
          </Carousel>

          {data.popular.length > 0 && (
            <Carousel title="Популярное">
              {data.popular.map((t, i) => (
                <CardTile
                  key={t.id}
                  cover={t.cover_url}
                  title={t.title}
                  subtitle={t.uploader}
                  onClick={() => startOrToggle(data.popular, i)}
                />
              ))}
            </Carousel>
          )}

          {data.recent.length > 0 && (
            <section className="section">
              <h2 className="section-title">Новое</h2>
              <div className="track-list">
                {data.recent.map((t, i) => (
                  <TrackRow key={t.id} track={t} token={token} list={data.recent} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default BrowsePage
