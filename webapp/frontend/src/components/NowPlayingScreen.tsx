import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  Heart,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import Cover from './Cover'
import MarqueeText from './MarqueeText'
import VideoStage from './VideoStage'
import LyricsStage from './LyricsStage'
import { hasLyrics, useLyrics } from '../hooks/useLyrics'
import VolumeControl from './VolumeControl'
import { usePlayer } from '../context/PlayerContext'
import { formatDuration } from '../types'

interface Props {
  onClose: () => void
  /** Нужен для запроса текста песни. */
  token: string
}

type Stage = 'cover' | 'lyrics' | 'video'

/** Порядок листания. Экраны без содержимого из него выпадают. */
const STAGE_ORDER: Stage[] = ['cover', 'lyrics', 'video']

function NowPlayingScreen({ onClose, token }: Props) {
  const {
    currentTrack,
    upNext,
    isPlaying,
    isPreparing,
    position,
    duration,
    shuffle,
    repeat,
    toggle,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleRepeat,
    toggleCurrentFavorite,
    videoUrl,
  } = usePlayer()

  const [stage, setStage] = useState<Stage>('cover')
  const lyricsState = useLyrics(currentTrack?.id ?? null, token)

  /*
   * Какие экраны доступны прямо сейчас.
   *
   * Список считается каждый раз, а не задан жёстко: у одного трека есть и
   * клип, и текст, у другого — ничего, и листать нужно только по тому, что
   * действительно есть. Иначе свайп открывал бы пустоту — так уже было с
   * клипом, который ещё качается.
   */
  const stages = STAGE_ORDER.filter(
    (item) =>
      item === 'cover' ||
      (item === 'lyrics' && hasLyrics(lyricsState)) ||
      (item === 'video' && Boolean(videoUrl)),
  )
  // Выбранный экран мог пропасть вместе со сменой трека — тогда возвращаемся
  // на обложку, она есть всегда.
  const activeStage = stages.includes(stage) ? stage : 'cover'

  /** Листание по кругу: за последним экраном снова первый. */
  const goStage = (step: number) => {
    if (stages.length < 2) return
    const at = stages.indexOf(activeStage)
    setStage(stages[(at + step + stages.length) % stages.length])
  }
  const [showQueue, setShowQueue] = useState(false)
  // Во время перетаскивания показываем позицию пальца, а не то, что реально
  // играет — иначе ползунок дёргается назад на каждом обновлении времени.
  const [scrubbing, setScrubbing] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)

  if (!currentTrack) return null

  const accent = currentTrack.cover_color || 'var(--surface-3)'
  const shown = scrubbing ?? position
  const progress = duration > 0 ? (shown / duration) * 100 : 0

  const seekFromClientX = (clientX: number) => {
    const bar = barRef.current
    if (!bar || duration <= 0) return null
    const rect = bar.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration
  }

  return (
    <motion.div
      className="now-playing"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 300 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_e, info) => {
        if (info.offset.y > 120 || info.velocity.y > 600) onClose()
      }}
    >
      <div
        className="now-playing-bg"
        style={{ background: `linear-gradient(180deg, ${accent} 0%, var(--surface) 55%, var(--bg) 100%)` }}
      />

      <div className="now-playing-head">
        <button type="button" className="np-icon-btn" onClick={onClose} aria-label="Свернуть">
          <ChevronDown size={26} />
        </button>
        <span className="now-playing-label">Сейчас играет</span>
        <button
          type="button"
          className={`np-icon-btn ${showQueue ? 'active' : ''}`}
          onClick={() => setShowQueue((v) => !v)}
          aria-label="Очередь"
        >
          <ListMusic size={22} />
        </button>
      </div>

      {showQueue ? (
        <div className="now-playing-queue">
          <div className="np-queue-title">Далее в очереди</div>
          {upNext.length === 0 ? (
            <div className="sheet-hint">Очередь пуста</div>
          ) : (
            upNext.map((t) => (
              <div key={t.id} className="np-queue-row">
                <Cover src={t.cover_url} size={40} radius={4} />
                <div className="np-queue-info">
                  <div className="np-queue-name">{t.title}</div>
                  {t.uploader && <div className="np-queue-artist">{t.uploader}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Свайп листает обложку, текст и клип по кругу — в обе стороны.
              Порог по расстоянию ИЛИ по скорости: короткий резкий флик тоже
              должен срабатывать. В список попадает только то, что реально
              есть у трека (см. stages выше), поэтому свайп больше не может
              открыть пустой экран. */}
          <motion.div
            className={`np-stage ${activeStage === 'lyrics' ? 'is-lyrics' : ''}`}
            drag={stages.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -60 || info.velocity.x < -450) goStage(1)
              else if (info.offset.x > 60 || info.velocity.x > 450) goStage(-1)
            }}
          >
            {activeStage === 'video' ? (
              <VideoStage url={videoUrl!} position={position} isPlaying={isPlaying} />
            ) : activeStage === 'lyrics' ? (
              <LyricsStage state={lyricsState} position={position} onSeek={seek} />
            ) : (
              <Cover src={currentTrack.cover_url} size={300} radius={12} className="np-cover" />
            )}
          </motion.div>

          {stages.length > 1 && (
            <div className="np-stage-dots">
              {stages.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`np-dot ${activeStage === item ? 'active' : ''}`}
                  onClick={() => setStage(item)}
                  aria-label={
                    item === 'cover' ? 'Обложка' : item === 'lyrics' ? 'Текст' : 'Клип'
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="now-playing-meta">
        <div className="np-meta-text">
          <MarqueeText className="np-title" text={currentTrack.title} active={isPlaying} />
          <div className="np-artist">{currentTrack.uploader || 'Неизвестный исполнитель'}</div>
        </div>
        {/* Звук сверху, сердечко под ним — колонка, а не строка. */}
        <div className="np-meta-side">
          <VolumeControl />
          <button
            type="button"
            className={`np-heart ${currentTrack.is_favorite ? 'active' : ''}`}
            onClick={toggleCurrentFavorite}
            aria-label={currentTrack.is_favorite ? 'Убрать из любимых' : 'В любимые'}
          >
            <Heart size={26} fill={currentTrack.is_favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {currentTrack.is_radio ? (
        /* У эфира нет ни длительности, ни конца — перематывать нечего, и
           полоса показывала бы пустоту, а таймер тикал бы от момента
           включения, что выглядит как длительность песни. */
        <div className="np-seek np-live">
          <span className="np-live-dot" />
          Прямой эфир
        </div>
      ) : (
      <div className="np-seek">
        <div
          className="np-seek-bar"
          ref={barRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            const t = seekFromClientX(e.clientX)
            if (t !== null) setScrubbing(t)
          }}
          onPointerMove={(e) => {
            if (scrubbing === null) return
            const t = seekFromClientX(e.clientX)
            if (t !== null) setScrubbing(t)
          }}
          onPointerUp={() => {
            if (scrubbing !== null) seek(scrubbing)
            setScrubbing(null)
          }}
        >
          <div className="np-seek-fill" style={{ width: `${progress}%` }}>
            <span className="np-seek-knob" />
          </div>
        </div>
        <div className="np-seek-times">
          <span>{formatDuration(shown)}</span>
          <span>{formatDuration(duration || currentTrack.duration)}</span>
        </div>
      </div>
      )}

      <div className="np-controls">
        <button
          type="button"
          className={`np-side-btn ${shuffle ? 'active' : ''}`}
          onClick={toggleShuffle}
          aria-label="Перемешать"
        >
          <Shuffle size={20} />
        </button>

        <button type="button" className="np-skip-btn" onClick={prev} aria-label="Предыдущий">
          <SkipBack size={30} fill="currentColor" />
        </button>

        <button type="button" className="np-play-btn" onClick={toggle} aria-label={isPlaying ? 'Пауза' : 'Играть'}>
          {isPreparing ? (
            <Loader2 size={28} className="spin" />
          ) : isPlaying ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" />
          )}
        </button>

        <button type="button" className="np-skip-btn" onClick={next} aria-label="Следующий">
          <SkipForward size={30} fill="currentColor" />
        </button>

        <button
          type="button"
          className={`np-side-btn ${repeat !== 'off' ? 'active' : ''}`}
          onClick={cycleRepeat}
          aria-label="Повтор"
        >
          {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
        </button>
      </div>
    </motion.div>
  )
}

export default NowPlayingScreen
