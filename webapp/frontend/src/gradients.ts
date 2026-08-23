/**
 * Градиенты для плиток без обложки: «Любимые треки», «Радио», «Открытие» и
 * жанровые подборки.
 *
 * Один источник на всё приложение — раньше «Любимые треки» на главной и в
 * «Медиатеке» рисовались разным кодом и разъехались: в одном месте был
 * градиент, в другом серый квадрат.
 *
 * Цвета приглушены: насыщенность срезана примерно до 60%. На тёмном фоне
 * чистый насыщенный цвет вибрирует и перетягивает внимание с названий
 * треков на декоративную плитку рядом. Тон у каждой подборки при этом
 * остался прежним — узнаваемость не поехала, ушла только резь.
 */
const GRADIENTS: Record<string, string> = {
  // Тот же по тону, что был в «Медиатеке», — менять его нельзя, иначе плитка
  // «Любимые треки» опять станет выглядеть по-разному в разных местах.
  favorites: 'linear-gradient(135deg, #4d31c5, #41bccf)',
  radio: 'linear-gradient(135deg, #cb336a, #d86494)',
  discovery: 'linear-gradient(135deg, #cc9434, #cf7b40)',
  similar: 'linear-gradient(135deg, #8353d4, #2c9bae)',

  rap: 'linear-gradient(135deg, #3f3f46, #d65d5d)',
  pop: 'linear-gradient(135deg, #c75ed7, #8353d4)',
  rock: 'linear-gradient(135deg, #aa2b2b, #401810)',
  electronic: 'linear-gradient(135deg, #2c9bae, #416dcf)',
  phonk: 'linear-gradient(135deg, #6a28a1, #222226)',
  lofi: 'linear-gradient(135deg, #8164d8, #c764d8)',
  jazz: 'linear-gradient(135deg, #223c86, #7035cc)',
  classic: 'linear-gradient(135deg, #bc952f, #6c381b)',
  metal: 'linear-gradient(135deg, #64748b, #131d35)',
  indie: 'linear-gradient(135deg, #208178, #7fb52d)',
  rnb: 'linear-gradient(135deg, #7c1f44, #d65d71)',
  retro: 'linear-gradient(135deg, #d79660, #29a396)',
}

/** Запасные цвета для ключей, которых нет в списке (новая категория —
 *  и плитка всё равно выглядит осмысленно, а не серым квадратом). */
const FALLBACK = [
  'linear-gradient(135deg, #3198c6, #2eb961)',
  'linear-gradient(135deg, #d65d71, #9829a2)',
  'linear-gradient(135deg, #c29e30, #c56431)',
  'linear-gradient(135deg, #29a396, #5d56d5)',
]

export function tileGradient(key: string): string {
  const known = GRADIENTS[key]
  if (known) return known
  // Устойчивый выбор по имени: у одной и той же категории цвет не будет
  // прыгать между перерисовками.
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return FALLBACK[Math.abs(hash) % FALLBACK.length]
}
