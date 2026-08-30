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
  | { kind: 'notfound' }

/** Разбирает адрес страницы. */
export function currentRoute(): Route {
  const path = window.location.pathname
  const shared = path.match(/^\/p\/([\w-]+)\/?$/)
  if (shared) return { kind: 'public', slug: shared[1] }
  if (/^\/my(\/|$)/.test(path)) return { kind: 'app' }
  // «/index.html» — это тот же корень: приложение для Windows грузит страницу
  // именно так (app://vexus/index.html), и без этой строки оно открывалось бы
  // на «страницы не существует» вместо музыки.
  if (path === '/' || path === '' || path === '/index.html') return { kind: 'landing' }

  /*
   * Внутри собранного приложения неправильных адресов не бывает.
   *
   * Человек не набирает адрес руками — он запустил программу. Любой
   * неожиданный путь тут означает особенность упаковки, а не опечатку, и
   * показывать «такой страницы нет» вместо приложения было бы враньём.
   */
  if (isPackagedApp()) return { kind: 'landing' }
  /*
   * Всё остальное — несуществующий адрес.
   *
   * Раньше сюда попадала витрина: любая опечатка в ссылке показывала рекламу
   * приложения вместо честного «такой страницы нет». Сайт лежит в хранилище, и
   * оно на неизвестный путь отдаёт index.html — значит разбираться, что это за
   * адрес, приходится здесь.
   */
  return { kind: 'notfound' }
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
