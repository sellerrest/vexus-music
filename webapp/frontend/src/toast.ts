/**
 * Всплывающие сообщения.
 *
 * Намеренно не React-контекст: сообщение показывает PlayerContext, а он сам
 * провайдер, и его пришлось бы оборачивать в ещё один — с точным порядком
 * вложенности, который легко сломать. Простая подписка ни от какого порядка
 * не зависит.
 */
import { typo } from './typography'

export interface ToastItem {
  id: number
  message: string
}

type Listener = (toast: ToastItem) => void

let listeners: Listener[] = []
let nextId = 1

export function showToast(message: string): void {
  // Типографика — тут, в одной точке: сообщения приходят из десятка мест, и
  // требовать от каждого помнить про кавычки и неразрывные пробелы значит
  // рано или поздно где-то забыть.
  const toast = { id: nextId++, message: typo(message) }
  listeners.forEach((listener) => listener(toast))
}

export function onToast(listener: Listener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((item) => item !== listener)
  }
}
