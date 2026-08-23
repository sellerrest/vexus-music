import { useRef } from 'react'
import type { ReactNode } from 'react'
import Cover from './Cover'
import CoverMosaic from './CoverMosaic'
import { tileGradient } from '../gradients'
import { typo } from '../typography'

interface CardProps {
  cover?: string | null
  /** Обложки треков для мозаики — если задано, вместо одной картинки. */
  covers?: string[]
  /** Вместо картинки — иконка на градиенте: так выглядят «Любимые треки»,
   *  «Радио», «Открытие» и жанровые подборки, у которых своей обложки нет. */
  icon?: ReactNode
  /** Ключ градиента (см. gradients.ts): у каждой подборки свой цвет. */
  gradient?: string
  title: string
  subtitle?: string | null
  size?: number
  onClick: () => void
}

/** Карточка в горизонтальной строке. */
export function CardTile({
  cover = null,
  covers,
  icon,
  gradient,
  title,
  subtitle,
  size = 140,
  onClick,
}: CardProps) {
  const art = icon ? (
    <div
      className="tile-art"
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: tileGradient(gradient || title),
      }}
    >
      {icon}
    </div>
  ) : covers && covers.length > 0 ? (
    <CoverMosaic covers={covers} size={size} radius={6} />
  ) : (
    <Cover src={cover} size={size} radius={6} />
  )

  return (
    <button type="button" className="card-tile" style={{ width: size }} onClick={onClick}>
      {art}
      {/* Подпись карточки переносится на вторую строку — тут неразрывные
          пробелы важнее всего: без них предлог остаётся висеть в конце
          первой строки («Похоже на» / «Rammstein»). */}
      <div className="card-tile-title">{typo(title)}</div>
      {subtitle && <div className="card-tile-subtitle">{typo(subtitle)}</div>}
    </button>
  )
}

interface Props {
  title: string
  /** Переход к полной подборке — ссылка справа от заголовка. */
  onShowAll?: () => void
  children: ReactNode
}

function Carousel({ title, onShowAll, children }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false })

  // На телефоне карусель листается пальцем сама. На компьютере — тянем
  // мышью. Колесо намеренно НЕ трогаем: перехват вертикальной прокрутки
  // мешает листать саму страницу, когда курсор оказался над каруселью.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Только мышь: у касаний уже есть родная инерционная прокрутка, ломать её
    // своим перетаскиванием не нужно.
    if (e.pointerType !== 'mouse') return
    const el = scrollRef.current
    if (!el) return
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!drag.current.active || !el) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 4) drag.current.moved = true
    el.scrollLeft = drag.current.startScroll - dx
  }

  const endDrag = () => {
    drag.current.active = false
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title flush">{typo(title)}</h2>
        {onShowAll && (
          <button type="button" className="section-more" onClick={onShowAll}>
            Все
          </button>
        )}
      </div>
      <div
        className="carousel"
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        // Без этого браузер начинает своё «перетаскивание картинки» вместо
        // прокрутки, и обложка уезжает за курсором как файл.
        onDragStart={(e) => e.preventDefault()}
        // После перетаскивания гасим клик, иначе отпускание мыши на карточке
        // засчитывалось бы как тап и открывало бы трек.
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault()
            e.stopPropagation()
            drag.current.moved = false
          }
        }}
      >
        {children}
      </div>
    </section>
  )
}

export default Carousel
