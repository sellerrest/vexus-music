import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
}

/**
 * Панель настроек, выезжающая слева.
 *
 * Через портал, а не внутри вкладки: страницы вкладок создают собственный
 * контекст наложения, и панель, отрисованная внутри, оказалась бы ПОД
 * мини-плеером и нижним меню — ровно так же, как когда-то тонула шторка
 * действий над треком.
 *
 * Закрывается тремя способами: нажатием по затемнению, смахиванием влево и
 * кнопкой «назад» у телефона.
 */
function SettingsDrawer({ onClose, children }: Props) {
  useEffect(() => {
    // Пока панель открыта, страница под ней не должна прокручиваться: иначе
    // содержимое уезжает за спиной у панели и после закрытия человек
    // оказывается не там, где был.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return createPortal(
    <motion.div
      className="drawer-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.6, right: 0 }}
        onDragEnd={(_e, info) => {
          if (info.offset.x < -80) onClose()
        }}
      >
        {children}
      </motion.aside>
    </motion.div>,
    document.body,
  )
}

export default SettingsDrawer
