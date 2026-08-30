import { CloudOff } from 'lucide-react'
import FeedPage from './FeedPage'
import { offlineTracks } from '../offline'

interface Props {
  token: string
}

/**
 * Медиатека без интернета.
 *
 * Собрана на обычном списке треков — тот же плеер, те же строки, та же кнопка
 * «Слушать». Отдельный экран со своим списком выглядел бы иначе там, где
 * никакой разницы нет: треки те же самые, просто лежат на устройстве.
 */
function OfflinePage({ token }: Props) {
  return (
    <FeedPage
      token={token}
      title="Без интернета"
      subtitle="Сохранено на устройстве"
      icon={<CloudOff size={54} strokeWidth={1.5} />}
      gradient="offline"
      loadPage={async () => ({ tracks: await offlineTracks(), hasMore: false })}
    />
  )
}

export default OfflinePage
