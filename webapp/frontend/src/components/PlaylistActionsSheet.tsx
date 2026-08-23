import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { Check, Copy, Globe, Image, Lock, Pencil, Trash2 } from 'lucide-react'
import Cover from './Cover'
import type { Playlist } from '../types'

interface Props {
  token: string
  playlist: Playlist
  onClose: () => void
  onChanged: (playlist: Playlist) => void
  onDeleted: () => void
}

function PlaylistActionsSheet({ token, playlist, onClose, onChanged, onDeleted }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(playlist.name)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const headers = { Authorization: `Bearer ${token}` }
  const publicLink = playlist.public_slug
    ? `${window.location.origin}/p/${playlist.public_slug}`
    : null

  const rename = async () => {
    const next = name.trim()
    if (!next || busy) return
    setBusy(true)
    try {
      await axios.post(`/api/playlists/${playlist.id}/rename`, { name: next }, { headers })
      onChanged({ ...playlist, name: next })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const togglePublic = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await axios.post(
        `/api/playlists/${playlist.id}/public`,
        { is_public: !playlist.is_public },
        { headers },
      )
      onChanged({ ...playlist, is_public: res.data.is_public, public_slug: res.data.public_slug })
    } finally {
      setBusy(false)
    }
  }

  const uploadCover = async (file: File) => {
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post(`/api/playlists/${playlist.id}/cover`, form, { headers })
      onChanged({ ...playlist, cover_url: res.data.cover_url })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await axios.delete(`/api/playlists/${playlist.id}`, { headers })
      onDeleted()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const copyLink = () => {
    if (!publicLink) return
    navigator.clipboard?.writeText(publicLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <motion.div
      className="sheet-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      >
        <div className="sheet-grabber" />

        <div className="sheet-track">
          <Cover src={playlist.cover_url} size={44} radius={4} />
          <div className="sheet-track-info">
            <div className="sheet-track-title">{playlist.name}</div>
            <div className="sheet-track-artist">{playlist.track_count} треков</div>
          </div>
        </div>

        {renaming ? (
          <div className="sheet-create-row">
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rename()}
              maxLength={100}
            />
            <button type="button" onClick={rename} disabled={!name.trim() || busy} aria-label="Сохранить">
              <Check size={20} />
            </button>
          </div>
        ) : (
          <div className="sheet-list">
            <button type="button" className="sheet-row" onClick={() => setRenaming(true)}>
              <Pencil size={20} />
              Переименовать
            </button>

            <button type="button" className="sheet-row" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Image size={20} />
              Загрузить обложку
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadCover(file)
              }}
            />

            <button type="button" className="sheet-row" onClick={togglePublic} disabled={busy}>
              {playlist.is_public ? <Globe size={20} /> : <Lock size={20} />}
              <span className="sheet-row-grow">
                {playlist.is_public ? 'Публичный плейлист' : 'Сделать публичным'}
              </span>
              {playlist.is_public && <Check size={18} />}
            </button>

            {publicLink && playlist.is_public && (
              <button type="button" className="sheet-row sheet-row-link" onClick={copyLink}>
                <Copy size={20} />
                <span className="sheet-row-grow sheet-link-text">{copied ? 'Ссылка скопирована' : publicLink}</span>
              </button>
            )}

            <button
              type="button"
              className={`sheet-row ${confirmDelete ? 'danger' : ''}`}
              onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
              disabled={busy}
            >
              <Trash2 size={20} />
              {confirmDelete ? 'Точно удалить?' : 'Удалить плейлист'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default PlaylistActionsSheet
