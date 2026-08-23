/**
 * Полосы эквалайзера. Восемь вместо пяти — по ним рисуется кривая, и на
 * пяти точках она выглядела бы угловатой.
 */
export const EQ_BANDS = [60, 150, 400, 1000, 2400, 6000, 10000, 16000] as const

export const EQ_BAND_LABELS = ['60', '150', '400', '1к', '2.4к', '6к', '10к', '16к'] as const

/** Предел усиления/ослабления в децибелах. */
export const EQ_MAX_GAIN = 12

export type EqGains = number[]

export const EQ_FLAT: EqGains = EQ_BANDS.map(() => 0)

export const EQ_PRESETS: { id: string; name: string; gains: EqGains }[] = [
  { id: 'flat', name: 'Ровно', gains: [0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'bass', name: 'Бас', gains: [9, 7, 3, 0, -1, -1, 0, 0] },
  { id: 'vocal', name: 'Вокал', gains: [-3, -2, 1, 5, 4, 2, 0, -1] },
  { id: 'bright', name: 'Ярко', gains: [-2, -2, -1, 0, 2, 5, 7, 6] },
  { id: 'night', name: 'Ночь', gains: [-5, -3, 0, 2, 2, 0, -2, -4] },
  { id: 'club', name: 'Клуб', gains: [6, 5, 2, 0, 2, 3, 2, 0] },
]

const STORAGE_KEY = 'equalizer_gains'

/** Приводит произвольное значение к допустимому усилению. */
function clampGain(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(-EQ_MAX_GAIN, Math.min(EQ_MAX_GAIN, Math.round(n * 10) / 10))
}

export function loadEqGains(): EqGains {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...EQ_FLAT]
    const parsed = JSON.parse(raw)
    // Длину проверяем явно: в хранилище могли остаться настройки от прежнего
    // набора полос, и тогда фильтров и значений было бы разное количество.
    if (!Array.isArray(parsed) || parsed.length !== EQ_BANDS.length) return [...EQ_FLAT]
    return parsed.map(clampGain)
  } catch {
    return [...EQ_FLAT]
  }
}

export function saveEqGains(gains: EqGains): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gains))
  } catch {
    // Приватный режим браузера — настройки просто не переживут перезапуск.
  }
}

export function matchesPreset(gains: EqGains, preset: EqGains): boolean {
  return gains.length === preset.length && gains.every((g, i) => Math.abs(g - preset[i]) < 0.05)
}
