import { useState } from 'react'
import { Music } from 'lucide-react'
import { apiUrl } from '../api'

interface Props {
  src: string | null
  size: number
  radius?: number
  className?: string
}

/**
 * Обложка с заглушкой. Обложки тянутся с нашего сервера лениво (первый запрос
 * может скачивать картинку с YouTube), поэтому промах — штатная ситуация, а
 * не ошибка: показываем иконку и живём дальше.
 */
function Cover({ src: rawSrc, size, radius = 6, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  // Обложки с CDN приходят абсолютными и не меняются; относительной
  // бывает только запасная ссылка /api/cover/<id> — её и достраиваем,
  // иначе в .exe и .apk она указывала бы внутрь пакета.
  const src = apiUrl(rawSrc)

  const style = { width: size, height: size, borderRadius: radius }

  if (!src || failed) {
    return (
      <div className={`cover cover-empty ${className}`} style={style}>
        <Music size={Math.round(size * 0.4)} />
      </div>
    )
  }

  return (
    <img
      className={`cover ${className}`}
      style={style}
      src={src}
      alt=""
      // Явные размеры в атрибутах, а не только в стилях: браузер знает место
      // под картинку ещё до её загрузки и не переставляет вёрстку потом.
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      // Иначе при перетаскивании карусели мышью браузер утаскивает саму
      // картинку как файл вместо того, чтобы прокручивать список.
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

export default Cover
