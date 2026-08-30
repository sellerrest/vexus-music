import { useCallback, useEffect, useMemo, useState } from 'react'
import { noteSessionEnd } from '../session'
import type { ReactNode } from 'react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Compass, Disc3, Radio, Search, Sparkles, X } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import MiniPlayer from '../components/MiniPlayer'
import NowPlayingScreen from '../components/NowPlayingScreen'
import ToastHost from '../components/ToastHost'
import { PlayerProvider } from '../context/PlayerContext'
import DesktopTitleBar from '../components/DesktopTitleBar'
import { isDesktopApp } from '../desktop'
import { NavContext } from '../context/NavContext'
import BackButton from '../components/BackButton'
import SearchResults from '../components/SearchResults'
import Sidebar from '../components/Sidebar'
import SettingsDrawer from '../components/SettingsDrawer'
import FlowBanner from '../components/FlowBanner'
import UpdateBanner from '../components/UpdateBanner'
import OfflineSheet from '../components/OfflineSheet'
import OfflinePage from './OfflinePage'
import { offlineTracks } from '../offline'
import { checkForUpdate, dismiss, isDismissed, shouldCheckNow } from '../updates'
import type { UpdateInfo } from '../updates'
import { insideTelegram, useTelegramBack } from '../hooks/useTelegramBack'
import { useIsDesktop } from '../hooks/useIsDesktop'
import AccountPage from './AccountPage'
import BrowsePage from './BrowsePage'
import FeedPage from './FeedPage'
import LibraryPage from './LibraryPage'
import RadioPage from './RadioPage'
import PublicPage from './PublicPage'
import ProfilePage from './ProfilePage'
import PlaylistDetailPage from './PlaylistDetailPage'
import type { TabKey } from '../components/BottomNav'
import type { Track } from '../types'

export interface Account {
  name: string
  username: string | null
  avatar_url: string | null
  email: string | null
}

interface Props {
  token: string
  onLogout: () => void
  /** Плейлист, присланный ссылкой vexmus://. null — ничего не присылали. */
  sharedSlug?: string | null
  /** Сообщить наверх, что присланный плейлист показан и его можно забыть. */
  onSharedShown?: () => void
}

type PlaylistRef = number | 'favorites'

/** Что открыто поверх вкладки: плейлист или одна из подборок. */
type OpenView =
  | { kind: 'playlist'; id: PlaylistRef }
  /* Лента рекомендаций «Радио для тебя» — подборка треков под вкус. */
  | { kind: 'radio' }
  /* Настоящее радио: список станций из каталога. Отдельный вид, потому что
     с лентой выше их роднит только слово. */
  | { kind: 'broadcast' }
  /* Чужой плейлист, открытый по ссылке: его можно послушать и забрать себе. */
  | { kind: 'shared'; slug: string }
  | { kind: 'discovery' }
  | { kind: 'trackRadio'; trackId: number; title: string; heading?: string; cover?: string | null }
  | { kind: 'category'; slug: string; title: string }
  | { kind: 'account' }

function Dashboard({ token, onLogout, sharedSlug, onSharedShown }: Props) {
  const [tab, setTab] = useState<TabKey>('browse')
  // Открытый экран принадлежит вкладке, а не приложению целиком. Раньше он
  // был один общий и подменял собой любую вкладку: уходишь в «Обзор» — а там
  // всё ещё плейлист. Теперь у каждой вкладки своя история: ушёл — экран
  // скрылся, вернулся — он на месте.
  const [openByTab, setOpenByTab] = useState<Record<TabKey, OpenView | null>>({
    browse: null,
    library: null,
    flow: null,
  })
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)
  /*
   * Панель настроек и данные о человеке.
   *
   * Учётку запрашиваем здесь, а не внутри профиля: аватарка нужна ещё и
   * кнопке в шапке «Обзора», и два независимых запроса за одним и тем же
   * означали бы две разные аватарки в момент загрузки.
   */
  const [settingsOpen, setSettingsOpen] = useState(false)
  /*
   * Обновление, о котором стоит сказать.
   *
   * Проверяем при запуске, но не чаще раза в сутки — см. updates.ts. Плашка
   * появляется только если эту версию ещё не откладывали.
   */
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  /*
   * Связь с сервером.
   *
   * «Ждём» — пока идёт первая проверка; «есть» — сервер ответил; «спросить» —
   * не ответил за отведённое время, предлагаем офлайн; «офлайн» — человек
   * согласился.
   */
  const [link, setLink] = useState<'ждём' | 'есть' | 'спросить' | 'офлайн'>('ждём')
  const [offlineCount, setOfflineCount] = useState(0)
  const [checking, setChecking] = useState(false)
  const [me, setMe] = useState<Account | null>(null)

  /**
   * Проверяет, отвечает ли сервер.
   *
   * Пять секунд — не «пока не надоест»: за это время обычный запрос успевает
   * дважды, а человек с пропавшей связью уже понимает, что что-то не так.
   * Заодно забираем данные аккаунта, чтобы не слать второй запрос ради того
   * же самого.
   */
  const checkLink = useCallback(async () => {
    setChecking(true)
    try {
      const res = await axios.get('/api/account', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      })
      setMe(res.data)
      setLink('есть')
    } catch (err: any) {
      // Отказ сервера — это не обрыв связи: он ответил, просто отказал.
      // Офлайн предлагаем только когда ответа не было вовсе.
      if (err?.response) {
        setLink('есть')
      } else {
        setOfflineCount((await offlineTracks()).length)
        setLink('спросить')
      }
    } finally {
      setChecking(false)
    }
  }, [token])

  useEffect(() => {
    void checkLink()
  }, [checkLink])

  useEffect(() => {
    if (!shouldCheckNow()) return
    checkForUpdate().then((found) => {
      if (found && !isDismissed(found.version)) setUpdate(found)
    })
  }, [])
  const isDesktop = useIsDesktop()
  // Поиск на компьютере живёт в боковой панели, поэтому его состояние —
  // здесь, а не внутри страницы «Обзор» (там своё, для телефона).
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  /*
   * Открыто ли радиовещание.
   *
   * От этого зависит, что делает единственная строка поиска на широком
   * экране: ищет станции или музыку. Без такой привязки человек в разделе
   * радио набирал бы название станции и получал треки с YouTube.
   */
  const inBroadcast = openByTab[tab]?.kind === 'broadcast'
  const searchLabel = inBroadcast ? 'Найти радиостанцию' : 'Найти музыку'

  const open = useCallback(
    (view: OpenView) => setOpenByTab((prev) => ({ ...prev, [tab]: view })),
    [tab],
  )
  const openPlaylist = useCallback((id: PlaylistRef) => open({ kind: 'playlist', id }), [open])

  /*
   * Плейлист, присланный ссылкой vexmus://, показываем сразу.
   *
   * Открывается во вкладке медиатеки, а не в текущей: человек пришёл по
   * ссылке за конкретным плейлистом, и логично оказаться там, куда он его
   * потом заберёт. Признак сбрасывается наверх, иначе тот же плейлист
   * открывался бы заново при каждой перерисовке.
   */
  useEffect(() => {
    if (!sharedSlug) return
    setSearchOpen(false)
    setTab('library')
    setOpenByTab((prev) => ({ ...prev, library: { kind: 'shared', slug: sharedSlug } }))
    onSharedShown?.()
  }, [sharedSlug, onSharedShown])

  // Клик по плейлисту в боковой панели показывает его справа. Панель на
  // компьютере видна всегда, поэтому открывать нужно в текущей области, а
  // не переключать вкладку.
  const openPlaylistFromSidebar = useCallback(
    (id: PlaylistRef) => {
      setSearchOpen(false)
      setOpenByTab((prev) => ({ ...prev, [tab]: { kind: 'playlist', id } }))
    },
    [tab],
  )

  const nav = useMemo(
    () => ({
      openRadio: () => open({ kind: 'radio' }),
      openDiscovery: () => open({ kind: 'discovery' }),
      openTrackRadio: (track: Track) =>
        open({ kind: 'trackRadio', trackId: track.id, title: track.title, cover: track.cover_url }),
      // «Похоже на {исполнитель}» — та же подборка по треку, но заголовок
      // называет артиста, а не трек-затравку: для человека это подборка про
      // исполнителя, и про затравку он ничего не знает.
      openArtistRadio: (seedTrackId: number, title: string, cover?: string | null) =>
        open({ kind: 'trackRadio', trackId: seedTrackId, title: '', heading: title, cover }),
      openCategory: (slug: string, title: string) => open({ kind: 'category', slug, title }),
    }),
    [open],
  )

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const loadRadio = useCallback(
    async (offset: number) => {
      const res = await axios.get('/api/radio', { headers, params: { offset, limit: 30 } })
      return { tracks: res.data.tracks as Track[], hasMore: Boolean(res.data.has_more) }
    },
    [headers],
  )

  const loadDiscovery = useCallback(
    async (offset: number) => {
      // «Открытие» — конечная подборка, целиком приходит одним ответом.
      if (offset > 0) return { tracks: [] as Track[], hasMore: false }
      const res = await axios.get('/api/discovery', { headers })
      return { tracks: res.data.tracks as Track[], hasMore: false }
    },
    [headers],
  )

  useEffect(() => {
    // Токен живёт сутки от открытия мини-аппа (см. webapp_api.py). Протух —
    // любой запрос словит 401: сбрасываем и возвращаем на экран авторизации,
    // откуда App.tsx возьмёт свежий initData сам.
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          // Отмечаем причину: сохранённый вход был, но сервер его не принял.
          // Это совсем другой случай, чем «вход не сохранился», и по экрану
          // входа их не различить.
          noteSessionEnd('сервер-отклонил')
          onLogout()
        }
        return Promise.reject(err)
      },
    )
    return () => axios.interceptors.response.eject(id)
  }, [onLogout])

  // Штатная кнопка «Назад» самого Telegram вместо своей стрелки в контенте:
  // закрывает сначала полноэкранный плеер, потом плейлист текущей вкладки.
  const handleBack = useCallback(() => {
    if (nowPlayingOpen) setNowPlayingOpen(false)
    else setOpenByTab((prev) => ({ ...prev, [tab]: null }))
  }, [nowPlayingOpen, tab])

  const canGoBack = nowPlayingOpen || openByTab[tab] !== null
  useTelegramBack(canGoBack, handleBack)
  // Вне Telegram системной кнопки нет — рисуем свою, иначе из плеера и
  // открытых подборок в браузере было бы не выйти вообще.
  const [showOwnBack] = useState(() => !insideTelegram())

  /*
   * «Поток» — бесконечная лента под вкус, отдельной вкладкой.
   *
   * Раньше она пряталась карточкой «Радио» в строке «Для тебя» на «Обзоре»:
   * до неё надо было доскроллить и догадаться нажать. Теперь это вкладка,
   * а карточки на «Обзоре» больше нет — иначе одно и то же открывалось бы
   * двумя разными путями.
   */
  const flowPage = (
    <FeedPage
      token={token}
      title="Поток"
      subtitle="Бесконечная лента под твой вкус"
      icon={<Radio size={56} strokeWidth={1.5} />}
      gradient="radio"
      loadPage={loadRadio}
      countable={false}
      display
      banner={(props) => <FlowBanner {...props} />}
    />
  )

  const settingsContent = (
    <ProfilePage
      me={me}
      onOpenPlaylist={(id) => {
        setSettingsOpen(false)
        openPlaylist(id)
      }}
      onOpenAccount={() => {
        setSettingsOpen(false)
        open({ kind: 'account' })
      }}
      onLogout={onLogout}
    />
  )

  const renderOpen = (view: OpenView) => {
    switch (view.kind) {
      case 'playlist':
        return <PlaylistDetailPage key={`p${view.id}`} token={token} playlistId={view.id} />
      case 'broadcast':
        return <RadioPage key="broadcast" token={token} />
      case 'shared':
        return <PublicPage key={`s${view.slug}`} slug={view.slug} token={token} />
      case 'radio':
        return (
          <FeedPage
            key="radio"
            token={token}
            title="Радио для тебя"
            subtitle="Бесконечный поток под твой вкус"
            icon={<Radio size={56} strokeWidth={1.5} />}
            gradient="radio"
            loadPage={loadRadio}
          />
        )
      case 'discovery':
        return (
          <FeedPage
            key="discovery"
            token={token}
            title="Открытие для тебя"
            subtitle="Исполнители, которых ты ещё не слушал"
            icon={<Compass size={56} strokeWidth={1.5} />}
            gradient="discovery"
            loadPage={loadDiscovery}
          />
        )
      case 'trackRadio':
        return (
          <FeedPage
            // key по треку: открыл радио по другому треку — список должен
            // перечитаться, а не показать прежний.
            key={`tr${view.trackId}`}
            token={token}
            title={view.heading || 'Похожее'}
            subtitle={view.heading ? undefined : view.title}
            cover={view.cover}
            icon={<Sparkles size={56} strokeWidth={1.5} />}
            gradient="similar"
            loadPage={async (offset) => {
              if (offset > 0) return { tracks: [], hasMore: false }
              const res = await axios.get(`/api/tracks/${view.trackId}/radio`, { headers })
              return { tracks: res.data.tracks as Track[], hasMore: false }
            }}
          />
        )
      case 'account':
        return <AccountPage key="account" token={token} />
      case 'category':
        return (
          <FeedPage
            key={`cat${view.slug}`}
            token={token}
            title={view.title}
            icon={<Disc3 size={56} strokeWidth={1.5} />}
            gradient={view.slug}
            loadPage={async (offset) => {
              if (offset > 0) return { tracks: [], hasMore: false }
              const res = await axios.get(`/api/category/${view.slug}`, { headers })
              return { tracks: res.data.tracks as Track[], hasMore: false }
            }}
          />
        )
    }
  }

  // Страница вкладки и открытый в ней экран остаются смонтированными:
  // переключение — это только смена видимости, без повторной загрузки данных
  // и с сохранением прокрутки.
  const renderTab = (key: TabKey, page: ReactNode) => {
    const opened = openByTab[key]
    return (
      <div style={{ display: tab === key ? 'block' : 'none' }}>
        <div style={{ display: opened === null ? 'block' : 'none' }}>{page}</div>
        {opened !== null && renderOpen(opened)}
      </div>
    )
  }

  // На широком экране вкладок нет: медиатека всегда слева, а справа — одна
  // открытая вещь, которую заменяет любой следующий выбор.
  const desktopMain = () => {
    if (searchOpen && query.trim()) {
      // В разделе радиовещания та же строка ищет станции: страница получает
      // запрос снаружи и показывает результат на своём месте.
      if (inBroadcast) return <RadioPage token={token} externalQuery={query} />
      // Обёртка .page обязательна: без неё у списка нет боковых отступов и
      // строки прижимаются к самому краю блока — именно так результаты и
      // «уезжали влево».
      return (
        <div className="page">
          <SearchResults token={token} query={query} />
        </div>
      )
    }
    const opened = openByTab[tab]
    if (opened !== null) return renderOpen(opened)
    if (tab === 'flow') return flowPage
    return (
      <BrowsePage
        token={token}
        avatarUrl={me?.avatar_url ?? null}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    )
  }

  // В офлайне показываем только сохранённое: остальные вкладки без сервера
  // всё равно пусты, и водить по ним человека было бы издевательством.
  const body = link === 'офлайн' ? (
    <OfflinePage token={token} />
  ) : isDesktop ? (
    <div className="desktop-shell">
      <Sidebar
        active={
          searchOpen ? 'search' : tab === 'flow' ? 'flow' : 'browse'
        }
        onOpenBrowse={() => {
          setSearchOpen(false)
          setQuery('')
          setTab('browse')
          setOpenByTab((prev) => ({ ...prev, browse: null }))
        }}
        onOpenFlow={() => {
          setSearchOpen(false)
          setQuery('')
          setTab('flow')
          setOpenByTab((prev) => ({ ...prev, flow: null }))
        }}
        onToggleSearch={() => setSearchOpen((was) => !was)}
        searchLabel={searchLabel}
      >
        <LibraryPage
          token={token}
          onOpenPlaylist={openPlaylistFromSidebar}
          onOpenRadio={() => {
            setSearchOpen(false)
            setOpenByTab((prev) => ({ ...prev, [tab]: { kind: 'broadcast' } }))
          }}
        />
      </Sidebar>

      {/* Строка поиска живёт здесь, а не в панели: она должна тянуться до
          правого края экрана, то есть перекрывать правый блок. */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="desktop-search"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Search size={17} />
            <input
              type="text"
              autoFocus
              placeholder={inBroadcast ? 'Название станции' : 'Трек или исполнитель'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false)
                setQuery('')
              }}
              aria-label="Закрыть поиск"
            >
              <X size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`main-pane ${searchOpen ? 'searching' : ''}`}>
        {/* Возврат из открытой подборки — в самом блоке, а не поверх окна:
            слева от него панель, и общая кнопка перекрывала бы её. */}
        {openByTab[tab] !== null && !searchOpen && (
          <button type="button" className="pane-back" onClick={handleBack} aria-label="Назад">
            <ChevronLeft size={20} />
          </button>
        )}
        {desktopMain()}
      </main>
    </div>
  ) : (
    <>
      {renderTab(
        'browse',
        <BrowsePage
          token={token}
          avatarUrl={me?.avatar_url ?? null}
          onOpenSettings={() => setSettingsOpen(true)}
        />,
      )}
      {renderTab(
        'library',
        <LibraryPage
          token={token}
          onOpenPlaylist={openPlaylist}
          onOpenRadio={() => open({ kind: 'broadcast' })}
        />,
      )}
      {renderTab('flow', flowPage)}
      <BottomNav active={tab} onChange={setTab} />
    </>
  )

  return (
    <PlayerProvider token={token}>
      <NavContext.Provider value={nav}>
        {/* Внутри провайдера: полосе нужен доступ к плееру — она
            показывает играющий трек и обслуживает кнопки на панели задач. */}
        {isDesktopApp() && <DesktopTitleBar />}
        <div className={`app-shell ${isDesktop ? 'is-desktop' : ''}`}>
          {body}

          {/* Полноэкранный плеер закрывается своей стрелкой вниз и свайпом —
              вторая кнопка возврата поверх него была бы лишней. Системную
              кнопку Telegram при этом не трогаем: без неё аппаратный «назад»
              на Android закрывал бы весь мини-апп вместо плеера. */}
          {showOwnBack && !isDesktop && !nowPlayingOpen && openByTab[tab] !== null && (
            <BackButton onClick={handleBack} />
          )}
          <AnimatePresence>
            {link === 'спросить' && (
              <OfflineSheet
                count={offlineCount}
                busy={checking}
                onRetry={() => void checkLink()}
                onOffline={() => setLink('офлайн')}
                /* Закрыть — значит «понял, оставьте меня»: приложение
                   остаётся как есть, без повторных напоминаний. */
                onClose={() => setLink('есть')}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {update && (
              <UpdateBanner
                info={update}
                onClose={() => {
                  dismiss(update.version)
                  setUpdate(null)
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {settingsOpen && (
              <SettingsDrawer onClose={() => setSettingsOpen(false)}>{settingsContent}</SettingsDrawer>
            )}
          </AnimatePresence>

          <MiniPlayer onOpen={() => setNowPlayingOpen(true)} />
          <ToastHost />

          <AnimatePresence>
            {nowPlayingOpen && <NowPlayingScreen token={token} onClose={() => setNowPlayingOpen(false)} />}
          </AnimatePresence>
        </div>
      </NavContext.Provider>
    </PlayerProvider>
  )
}

export default Dashboard
