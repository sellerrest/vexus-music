import { useEffect, useRef, useState } from 'react'

/** Просвет между копиями текста — он же задаёт паузу между повторами. */
const MARQUEE_GAP = 48

interface Props {
  text: string
  className?: string
  /** Крутить только когда трек играет — на паузе строка стоит на месте. */
  active?: boolean
  /** Пикселей в секунду: длинные названия не должны нестись быстрее коротких. */
  speed?: number
}

/**
 * Название, которое едет по кругу, если не помещается в строку.
 *
 * Прокрутка включается только при реальном переполнении: короткие названия
 * ездить не должны — это выглядит дёргано и мешает читать. Для бесшовной
 * петли текст дублируется, а отступ висит на самих копиях, чтобы каждая была
 * одинаковой ширины и сдвиг ровно на половину попадал в начало второй.
 */
function MarqueeText({ text, className = '', active = true, speed = 34 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const span = textRef.current
    if (!container || !span) return

    const measure = () => {
      const overflow = span.scrollWidth - container.clientWidth
      // Небольшой запас: из-за округления ширины строка может «переполняться»
      // на доли пикселя, и тогда крутилось бы вообще всё подряд.
      if (overflow > 6) setDuration((span.scrollWidth + MARQUEE_GAP) / speed)
      else setDuration(0)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [text, speed])

  const animated = duration > 0 && active

  return (
    <div ref={containerRef} className={`marquee ${animated ? 'is-animated' : ''} ${className}`}>
      <div className="marquee-inner" style={animated ? { animationDuration: `${duration}s` } : undefined}>
        <span ref={textRef}>{text}</span>
        {animated && <span aria-hidden="true">{text}</span>}
      </div>
    </div>
  )
}

export default MarqueeText
