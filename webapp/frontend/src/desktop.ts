/**
 * Доступ к возможностям приложения для Windows.
 *
 * Один и тот же собранный код работает и на сайте, и внутри приложения,
 * поэтому всё отсюда — необязательное: на сайте моста просто нет, и функции
 * тихо ничего не делают. Проверять «мы в приложении?» нужно именно так, а не
 * по строке браузера: приложение и сайт для него неотличимы.
 */

/** Команды кнопок панели задач Windows. */
export type DesktopCommand = 'toggle' | 'next' | 'prev'

interface DesktopBridge {
  platform: string
  setPlaybackState(state: { isPlaying: boolean; hasTrack: boolean }): void
  onCommand(handler: (command: DesktopCommand) => void): () => void
}

function bridge(): DesktopBridge | null {
  return (window as unknown as { vexusDesktop?: DesktopBridge }).vexusDesktop ?? null
}

/** Приложение для Windows, а не сайт в браузере. */
export function isDesktopApp(): boolean {
  return bridge() !== null
}

/** Сообщает системе, что играет — по этому рисуются кнопки на панели задач. */
export function reportPlayback(state: { isPlaying: boolean; hasTrack: boolean }): void {
  bridge()?.setPlaybackState(state)
}

/** Подписка на кнопки панели задач. Возвращает функцию отписки. */
export function onDesktopCommand(handler: (command: DesktopCommand) => void): () => void {
  return bridge()?.onCommand(handler) ?? (() => {})
}
