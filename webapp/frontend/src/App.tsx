import { Suspense, lazy, useEffect, useState } from 'react'
import axios from 'axios'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'

/*
 * Страница публичного плейлиста грузится только когда её открыли.
 *
 * Она нужна по ссылке вида /p/<имя> и обычному пользователю приложения не
 * попадается вовсе — но её код лежал в общем файле и приезжал всем при первом
 * же заходе.
 */
const PublicPage = lazy(() => import('./pages/PublicPage'))

/*
 * Витрина тоже грузится отдельно.
 *
 * Тем, кто уже вошёл, она не показывается вовсе — а её код лежал бы в общем
 * файле и приезжал каждому при первом же заходе.
 */
const LandingPage = lazy(() => import('./pages/LandingPage'))
import { useViewportReady } from './hooks/useViewportReady'
import { typo } from './typography'
import { StaticTitleBar } from './components/DesktopTitleBar'
import { isDesktopApp } from './desktop'
import { onDeepLink } from './deepLink'

import { currentRoute, isPackagedApp } from './routes'
import { clearToken, loadToken, saveToken } from './session'

/** Мини-апп внутри Telegram: там витрина не нужна, сразу музыка. */
function insideTelegramNow(): boolean {
  return Boolean((window as any).Telegram?.WebApp?.initData)
}

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  // Признак «мы внутри Telegram» фиксируем один раз при запуске: от него
  // зависит, показывать форму входа или сообщение об ошибке авторизации.
  const [insideTelegram] = useState(() => Boolean((window as any).Telegram?.WebApp?.initData))
  const route = currentRoute()
  const insidePackagedApp = isPackagedApp()

  /*
   * Кого показывать на «/».
   *
   * Витрину видят все, кто пришёл на сайт, — вошедшие тоже. Раньше здесь
   * читался срок годности токена и вошедшего сразу уносило в /my, из-за чего
   * попасть на собственную главную страницу было нельзя: адрес подменялся
   * быстрее, чем страница успевала нарисоваться.
   *
   * Внутри собранных приложений и в Telegram витрины нет: там открыли само
   * приложение, а не сайт, и рекламировать его владельцу нечего.
   */
  const showLanding =
    route.kind === 'landing' &&
    !insidePackagedApp &&
    !insideTelegramNow()

  useEffect(() => {
    if (route.kind !== 'landing' || showLanding) return
    // Заменяем адрес, а не добавляем: иначе «назад» возвращало бы на витрину,
    // с которой снова перебрасывало бы сюда.
    window.history.replaceState(null, '', '/my')
  }, [route.kind, showLanding])
  const viewportReady = useViewportReady()
  /*
   * Плейлист, которым с нами поделились по ссылке vexmus://.
   *
   * Ссылка приходит раньше, чем приложение что-либо нарисует — если ею же
   * приложение и открыли. Поэтому она просто запоминается здесь, а
   * показывается, когда будет чем показывать.
   */
  const [sharedSlug, setSharedSlug] = useState<string | null>(null)

  useEffect(
    () => onDeepLink((target) => {
      if (target.kind === 'playlist') setSharedSlug(target.slug)
    }),
    [],
  )

  useEffect(() => {
    // Публичные страницы открываются в обычном браузере — авторизация им не
    // нужна и Telegram там может отсутствовать вовсе.
    if (route) {
      setLoading(false)
      return
    }

    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      try {
        tg.expand()
      } catch {}
      // Полоса Telegram над приложением красится своей темой мессенджера, а
      // не нашей: без этого сверху оставалась чужая тёмная плашка, не
      // совпадающая с серым фоном приложения. Мини-апп всегда телефонной
      // ширины, поэтому берём телефонное значение палитры.
      try {
        tg.setHeaderColor?.('#141414')
        tg.setBackgroundColor?.('#141414')
      } catch {
        // Старый клиент — оставляем как есть, это только косметика.
      }
    }

    const run = async () => {
      if (tg?.initData) {
        try {
          const res = await axios.post('/api/auth/telegram', { init_data: tg.initData })
          await saveToken(res.data.access_token)
          setToken(res.data.access_token)
        } catch (e: any) {
          await clearToken()
          setAuthError(e.response?.data?.detail || 'Ошибка авторизации')
        }
        setLoading(false)
        return
      }

      const saved = await loadToken()
      if (saved) setToken(saved)
      setLoading(false)
    }
    run()
  }, [])

  const loader = (
    <div className="app-shell">
      <div className="loader-wrap">
        <div className="spinner" />
      </div>
    </div>
  )

  if (route.kind === 'public') {
    return (
      <Suspense fallback={loader}>
        <PublicPage slug={route.slug} />
      </Suspense>
    )
  }

  if (showLanding) {
    return (
      <Suspense fallback={loader}>
        <LandingPage />
      </Suspense>
    )
  }

  // До входа плеера ещё нет, но полоса нужна: без неё в окне не остаётся
  // области, за которую его таскают.
  const titleBar = isDesktopApp() ? <StaticTitleBar /> : null

  // Пока идёт авторизация ИЛИ Telegram ещё разворачивает окно — показываем
  // только крутилку: она выглядит одинаково при любой ширине, а вот вёрстку
  // со списками нельзя считать по промежуточным размерам окна.
  if (loading || !viewportReady) {
    return (
      <>
        {titleBar}
        <div className="app-shell">
          <div className="loader-wrap">
            <div className="spinner" />
          </div>
        </div>
      </>
    )
  }

  // Внутри Telegram токен выдаётся сам; если там что-то пошло не так —
  // показываем причину, а не форму входа: пароль тут ни при чём.
  if (!token && insideTelegram) {
    return (
      <>
        {titleBar}
        <div className="app-shell">
          <div className="loader-wrap">
            <span>{typo(authError || 'Не удалось авторизоваться. Переоткрой приложение.')}</span>
          </div>
        </div>
      </>
    )
  }

  if (!token) {
    return (
      <>
        {titleBar}
        <LoginPage onLoggedIn={setToken} />
      </>
    )
  }

  return (
    <Dashboard
      token={token}
      sharedSlug={sharedSlug}
      onSharedShown={() => setSharedSlug(null)}
      onLogout={() => {
        void clearToken()
        setToken(null)
      }}
    />
  )
}

export default App
