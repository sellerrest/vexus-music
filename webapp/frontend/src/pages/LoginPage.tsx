import { useEffect, useRef, useState } from 'react'
import { lastSessionEnd, saveToken, storageKind } from '../session'
import axios from 'axios'
import { ArrowLeft, KeyRound, Loader2, Lock, Mail } from 'lucide-react'
import { typo } from '../typography'
import { isPackagedApp } from '../routes'
import { SITE_BASE } from '../api'

interface Props {
  onLoggedIn: (token: string) => void
}

/** Где заводят аккаунт: только сайт, потому что письмо с кодом ведёт туда же. */
const REGISTER_URL = `${SITE_BASE}/my?register=1`

type Mode = 'login' | 'register' | 'code' | 'reset' | 'reset-code'

/**
 * Вход и создание аккаунта.
 *
 * Внутри собранных приложений регистрации нет намеренно: подтверждение почты
 * — это переход по коду из письма, и вести человека туда-обратно через
 * встроенное окно значит потерять его на первом же шаге. Приложение просто
 * открывает браузер.
 */
function LoginPage({ onLoggedIn }: Props) {
  const packaged = isPackagedApp()
  const [mode, setMode] = useState<Mode>(() =>
    !packaged && new URLSearchParams(window.location.search).has('register') ? 'register' : 'login',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Сколько секунд до того, как можно попросить письмо снова. */
  const [wait, setWait] = useState(0)
  const codeInput = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  useEffect(() => {
    if (mode === 'code') codeInput.current?.focus()
  }, [mode])

  const fail = (err: any, fallback: string) =>
    setError(err?.response?.data?.detail || fallback)

  const doLogin = async () => {
    const res = await axios.post('/api/auth/password', { email: email.trim(), password })
    await saveToken(res.data.access_token)
    onLoggedIn(res.data.access_token)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        await doLogin()
      } else if (mode === 'register') {
        const res = await axios.post('/api/auth/register/start', {
          email: email.trim(),
          password,
        })
        setWait(res.data?.resend_after ?? 60)
        setCode('')
        setMode('code')
      } else if (mode === 'code') {
        const res = await axios.post('/api/auth/register/confirm', {
          email: email.trim(),
          code: code.trim(),
        })
        await saveToken(res.data.access_token)
        onLoggedIn(res.data.access_token)
      } else if (mode === 'reset') {
        const res = await axios.post('/api/auth/reset/start', { email: email.trim() })
        setWait(res.data?.resend_after ?? 60)
        setCode('')
        setPassword('')
        setMode('reset-code')
      } else {
        const res = await axios.post('/api/auth/reset/confirm', {
          email: email.trim(),
          code: code.trim(),
          password,
        })
        await saveToken(res.data.access_token)
        onLoggedIn(res.data.access_token)
      }
    } catch (err: any) {
      fail(
        err,
        mode === 'login'
          ? 'Не удалось войти'
          : mode === 'register' || mode === 'reset'
            ? 'Не удалось отправить код'
            : 'Код не подошёл',
      )
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (busy || wait > 0) return
    setBusy(true)
    setError(null)
    try {
      const res =
        mode === 'reset-code'
          ? await axios.post('/api/auth/reset/start', { email: email.trim() })
          : await axios.post('/api/auth/register/start', { email: email.trim(), password })
      setWait(res.data?.resend_after ?? 60)
    } catch (err: any) {
      fail(err, 'Не удалось отправить код')
    } finally {
      setBusy(false)
    }
  }

  const ready =
    mode === 'code'
      ? code.trim().length === 4
      : mode === 'reset'
        ? Boolean(email.trim())
        : mode === 'reset-code'
          ? code.trim().length === 4 && password.length > 0
          : Boolean(email.trim()) && password.length > 0

  const onCode = mode === 'code' || mode === 'reset-code'
  const title = onCode ? 'Проверьте почту' : mode === 'reset' ? 'Забыли пароль' : 'Vexus Music'
  const hint =
    mode === 'login'
      ? typo('Войдите по почте и паролю. Аккаунта ещё нет - создайте его, это займёт минуту.')
      : mode === 'register'
        ? typo('Придумайте пароль и укажите почту - на неё придёт код подтверждения.')
        : mode === 'reset'
          ? typo('Укажите почту от аккаунта - пришлём код, и вы зададите новый пароль.')
          : mode === 'reset-code'
            ? typo(`Отправили код на ${email.trim()}. Введите его и новый пароль.`)
            : typo(`Отправили код из четырёх цифр на ${email.trim()}. Введите его здесь.`)

  return (
    <div className="app-shell login-shell">
      <form className={`login-card ${mode !== 'login' ? 'has-back' : ''}`} onSubmit={submit}>
        {mode !== 'login' && (
          <button
            type="button"
            className="login-back"
            onClick={() => {
              setError(null)
              setMode(mode === 'code' ? 'register' : mode === 'reset-code' ? 'reset' : 'login')
            }}
            aria-label="Назад"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <h1 className="login-title">{title}</h1>
        <p className="login-hint">{hint}</p>

        {onCode ? (
          <>
          <label className="login-field">
            <KeyRound size={17} />
            <input
              ref={codeInput}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              /* Только цифры и ровно четыре: подсказывать формат надёжнее,
                 чем ругаться после отправки. */
              maxLength={4}
              placeholder="0000"
              className="login-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </label>
          {/* При сбросе новый пароль вводится тут же: отдельный шаг ради
              одного поля заставлял бы человека ждать ещё один экран. */}
          {mode === 'reset-code' && (
            <label className="login-field">
              <Lock size={17} />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Новый пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          </>
        ) : mode === 'reset' ? (
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
        ) : (
          <>
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
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </>
        )}

        {error && <div className="login-error">{error}</div>}
        {!error && mode === 'login' && reason && <div className="login-why">{reason}</div>}

        <button type="submit" className="login-submit" disabled={busy || !ready}>
          {busy ? (
            <Loader2 size={18} className="spin" />
          ) : mode === 'login' ? (
            'Войти'
          ) : mode === 'register' ? (
            'Создать аккаунт'
          ) : mode === 'reset' ? (
            'Прислать код'
          ) : mode === 'reset-code' ? (
            'Сменить пароль'
          ) : (
            'Подтвердить'
          )}
        </button>

        {onCode && (
          <button type="button" className="login-link" onClick={resend} disabled={busy || wait > 0}>
            {wait > 0 ? `Отправить ещё раз через ${wait} с` : 'Отправить код ещё раз'}
          </button>
        )}

        {mode === 'login' && (
          <button
            type="button"
            className="login-link"
            onClick={() => {
              setError(null)
              setCode('')
              setMode('reset')
            }}
          >
            Забыли пароль?
          </button>
        )}

        {mode === 'login' &&
          (packaged ? (
            <button
              type="button"
              className="login-link"
              onClick={() => window.open(REGISTER_URL, '_blank', 'noopener,noreferrer')}
            >
              Нет аккаунта? Создать в браузере
            </button>
          ) : (
            <button
              type="button"
              className="login-link"
              onClick={() => {
                setError(null)
                setMode('register')
              }}
            >
              Нет аккаунта? Создать
            </button>
          ))}
      </form>
    </div>
  )
}

export default LoginPage
