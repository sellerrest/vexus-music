import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Compass, Disc3, Search, X } from 'lucide-react'
import Carousel, { CardTile } from '../components/Carousel'
import ProfileAvatar from '../components/ProfileAvatar'
import { CarouselSkeleton } from '../components/Skeleton'
import SearchResults from '../components/SearchResults'
import TrackRow from '../components/TrackRow'
import { usePlayer } from '../context/PlayerContext'
import { useNav } from '../context/NavContext'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { typo } from '../typography'
import type { Playlist, Track } from '../types'

interface Props {
  token: string
  /** Аватарка для кнопки настроек. На широком экране не используется. */
  avatarUrl?: string | null
  onOpenSettings?: () => void
}

/**
 * Приветствие по времени суток.
 *
 * Границы взяты по тому, как говорят, а не по календарным четвертям: «доброе
 * утро» в четыре часа звучало бы издевательством, поэтому ночь тянется до
 * пяти, а вечер начинается в шесть.
 */
function greeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  if (hour < 23) return 'Добрый вечер'
  return 'Доброй ночи'
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

function BrowsePage({ token, avatarUrl, onOpenSettings }: Props) {
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
  const { openDiscovery, openArtistRadio, openCategory } = useNav()
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
        {/* Поиск подменяет собой всю шапку: строка должна занимать всю
            ширину, а приветствие с аватаркой на это время не нужны. На
            широком экране поиск живёт в боковой панели, поэтому подмены
            там не бывает. */}
        {!isDesktop && searchOpen ? (
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
            {/* Аватарка — она же вход в настройки. Отдельной кнопки-шестерёнки
                нет намеренно: своё лицо человек находит взглядом быстрее
                любого значка. */}
            <button
              type="button"
              className="browse-avatar"
              onClick={onOpenSettings}
              aria-label="Настройки"
            >
              <ProfileAvatar src={avatarUrl ?? null} size={38} round ring={false} />
            </button>
            <h1 className="page-heading browse-greeting">{typo(greeting())}</h1>
            {!isDesktop && (
              <button
                type="button"
                className="np-icon-btn"
                onClick={() => setSearchOpen(true)}
                aria-label="Поиск"
              >
                <Search size={23} />
              </button>
            )}
          </>
        )}
      </div>

      {!isDesktop && searchOpen && query.trim() ? (
        <SearchResults token={token} query={query} />
      ) : !data ? (
        <>
          <section className="section">
            <h2 className="section-title">Популярное</h2>
            <CarouselSkeleton />
          </section>
        </>
      ) : (
        <>
          {/* «Для тебя» — одна строка на все персональные подборки: радио,
              открытие и «похоже на» по самым слушаемым исполнителям. */}
          {(data.discovery.length > 0 || data.top_artists.length > 0) && (
            <Carousel title="Для тебя">
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
                  onClick={() => openArtistRadio(a.seed_track_id, `Похоже на ${a.name}`, a.cover_url)}
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
