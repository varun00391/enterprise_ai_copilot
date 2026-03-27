import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,175,55,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(59,130,246,0.08), transparent)',
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-6 pb-16 pt-10 md:px-10">
        <header className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-zinc-100 md:text-2xl">
            Copilot
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white"
            >
              Join
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,8vw,4.5rem)] leading-[1.05] tracking-tight text-zinc-50">
            Your data. Answered.
          </h1>
          <div className="mt-14 flex flex-wrap gap-4">
            <Link
              to="/app"
              className="inline-flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-200/10 px-8 py-3 text-sm font-medium text-amber-100 backdrop-blur transition hover:border-amber-200/50 hover:bg-amber-200/15"
            >
              Chat
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Create account
            </Link>
          </div>
        </main>

        <footer className="border-t border-zinc-800/80 pt-8 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}
