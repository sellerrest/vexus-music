import type { Track } from './types'

/**
 * Музыка, доступная без интернета.
 *
 * Почему именно так, а не «покажем то, что осталось в кэше браузера»: список
 * этого кэша прочитать нельзя — такого способа просто не существует. Поэтому
 * файлы складываются в собственное хранилище (Cache Storage), которое, в
 * отличие от кэша браузера, можно перебрать. Что там лежит — то и играет,
 * без «наверное, сохранилось».
 *
 * Складываем при прослушивании, а не по кнопке: трек в этот момент уже
 * скачан браузером, у файлов год годности, и повторный запрос почти всегда
 * обслуживается из кэша — то есть сохранение обходится без второй загрузки.
 */

const CACHE_NAME = 'vexus-audio-v1'
const META_KEY = 'offline_tracks'
/** Сколько треков держим. Дальше вытесняем самые давние. */
const MAX_TRACKS = 150

export interface OfflineTrack extends Track {
  /** Когда положили — по нему вытесняем старое. */
  saved_at: number
}

function storageOk(): boolean {
  return typeof caches !== 'undefined'
}

function readMeta(): OfflineTrack[] {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? (JSON.parse(raw) as OfflineTrack[]) : []
  } catch {
    return []
  }
}

function writeMeta(list: OfflineTrack[]): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list))
  } catch {
    // Хранилище переполнено или запрещено — не беда, просто не запомним.
  }
}

/**
 * Кладёт трек в офлайн-хранилище.
 *
 * Тихо ничего не делает, если складывать нечего или некуда: у радио нет
 * файла, а в небезопасном окружении нет и самого хранилища.
 */
export async function keepTrack(track: Track): Promise<void> {
  if (!storageOk() || !track.url || track.is_radio) return

  try {
    const cache = await caches.open(CACHE_NAME)
    const already = await cache.match(track.url)
    if (!already) {
      // Обычный запрос, не no-cors: CDN возвращает тот Origin, который его
      // спросили, поэтому ответ читаемый — из него потом делается ссылка для
      // <audio>. С непрозрачным ответом так было бы нельзя.
      const res = await fetch(track.url, { mode: 'cors', credentials: 'omit' })
      if (!res.ok) return
      await cache.put(track.url, res.clone())
    }

    const meta = readMeta().filter((t) => t.id !== track.id)
    meta.unshift({ ...track, saved_at: Date.now() })

    // Вытесняем самые давние вместе с их файлами, иначе хранилище растёт до
    // предела, который браузер однажды обрубит без предупреждения.
    const keep = meta.slice(0, MAX_TRACKS)
    for (const gone of meta.slice(MAX_TRACKS)) {
      if (gone.url) await cache.delete(gone.url)
    }
    writeMeta(keep)
  } catch {
    // Нет места, нет сети, запрет — офлайн просто не пополнился.
  }
}

/**
 * Что доступно без интернета.
 *
 * Сверяем запись о треке с наличием файла: без сверки список обещал бы то,
 * чего уже нет — браузер вправе очистить хранилище сам.
 */
export async function offlineTracks(): Promise<OfflineTrack[]> {
  if (!storageOk()) return []
  try {
    const cache = await caches.open(CACHE_NAME)
    const meta = readMeta()
    const alive: OfflineTrack[] = []
    for (const t of meta) {
      if (t.url && (await cache.match(t.url))) alive.push(t)
    }
    if (alive.length !== meta.length) writeMeta(alive)
    return alive
  } catch {
    return []
  }
}

/** Есть ли вообще что слушать без интернета — для быстрой проверки. */
export async function hasOffline(): Promise<boolean> {
  return (await offlineTracks()).length > 0
}

/*
 * Ссылка на последний выданный файл.
 *
 * Такие ссылки живут, пока их не отзовут, и каждая держит копию файла в
 * памяти. Держим ровно одну: следующий трек освобождает предыдущий.
 */
let lastObjectUrl: string | null = null

/** Ссылка на сохранённый файл трека или null, если его нет. */
export async function localSource(url: string | null): Promise<string | null> {
  if (!storageOk() || !url) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const res = await cache.match(url)
    if (!res) return null
    const blob = await res.blob()
    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl)
    lastObjectUrl = URL.createObjectURL(blob)
    return lastObjectUrl
  } catch {
    return null
  }
}

/** Убирает трек из офлайна вместе с файлом. */
export async function forget(id: number): Promise<void> {
  const meta = readMeta()
  const gone = meta.find((t) => t.id === id)
  writeMeta(meta.filter((t) => t.id !== id))
  if (!storageOk() || !gone?.url) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(gone.url)
  } catch {
    // Файл останется висеть до вытеснения — не страшно.
  }
}

/** Сколько занято: число треков и объём в байтах. */
export async function offlineSize(): Promise<{ tracks: number; bytes: number }> {
  const list = await offlineTracks()
  let bytes = 0
  if (storageOk()) {
    try {
      const cache = await caches.open(CACHE_NAME)
      for (const t of list) {
        if (!t.url) continue
        const res = await cache.match(t.url)
        const len = res?.headers.get('content-length')
        if (len) bytes += Number(len)
      }
    } catch {
      // Размер не посчитался — покажем только количество.
    }
  }
  return { tracks: list.length, bytes }
}

/** Стирает всё офлайн-хранилище. */
export async function clearOffline(): Promise<void> {
  writeMeta([])
  if (!storageOk()) return
  try {
    await caches.delete(CACHE_NAME)
  } catch {
    // Ничего не поделать.
  }
}
