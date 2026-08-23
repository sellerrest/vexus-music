import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Побочный эффект: проставляет axios.defaults.baseURL до первого запроса.
import './api'
import { isDesktopApp } from './desktop'
import './styles.css'

// iOS WebKit игнорирует viewport user-scalable=no и touch-action для pinch-zoom
// (это нестандартные gesture-события, специфичные для Safari/WKWebView).
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('gesturechange', (e) => e.preventDefault())
// Двойной тап тоже зумит на iOS независимо от viewport — гасим его вручную.
let lastTouchEnd = 0
document.addEventListener('touchend', (e) => {
  const now = Date.now()
  if (now - lastTouchEnd <= 300) e.preventDefault()
  lastTouchEnd = now
}, { passive: false })

// Класс ставится до отрисовки: по нему включаются отступ под полосу
// заголовка и её собственные стили. На сайте моста в систему нет, класс не
// появляется, и вёрстка остаётся прежней до пикселя.
if (isDesktopApp()) document.documentElement.classList.add('has-titlebar')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Регистрация сервис-воркера. Он ничего не кэширует (см. public/sw.js) — он
// нужен лишь для того, чтобы браузер считал сайт устанавливаемым и предлагал
// добавить его на главный экран.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
