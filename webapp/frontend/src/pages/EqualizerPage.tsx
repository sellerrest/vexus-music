import { useRef, useState } from 'react'
import { usePlayer } from '../context/PlayerContext'
import {
  EQ_BAND_LABELS, EQ_BANDS, EQ_FLAT, EQ_MAX_GAIN, EQ_PRESETS, matchesPreset,
} from '../equalizer'
import { typo } from '../typography'

/** Высота поля с полосами. Ширина резиновая. */
const H = 220

/**
 * Кривая по точкам полос — сглаженная, чтобы поле читалось как настройка
 * тембра, а не как набор отдельных столбиков.
 */
function curvePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const mid = (a.x + b.x) / 2
    // Кубическая кривая с контрольными точками на середине отрезка: даёт
    // плавный переход без выбросов за пределы соседних значений.
    d += ` C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`
  }
  return d
}

function EqualizerPage() {
  const { eqGains, setEqGains } = usePlayer()
  const boxRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef<number | null>(null)
  const [active, setActive] = useState<number | null>(null)

  const count = EQ_BANDS.length
  const gainToY = (g: number) => H / 2 - (g / EQ_MAX_GAIN) * (H / 2 - 14)
  const yToGain = (y: number) => {
    const raw = ((H / 2 - y) / (H / 2 - 14)) * EQ_MAX_GAIN
    return Math.max(-EQ_MAX_GAIN, Math.min(EQ_MAX_GAIN, Math.round(raw * 2) / 2))
  }

  /** Какая полоса под пальцем и какое усиление ей соответствует. */
  const fromPointer = (clientX: number, clientY: number) => {
    const box = boxRef.current
    if (!box) return null
    const rect = box.getBoundingClientRect()
    const step = rect.width / count
    const index = Math.max(0, Math.min(count - 1, Math.floor((clientX - rect.left) / step)))
    const y = ((clientY - rect.top) / rect.height) * H
    return { index, gain: yToGain(y) }
  }

  const apply = (index: number, gain: number) => {
    const next = [...eqGains]
    next[index] = gain
    setEqGains(next)
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const hit = fromPointer(e.clientX, e.clientY)
    if (!hit) return
    // Захват указателя: палец может уйти за пределы поля, но события всё
    // равно продолжат приходить сюда — иначе перетаскивание обрывалось бы
    // на краю.
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = hit.index
    setActive(hit.index)
    apply(hit.index, hit.gain)
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current === null) return
    const hit = fromPointer(e.clientX, e.clientY)
    if (!hit) return
    // Полосу не меняем на ходу: палец ведут вверх-вниз, и случайный уход
    // вбок не должен перекидывать настройку на соседнюю частоту.
    apply(dragging.current, hit.gain)
  }

  const endDrag = () => {
    dragging.current = null
    setActive(null)
  }

  const step = 100 / count
  const points = eqGains.map((g, i) => ({ x: (i + 0.5) * step, y: gainToY(g) }))

  return (
    <div className="page">
      <h1 className="page-heading">Эквалайзер</h1>

      <div className="eq-presets">
        {EQ_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`eq-preset ${matchesPreset(eqGains, preset.gains) ? 'active' : ''}`}
            onClick={() => setEqGains([...preset.gains])}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div
        className="eq-box"
        ref={boxRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="eq-svg">
          {/* Нулевая линия — от неё считается усиление. */}
          <line x1="0" y1={H / 2} x2="100" y2={H / 2} className="eq-zero" />

          {eqGains.map((g, i) => {
            const x = (i + 0.5) * step
            const y = gainToY(g)
            const top = Math.min(y, H / 2)
            const height = Math.abs(H / 2 - y)
            return (
              <rect
                key={i}
                x={x - step * 0.28}
                y={top}
                width={step * 0.56}
                height={Math.max(height, 1)}
                rx="1"
                className={`eq-bar ${active === i ? 'active' : ''}`}
              />
            )
          })}

          <path d={curvePath(points)} className="eq-curve" />

          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.6" className={`eq-dot ${active === i ? 'active' : ''}`} />
          ))}
        </svg>

        <div className="eq-labels">
          {EQ_BAND_LABELS.map((label, i) => (
            <span key={label} className={active === i ? 'active' : ''}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="eq-readout">
        {eqGains.map((g, i) => (
          <span key={i} className={active === i ? 'active' : ''}>
            {g > 0 ? '+' : ''}
            {g}
          </span>
        ))}
      </div>

      <button type="button" className="eq-reset" onClick={() => setEqGains([...EQ_FLAT])}>
        Сбросить
      </button>

      <p className="eq-hint">
        {typo(
          'Тяни полосы вверх или вниз. Значения в децибелах, середина - без изменений. Настройки применяются сразу и запоминаются.',
        )}
      </p>
    </div>
  )
}

export default EqualizerPage
