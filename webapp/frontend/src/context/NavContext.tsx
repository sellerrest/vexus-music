import { createContext, useContext } from 'react'
import type { Track } from '../types'

/**
 * Открыть подборку из любого места приложения.
 *
 * Нужен, потому что «Радио по треку» вызывается из меню трека, а меню лежит
 * глубоко: карусель → строка трека → шторка действий. Тащить колбэк через все
 * эти слои пришлось бы четырьмя пропсами подряд, ни один из которых
 * промежуточным компонентам не нужен.
 */
export interface NavValue {
  openTrackRadio: (track: Track) => void
  /** «Похоже на {исполнитель}» — то же радио по треку, но со своим
   *  заголовком и лицом: подборка строится по самому заслушанному треку
   *  артиста, его обложка и становится обложкой подборки. */
  openArtistRadio: (seedTrackId: number, title: string, cover?: string | null) => void
  openCategory: (slug: string, title: string) => void
  openRadio: () => void
  openDiscovery: () => void
}

const noop = () => {}

export const NavContext = createContext<NavValue>({
  openTrackRadio: noop,
  openArtistRadio: noop,
  openCategory: noop,
  openRadio: noop,
  openDiscovery: noop,
})

export const useNav = () => useContext(NavContext)
