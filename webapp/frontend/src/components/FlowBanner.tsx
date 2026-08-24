import { Play, Shuffle } from 'lucide-react'

interface Props {
  onPlay: () => void
  onShuffle: () => void
  /** Пока лента не загрузилась, играть нечего — кнопки ждут. */
  ready: boolean
}

/*
 * Знак бесконечности одним контуром.
 *
 * Ключ к тому, чтобы получилось перекрестие, а не два соприкасающихся кольца:
 * верхняя половина ЛЕВОЙ петли переходит в нижнюю половину ПРАВОЙ, и наоборот.
 * Если же вести каждую петлю саму в себя, линия в центре только коснётся
 * встречной — выйдут две окружности рядом.
 */
const LOOP =
  'M110,150 C110,84 205,84 300,150 C395,216 490,216 490,150 ' +
  'C490,84 395,84 300,150 C205,216 110,216 110,150 Z'

/**
 * Широкая шапка «Потока» для компьютера.
 *
 * Вместо квадратной обложки со значком и счётчика треков — лента во всю
 * ширину. У бесконечного потока обложки нет и быть не может, а «сколько
 * треков» у него бессмысленно: он не кончается.
 *
 * Свечение собрано слоями одного и того же контура: широкие и сильно
 * размытые снизу, тонкий и резкий сверху. Так получается ореол, который
 * выглядит как свет, а не как толстая линия с тенью.
 */
function FlowBanner({ onPlay, onShuffle, ready }: Props) {
  return (
    <div className="flow-banner">
      <svg className="flow-banner-art" viewBox="0 0 600 300" aria-hidden="true">
        <defs>
          <linearGradient id="flow-line" x1="12%" y1="30%" x2="88%" y2="70%">
            <stop offset="0%" stopColor="#ff2d6f" />
            <stop offset="34%" stopColor="#d02cc4" />
            <stop offset="62%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#2b7ae4" />
          </linearGradient>
          <filter id="flow-wide" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <filter id="flow-mid" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id="flow-near" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        <g fill="none" stroke="url(#flow-line)" strokeLinecap="round">
          <path d={LOOP} strokeWidth="46" opacity="0.30" filter="url(#flow-wide)" />
          <path d={LOOP} strokeWidth="22" opacity="0.42" filter="url(#flow-wide)" />
          <path d={LOOP} strokeWidth="13" opacity="0.62" filter="url(#flow-mid)" />
          <path d={LOOP} strokeWidth="5" opacity="0.85" filter="url(#flow-near)" />
          {/* Резкая сердцевина: без неё ореол выглядит расфокусированным. */}
          <path d={LOOP} strokeWidth="1.6" opacity="0.95" />
        </g>
      </svg>

      <div className="flow-banner-text">
        <h1>Поток</h1>
        <p>
          Бесконечный поток музыки,
          <br />
          подобранный под твой вкус
        </p>
        <div className="flow-banner-actions">
          <button type="button" className="flow-banner-play" onClick={onPlay} disabled={!ready}>
            <Play size={18} fill="currentColor" />
            Слушать
          </button>
          <button
            type="button"
            className="flow-banner-shuffle"
            onClick={onShuffle}
            disabled={!ready}
            aria-label="Вперемешку"
          >
            <Shuffle size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FlowBanner
