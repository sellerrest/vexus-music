import { useEffect } from 'react'

/** Открыто ли приложение внутри Telegram. Вне его своей кнопки «назад» у
 *  мессенджера нет, и рисовать её приходится самим. */
export const insideTelegram = (): boolean =>
  Boolean((window as any).Telegram?.WebApp?.initData)

/**
 * Системная кнопка «Назад» самого Telegram вместо своей стрелки в интерфейсе.
 *
 * Внутри мини-аппа Telegram рисует кнопку возврата в собственной шапке — и
 * пользователь ждёт, что назад работает именно она (а на Android ещё и
 * аппаратная кнопка). Своя стрелка в контенте дублировала бы её и занимала
 * место.
 *
 * В браузере этой кнопки нет вовсе, поэтому там Dashboard рисует свою (см.
 * компонент BackButton) — этот хук в браузере просто ничего не делает.
 *
 * @param active показывать ли кнопку прямо сейчас
 * @param onBack что делать при нажатии
 */
export function useTelegramBack(active: boolean, onBack: () => void) {
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const backButton = tg?.BackButton
    if (!backButton) return

    if (!active) {
      backButton.hide()
      return
    }

    backButton.onClick(onBack)
    backButton.show()
    return () => {
      backButton.offClick(onBack)
      backButton.hide()
    }
  }, [active, onBack])
}
