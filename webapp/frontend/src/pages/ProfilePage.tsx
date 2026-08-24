import { useState } from 'react'
import { APP_VERSION } from '../version'
import { checkForUpdate, startUpdate } from '../updates'
import type { UpdateInfo } from '../updates'
import { loadToken, noteSessionEnd, saveToken, storageKind } from '../session'
import {
  ChevronRight, Heart, Headphones, KeyRound, LogOut, RefreshCw,
  MessageCircleMore, MessageSquareText, Smartphone, Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Account } from './Dashboard'
import ProfileAvatar from '../components/ProfileAvatar'
import { insideTelegram } from '../hooks/useTelegramBack'
import { useAddToHomeScreen } from '../hooks/useAddToHomeScreen'
import { showToast } from '../toast'
import { typo } from '../typography'

interface Props {
  /** Данные о человеке приходят снаружи: их же показывает кнопка в шапке
   *  «Обзора», и запрашивать одно и то же дважды незачем. */
  me: Account | null
  onOpenPlaylist: (id: number | 'favorites') => void
  onOpenAccount: () => void
  onLogout: () => void
}

// Ссылки проекта — правь тут, всё остальное подстроится само.
const SUPPORT_URL = 'https://t.me/VexusSuppBot'
const CHANNEL_URL = 'https://t.me/VexusVpnInfo'
const CHAT_URL = 'https://t.me/VexusVpnInfo'

function openExternal(url: string) {
  const tg = (window as any).Telegram?.WebApp
  // Ссылки на Telegram открываем его же средствами — так переход остаётся
  // внутри приложения, а не выкидывает во внешний браузер.
  if (tg?.openTelegramLink && url.startsWith('https://t.me/')) tg.openTelegramLink(url)
  else if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank', 'noopener,noreferrer')
}

type Row = {
  label: string
  hint?: string
  icon: LucideIcon
  color: string
  onClick: () => void
  /** Действие необратимое: первое нажатие только переспрашивает. */
  confirm?: string
}

function ProfilePage({ me, onOpenPlaylist, onOpenAccount, onLogout }: Props) {
  // Какая строка сейчас переспрашивает. Одна на весь список: подтверждение
  // на одной кнопке должно сбрасываться, если нажали другую.
  const [confirming, setConfirming] = useState<string | null>(null)
  /*
   * Проверка обновлений по нажатию.
   *
   * Две ступени намеренно: сначала «проверить», и только если что-то нашлось —
   * «обновить». Скачивать полсотни мегабайт от одного нажатия на строку,
   * которая обещала лишь проверку, было бы нечестно.
   */
  const [update, setUpdate] = useState<{ busy: boolean; found: UpdateInfo | null }>({
    busy: false,
    found: null,
  })

  const runUpdateCheck = async () => {
    if (update.busy) return
    if (update.found) return startUpdate(update.found)
    setUpdate({ busy: true, found: null })
    const found = await checkForUpdate()
    setUpdate({ busy: false, found })
    showToast(found ? `Вышла версия ${found.version}` : 'Установлена последняя версия')
  }
  const homeScreen = useAddToHomeScreen()

  /**
   * Чистит кэш браузера: сохранённые ответы и локальные данные приложения.
   *
   * Токен входа намеренно не трогаем — иначе «очистка кэша» выкидывала бы из
   * аккаунта, а для этого есть отдельная кнопка.
   */
  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map((name) => caches.delete(name)))
      }
      const keep = await loadToken()
      localStorage.clear()
      if (keep) await saveToken(keep)
      showToast('Кэш очищен')
      // Перезагружаем: часть данных уже висит в памяти страницы, и без
      // перезагрузки очистка выглядела бы так, будто ничего не изменилось.
      setTimeout(() => window.location.reload(), 600)
    } catch {
      showToast('Не удалось очистить кэш')
    }
  }

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Аккаунт',
      rows: [
        {
          label: 'Вход по почте',
          hint: me?.email || 'не настроен',
          icon: KeyRound,
          color: 'blue',
          onClick: onOpenAccount,
        },
      ],
    },
    {
      title: 'Аудио',
      rows: [
        {
          label: 'Любимые треки',
          icon: Heart,
          color: 'pink',
          onClick: () => onOpenPlaylist('favorites'),
        },
      ],
    },
    {
      title: 'Сообщество',
      rows: [
        { label: 'Поддержка', icon: Headphones, color: 'accent', onClick: () => openExternal(SUPPORT_URL) },
        { label: 'Канал', icon: MessageSquareText, color: 'green', onClick: () => openExternal(CHANNEL_URL) },
        { label: 'Чат', icon: MessageCircleMore, color: 'blue', onClick: () => openExternal(CHAT_URL) },
      ],
    },
  ]

  const other: Row[] = []
  if (homeScreen.available) {
    other.push({
      label: 'Добавить на главный экран',
      hint: 'ярлык приложения',
      icon: Smartphone,
      color: 'accent',
      onClick: homeScreen.add,
    })
  }
  other.push(
    {
      label: update.busy
        ? 'Проверяю…'
        : update.found
          ? `Обновить до ${update.found.version}`
          : 'Проверить обновления',
      hint: `установлена ${APP_VERSION}`,
      icon: RefreshCw,
      color: 'accent',
      onClick: runUpdateCheck,
    },
    {
      label: 'Очистить кэш',
      hint: 'сохранённые данные в браузере',
      icon: Trash2,
      color: 'gray',
      onClick: clearCache,
      confirm: 'Точно очистить кэш?',
    },
  )
  // В Telegram выходить некуда: сессию там выдаёт сам мессенджер, и после
  // «выхода» приложение тут же авторизовалось бы заново.
  if (!insideTelegram()) {
    other.push({
      label: 'Выйти из аккаунта',
      icon: LogOut,
      color: 'gray',
      onClick: () => {
        noteSessionEnd('вышел-сам')
        onLogout()
      },
      confirm: 'Точно выйти?',
    })
  }
  if (other.length > 0) sections.push({ title: 'Другое', rows: other })

  return (
    <div className="page profile-page">
      <div className="profile-top">
        <ProfileAvatar src={me?.avatar_url ?? null} size={64} round ring={false} />
        <div className="profile-name">{me?.name || 'Пользователь'}</div>
        {me?.username && <div className="profile-username">@{me.username}</div>}
      </div>

      {sections.map((section) => (
        <section className="profile-section" key={section.title}>
          <div className="profile-section-title">{typo(section.title)}</div>
          {/* Две колонки на широком экране, одна на телефоне — раскладку
              задаёт CSS, а не измерения в коде: так она подстраивается и при
              изменении размера окна. */}
          <div className="profile-rows">
            {section.rows.map((row) => {
              const asking = confirming === row.label
              return (
                <button
                  key={row.label}
                  type="button"
                  className={`profile-row ${asking ? 'danger' : ''}`}
                  onClick={() => {
                    if (!row.confirm) return row.onClick()
                    if (asking) {
                      setConfirming(null)
                      row.onClick()
                    } else {
                      setConfirming(row.label)
                    }
                  }}
                >
                  <span className={`profile-row-icon ${row.color}`}>
                    <row.icon size={18} />
                  </span>
                  <span className="profile-row-text">
                    <span className="profile-row-label">{typo(asking ? row.confirm! : row.label)}</span>
                    {row.hint && !asking && <span className="profile-row-hint">{typo(row.hint)}</span>}
                  </span>
                  <ChevronRight size={17} className="profile-row-arrow" />
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {/* Версия и место хранения входа. Без них нельзя ответить на простой
          вопрос «а какая сборка у тебя стоит» — а он всплывает первым, как
          только что-то ведёт себя не так. */}
      <p className="profile-build">
        {APP_VERSION} · {storageKind()}
      </p>
    </div>
  )
}

export default ProfilePage
