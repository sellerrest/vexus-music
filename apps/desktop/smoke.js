/*
 * Проверка собранного приложения: страница действительно рисуется из пакета,
 * а запросы уходят на боевой сервер. Запускается тем же Electron, что и
 * приложение, и с тем же обработчиком схемы — иначе проверялось бы не то,
 * что поедет пользователю.
 */
const { app, BrowserWindow, protocol, net } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const APP_DIR = path.join(__dirname, 'app')
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])

const log = []
app.whenReady().then(async () => {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    const rel = pathname === '/' ? '/index.html' : pathname
    const target = path.join(APP_DIR, decodeURIComponent(rel))
    const safe = target.startsWith(APP_DIR) ? target : path.join(APP_DIR, 'index.html')
    return net.fetch(pathToFileURL(safe).toString())
  })

  const win = new BrowserWindow({ show: false, width: 1280, height: 820,
    webPreferences: { nodeIntegration: false, contextIsolation: true } })

  const errors = []
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) errors.push(message)
  })
  win.webContents.on('did-fail-load', (_e, code, desc, url) =>
    errors.push(`не загрузилось ${url}: ${desc} (${code})`))

  await win.loadURL('app://vexus/index.html')
  // Ждём, пока React смонтируется и отработает первый запрос.
  await new Promise((r) => setTimeout(r, 4000))

  const res = await win.webContents.executeJavaScript(`(async () => {
    const root = document.getElementById('root')
    const out = {
      реактСмонтирован: !!root && root.children.length > 0,
      разметкаЗнаков: document.querySelectorAll('svg').length,
      фонСтраницы: getComputedStyle(document.body).backgroundColor,
      хранилищеРаботает: (() => { try { localStorage.setItem('t','1'); const v = localStorage.getItem('t')==='1'; localStorage.removeItem('t'); return v } catch { return false } })(),
      происхождение: location.origin,
    }
    try {
      // Настоящий запрос к API — без токена ждём 401, это и есть «сервер ответил».
      const r = await fetch('https://music.vexus.pw/api/home')
      out.ответСервера = r.status
    } catch (e) { out.ответСервера = 'ОШИБКА: ' + e.message }
    try {
      const r = await fetch('https://music.vexus.pw/api/auth/password', { method: 'OPTIONS' })
      out.corsПреflight = r.status
    } catch (e) { out.corsПреflight = 'ОШИБКА: ' + e.message }
    return out
  })()`)

  log.push(JSON.stringify(res, null, 2))
  if (errors.length) log.push('ОШИБКИ В КОНСОЛИ:\n' + errors.join('\n'))
  console.log('===SMOKE===\n' + log.join('\n'))
  app.quit()
})
