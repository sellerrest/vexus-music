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
  if (!native()) return fromWeb()

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
