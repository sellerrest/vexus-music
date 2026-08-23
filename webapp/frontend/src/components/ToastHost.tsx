import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { onToast } from '../toast'
import type { ToastItem } from '../toast'

const VISIBLE_MS = 3000

/** Сообщения в правом верхнем углу. Живут пару секунд и уходят сами. */
function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    return onToast((toast) => {
      setItems((prev) => [...prev, toast])
      // Убираем по id, а не по индексу: за это время список мог измениться.
      setTimeout(
        () => setItems((prev) => prev.filter((item) => item.id !== toast.id)),
        VISIBLE_MS,
      )
    })
  }, [])

  return (
    <div className="toast-host">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="toast"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <AlertCircle size={17} className="toast-icon" />
            <span>{item.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastHost
