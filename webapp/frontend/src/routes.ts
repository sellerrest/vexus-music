/**
 * Куда попал человек и есть ли у него действующий вход.
 *
 * Адресов теперь три: «/» — витрина для новых, «/my» — само приложение,
 * «/p/<код>» — чужой плейлист по ссылке. Раньше приложение открывалось прямо
 * на «/», и первое, что видел незнакомый человек, — форма входа.
 */

export type Route =
  | { kind: 'landing' }
  | { kind: 'app' }
  | { kind: 'public'; slug: string }

/** Разбирает адрес страницы. */
export function currentRoute(): Route {
  const path = window.location.pathname
  const shared = path.match(/^\/p\/([\w-]+)\/?$/)
  if (shared) return { kind: 'public', slug: shared[1] }
  if (/^\/my(\/|$)/.test(path)) return { kind: 'app' }
  return { kind: 'landing' }
}

/** Внутри собранного приложения витрина не нужна — там сразу музыка. */
export function isPackagedApp(): boolean {
  const w = window as unknown as {
    vexusDesktop?: unknown
    Capacitor?: { isNativePlatform?: () => boolean }
  }
  if (w.vexusDesktop) return true
  return Boolean(w.Capacitor?.isNativePlatform?.())
}
