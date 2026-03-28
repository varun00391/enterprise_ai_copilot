import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import MeshBackground from '../components/MeshBackground'

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
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-16">
      <MeshBackground />
      <div className="relative w-full max-w-md">
        <div className="glass-panel rounded-3xl p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <Link
              to="/"
              className="font-[family-name:var(--font-display)] text-2xl text-white"
            >
              Copilot
            </Link>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white md:text-4xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              New here?{' '}
              <Link to="/register" className="font-medium text-amber-200/90 hover:underline">
                Register
              </Link>
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-elegant"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-elegant"
              />
            </div>
            <button type="submit" disabled={pending} className="btn-primary mt-2 w-full !py-3.5 disabled:opacity-50">
              {pending ? 'Signing in…' : 'Continue'}
            </button>
          </form>
          <p className="mt-8 text-center text-xs text-zinc-600">
            <Link to="/" className="hover:text-zinc-400">
              ← Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
