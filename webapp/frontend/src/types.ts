export interface Track {
  id: number
  title: string
  uploader: string | null
  duration: number | null
  is_downloaded: boolean
  /** Радиостанция: бесконечный эфир вместо файла, перематывать нечего. */
  is_radio?: boolean
  is_favorite: boolean
  url: string | null
  cover_url: string
  /** Доминирующий цвет обложки (#rrggbb) — фон-градиент в плеере. */
  cover_color: string | null
  /** Готовый клип, если его уже скачали; иначе качается по запросу. */
  video_url?: string | null
}

export interface Playlist {
  id: number
  name: string
  track_count: number
  cover_url: string | null
  /** Обложки первых треков — из них складывается мозаика на плитке.
   *  Пусто, если у плейлиста задана своя загруженная обложка. */
  cover_urls: string[]
  is_public: boolean
  public_slug: string | null
}

export interface ProfileProject {
  id: number
  title: string
  description: string | null
  url: string | null
}

export interface ProfileData {
  slug: string | null
  display_name: string | null
  bio: string | null
  accent: string | null
  is_public: boolean
  avatar_url: string | null
  tracks: Track[]
  projects: ProfileProject[]
  max_tracks: number
}

export function formatDuration(seconds: number | null): string {
  if (!seconds && seconds !== 0) return '—:—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
