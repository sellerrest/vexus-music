import { useEffect, useRef } from 'react'

interface Props {
  /** Готовая ссылка на клип. Его подготовкой занимается плеер (см.
   *  PlayerContext): запрос уходит вместе с запуском трека, а сюда компонент
   *  попадает уже с готовым файлом. */
  url: string
  /** Позиция аудио — под неё подстраивается видео. */
  position: number
  isPlaying: boolean
}

/**
 * Видеоряд клипа.
 *
 * Звук всегда остаётся за общим <audio> плеера, а <video> идёт немым и просто
 * подтягивается к его времени. Так переключение «обложка ↔ видео» не рвёт
 * воспроизведение и не создаёт двух звуковых дорожек сразу.
 */
function VideoStage({ url, position, isPlaying }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastSync = useRef(0)

  /**
   * Держим картинку в такт со звуком.
   *
   * Тут легко сделать хуже, чем есть: позиция звука приходит четыре раза в
   * секунду, и если подтягивать видео на каждое расхождение, перемотки идут
   * одна за другой. Декодер не успевает выдать кадр между ними — и вместо
   * клипа виден чёрный экран, хотя файл загружен. Поэтому: не трогаем, пока
   * идёт предыдущая перемотка, порог больше, и не чаще раза в пару секунд.
   */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.seeking || video.readyState < 2) return
    if (Math.abs(video.currentTime - position) <= 1.5) return
    const now = Date.now()
    if (now - lastSync.current < 2000) return
    lastSync.current = now
    video.currentTime = position
  }, [position])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.play().catch(() => {})
    else video.pause()
  }, [isPlaying])

  // Рамка облегает сам клип (ширина по содержимому), поэтому чёрных полей
  // не остаётся ни при каких пропорциях файла.
  return (
    <div className="video-stage">
      <video
        ref={videoRef}
        src={url}
        muted
        playsInline
        preload="auto"
        className="video-el"
        onLoadedMetadata={(e) => {
          const el = e.currentTarget
          // Догоняем текущую позицию сразу, как только видео готово —
          // иначе клип начнётся с нуля, пока звук уже на середине.
          el.currentTime = position
          if (isPlaying) el.play().catch(() => {})
        }}
      />
    </div>
  )
}

export default VideoStage
