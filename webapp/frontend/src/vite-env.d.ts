/// <reference types="vite/client" />

/** Переменные сборки. Задаются при упаковке приложения (см. src/api.ts). */
interface ImportMetaEnv {
  /** Полный адрес сервера для сборок .exe и .apk; в вебе пусто. */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
