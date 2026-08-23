/*
 * Оболочка приложения для Windows.
 *
 * Внутри лежит собранное React-приложение — то же самое, что и на сайте.
 * Наружу уходят только запросы к API и за музыкой; сама страница ничего с
 * сервера не тянет и работает из пакета.
 */
const { app, BrowserWindow, ipcMain, nativeImage, nativeTheme, protocol, net, shell } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const APP_DIR = path.join(__dirname, 'app')
// Не в build/: эта папка у упаковщика служебная, ресурсы сборки из неё
// внутрь приложения не попадают — значки бы просто не нашлись.
const ICONS_DIR = path.join(__dirname, 'assets', 'thumbar')
const ORIGIN = 'app://vexus'

/** Высота своей полосы заголовка. Должна совпадать с --titlebar-h в стилях. */
const TITLE_BAR_HEIGHT = 36

/** Через сколько показать окно, даже если оно так и не сообщило о готовности. */
const WINDOW_SHOW_TIMEOUT = 3000

/*
 * Своя схема вместо file://.
 *
 * На file:// у страницы «пустое» происхождение: localStorage там ведёт себя
 * непредсказуемо (а в нём лежит токен входа — без него приложение каждый раз
 * просило бы пароль заново), и обычные правила кросс-доменных запросов к
 * нашему API тоже применяются иначе. Схема, объявленная стандартной и
 * защищённой, даёт странице нормальное происхождение — дальше всё работает
 * ровно как в браузере.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
])

/** Последнее известное состояние воспроизведения — от него зависят кнопки. */
let playback = { isPlaying: false, hasTrack: false }

/** Схема ссылок, по которым система открывает именно наше приложение. */
const DEEP_LINK_SCHEME = 'vexmus'

/*
 * Ссылка, с которой приложение запустили.
 *
 * Windows передаёт её аргументом командной строки, и приходит она РАНЬШЕ,
 * чем страница успевает загрузиться. Если отправить её сразу, слушателя ещё
 * нет и ссылка пропадёт — поэтому она ждёт здесь до готовности окна.
 */
let pendingDeepLink = null

/** Достаёт ссылку vexmus:// из аргументов запуска. */
function deepLinkFromArgv(argv) {
  return argv.find((arg) => typeof arg === 'string' && arg.startsWith(`${DEEP_LINK_SCHEME}://`)) || null
}

function deliverDeepLink(win, link) {
  if (!link) return
  if (!win || win.isDestroyed()) return
  if (win.webContents.isLoading()) {
    // Страница ещё грузится — отдадим, когда будет кому принять.
    pendingDeepLink = link
    return
  }
  pendingDeepLink = null
  win.webContents.send('deep-link', link)
}

function icon(name) {
  // Всплывающее окошко над панелью задач красится темой системы, поэтому
  // набор значков выбирается под неё: на тёмной нужны светлые, на светлой —
  // тёмные, иначе кнопки сливаются с подложкой и выглядят пустыми.
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  return nativeImage.createFromPath(path.join(ICONS_DIR, `${name}-${theme}.png`))
}

/**
 * Кнопки управления в предпросмотре окна на панели задач.
 *
 * Вызывается заново при каждой смене состояния: список кнопок в Windows не
 * обновляется по частям, его можно только переустановить целиком.
 */
function applyThumbarButtons(win) {
  if (!win || win.isDestroyed() || process.platform !== 'win32') return

  const send = (command) => () => win.webContents.send('thumbar-command', command)
  // Без трека нажимать нечего: кнопки остаются на месте, но гаснут — так
  // понятнее, чем исчезающая и появляющаяся панель.
  const flags = playback.hasTrack ? [] : ['disabled']

  win.setThumbarButtons([
    { tooltip: 'Предыдущий', icon: icon('prev'), flags, click: send('prev') },
    playback.isPlaying
      ? { tooltip: 'Пауза', icon: icon('pause'), flags, click: send('toggle') }
      : { tooltip: 'Воспроизвести', icon: icon('play'), flags, click: send('toggle') },
    { tooltip: 'Следующий', icon: icon('next'), flags, click: send('next') },
  ])
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#0a0a0c',
    autoHideMenuBar: true,
    show: false,
    /*
     * Своя полоса заголовка вместо системной.
     *
     * hidden убирает подпись с иконкой приложения, а titleBarOverlay
     * оставляет на месте родные «свернуть / развернуть / закрыть»: рисовать
     * их самим — значит потерять привязку к системе (подсветка при наведении,
     * прилипание окон, поведение при развороте). Цвета задаём под тему
     * приложения, чтобы кнопки не выделялись светлым прямоугольником.
     */
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0c',
      symbolColor: '#e8e8ea',
      height: TITLE_BAR_HEIGHT,
    },
    webPreferences: {
      // Приложению не нужен доступ к системе: это обычная веб-страница,
      // и открывать ей Node означало бы дарить такой доступ любому скрипту,
      // который туда когда-нибудь попадёт. Всё нужное выдаётся точечно
      // через preload.js.
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  /*
   * Показ окна.
   *
   * Окно создаётся скрытым, чтобы не мелькало пустым до первой отрисовки, —
   * но полагаться на одно только ready-to-show нельзя. Это событие наступает
   * по первому нарисованному кадру, а Windows скрытому окну рисовать не
   * даёт: она считает его ненужным и придерживает отрисовку. Тогда событие
   * не приходит НИКОГДА, show() не вызывается, и приложение остаётся жить в
   * процессах без единого окна — «запускаю, а оно не открывается». Причём
   * через раз: успеет система дать кадр — откроется, не успеет — нет.
   *
   * Поэтому показываем по первому из трёх поводов: готовности к показу,
   * окончанию загрузки страницы или по истечении срока ожидания. Белой
   * вспышки не будет в любом случае — фон окна задан цветом приложения.
   */
  let shown = false
  const showWindow = () => {
    if (shown || win.isDestroyed()) return
    shown = true
    win.show()
    applyThumbarButtons(win)
  }
  win.once('ready-to-show', showWindow)
  win.webContents.once('did-finish-load', () => {
    showWindow()
    // Ссылка, с которой нас запустили, ждала загрузки страницы.
    deliverDeepLink(win, pendingDeepLink)
  })
  // Последняя страховка: даже если не загрузилось вообще, пользователь
  // должен увидеть окно и понять, что что-то пошло не так, а не гадать,
  // почему приложение не запускается.
  setTimeout(showWindow, WINDOW_SHOW_TIMEOUT)

  win.loadURL(`${ORIGIN}/index.html`)

  // Внешние ссылки (поддержка, канал) — в системный браузер, а не подменой
  // самого приложения: вернуться из подменённого окна было бы некуда.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  return win
}

/*
 * Приложение должно быть одно.
 *
 * По ссылке vexmus:// Windows запускает НОВЫЙ экземпляр и передаёт адрес ему.
 * Без этого замка у человека открывалось бы второе окно поверх первого, с
 * отдельным плеером — и музыка играла бы из обоих сразу.
 */
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      deliverDeepLink(win, deepLinkFromArgv(argv))
    }
  })
}

app.whenReady().then(() => {
  // Заявляем схему системе: после этого ссылки vexmus:// открывают нас.
  // В отладочном запуске (electron .) путь до исполняемого файла другой,
  // иначе система запомнила бы сам electron.exe вместо приложения.
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [__dirname])
  }
  pendingDeepLink = deepLinkFromArgv(process.argv)

  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    // Всё, кроме известных файлов, отдаём index.html: приложение рисует
    // страницы само, и переход внутри него не должен упираться в 404.
    const rel = pathname === '/' ? '/index.html' : pathname
    const target = path.join(APP_DIR, decodeURIComponent(rel))
    // Выход за пределы папки приложения запрещаем: адрес приходит из
    // страницы, и «..» в нём открыл бы доступ ко всему диску.
    const safe = target.startsWith(APP_DIR) ? target : path.join(APP_DIR, 'index.html')
    return net.fetch(pathToFileURL(safe).toString())
  })

  ipcMain.on('playback-state', (event, state) => {
    playback = { isPlaying: Boolean(state?.isPlaying), hasTrack: Boolean(state?.hasTrack) }
    applyThumbarButtons(BrowserWindow.fromWebContents(event.sender))
  })

  // Тему меняют на ходу — значки надо переложить, иначе они станут не видны
  // на новой подложке.
  nativeTheme.on('updated', () => {
    BrowserWindow.getAllWindows().forEach(applyThumbarButtons)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// На macOS ссылка приходит событием, а не аргументом командной строки.
app.on('open-url', (event, url) => {
  event.preventDefault()
  const win = BrowserWindow.getAllWindows()[0]
  if (win) deliverDeepLink(win, url)
  else pendingDeepLink = url
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
