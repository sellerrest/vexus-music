import { useState } from 'react'
import { lastSessionEnd, saveToken, storageKind } from '../session'
import axios from 'axios'
import { Loader2, Lock, Mail } from 'lucide-react'
import { typo } from '../typography'

interface Props {
  onLoggedIn: (token: string) => void
}

/**
 * Вход из обычного браузера.
 *
 * Аккаунт остаётся телеграмовским — почта с паролём это второй способ войти
 * в тот же самый. Задать их можно только изнутри мини-аппа, где личность
 * подтверждает сам Telegram, поэтому регистрации тут нет и быть не должно.
 */
function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /*
   * Почему пришлось спрашивать вход.
   *
   * Снаружи «вход не сохранился» и «сервер не принял сохранённый вход»
   * выглядят одинаково, а чинить их надо в разных местах. Строка короткая и
   * спокойная — это не ошибка, а объяснение.
   */
  const [reason] = useState(() => {
    const last = lastSessionEnd()
    if (last === 'сервер-отклонил') return `Прошлый вход больше не действует · ${storageKind()}`
    if (last === 'нет-сохранённого') return `Сохранённого входа не нашлось · ${storageKind()}`
    return null
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !email.trim() || !password) return
    setBusy(true)
    setError(null)
    try {
      const res = await axios.post('/api/auth/password', {
        email: email.trim(),
        password,
      })
      await saveToken(res.data.access_token)
      onLoggedIn(res.data.access_token)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell login-shell">
      <form className="login-card" onSubmit={submit}>
        <h1 className="login-title">Vexus Music</h1>
        <p className="login-hint">
          {typo('Войди по почте и паролю. Задать их можно в приложении внутри Telegram - в профиле, раздел "Аккаунт".')}
        </p>

        <label className="login-field">
          <Mail size={17} />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="login-field">
          <Lock size={17} />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="login-error">{error}</div>}
        {!error && reason && <div className="login-why">{reason}</div>}

        <button type="submit" className="login-submit" disabled={busy || !email.trim() || !password}>
          {busy ? <Loader2 size={18} className="spin" /> : 'Войти'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage
