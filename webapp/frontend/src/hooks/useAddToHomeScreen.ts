import { useEffect, useState } from 'react'
import { insideTelegram } from './useTelegramBack'

/** Событие браузера с отложенным приглашением установить приложение. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Минимальная версия Telegram, где появился метод добавления на экран. */
const TELEGRAM_HOME_SCREEN_VERSION = '8.0'

/**
 * Добавление приложения на главный экран — одной кнопкой для обоих случаев.
 *
 * Внутри Telegram это делает сам мессенджер своим методом. В браузере —
 * штатное приглашение установки, но браузер даёт его не по запросу, а сам,
 * заранее и один раз: событие надо перехватить и придержать до нажатия.
 * Поэтому наличие кнопки — это состояние, а не просто вызов функции.
 */
export function useAddToHomeScreen() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [telegramReady, setTelegramReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (insideTelegram() && tg?.isVersionAtLeast?.(TELEGRAM_HOME_SCREEN_VERSION)) {
      setTelegramReady(true)
      // Уже добавлено — кнопку показывать незачем. Статус приходит событием,
      // синхронного ответа у метода нет.
      try {
        tg.checkHomeScreenStatus?.((status: string) => {
          if (status === 'added') setDone(true)
        })
      } catch {
        // Старый клиент — просто оставляем кнопку.
      }
      return
    }

    const onPrompt = (e: Event) => {
      // Без этого браузер покажет своё приглашение когда сам захочет, и наша
      // кнопка окажется бесполезной.
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      setPrompt(null)
      setDone(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const add = async () => {
    const tg = (window as any).Telegram?.WebApp
    if (telegramReady) {
      tg.addToHomeScreen()
      return
    }
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    // Повторно то же событие браузер не отдаёт — прячем кнопку в любом
    // случае, иначе она осталась бы нерабочей.
    setPrompt(null)
    if (choice.outcome === 'accepted') setDone(true)
  }

  return { available: !done && (telegramReady || prompt !== null), add }
}
