import { ArrowRight, Compass } from 'lucide-react'
import { SITE_BASE } from '../api'
import { typo } from '../typography'

/**
 * Страница несуществующего адреса.
 *
 * Нужна из-за того, как устроена отдача сайта: он лежит в хранилище, а оно на
 * любой неизвестный путь отдаёт index.html — иначе не открывались бы ни /my,
 * ни ссылки на плейлисты, файлов под которыми нет и быть не может. Значит
 * отличить «внутренний адрес приложения» от «человек ошибся ссылкой» может
 * только само приложение, здесь.
 *
 * Код ответа при этом остаётся 404 — его ставит хранилище, и это ровно то, что
 * нужно: страницы действительно нет.
 */
function NotFoundPage() {
  return (
    <div className="app-shell nf-shell">
      <div className="nf-card">
        <span className="nf-glyph" aria-hidden="true">
          <Compass size={38} strokeWidth={1.6} />
        </span>

        <div className="nf-code" aria-hidden="true">
          404
        </div>
        <h1>Такой страницы нет</h1>
        <p>
          {typo(
            'Ссылка ведёт в пустоту: либо адрес набран с ошибкой, либо страницу убрали. Музыка при этом на месте.',
          )}
        </p>

        <div className="nf-actions">
          <a className="nf-btn nf-btn-main" href={`${SITE_BASE}/my`}>
            Открыть музыку
            <ArrowRight size={17} />
          </a>
          <a className="nf-btn" href={SITE_BASE}>
            На главную
          </a>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
