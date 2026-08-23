import { Capacitor } from '@capacitor/core'
import { MediaSession } from '@jofr/capacitor-media-session'

/**
 * Управление музыкой снаружи приложения.
 *
 * Отсюда берётся всё, что показывает систему играющий трек: карточка в шторке
 * Android, экран блокировки, кнопки на наушниках и клавиатуре, а также
 * «капсулы» вокруг выреза камеры — Mini Capsule у Realme, Smart Island у
 * OPPO, Now Bar у Samsung. Отдельно их поддерживать не нужно: все они читают
 * одну и ту же системную MediaSession, и как только она появляется с
 * обложкой и состоянием, капсула зажигается сама.
 *
 * Точек входа две, и выбирается она платформой:
 *
 * • Браузер — штатный navigator.mediaSession: карточку рисует сам браузер.
 *   Через него же на iPhone работает Dynamic Island.
 *
 * • Android внутри приложения — плагин. Обычный navigator.mediaSession там
 *   бесполезен: карточку в шторке рисует БРАУЗЕР Chrome, а не системный
 *   WebView, внутри которого работает приложение, — поэтому до плагина
 *   никакой системной сессии не создавалось вовсе, и капсуле было нечего
 *   показывать. Плагин поднимает настоящую службу переднего плана с нативной
 *   MediaSession — от неё и появляется уведомление, и она же не даёт системе
 *   выгрузить приложение, когда музыка играет в фоне.
 *
 * У плагина есть отличие от веб-стандарта, из-за которого его нельзя просто
 * «включить и забыть»: уведомление не появится, пока явно не выставлено
 * состояние воспроизведения и не назначены обработчики play/pause. В браузере
 * это делается само по факту звучащего <audio>.
 */

/** Внутри собранного приложения для Android, а не на сайте. */
const NATIVE_ANDROID =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

export interface TrackMeta {
  title: string
  artist: string
  /** Полная ссылка на обложку. Относительная не годится: система грузит её сама. */
  artwork?: string
}

export type MediaAction = 'play' | 'pause' | 'previoustrack' | 'nexttrack' | 'seekto'

export interface MediaHandlers {
  play: () => void
  pause: () => void
  previoustrack: () => void
  nexttrack: () => void
  seekto: (time: number) => void
}

const hasWebSession = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator

/** Название и обложка текущего трека. */
export function setMetadata(meta: TrackMeta | null): void {
  if (!meta) return
  const artwork = meta.artwork
    ? [
        { src: meta.artwork, sizes: '512x512', type: 'image/jpeg' },
        { src: meta.artwork, sizes: '256x256', type: 'image/jpeg' },
      ]
    : []

  if (NATIVE_ANDROID) {
    // Ровно одна запись, а не список размеров, как для браузера: нативная
    // часть проходит по всем и скачивает КАЖДУЮ, оставляя последнюю. Со
    // списком из двух ссылок на одну и ту же картинку обложка качалась бы
    // дважды при каждой смене трека.
    void MediaSession.setMetadata({
      title: meta.title,
      artist: meta.artist,
      artwork: artwork.slice(0, 1),
    })
    return
  }
  if (!hasWebSession()) return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: meta.title,
    artist: meta.artist,
    artwork,
  })
}

/** Играет или на паузе. На Android без этого уведомление вообще не появится. */
export function setPlaybackState(playing: boolean): void {
  const state = playing ? 'playing' : 'paused'
  if (NATIVE_ANDROID) {
    void MediaSession.setPlaybackState({ playbackState: state })
    return
  }
  if (hasWebSession()) navigator.mediaSession.playbackState = state
}

/**
 * Положение и длительность — из них система рисует полосу перемотки.
 *
 * Значения проверяются перед отправкой: браузеры бросают исключение на NaN и
 * на положении больше длительности, а такое легко случается в момент смены
 * трека, когда метаданные нового ещё не пришли.
 */
export function setPositionState(position: number, duration: number, rate = 1): void {
  if (!Number.isFinite(duration) || duration <= 0) return
  const safe = Math.min(Math.max(position, 0), duration)

  if (NATIVE_ANDROID) {
    void MediaSession.setPositionState({ duration, position: safe, playbackRate: rate })
    return
  }
  if (!hasWebSession() || !navigator.mediaSession.setPositionState) return
  try {
    navigator.mediaSession.setPositionState({ duration, position: safe, playbackRate: rate })
  } catch {
    // Разные браузеры придирчивы по-разному; полоса перемотки в шторке — не
    // та вещь, ради которой стоит ронять воспроизведение.
  }
}

/**
 * Назначает обработчики кнопок.
 *
 * Возвращает функцию отмены: обработчики замыкают на себе актуальные функции
 * плеера и переустанавливаются при их смене, а старые надо снимать — иначе
 * нажатие в шторке дёргало бы устаревшую очередь.
 */
export function setHandlers(handlers: MediaHandlers): () => void {
  const map: Array<[MediaAction, (details?: { seekTime?: number | null }) => void]> = [
    ['play', () => handlers.play()],
    ['pause', () => handlers.pause()],
    ['previoustrack', () => handlers.previoustrack()],
    ['nexttrack', () => handlers.nexttrack()],
    ['seekto', (details) => {
      if (details?.seekTime != null) handlers.seekto(details.seekTime)
    }],
  ]

  if (NATIVE_ANDROID) {
    map.forEach(([action, fn]) => {
      void MediaSession.setActionHandler({ action }, fn)
    })
    return () => {
      map.forEach(([action]) => {
        void MediaSession.setActionHandler({ action }, null)
      })
    }
  }

  if (!hasWebSession()) return () => {}
  map.forEach(([action, fn]) => {
    try {
      navigator.mediaSession.setActionHandler(action as MediaSessionAction, fn)
    } catch {
      // Часть действий поддерживают не все браузеры — пропускаем молча.
    }
  })
  return () => {
    map.forEach(([action]) => {
      try {
        navigator.mediaSession.setActionHandler(action as MediaSessionAction, null)
      } catch {
        // см. выше
      }
    })
  }
}
