import { useEffect, useState } from 'react'
import axios from 'axios'

export interface LyricLine {
  /** Секунда, на которой звучит строка. null — текст без синхронизации. */
  time: number | null
  text: string
}

export interface Lyrics {
  kind: 'synced' | 'plain' | 'none'
  lines: LyricLine[]
}

/** Что известно про текст: ещё грузим, не нашли, или вот он. */
export type LyricsState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; lyrics: Lyrics }

/**
 * Текст песни для трека.
 *
 * Запрашивается в плеере, а не внутри самого экрана с текстом: от того, есть
 * текст или нет, зависит, показывать ли эту вкладку вообще — а решать это
 * надо до того, как её нарисуют.
 *
 * Ответы держим в памяти на время сессии: при переключении между обложкой,
 * текстом и клипом компонент размонтируется, и без этого каждое возвращение
 * к тексту било бы запросом по серверу.
 */
const cache = new Map<number, Lyrics>()

export function useLyrics(trackId: number | null, token: string): LyricsState {
  const [state, setState] = useState<LyricsState>({ status: 'loading' })

  useEffect(() => {
    if (trackId === null) {
      setState({ status: 'ready', lyrics: { kind: 'none', lines: [] } })
      return
    }
    const cached = cache.get(trackId)
    if (cached) {
      setState({ status: 'ready', lyrics: cached })
      return
    }

    let alive = true
    setState({ status: 'loading' })
    axios
      .get<Lyrics>(`/api/tracks/${trackId}/lyrics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        cache.set(trackId, res.data)
        if (alive) setState({ status: 'ready', lyrics: res.data })
      })
      .catch(() => {
        // Промах не кэшируем: он мог случиться из-за сети, и при следующем
        // открытии стоит попробовать снова.
        if (alive) setState({ status: 'failed' })
      })
    return () => {
      alive = false
    }
  }, [trackId, token])

  return state
}

/** Есть ли что показывать во вкладке с текстом. */
export function hasLyrics(state: LyricsState): boolean {
  return state.status === 'ready' && state.lyrics.kind !== 'none' && state.lyrics.lines.length > 0
}
