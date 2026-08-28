import { useEffect, useState } from 'react'

/**
 * Приветственная страница — то, что видит человек, впервые открывший сайт.
 *
 * Оформление намеренно НЕ такое, как в самом приложении: приложение тёмное и
 * тихое, чтобы не мешать музыке, а витрина светлая и громкая — плотные
 * обводки, жёсткие тени, крупный капс. Тот же язык, что на странице VPN, и
 * это осознанно: два продукта одного хозяина должны выглядеть роднёй.
 *
 * Снимки лежат отдельными файлами в public/landing и подставляются вручную —
 * это должны быть кадры настоящего приложения, а не макеты. Какого файла
 * нет — та карточка просто не показывается, страница остаётся целой.
 *
 * Значки — встроенный SVG: рисуются вместе с разметкой, не грузятся
 * отдельными запросами и остаются резкими на любом экране.
 */

/** Общая обводка значков: одинаковая толщина линий во всех. */
const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

interface Feature {
  n: string
  title: string
  text: string
  icon: JSX.Element
}

const FEATURES: Feature[] = [
  {
    n: '01',
    title: 'Вся музыка сразу',
    text: 'Ищи что угодно и слушай мгновенно — трек подхватывается и играет, пока остальные ещё качаются.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" {...line} />
        <path d="M16.5 16.5 21 21" {...line} />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Текст под музыку',
    text: 'Строки загораются в такт песне. Нажми на любую — и трек перемотается ровно туда.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M4 11h11M4 16h13M4 21h7" {...line} />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Клипы',
    text: 'Смахни вбок — и вместо обложки пойдёт видео, ровно под ту же музыку.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" {...line} />
        <path d="m10 9.5 5 2.5-5 2.5z" {...line} />
      </svg>
    ),
  },
  {
    n: '04',
    title: 'Радио со всего мира',
    text: 'Тысячи станций — и только те, что действительно играют: каждая проверяется до показа.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="2.5" {...line} />
        <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 16.5a6.4 6.4 0 0 0 0-9" {...line} />
        <path d="M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 19.5a10.6 10.6 0 0 0 0-15" {...line} />
      </svg>
    ),
  },
  {
    n: '05',
    title: 'Плейлисты и обмен',
    text: 'Собирай своё и делись ссылкой — друг заберёт плейлист к себе одним нажатием.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="18" cy="5" r="2.5" {...line} />
        <circle cx="6" cy="12" r="2.5" {...line} />
        <circle cx="18" cy="19" r="2.5" {...line} />
        <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" {...line} />
      </svg>
    ),
  },
]

/** Слова в бегущей ленте между первым экраном и остальным. */
const BAND = [
  'без рекламы',
  'бесплатно',
  'тексты песен',
  'клипы',
  'радио',
  'плейлисты',
  'на телефоне и на пк',
]

const PHONE_SHOTS = [
  { src: '/landing/home.png', caption: 'Подборки под твой вкус' },
  { src: '/landing/player.png', caption: 'Плеер с обложкой и клипом' },
  { src: '/landing/lyrics.png', caption: 'Текст, идущий за музыкой' },
  { src: '/landing/tracks.png', caption: 'Твоя медиатека' },
]

const DESKTOP_SHOTS = [
  { src: '/landing/desktop-home.png', caption: 'Медиатека всегда под рукой' },
  { src: '/landing/desktop-player.png', caption: 'Плеер во весь экран' },
]

/** Кадр в рамке. Файла нет — карточка исчезает, а не показывает битую картинку. */
/*
 * Готовые сборки лежат в разделе релизов на GitHub.
 *
 * В именах файлов НЕТ номера версии, и это осознанно: адрес latest/download
 * ищет файл по точному имени, поэтому «VexusMusic-1.0.0.apk» перестал бы
 * находиться в тот день, когда выйдет 1.1.0, и все ссылки на витрине молча
 * превратились бы в 404.
 */
const RELEASES = 'https://github.com/sellerrest/vexus-music/releases/latest'
const asset = (file: string) => `${RELEASES}/download/${file}`

interface Build {
  name: string
  note: string
  main: { label: string; file: string; size: string }
  alt?: { label: string; file: string; size: string }
  icon: JSX.Element
}

const BUILDS: Build[] = [
  {
    name: 'Android',
    note: 'Android 6.0 и новее',
    main: { label: 'Скачать APK', file: 'VexusMusic.apk', size: '4,7 МБ' },
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" {...line} />
        <path d="M10.5 18.5h3" {...line} />
      </svg>
    ),
  },
  {
    name: 'Windows',
    note: 'Windows 10 и 11',
    main: { label: 'Установщик', file: 'VexusMusic-Setup.exe', size: '79 МБ' },
    alt: { label: 'Без установки', file: 'VexusMusic-Portable.exe', size: '79 МБ' },
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6.2l8-1.1v6.4H3zM13 4.8l8-1.1v7.8h-8zM3 12.5h8v6.4l-8-1.1zM13 12.5h8v7.8l-8-1.1z" {...line} />
      </svg>
    ),
  },
]

function Shot({ src, caption, wide }: { src: string; caption: string; wide?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <figure className={wide ? 'lp-shot lp-shot-wide' : 'lp-shot'}>
      <div className="lp-shot-frame">
        <img
          src={src}
          alt={caption}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/** Мелкая надпись-«бровь» над заголовком секции. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-eyebrow">
      <span className="lp-eyebrow-line" />
      {children}
    </div>
  )
}

function LandingPage() {
  /*
   * Оформление витрины — светлое, а всё приложение тёмное. Класс на <html>
   * переключает палитру целиком: без него кремовая страница осталась бы на
   * чёрном фоне тела документа, который задан глобально.
   */
  useEffect(() => {
    document.documentElement.classList.add('landing-mode')
    return () => document.documentElement.classList.remove('landing-mode')
  }, [])

  return (
    <div className="lp">
      {/* Точечная сетка со штриховкой и зерно — как на бумаге. */}
      <div className="lp-field" aria-hidden="true" />
      <div className="lp-glow" aria-hidden="true">
        <i /> <i /> <i />
      </div>
      <div className="lp-grain" aria-hidden="true" />

      <header className="lp-nav">
        <div className="lp-nav-in">
          <a className="lp-brand" href="#top">
            VEXUS<span>MUSIC</span>
          </a>
          <a className="lp-pill" href="/my">
            Слушать
            <svg viewBox="0 0 24 24" aria-hidden="true" className="lp-arrow">
              <path d="M7 17 17 7M8 7h9v9" {...line} strokeWidth={2.4} />
            </svg>
          </a>
        </div>
      </header>

      <main className="lp-main" id="top">
        <section className="lp-hero">
          <span className="lp-glyph" aria-hidden="true">
            ♪
          </span>
          <h1>
            <span>Vexus</span>
            <span className="lp-grad">Music</span>
          </h1>
          <p className="lp-lead">
            Вся музыка, тексты песен строка в строку, клипы и радио со всего мира.{' '}
            <b>Бесплатно и без рекламы</b> — в браузере, в Telegram, на телефоне и на компьютере.
          </p>
          <div className="lp-cta">
            <a className="lp-btn lp-btn-a" href="/my">
              Слушать в браузере
              <svg viewBox="0 0 24 24" aria-hidden="true" className="lp-arrow">
                <path d="M5 12h14M13 6l6 6-6 6" {...line} strokeWidth={2.4} />
              </svg>
            </a>
            <a className="lp-btn lp-btn-b" href="https://t.me/VexusMusicBot">
              Открыть в Telegram
            </a>
            <a className="lp-btn lp-btn-c" href="#get">
              Скачать приложение
            </a>
          </div>
        </section>

        {/* Диагональная лента — она же граница между первым экраном и остальным. */}
        <div className="lp-band" aria-hidden="true">
          <div className="lp-band-run">
            {[0, 1].map((copy) => (
              <div className="lp-band-group" key={copy}>
                {BAND.map((word) => (
                  <span key={word}>
                    {word}
                    <i>◆</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="lp-section">
          <Eyebrow>01 — на телефоне</Eyebrow>
          <h2 className="lp-title">
            Открыл и <span className="lp-grad">слушаешь</span>
          </h2>
          <div className="lp-shots">
            {PHONE_SHOTS.map((s) => (
              <Shot key={s.src} {...s} />
            ))}
          </div>
        </section>

        <section className="lp-section">
          <Eyebrow>02 — что внутри</Eyebrow>
          <h2 className="lp-title">Всё, что нужно от плеера</h2>
          <div className="lp-grid">
            {FEATURES.map((f) => (
              <article className="lp-card" key={f.n}>
                <div className="lp-card-top">
                  <span className="lp-card-icon">{f.icon}</span>
                  <span className="lp-card-n">{f.n}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <Eyebrow>03 — на компьютере</Eyebrow>
          <h2 className="lp-title">
            И на <span className="lp-grad">большом экране</span>
          </h2>
          <p className="lp-lead lp-lead-mid">
            То же приложение на компьютере и на телефоне. Музыка не обрывается при сворачивании,
            играет с экрана блокировки и слушается кнопок на наушниках.
          </p>
          <div className="lp-wide">
            {DESKTOP_SHOTS.map((s) => (
              <Shot key={s.src} {...s} wide />
            ))}
          </div>
        </section>

        <section className="lp-section" id="get">
          <Eyebrow>Загрузка</Eyebrow>
          <h2 className="lp-title">Забрать к себе</h2>
          <p className="lp-lead lp-lead-mid">
            Внутри — собранное приложение целиком, а не браузер, наведённый на сайт. Наружу
            уходят только запросы за данными и за самой музыкой.
          </p>
          <div className="lp-get">
            {BUILDS.map((b) => (
              <div className="lp-get-card" key={b.name}>
                <span className="lp-get-icon" aria-hidden="true">
                  {b.icon}
                </span>
                <h3>{b.name}</h3>
                <p>{b.note}</p>
                <div className="lp-get-links">
                  <a className="lp-btn lp-btn-a" href={asset(b.main.file)}>
                    {b.main.label}
                    <i>{b.main.size}</i>
                  </a>
                  {b.alt && (
                    <a className="lp-get-alt" href={asset(b.alt.file)}>
                      {b.alt.label} · {b.alt.size}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="lp-get-note">
            Все сборки и исходный код —{' '}
            <a href="https://github.com/sellerrest/vexus-music">на GitHub</a>.
            <br />
            Сборки не подписаны сертификатом, поэтому Windows покажет предупреждение
            SmartScreen, а Android — про установку из неизвестного источника. Так система
            встречает любое приложение не из магазина.
          </p>
        </section>

        <section className="lp-final">
          <h2 className="lp-title">Включай</h2>
          <div className="lp-cta">
            <a className="lp-btn lp-btn-a" href="/my">
              Слушать в браузере
              <svg viewBox="0 0 24 24" aria-hidden="true" className="lp-arrow">
                <path d="M5 12h14M13 6l6 6-6 6" {...line} strokeWidth={2.4} />
              </svg>
            </a>
            <a className="lp-btn lp-btn-b" href={asset('VexusMusic.apk')}>
              Скачать на Android
            </a>
            <a className="lp-btn lp-btn-c" href={asset('VexusMusic-Setup.exe')}>
              Скачать на Windows
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <span>VEXUS MUSIC</span>
        <a href="https://t.me/VexusSuppBot">Поддержка</a>
      </footer>
    </div>
  )
}

export default LandingPage
