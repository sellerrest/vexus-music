import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ArrowDownToLine, X } from 'lucide-react'
import { startUpdate } from '../updates'
import type { UpdateInfo } from '../updates'
import { typo } from '../typography'

interface Props {
  info: UpdateInfo
  onClose: () => void
}

/**
 * Окно «вышло обновление» на половину экрана.
 *
 * Через портал и поверх всего: появляется само, без просьбы, и не должно
 * зависеть от того, на какой вкладке человек и какой экран открыт.
 *
 * Закрывается насовсем — но только для этой версии: отложил одно обновление,
 * о следующем скажем снова. Иначе закрывший однажды больше никогда не узнал
 * бы о новых выпусках.
 */
function UpdateBanner({ info, onClose }: Props) {
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
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_e, i) => {
          if (i.offset.y > 90) onClose()
        }}
      >
        <button type="button" className="update-close" onClick={onClose} aria-label="Закрыть">
          <X size={20} />
        </button>

        <span className="update-glow" aria-hidden="true">
          <ArrowDownToLine size={34} />
        </span>

        <h2>{typo(`Вышла версия ${info.version}`)}</h2>
        <p>
          {typo(
            info.hasBuild
              ? 'Скачается новая сборка. Система спросит разрешение на установку — это обычное дело для приложений не из магазина.'
              : 'Открою страницу выпусков — там лежат сборки под все платформы.',
          )}
        </p>

        <button
          type="button"
          className="update-go"
          onClick={() => {
            startUpdate(info)
            onClose()
          }}
        >
          {info.hasBuild ? 'Обновить' : 'Открыть выпуски'}
        </button>
        <button type="button" className="update-later" onClick={onClose}>
          Позже
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export default UpdateBanner
