import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Radio, Search, X } from 'lucide-react'
import TrackRow from '../components/TrackRow'
import { TrackRowSkeleton } from '../components/Skeleton'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { typo } from '../typography'
import type { Track } from '../types'

interface Props {
  token: string
  /**
   * Запрос снаружи — с широкого экрана.
   *
   * Там строка поиска одна на всё приложение и живёт в шапке, а не внутри
   * страницы: она должна тянуться до правого края окна. Своей лупы на
   * широком экране страница не показывает, иначе их было бы две.
   */
  externalQuery?: string
}

/** Пауза после последнего нажатия, прежде чем идти за станциями. */
const TYPING_PAUSE = 450

/**
 * Радиовещание: поиск станций и их прослушивание.
 *
 * Станции приходят с сервера теми же объектами, что и треки, и рисуются
 * обычной строкой трека — поэтому «⋮» с добавлением в плейлист, сердечко и
 * запуск работают здесь сами собой, без отдельного кода.
 *
 * Показываются только станции с проверенным потоком: сервер отсеивает те,
 * что не заиграют (см. search_radio в core.py). Половина каталога записана с
 * небезопасным адресом, и без такой проверки список наполовину состоял бы из
 * станций, молча не включающихся.
 */
function RadioPage({ token, externalQuery }: Props) {
  const isDesktop = useIsDesktop()
  const [searchOpen, setSearchOpen] = useState(false)
  const [ownQuery, setOwnQuery] = useState('')
  const [stations, setStations] = useState<Track[] | null>(null)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // На широком экране запросом управляет шапка, на телефоне — своя лупа.
  const query = isDesktop ? (externalQuery ?? '') : ownQuery

  useEffect(() => {
    let alive = true
    setFailed(false)
    // Ждём паузы в наборе: иначе запрос уходит на каждую букву, а поиск
    // станции, которой у нас ещё нет, идёт в каталог и занимает секунды.
    const timer = setTimeout(
      () => {
        setStations(null)
        axios
          .get('/api/radio/stations', {
            headers: { Authorization: `Bearer ${token}` },
            params: { q: query.trim(), limit: 40 },
          })
          .then((res) => alive && setStations(res.data.stations))
          .catch(() => {
            if (!alive) return
            setStations([])
            setFailed(true)
          })
      },
      query ? TYPING_PAUSE : 0,
    )

    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query, token])

  const closeSearch = () => {
    setSearchOpen(false)
    setOwnQuery('')
  }

  return (
    <div className="page">
      <div className="browse-head">
        {/* На широком экране поиск живёт в шапке приложения — своя лупа тут
            была бы вторым таким же элементом на одном экране. */}
        {isDesktop ? (
          <h1 className="page-heading">Радиовещание</h1>
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
              placeholder="Название станции"
              value={ownQuery}
              onChange={(e) => setOwnQuery(e.target.value)}
            />
            <button
              type="button"
              className="search-island-close"
              onClick={closeSearch}
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </motion.div>
        ) : (
          <>
            <h1 className="page-heading">Радиовещание</h1>
            <button
              type="button"
              className="np-icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Поиск станции"
            >
              <Search size={23} />
            </button>
          </>
        )}
      </div>

      {!query && stations !== null && stations.length > 0 && (
        <div className="section-header">
          <h2 className="section-title flush">{typo('Популярные станции')}</h2>
        </div>
      )}

      {stations === null ? (
        <div className="track-list">
          {[0, 1, 2, 3, 4].map((i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="empty-state">
          <Radio size={30} className="inline-icon" />
          <div>
            {typo(
              failed
                ? 'Не удалось получить станции'
                : query
                  ? 'Такой станции не нашлось'
                  : 'Станции не загрузились',
            )}
          </div>
        </div>
      ) : (
        <div className="track-list">
          {stations.map((station, i) => (
            <TrackRow key={station.id} track={station} token={token} list={stations} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export default RadioPage
