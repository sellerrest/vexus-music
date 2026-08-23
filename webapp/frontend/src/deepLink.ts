import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * Ссылки вида vexmus://…, которыми приложение открывают снаружи.
 *
 * Схема одна на все платформы, а приходит по-разному: на Windows система
 * передаёт адрес аргументом запуска и он попадает к нам через мост в
 * preload.js, на Android — событием от системы. Здесь оба случая сведены к
 * одной подписке, чтобы остальному коду было всё равно, где он работает.
 */

/** Что открыть по ссылке. Пока цель одна — плейлист, но форма общая. */
export type DeepLinkTarget = { kind: 'playlist'; slug: string }

export const DEEP_LINK_SCHEME = 'vexmus'

/** Собирает ссылку на плейлист — ею делятся и по ней открывают приложение. */
export function playlistDeepLink(slug: string): string {
  return `${DEEP_LINK_SCHEME}://playlist/${slug}`
}

/**
 * Разбирает адрес.
 *
 * Разбираем вручную, а не через URL: у нестандартной схемы браузеры кладут
 * всё после «://» в pathname по-разному, и на Android с Windows результат
 * отличался бы.
 */
export function parseDeepLink(raw: string): DeepLinkTarget | null {
  if (!raw) return null
  const prefix = `${DEEP_LINK_SCHEME}://`
  if (!raw.toLowerCase().startsWith(prefix)) return null
  const path = raw.slice(prefix.length).replace(/^\/+/, '')
  const [kind, value] = path.split(/[/?#]/)
  if (kind === 'playlist' && value) {
    return { kind: 'playlist', slug: decodeURIComponent(value) }
  }
  return null
}

interface DesktopBridge {
  onDeepLink?(handler: (url: string) => void): () => void
}

/**
 * Подписка на входящие ссылки. Возвращает функцию отписки.
 *
 * Ссылка может прийти самой первой, ещё до того как приложение что-либо
 * нарисует — именно так и бывает, когда им же приложение и открыли. Поэтому
 * подписываться нужно сразу при запуске, а не по нажатию.
 */
export function onDeepLink(handler: (target: DeepLinkTarget) => void): () => void {
  const deliver = (raw: string) => {
    const target = parseDeepLink(raw)
    if (target) handler(target)
  }

  const unsubscribers: Array<() => void> = []

  const desktop = (window as unknown as { vexusDesktop?: DesktopBridge }).vexusDesktop
  if (desktop?.onDeepLink) {
    unsubscribers.push(desktop.onDeepLink(deliver))
  }

  if (Capacitor.isNativePlatform()) {
    // Приложение уже работало и его открыли ссылкой.
    const listener = CapacitorApp.addListener('appUrlOpen', (event) => deliver(event.url))
    unsubscribers.push(() => {
      void listener.then((handle) => handle.remove())
    })
    // Приложение запустили самой ссылкой — она уже ждёт, событие не придёт.
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) deliver(launch.url)
    })
  }

  return () => unsubscribers.forEach((off) => off())
}
