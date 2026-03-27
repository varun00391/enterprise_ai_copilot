import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      const u = await login(email, password)
      navigate(u.role === 'admin' ? '/admin' : from, { replace: true })
    } catch {
      setError('Invalid email or password.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-zinc-50">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">
          No account?{' '}
          <Link to="/register" className="text-amber-200/90 hover:underline">
            Register
          </Link>
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none ring-amber-200/20 focus:border-amber-200/40 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none ring-amber-200/20 focus:border-amber-200/40 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-50"
          >
            {pending ? '…' : 'Continue'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-600">
          <Link to="/" className="hover:text-zinc-400">
            Home
          </Link>
        </p>
      </div>
    </div>
  )
}
