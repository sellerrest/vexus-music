import { useState } from 'react'
import { User } from 'lucide-react'
import { apiUrl } from '../api'

interface Props {
  src: string | null
  size?: number
  /** Круг вместо скруглённого квадрата — для маленькой кнопки в шапке. */
  round?: boolean
  /** Бегущее пунктирное кольцо. В шапке оно ни к чему: там аватарка мелкая
   *  и стоит рядом с текстом, а кольцо перетягивает на себя всё внимание. */
  ring?: boolean
}

/**
 * Аватарка со скруглённым квадратом и бегущим пунктирным кольцом.
 *
 * Пунктир 23/15 и смещение на 38 за цикл подобраны не случайно: сумма
 * штриха с пробелом равна сдвигу, поэтому кольцо крутится без видимого
 * стыка. Маска-градиент гасит края штрихов, чтобы они не обрывались резко.
 */
function ProfileAvatar({ src, size = 80, round = false, ring: showRing = true }: Props) {
  const [failed, setFailed] = useState(false)
  // Зазор под кольцо — в долях от размера. Раньше он был жёстко 15px, и
  // маленькая аватарка тонула в венце шириной с неё саму.
  const pad = showRing ? Math.round(size * 0.19) : 0
  const ring = size + pad * 2
  // Скругление тоже в долях: при жёстких 28px маленькая аватарка выглядела
  // бы заметно круглее большой.
  const radius = round ? size / 2 : Math.round(size * 0.31)

  return (
    <div className="pfp" style={{ width: size, height: size }}>
      {showRing && (
      <svg
        className="pfp-ring"
        viewBox="0 0 120 120"
        style={{ width: ring, height: ring, left: -pad, top: -pad }}
      >
        <defs>
          <linearGradient id="pfp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#41bccf" />
            <stop offset="100%" stopColor="#8353d4" />
          </linearGradient>
          <linearGradient id="pfp-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="10%" stopColor="white" stopOpacity="1" />
            <stop offset="90%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="pfp-mask">
            <rect x="0" y="0" width="120" height="120" fill="url(#pfp-fade)" />
          </mask>
        </defs>
        <rect
          x="10"
          y="10"
          width="100"
          height="100"
          rx={round ? 50 : 32}
          fill="none"
          stroke="url(#pfp-grad)"
          strokeWidth="4.5"
          strokeDasharray="23 15"
          strokeLinecap="round"
          mask="url(#pfp-mask)"
          className="pfp-dash"
        />
      </svg>
      )}

      {src && !failed ? (
        <img
          className="pfp-img"
          style={{ borderRadius: radius }}
          src={apiUrl(src) ?? undefined}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="pfp-img pfp-empty" style={{ borderRadius: radius }}>
          <User size={Math.round(size * 0.4)} />
        </div>
      )}
    </div>
  )
}

export default ProfileAvatar
