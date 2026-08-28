import { APP_VERSION } from './version'
import { isDesktopApp } from './desktop'

/**
 * Проверка обновлений по релизам на GitHub.
 *
 * Ходим в открытый API без ключа: он отдаёт «Access-Control-Allow-Origin: *»,
 * поэтому запрос проходит и с сайта, и из приложения. Ограничение — 60
 * запросов в час на адрес, чего с запасом хватает: сами проверяем раз в сутки,
 * остальное — по нажатию человека.
 *
 * Обновление не устанавливается внутри приложения, а отдаётся системе: ссылка
 * открывается наружу, дальше загрузчик Android или Windows делает своё дело.
 * Так не нужно ни разрешение на установку пакетов, ни собственный установщик,
 * а запрос «разрешить установку из неизвестного источника» человек видит от
 * самой системы — в тот момент, когда открывает скачанный файл.
 */

const RELEASES_API = 'https://api.github.com/repos/sellerrest/vexus-music/releases/latest'
const RELEASES_PAGE = 'https://github.com/sellerrest/vexus-music/releases/latest'
const DISMISSED_KEY = 'update_dismissed'
const CHECKED_KEY = 'update_checked_at'
/** Раз в сутки — чаще бессмысленно, выпуски выходят не ежечасно. */
const CHECK_EVERY_MS = 24 * 3600 * 1000

export interface UpdateInfo {
  version: string
  /** Что открыть, чтобы обновиться: файл под эту платформу или страница. */
  url: string
  /** Есть ли готовый файл именно под эту платформу. */
  hasBuild: boolean
}

/**
 * Умеет ли эта площадка обновляться.
 *
 * В браузере — нет, и предлагать там «обновиться» бессмысленно: страница
 * всегда свежая, её версия меняется сама при следующей выкладке сайта.
 * Разговор про версии уместен только там, где стоит установленный файл.
 */
export function updatesSupported(): boolean {
  return platform() !== 'web'
}

/** Платформа, на которой сейчас работает приложение. */
function platform(): 'android' | 'windows' | 'web' {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  if (w.Capacitor?.isNativePlatform?.()) return 'android'
  if (isDesktopApp()) return 'windows'
  return 'web'
}

/** Имя файла сборки под текущую платформу. */
function assetName(): string | null {
  const p = platform()
  if (p === 'android') return 'VexusMusic.apk'
  if (p === 'windows') return 'VexusMusic-Setup.exe'
  return null
}

/**
 * Сравнивает версии вида «1.0.4».
 *
 * Именно по числам, а не по строке: «1.0.10» строкой меньше «1.0.9», и
 * десятое исправление никто бы не увидел.
 */
function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split('.').map((n) => parseInt(n, 10) || 0)
  const b = current.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Хранилище запрещено — проверим заново в следующий раз, не беда.
  }
}

/**
 * Спрашивает GitHub про последний выпуск.
 *
 * Возвращает null, если обновляться не на что: версия та же или старее, либо
 * до сети не достучались. Ошибку наружу не бросаем — проверка обновлений не
 * тот повод, чтобы показывать человеку сбой.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!updatesSupported()) return null
  let data: { tag_name?: string; assets?: { name: string; browser_download_url: string }[] }
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return null
    data = await res.json()
  } catch {
    return null
  }
  write(CHECKED_KEY, String(Date.now()))

  const version = (data.tag_name || '').replace(/^v/, '')
  if (!version || !isNewer(version, APP_VERSION)) return null

  const wanted = assetName()
  const asset = wanted ? (data.assets || []).find((a) => a.name === wanted) : undefined
  return {
    version,
    url: asset?.browser_download_url || RELEASES_PAGE,
    hasBuild: Boolean(asset),
  }
}

/** Проверять ли самим при запуске: не чаще раза в сутки. */
export function shouldCheckNow(): boolean {
  const last = Number(read(CHECKED_KEY))
  return !Number.isFinite(last) || Date.now() - last > CHECK_EVERY_MS
}

/** Эту версию человек уже отложил — плашку больше не показываем. */
export function isDismissed(version: string): boolean {
  return read(DISMISSED_KEY) === version
}

export function dismiss(version: string): void {
  write(DISMISSED_KEY, version)
}

/**
 * Отдаёт обновление системе.
 *
 * В приложениях ссылка уходит наружу: на Android её подхватывает загрузчик и
 * показывает файл в шторке, на Windows — браузер. Установку дальше запускает
 * сам человек, и система в этот момент спрашивает разрешение, если файл
 * пришёл не из магазина.
 */
export function startUpdate(info: UpdateInfo): void {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.openLink) tg.openLink(info.url)
  else window.open(info.url, '_blank', 'noopener,noreferrer')
}

export { RELEASES_PAGE }
