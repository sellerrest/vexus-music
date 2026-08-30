import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CloudOff, RotateCw } from 'lucide-react'
import { typo } from '../typography'

interface Props {
  /** Сколько треков доступно без интернета. */
  count: number
  busy: boolean
  onRetry: () => void
  onOffline: () => void
  onClose: () => void
}

/**
 * «Нет интернета» — предложение перейти в офлайн.
 *
 * Появляется, когда сервер не ответил за отведённое время. Не ошибка на пустом
 * месте: у человека, скорее всего, уже есть что послушать, и предложить это
 * честнее, чем оставить его смотреть на пустой экран.
 */
function OfflineSheet({ count, busy, onRetry, onOffline, onClose }: Props) {
  const nothing = count === 0

  return createPortal(
    <motion.div
      className="update-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="update-sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <span className="update-glow offline-glow" aria-hidden="true">
          <CloudOff size={34} />
        </span>

        <h2>Нет связи с сервером</h2>
        <p>
          {typo(
            nothing
              ? 'Сервер не отвечает. Слушать пока нечего: без интернета доступны только треки, которые вы уже включали.'
              /* Двоеточие вместо согласования: «1 трек сохранены» и «5 треков
                 сохранён» — обе беды разом обходятся тем, что глагола нет. */
              : `Сервер не отвечает. На устройстве уже есть музыка: ${count} ${plural(count)}. Слушать можно прямо сейчас.`,
          )}
        </p>

        {!nothing && (
          <button type="button" className="update-go" onClick={onOffline}>
            Слушать без интернета
          </button>
        )}
        <button
          type="button"
          className={nothing ? 'update-go' : 'update-later'}
          onClick={onRetry}
          disabled={busy}
        >
          {busy ? (
            'Проверяю…'
          ) : (
            <>
              <RotateCw size={15} /> Попробовать снова
            </>
          )}
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

/** «1 трек», «2 трека», «5 треков» — иначе фраза читается как машинная. */
function plural(n: number): string {
  const ten = n % 100
  if (ten >= 11 && ten <= 14) return 'треков'
  switch (n % 10) {
    case 1:
      return 'трек'
    case 2:
    case 3:
    case 4:
      return 'трека'
    default:
      return 'треков'
  }
}

export default OfflineSheet
