import { useEffect, useState } from 'react'
import axios from 'axios'
import { Check, Loader2, Lock, Mail } from 'lucide-react'
import { showToast } from '../toast'
import { typo } from '../typography'

interface Props {
  token: string
}

const MIN_PASSWORD = 8

/**
 * Почта и пароль для входа с сайта.
 *
 * Задаются только отсюда, изнутри Telegram: здесь личность уже подтвердил
 * сам мессенджер, поэтому отдельная регистрация не нужна и не должна
 * существовать — иначе к аккаунту можно было бы привязаться снаружи.
 */
function AccountPage({ token }: Props) {
  const [email, setEmail] = useState('')
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios
      .get('/api/account', { headers })
      .then((res) => {
        setSavedEmail(res.data.email)
        if (res.data.email) setEmail(res.data.email)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const mismatch = repeat.length > 0 && password !== repeat
  const canSave =
    !busy && email.trim().length > 0 && password.length >= MIN_PASSWORD && password === repeat

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    setError(null)
    try {
      const res = await axios.post(
        '/api/account/credentials',
        { email: email.trim(), password },
        { headers },
      )
      setSavedEmail(res.data.email)
      setEmail(res.data.email)
      setPassword('')
      setRepeat('')
      showToast('Данные для входа сохранены')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-heading">Аккаунт</h1>
        <div className="loader-wrap">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1 className="page-heading">Аккаунт</h1>
      <p className="account-hint">
        {typo(
          savedEmail
            ? 'Вход с сайта уже настроен. Тут можно сменить почту или пароль.'
            : 'Задай почту и пароль - с ними можно будет заходить в приложение из браузера, а не только из Telegram.',
        )}
      </p>

      {savedEmail && (
        <div className="account-current">
          <Check size={15} />
          <span>{savedEmail}</span>
        </div>
      )}

      <form className="account-form" onSubmit={save}>
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
            autoComplete="new-password"
            placeholder={savedEmail ? 'Новый пароль' : 'Пароль'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="login-field">
          <Lock size={17} />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Повтори пароль"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </label>

        <div className="account-notes">
          {password.length > 0 && password.length < MIN_PASSWORD && (
            <span className="account-warn">Пароль короче {MIN_PASSWORD} символов</span>
          )}
          {mismatch && <span className="account-warn">Пароли не совпадают</span>}
          {error && <span className="account-warn">{error}</span>}
        </div>

        <button type="submit" className="login-submit" disabled={!canSave}>
          {busy ? <Loader2 size={18} className="spin" /> : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}

export default AccountPage
