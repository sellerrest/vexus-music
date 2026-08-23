import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'

/**
 * Кнопка звука с выезжающим регулятором.
 *
 * Сама громкость хранится на единственном <audio> приложения, поэтому на
 * следующем треке она остаётся выставленной; между запусками её помнит
 * localStorage (см. PlayerContext).
 */
function VolumeControl() {
  const { volume, setVolume, volumeSupported } = usePlayer()
  const [open, setOpen] = useState(false)
  const barRef = useRef<HTMLDivElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)

  // Тап мимо регулятора закрывает его — иначе он перекрывал бы обложку и
  // убрать его было бы нечем.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  if (!volumeSupported) return null

  const fromClientY = (clientY: number): number => {
    const bar = barRef.current
    if (!bar) return volume
    const rect = bar.getBoundingClientRect()
    if (rect.height === 0) return volume
    // Полоска вертикальная и растёт снизу вверх, поэтому координату
    // переворачиваем.
    const ratio = 1 - (clientY - rect.top) / rect.height
    return Math.min(1, Math.max(0, ratio))
  }

  const Icon = volume === 0 ? VolumeX : volume < 0.34 ? Volume : volume < 0.7 ? Volume1 : Volume2

  return (
    <div className="np-volume" ref={wrapRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="np-volume-popover"
            // x обязан быть здесь, а не в CSS: framer-motion пишет свой
            // transform инлайном и перетирает им правило из стилей — из-за
            // этого центрирующий translateX(-50%) пропадал, и регулятор
            // уезжал вправо на половину своей ширины.
            initial={{ opacity: 0, scaleY: 0.6, x: '-50%' }}
            animate={{ opacity: 1, scaleY: 1, x: '-50%' }}
            exit={{ opacity: 0, scaleY: 0.6, x: '-50%' }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="np-volume-bar"
              ref={barRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                dragging.current = true
                setVolume(fromClientY(e.clientY))
              }}
              onPointerMove={(e) => {
                if (dragging.current) setVolume(fromClientY(e.clientY))
              }}
              onPointerUp={() => {
                dragging.current = false
              }}
              onPointerCancel={() => {
                dragging.current = false
              }}
            >
              <div className="np-volume-fill" style={{ height: `${volume * 100}%` }}>
                <span className="np-volume-knob" />
              </div>
            </div>
            <div className="np-volume-value">{Math.round(volume * 100)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className={`np-volume-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((was) => !was)}
        aria-label="Громкость"
      >
        <Icon size={22} />
      </button>
    </div>
  )
}

export default VolumeControl
