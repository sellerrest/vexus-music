import Cover from './Cover'

interface Props {
  /** Обложки первых треков плейлиста, свежие первыми. */
  covers: string[]
  size: number
  radius?: number
}

/**
 * Обложка плейлиста, собранная из обложек его треков.
 *
 * Сетка выбирается по тому, сколько картинок реально есть: 9 — 3x3, от 4 —
 * 2x2, меньше — одна во всю плитку. Показывать 2x2 с дырками нельзя: пустые
 * клетки выглядят как поломанная вёрстка, а не как задумка.
 */
function CoverMosaic({ covers, size, radius = 6 }: Props) {
  const grid = covers.length >= 9 ? 3 : covers.length >= 4 ? 2 : 1
  const used = covers.slice(0, grid * grid)

  if (grid === 1) {
    return <Cover src={used[0] ?? null} size={size} radius={radius} />
  }

  return (
    <div
      className="cover-mosaic"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        gridTemplateColumns: `repeat(${grid}, 1fr)`,
      }}
    >
      {used.map((src, i) => (
        // Плитки внутри мозаики без своего скругления: его даёт контейнер
        // через overflow, иначе на стыках вылезают светлые уголки.
        <Cover key={i} src={src} size={Math.floor(size / grid)} radius={0} />
      ))}
    </div>
  )
}

export default CoverMosaic
