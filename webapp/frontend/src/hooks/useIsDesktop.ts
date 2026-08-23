import { useEffect, useState } from 'react'

/** С этой ширины показываем раскладку с боковой панелью вместо нижнего меню. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Широкий экран или нет.
 *
 * Слушаем именно медиазапрос, а не разовое измерение: окно на компьютере
 * меняют размером, и раскладка должна переключаться вместе с ним.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(media.matches)
    media.addEventListener('change', onChange)
    onChange()
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
