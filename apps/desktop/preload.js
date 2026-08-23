/*
 * Мост между страницей и системной частью приложения.
 *
 * Сама страница живёт без доступа к системе (contextIsolation), и это
 * намеренно: внутри обычный веб-код, которому незачем уметь читать диск или
 * запускать процессы. Здесь наружу выставлены ровно две вещи, нужные для
 * панели задач Windows, и ничего сверх того.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vexusDesktop', {
  /** Признак «мы внутри приложения для Windows», а не на сайте. */
  platform: process.platform,

  /**
   * Сообщает системе, что сейчас с воспроизведением.
   *
   * По этому состоянию перерисовываются кнопки на панели задач: пока играет —
   * там пауза, на паузе — воспроизведение; без трека кнопки гасятся.
   */
  setPlaybackState(state) {
    ipcRenderer.send('playback-state', state)
  },

  /**
   * Подписка на ссылки vexmus://, которыми открыли приложение.
   *
   * Обработчик ставится сразу при запуске страницы: ссылка может прийти
   * первым же делом, если приложение именно ею и открыли.
   */
  onDeepLink(handler) {
    const listener = (_event, url) => handler(url)
    ipcRenderer.on('deep-link', listener)
    return () => ipcRenderer.removeListener('deep-link', listener)
  },

  /**
   * Подписка на нажатия кнопок панели задач.
   *
   * Возвращает функцию отписки: без неё при пересоздании подписчика
   * обработчики копились бы, и одно нажатие срабатывало бы несколько раз.
   */
  onCommand(handler) {
    const listener = (_event, command) => handler(command)
    ipcRenderer.on('thumbar-command', listener)
    return () => ipcRenderer.removeListener('thumbar-command', listener)
  },
})
