import { Preferences } from '@capacitor/preferences'

/**
 * Где приложение держит вход.
 *
 * В браузере — localStorage, как и было. А внутри собранного приложения на
 * Android этого мало: localStorage живёт в данных WebView, и система вправе
 * их вычистить — при нехватке места, при «оптимизации памяти» оболочки
 * производителя, при обновлении самого WebView. Снаружи это выглядит так,
 * будто приложение забыло пользователя и снова просит почту с паролем.
 *
 * Поэтому на телефоне токен пишется в системное хранилище настроек: это тот
 * же файл, где приложения хранят свои настройки, и чистилки кэша его не
 * трогают. localStorage при этом продолжаем заполнять — часть кода читает
 * токен из него напрямую, и терять эту возможность незачем.
 */

const KEY = 'auth_token'
const WHY = 'auth_last_end'

/**
 * Почему вход потребовался снова.
 *
 * Причин ровно три, и снаружи они выглядят одинаково — экраном входа. Разница
 * между «сохранённого входа не нашлось» и «сохранённый вход был, но сервер его
 * не принял» решает, где искать неисправность, поэтому она и записывается.
 */
export type SessionEnd = 'нет-сохранённого' | 'сервер-отклонил' | 'вышел-сам'

/** Где на этом устройстве лежит вход — видно в профиле. */
export function storageKind(): string {
    return native() ? 'системное хранилище' : 'хранилище браузера'
}

/** Запоминает причину, по которой вход пришлось спросить заново. */
export function noteSessionEnd(reason: SessionEnd): void {
    try {
        localStorage.setItem(WHY, reason)
    } catch {
        // Не записалось — покажем экран входа без пояснения, только и всего.
    }
}

/** Причина прошлого выхода, если она известна. */
export function lastSessionEnd(): SessionEnd | null {
    try {
        return (localStorage.getItem(WHY) as SessionEnd) || null
    } catch {
        return null
    }
}

function native(): boolean {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  return Boolean(w.Capacitor?.isNativePlatform?.())
}

function fromWeb(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    // Хранилище может быть запрещено настройками браузера.
    return null
  }
}

function toWeb(token: string | null) {
  try {
    if (token === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, token)
  } catch {
    // Ничего не поделать — на телефоне вход всё равно уже сохранён нативно.
  }
}

/** Достаёт сохранённый вход. */
export async function loadToken(): Promise<string | null> {
  if (!native()) {
    const web = fromWeb()
    if (!web) noteSessionEnd('нет-сохранённого')
    return web
  }

  const { value } = await Preferences.get({ key: KEY })
  if (value) {
    // Держим веб-копию в согласии с нативной: код, который читает
    // localStorage напрямую, не должен видеть пустоту.
    toWeb(value)
    return value
  }

  // Переезд со старых сборок: там вход лежал только в localStorage. Если он
  // ещё цел — переносим, чтобы человек не вводил пароль лишний раз.
  const legacy = fromWeb()
  if (legacy) await Preferences.set({ key: KEY, value: legacy })
  else noteSessionEnd('нет-сохранённого')
  return legacy
}

/** Запоминает вход. */
export async function saveToken(token: string): Promise<void> {
  toWeb(token)
  if (native()) await Preferences.set({ key: KEY, value: token })
}

/** Забывает вход — и в веб-копии, и в системном хранилище. */
export async function clearToken(): Promise<void> {
  toWeb(null)
  if (native()) await Preferences.remove({ key: KEY })
}
