import { useState } from 'react'
import { User } from 'lucide-react'
import { apiUrl } from '../api'

interface Props {
  src: string | null
  size?: number
}

/**
 * Аватарка со скруглённым квадратом и бегущим пунктирным кольцом.
 *
 * Пунктир 23/15 и смещение на 38 за цикл подобраны не случайно: сумма
 * штриха с пробелом равна сдвигу, поэтому кольцо крутится без видимого
 * стыка. Маска-градиент гасит края штрихов, чтобы они не обрывались резко.
 */
function ProfileAvatar({ src, size = 80 }: Props) {
  const [failed, setFailed] = useState(false)
  const ring = size + 30
  // Скругление в долях от размера, а не фиксированное: при жёстких 28px
  // маленькая аватарка выглядела бы заметно круглее большой.
  const radius = Math.round(size * 0.31)

  return (
    <div className="pfp" style={{ width: size, height: size }}>
      <svg
        className="pfp-ring"
        viewBox="0 0 120 120"
        style={{ width: ring, height: ring, left: -15, top: -15 }}
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
          rx="32"
          fill="none"
          stroke="url(#pfp-grad)"
          strokeWidth="4.5"
          strokeDasharray="23 15"
          strokeLinecap="round"
          mask="url(#pfp-mask)"
          className="pfp-dash"
        />
      </svg>

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
