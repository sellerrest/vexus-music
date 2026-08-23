import { useEffect, useState } from 'react'

/** Дольше этого не ждём ни при каких условиях — лучше показать содержимое,
 *  чем держать пустой экран, если сигнал о готовности почему-то не придёт. */
const MAX_WAIT_MS = 400

/**
 * Готово ли окно к отрисовке содержимого.
 *
 * Telegram открывает мини-апп с анимацией: сначала окно узкое, потом
 * разворачивается на весь экран. Если нарисовать содержимое в этот момент,
 * вёрстка считается по промежуточной ширине — обложки выглядят непривычно
 * крупными относительно экрана, а потом всё резко перестраивается. Ждём,
 * пока размеры устаканятся, и только тогда показываем.
 */
export function useViewportReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    // Вне Telegram ждать нечего — сразу рисуем.
    if (!tg) {
      setReady(true)
      return
    }

    let done = false
    const finish = () => {
      if (done) return
      done = true
      setReady(true)
    }

    // Кадр после смены размеров: к этому моменту ширина уже пересчитана.
    const onViewportChange = () => requestAnimationFrame(finish)

    tg.onEvent?.('viewportChanged', onViewportChange)
    // Если окно уже развёрнуто, события не будет — проверяем сразу.
    if (tg.isExpanded) requestAnimationFrame(finish)
    const timer = setTimeout(finish, MAX_WAIT_MS)

    return () => {
      clearTimeout(timer)
      tg.offEvent?.('viewportChanged', onViewportChange)
    }
  }, [])

  return ready
}
