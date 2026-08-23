interface Props {
  width?: number | string
  height?: number
  radius?: number
  className?: string
}

/**
 * Заглушка на время загрузки. Вместо крутилки по центру пустого экрана —
 * контур будущего содержимого: интерфейс не «прыгает», когда данные приходят,
 * и загрузка не выглядит как зависание.
 */
function Skeleton({ width = '100%', height = 16, radius = 4, className = '' }: Props) {
  return <div className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} />
}

export function TrackRowSkeleton() {
  return (
    <div className="track-row-skeleton">
      <Skeleton width={48} height={48} radius={4} />
      <div className="track-row-skeleton-text">
        <Skeleton width="70%" height={13} />
        <Skeleton width="40%" height={11} />
      </div>
    </div>
  )
}

export function CarouselSkeleton() {
  return (
    <div className="carousel">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-tile">
          <Skeleton width={140} height={140} radius={6} />
          <Skeleton width="80%" height={12} />
          <Skeleton width="50%" height={10} />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
