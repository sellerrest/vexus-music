import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import { showToast } from '../toast'
import {
  setHandlers as setMediaHandlers,
  setMetadata as setMediaMetadata,
  setPlaybackState as setMediaPlaybackState,
  setPositionState as setMediaPositionState,
} from '../mediaSession'
import { EQ_BANDS, loadEqGains, saveEqGains } from '../equalizer'
import type { Track } from '../types'

export type RepeatMode = 'off' | 'all' | 'one'

interface PlayerContextValue {
  currentTrack: Track | null
  queue: Track[]
  /** Что заиграет дальше — для экрана очереди. */
  upNext: Track[]
  isPlaying: boolean
  /** Трек ещё не скачан на сервер: качаем и включим сами, когда будет готов. */
  isPreparing: boolean
  /** Что именно сейчас делает сервер — «Скачиваю», «Обрабатываю», «Загружаю».
   *  Без этого полоска замирала на одном месте, пока шли перекодирование и
   *  заливка, и выглядело это как зависшая загрузка. */
  prepareLabel: string
  position: number
  duration: number
  shuffle: boolean
  repeat: RepeatMode
  /** 0..1. Живёт на самом <audio>, поэтому переносится на следующий трек
   *  сама собой, а между запусками — через localStorage. */
  volume: number
  setVolume: (value: number) => void
  /** Усиление по полосам эквалайзера, дБ. Работает всегда. */
  eqGains: number[]
  setEqGains: (gains: number[]) => void
  /** На iOS громкость <audio> только для чтения — регулятор там показывать
   *  нельзя, он заведомо ни на что не повлияет. */
  volumeSupported: boolean
  playQueue: (tracks: Track[], startIndex?: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  /** Лайк текущего трека — состояние общее для мини- и полного плеера. */
  toggleCurrentFavorite: () => void
  /** Треки, которые доехали до хранилища уже в этой сессии. Списки берут
   *  свои данные из ответа сервера и о свежих загрузках не знают — без
   *  этого плашка «не скачан» висела бы на уже играющем треке. */
  readyIds: Set<number>
  /** Треки, которые скачать не удалось: их незачем показывать. */
  failedIds: Set<number>
  /** Ссылка на клип текущего трека — появляется, когда он готов в хранилище.
   *  Пока её нет, переключаться на видео нельзя: показывать было бы нечего. */
  videoUrl: string | null
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

const VOLUME_KEY = 'player_volume'

/** Подписи этапов подготовки трека — приходят с сервера как phase. */
const PREPARE_LABELS: Record<string, string> = {
  downloading: 'Скачиваю…',
  processing: 'Обрабатываю…',
  uploading: 'Загружаю…',
}

/*
 * Память о том, что источник звука не отдаёт заголовки CORS.
 *
 * Хранится между запусками не ради удобства: без этого каждый первый трек в
 * сессии сначала уходил бы в ошибку, элемент пересоздавался бы, и всё это
 * пользователь слышал бы как заминку перед началом. Один раз выяснили —
 * дальше сразу играем обычным способом.
 *
 * Отметка со сроком, а не просто флаг: настройки CDN меняются, и когда
 * заголовок появится, эквалайзер должен вернуться сам, без переустановки
 * приложения и чистки данных.
 */
const CORS_BLOCKED_KEY = 'cors_blocked_until'
const CORS_RETRY_HOURS = 24

function loadCorsBlocked(): boolean {
  try {
    const until = Number(localStorage.getItem(CORS_BLOCKED_KEY))
    return Number.isFinite(until) && until > Date.now()
  } catch {
    // Приватный режим и запрет на хранилище — не повод падать при старте.
    return false
  }
}

function rememberCorsBlocked(): void {
  try {
    localStorage.setItem(
      CORS_BLOCKED_KEY,
      String(Date.now() + CORS_RETRY_HOURS * 3600 * 1000),
    )
  } catch {
    // Не записалось — просто проверим заново в следующий раз.
  }
}

/**
 * Короткая метка происхождения страницы.
 *
 * Нужна как часть адреса файла, чтобы у сайта, приложения для Windows и
 * приложения для Android были РАЗНЫЕ записи в кэше CDN (см. sourceUrl).
 * Само значение неважно — важно лишь, что для разных origin оно разное, а
 * для одного и того же постоянное между запусками.
 */
const ORIGIN_TAG: string = (() => {
  const origin = typeof location !== 'undefined' ? location.origin : ''
  let hash = 0
  for (let i = 0; i < origin.length; i++) hash = (hash * 31 + origin.charCodeAt(i)) | 0
  return Math.abs(hash).toString(36).slice(0, 8) || '1'
})()

function savedVolume(): number {
  const raw = localStorage.getItem(VOLUME_KEY)
  if (raw === null) return 1
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 1
}

function shuffledOrder(length: number, keepFirst: number): number[] {
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== keepFirst)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [keepFirst, ...rest]
}

/**
 * Единственный <audio> на всё приложение плюс очередь воспроизведения.
 *
 * Очередь — то, что отличает плеер от «кнопки play на каждой строчке»: тап по
 * треку в любом списке делает очередью весь этот список, дальше играет само.
 */
function PlayerProvider({ token, children }: { token: string; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [orderPos, setOrderPos] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [prepareLabel, setPrepareLabel] = useState('Скачиваю…')
  const [readyIds, setReadyIds] = useState<Set<number>>(new Set())
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set())
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<RepeatMode>('off')
  const [volume, setVolumeState] = useState(savedVolume)
  const [volumeSupported, setVolumeSupported] = useState(false)
  const [eqGains, setEqGainsState] = useState<number[]>(loadEqGains)
  // Узлы Web Audio держим в ref: пересоздавать их на каждый рендер нельзя —
  // источник из <audio> можно создать ровно один раз за время жизни элемента.
  const audioGraph = useRef<{ ctx: AudioContext; filters: BiquadFilterNode[] } | null>(null)
  // Источник отказался отдавать звук в режиме CORS. Тогда эквалайзер
  // невозможен в принципе: Web Audio выдаёт тишину для источника, который не
  // разрешил себя читать. Переключаемся на обычное воспроизведение и больше
  // не пробуем — до следующей проверки (см. rememberCorsBlocked).
  const corsBlocked = useRef(loadCorsBlocked())
  /*
   * Счётчик пересозданий <audio>.
   *
   * Менять его — единственный способ вернуть звук после того, как элемент уже
   * отдали в createMediaElementSource: эта привязка вечная, и снять её нельзя
   * ни удалением crossOrigin, ни новым src. React по смене key выбрасывает
   * старый элемент и делает новый, ни с каким графом не связанный.
   */
  const [audioKey, setAudioKey] = useState(0)
  /** Что доиграть на новом элементе после пересоздания. */
  const pendingResume = useRef<{ src: string; time: number; play: boolean } | null>(null)
  // Зеркало настроек в ref: их читают обработчики, которые не должны
  // пересоздаваться на каждое движение ползунка.
  const eqGainsRef = useRef(eqGains)

  // Гонка: пока качается трек A, юзер жмёт трек B. Когда A докачается, он не
  // должен перебить B — сверяем «поколение» запроса перед тем, как играть.
  const prepareGeneration = useRef(0)

  const headers = { Authorization: `Bearer ${token}` }
  const currentTrack = order.length > 0 ? queue[order[orderPos]] ?? null : null
  const upNext = order.slice(orderPos + 1).map((i) => queue[i]).filter(Boolean)

  /**
   * Готовит элемент к новому источнику.
   *
   * crossOrigin обязателен, чтобы Web Audio вообще получил доступ к звуку:
   * без него эквалайзер играл бы тишину. Ставить его нужно ДО присвоения
   * src — иначе браузер уже начал загрузку в другом режиме.
   */
  const applyCrossOrigin = (audio: HTMLAudioElement) => {
    if (corsBlocked.current) audio.removeAttribute('crossorigin')
    else audio.crossOrigin = 'anonymous'
  }

  /**
   * Ссылка на файл для текущего режима.
   *
   * CDN добавляет Access-Control-Allow-Origin, подставляя туда origin из
   * запроса, но кэширует ответ БЕЗ учёта origin (Vary: Origin он объявляет,
   * но не соблюдает). Из-за этого одна и та же ссылка отдаёт всем тот
   * заголовок, который достался первому запросившему.
   *
   * Отсюда метка: в неё зашит origin, поэтому у сайта и у приложения ссылки
   * разные, а значит и записи в кэше разные — каждый получает заголовок под
   * себя. Раньше тут стояла постоянная «cors=1», общая для всех; она чинила
   * кэш браузера (ответ без заголовка подставлялся в режим CORS и Web Audio
   * играл тишину), но ровно ту же беду создавала в кэше CDN — сайт и
   * приложение отбирали заголовок друг у друга.
   */
  const sourceUrl = (url: string): string => {
    if (corsBlocked.current) return url
    return url + (url.includes('?') ? '&' : '?') + `cors=${ORIGIN_TAG}`
  }

  /** Ставит трек в <audio> и запускает; если он ещё не скачан — сначала качает. */
  const load = useCallback(
    async (track: Track) => {
      const audio = audioRef.current
      if (!audio) return
      const generation = ++prepareGeneration.current

      if (track.url) {
        setIsPreparing(false)
        applyCrossOrigin(audio)
        audio.src = sourceUrl(track.url)
        ensureGraph()
        audio.play().catch(() => {})
        return
      }

      setIsPreparing(true)
      try {
        await axios.post(`/api/tracks/${track.id}/download`, {}, { headers })
        let url: string | null = null

        // Ждём готовности. Запрос «ждущий»: сервер держит его и отвечает
        // ровно в момент готовности файла. Раньше опрос шёл раз в полторы
        // секунды, и уже готовый трек в среднем ещё 0.75 с молчал впустую.
        //
        // Цикл всё равно нужен: сервер отпускает запрос по своему таймауту,
        // чтобы соединение не висело вечно, — тогда просто спрашиваем снова.
        for (let attempt = 0; attempt < 30; attempt++) {
          const status = await axios.get(`/api/tracks/${track.id}/status`, {
            headers,
            params: { wait: 10 },
            timeout: 30000,
          })
          if (status.data.status === 'ready') {
            url = status.data.url
            break
          }
          if (status.data.status === 'failed') {
            setFailedIds((prev) => new Set(prev).add(track.id))
            break
          }
          setPrepareLabel(PREPARE_LABELS[status.data.phase] || 'Скачиваю…')
          // Загрузка ещё не началась (задачи на сервере нет) — ждать нечего,
          // сервер вернулся сразу, поэтому небольшая пауза перед повтором.
          if (status.data.status === 'not_started') {
            await new Promise((r) => setTimeout(r, 300))
          }
        }

        if (generation !== prepareGeneration.current) return // юзер уже выбрал другое
        if (!url) {
          // Сервер перебрал все прокси и не смог. Молчать тут нельзя:
          // раньше кружок просто гас, и было непонятно, сломалось что-то
          // или трек ещё качается.
          setIsPreparing(false)
          setFailedIds((prev) => new Set(prev).add(track.id))
          showToast('Не удалось скачать трек')
          return
        }

        setQueue((prev) => prev.map((t) => (t.id === track.id ? { ...t, url, is_downloaded: true } : t)))
        setReadyIds((prev) => new Set(prev).add(track.id))
        setIsPreparing(false)
        applyCrossOrigin(audio)
        audio.src = sourceUrl(url)
        ensureGraph()
        audio.play().catch(() => {})
      } catch {
        // Сеть отвалилась или сервер ответил ошибкой — сообщаем только если
        // человек всё ещё ждёт именно этот трек, а не переключился давно.
        if (generation === prepareGeneration.current) {
          setIsPreparing(false)
          setFailedIds((prev) => new Set(prev).add(track.id))
          showToast('Не удалось скачать трек')
        }
      }
    },
    [token],
  )

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (tracks.length === 0) return
      const newOrder = shuffle ? shuffledOrder(tracks.length, startIndex) : tracks.map((_, i) => i)
      const pos = shuffle ? 0 : startIndex
      setQueue(tracks)
      setOrder(newOrder)
      setOrderPos(pos)
      setPosition(0)
      load(tracks[newOrder[pos]])
      axios.post(`/api/tracks/${tracks[newOrder[pos]].id}/play`, {}, { headers }).catch(() => {})
    },
    [shuffle, load, token],
  )

  const goTo = useCallback(
    (pos: number) => {
      if (pos < 0 || pos >= order.length) return
      setOrderPos(pos)
      setPosition(0)
      const track = queue[order[pos]]
      if (track) {
        load(track)
        axios.post(`/api/tracks/${track.id}/play`, {}, { headers }).catch(() => {})
      }
    },
    [order, queue, load, token],
  )

  const next = useCallback(() => {
    if (orderPos + 1 < order.length) goTo(orderPos + 1)
    else if (repeat === 'all') goTo(0)
  }, [orderPos, order.length, repeat, goTo])

  // Пока играет текущий трек, следующий уже качается на сервере. При
  // последовательном прослушивании ожидание исчезает совсем: к моменту
  // переключения файл готов, и переход мгновенный.
  //
  // Ждём, пока текущий трек перестанет готовиться: очередь скачиваний на
  // сервере ограничена числом прокси, и запрос «впрок» не должен занимать
  // слот, нужный треку, который человек слушает прямо сейчас.
  const nextUp = upNext[0]
  const nextUpId = nextUp?.id
  const nextUpReady = Boolean(nextUp?.url || nextUp?.is_downloaded)
  useEffect(() => {
    if (!nextUpId || nextUpReady || isPreparing) return
    // Ответ намеренно не ждём и ошибку глушим: это подготовка впрок, на
    // текущее воспроизведение она не влияет, а не получится — трек всё
    // равно докачается обычным путём, когда до него дойдёт очередь.
    axios.post(`/api/tracks/${nextUpId}/download`, {}, { headers }).catch(() => {})
  }, [nextUpId, nextUpReady, isPreparing, token])

  const prev = useCallback(() => {
    const audio = audioRef.current
    // Как во всех плеерах: «назад» в середине трека — сначала к его началу.
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    if (orderPos > 0) goTo(orderPos - 1)
    else if (audio) audio.currentTime = 0
  }, [orderPos, goTo])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audio.src) return
    if (audio.paused) {
      // Контекст мог быть приостановлен браузером — поднимаем его тем же
      // нажатием, которым человек включает музыку.
      ensureGraph()
      audio.play().catch(() => {})
    } else audio.pause()
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio && Number.isFinite(seconds)) audio.currentTime = seconds
  }, [])

  const toggleShuffle = useCallback(() => {
    setShuffle((was) => {
      const now = !was
      // Порядок перестраиваем так, чтобы текущий трек остался играть, а
      // менялось только то, что после него.
      setOrder((prevOrder) => {
        const currentTrackIndex = prevOrder[orderPos]
        if (now) {
          const reshuffled = shuffledOrder(queue.length, currentTrackIndex)
          setOrderPos(0)
          return reshuffled
        }
        setOrderPos(currentTrackIndex)
        return queue.map((_, i) => i)
      })
      return now
    })
  }, [orderPos, queue])

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
  }, [])

  const toggleCurrentFavorite = useCallback(() => {
    const track = order.length > 0 ? queue[order[orderPos]] : null
    if (!track) return
    const next = !track.is_favorite

    // Перерисовываем сразу, не дожидаясь сети: сердечко должно загораться под
    // пальцем. Если запрос упадёт — вернём как было.
    const apply = (value: boolean) =>
      setQueue((prev) => prev.map((t) => (t.id === track.id ? { ...t, is_favorite: value } : t)))

    apply(next)
    const request = next
      ? axios.post(`/api/tracks/${track.id}/favorite`, {}, { headers })
      : axios.delete(`/api/tracks/${track.id}/favorite`, { headers })
    request.catch(() => apply(!next))
  }, [order, orderPos, queue, token])

  // Автопереход в конце трека
  const handleEnded = useCallback(() => {
    const audio = audioRef.current
    if (repeat === 'one' && audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
      return
    }
    next()
  }, [repeat, next])

  // Управление музыкой снаружи приложения: шторка Android, экран блокировки,
  // Dynamic Island на iPhone, кнопки на наушниках. Именно это отличает
  // «сайт с музыкой» от приложения. Куда именно уходят эти вызовы, решает
  // сам модуль — на Android внутри приложения нужен нативный путь, обычного
  // navigator.mediaSession там недостаточно (см. mediaSession.ts).
  useEffect(() => {
    if (!currentTrack) return
    setMediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.uploader || 'Неизвестный исполнитель',
      // Ссылка обязательно полная: обложку грузит система, и относительный
      // путь ей не от чего отсчитывать.
      artwork: currentTrack.cover_url
        ? new URL(currentTrack.cover_url, window.location.origin).href
        : undefined,
    })
  }, [currentTrack])

  useEffect(() => {
    return setMediaHandlers({
      play: () => audioRef.current?.play(),
      pause: () => audioRef.current?.pause(),
      previoustrack: prev,
      nexttrack: next,
      seekto: seek,
    })
  }, [prev, next, seek])

  useEffect(() => {
    setMediaPlaybackState(isPlaying)
  }, [isPlaying])

  // Полоса перемотки в шторке. Обновляется по секундам, а не по каждому
  // событию времени: тех прилетает несколько раз в секунду, и дёргать ради
  // них мост в систему незачем.
  useEffect(() => {
    if (!duration) return
    setMediaPositionState(position, duration)
  }, [Math.floor(position), duration])

  /**
   * Клип готовится сразу, как заиграл трек, а не когда до него долистали.
   *
   * Раньше загрузка начиналась в момент свайпа, и человек упирался в пустой
   * чёрный экран с ожиданием. Теперь пока клипа нет — свайпать просто некуда
   * (см. NowPlayingScreen), а к моменту, когда он появится, файл уже готов.
   */
  useEffect(() => {
    const track = currentTrack
    if (!track) {
      setVideoUrl(null)
      return
    }
    if (track.video_url) {
      setVideoUrl(track.video_url)
      return
    }
    setVideoUrl(null)

    let cancelled = false
    const run = async () => {
      try {
        const started = await axios.post(`/api/tracks/${track.id}/video`, {}, { headers })
        if (started.data.status === 'ready') {
          if (!cancelled) setVideoUrl(started.data.url)
          return
        }
        // Клип весит в разы больше аудио — спрашиваем реже и терпим дольше.
        for (let attempt = 0; attempt < 120; attempt++) {
          await new Promise((r) => setTimeout(r, 2500))
          if (cancelled) return
          const status = await axios.get(`/api/tracks/${track.id}/video`, { headers })
          if (status.data.status === 'ready') {
            if (!cancelled) setVideoUrl(status.data.url)
            return
          }
        }
      } catch {
        // Клипа не будет — просто останется одна обложка.
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // Намеренно только по треку: статус меняется внутри самого эффекта, и
    // включи мы его в зависимости — эффект перезапускался бы сам от себя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, token])

  // Проверяем, слушается ли <audio> вообще. На iOS громкость только для
  // чтения: присваивание молча не срабатывает, и регулятор выглядел бы
  // сломанным. Поэтому пробуем записать и тут же прочитать обратно.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const probe = 0.42
    audio.volume = probe
    const writable = Math.abs(audio.volume - probe) < 0.001
    setVolumeSupported(writable)
    audio.volume = writable ? volume : 1
    // Один раз при старте: дальше громкость меняется только через setVolume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Строит цепочку фильтров и следит, чтобы контекст был запущен.
   *
   * Порядок важен: createMediaElementSource НАВСЕГДА уводит звук элемента в
   * граф. Если при этом контекст приостановлен (браузеры создают его именно
   * таким, пока не было действия пользователя), звук пропадает совсем —
   * ровно это и было: эквалайзер включался, и музыка замолкала до
   * перезагрузки страницы. Поэтому после создания и перед каждым
   * воспроизведением дёргаем resume().
   */
  const ensureGraph = useCallback((): boolean => {
    // Главная защита от немого плеера: без работающего CORS привязка элемента
    // к графу равносильна выключению звука, и отменить её потом нельзя.
    if (corsBlocked.current) return false
    if (audioGraph.current) {
      if (audioGraph.current.ctx.state === 'suspended') {
        audioGraph.current.ctx.resume().catch(() => {})
      }
      return true
    }
    const audio = audioRef.current
    if (!audio) return false
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      const ctx: AudioContext = new Ctx()
      const source = ctx.createMediaElementSource(audio)
      const filters = EQ_BANDS.map((frequency, index) => {
        const filter = ctx.createBiquadFilter()
        // Края спектра тянем полками, середину — колоколами: иначе самая
        // низкая и самая высокая полосы почти не влияли бы на звук.
        filter.type =
          index === 0 ? 'lowshelf' : index === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking'
        filter.frequency.value = frequency
        filter.Q.value = 1
        filter.gain.value = eqGainsRef.current[index] ?? 0
        return filter
      })
      // source -> f1 -> f2 -> ... -> выход
      filters.reduce<AudioNode>((prev, filter) => {
        prev.connect(filter)
        return filter
      }, source).connect(ctx.destination)
      audioGraph.current = { ctx, filters }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      return true
    } catch {
      return false
    }
  }, [])

  const setEqGains = useCallback((gains: number[]) => {
    eqGainsRef.current = gains
    setEqGainsState(gains)
    saveEqGains(gains)
    const graph = audioGraph.current
    if (!graph) return
    graph.filters.forEach((filter, i) => {
      // setTargetAtTime вместо мгновенного присваивания: скачок усиления
      // слышен щелчком, а при перетаскивании ползунка их были бы десятки.
      filter.gain.setTargetAtTime(gains[i] ?? 0, graph.ctx.currentTime, 0.02)
    })
  }, [])

  /**
   * Источник не загрузился. Самая вероятная причина — режим CORS: элемент с
   * crossOrigin не примет ответ без заголовка Access-Control-Allow-Origin, а
   * наш CDN отдаёт его не для всякого домена. Тогда откатываемся к обычной
   * загрузке: музыка важнее эквалайзера.
   */
  const handleAudioError = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audio.src || corsBlocked.current || !audio.crossOrigin) return
    corsBlocked.current = true
    rememberCorsBlocked()
    // Параметр режима тоже убираем: он был нужен только чтобы обойти кэш
    // ради CORS, а раз CORS не вышел — пусть играет обычная ссылка.
    const src = audio.src.replace(/[?&]cors=[^&]*/, '')

    if (audioGraph.current) {
      /*
       * Граф уже прицеплен — и это тупик: снятие crossOrigin вернёт загрузку
       * файла, но звук всё равно пойдёт через createMediaElementSource, а тот
       * для источника без разрешения CORS по стандарту выдаёт тишину. Именно
       * поэтому раньше вместе с сообщением про эквалайзер пропадал и звук.
       * Спасает только новый элемент.
       */
      pendingResume.current = { src, time: audio.currentTime || 0, play: true }
      audio.pause()
      audioGraph.current.ctx.close().catch(() => {})
      audioGraph.current = null
      setAudioKey((n) => n + 1)
    } else {
      audio.removeAttribute('crossorigin')
      audio.src = src
      audio.play().catch(() => {})
    }
    showToast('Эквалайзер недоступен для этого источника')
  }, [])

  /** Доигрывает трек на только что созданном элементе. */
  useEffect(() => {
    const pending = pendingResume.current
    if (!pending) return
    pendingResume.current = null
    const audio = audioRef.current
    if (!audio) return
    audio.removeAttribute('crossorigin')
    audio.volume = volumeSupported ? volume : 1
    audio.src = pending.src
    // Перемотку ставим только когда длительность уже известна: до этого
    // момента присваивание currentTime молча теряется.
    const seek = () => {
      if (pending.time > 0) audio.currentTime = pending.time
      audio.removeEventListener('loadedmetadata', seek)
    }
    audio.addEventListener('loadedmetadata', seek)
    if (pending.play) audio.play().catch(() => {})
    // Зависимость только от ключа: эффект — реакция на пересоздание элемента.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioKey])

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value))
    setVolumeState(clamped)
    // Громкость живёт на самом элементе, а он один на всё приложение —
    // поэтому на следующем треке она останется той же без всяких усилий.
    if (audioRef.current) audioRef.current.volume = clamped
    localStorage.setItem(VOLUME_KEY, String(clamped))
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        upNext,
        isPlaying,
        isPreparing,
        prepareLabel,
        position,
        duration,
        shuffle,
        repeat,
        volume,
        setVolume,
        volumeSupported,
        eqGains,
        setEqGains,
        playQueue,
        toggle,
        next,
        prev,
        seek,
        toggleShuffle,
        cycleRepeat,
        toggleCurrentFavorite,
        readyIds,
        failedIds,
        videoUrl,
      }}
    >
      {children}
      <audio
        key={audioKey}
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={handleAudioError}
        preload="metadata"
      />
    </PlayerContext.Provider>
  )
}

function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer() должен вызываться внутри PlayerProvider')
  return ctx
}

export { PlayerProvider, usePlayer }
