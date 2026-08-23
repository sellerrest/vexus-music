import { useEffect, useState } from 'react'
import axios from 'axios'
import TrackRow from './TrackRow'
import { TrackRowSkeleton } from './Skeleton'
import type { Track } from '../types'
import { typo } from '../typography'

interface Props {
  token: string
  query: string
}

const RECENT_KEY = 'recent_searches'

/**
 * Результаты поиска. Отдельным компонентом, потому что поле ввода живёт в
 * двух разных местах: на телефоне — «островок» в Обзоре, на компьютере —
 * строка в боковой панели. Сам поиск при этом должен быть один.
 */
function SearchResults({ token, query }: Props) {
  const [results, setResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setSearched(false)
      setSearching(false)
      return
    }
    setSearching(true)
    // Дебаунс: ждём паузы в наборе, а не шлём запрос на каждую букву.
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get('/api/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: { q },
        })
        setResults(res.data.tracks)
        setSearched(true)
        const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
        localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev.filter((i) => i !== q)].slice(0, 8)))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [query, token])

  if (searching) {
    return (
      <div className="track-list">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <TrackRowSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (searched && results.length === 0) {
    return <div className="empty-state">{typo('Ничего не нашлось')}</div>
  }
  return (
    <div className="track-list">
      {results.map((t, i) => (
        <TrackRow key={t.id} track={t} token={token} list={results} index={i} />
      ))}
    </div>
  )
}

export default SearchResults
