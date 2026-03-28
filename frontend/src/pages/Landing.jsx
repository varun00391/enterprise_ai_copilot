import { Link } from 'react-router-dom'
import MeshBackground from '../components/MeshBackground'

export default function Landing() {
  return (
    <div className="relative min-h-dvh">
      <MeshBackground />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6 pb-20 pt-8 md:px-12 md:pt-12">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-zinc-100 md:text-3xl"
          >
            Copilot
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-full px-5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Sign in
            </Link>
            <Link to="/register" className="btn-primary rounded-full !py-2.5 !text-sm">
              Get started
            </Link>
          </nav>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-amber-200/90">
              Enterprise RAG
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,7vw,4.75rem)] leading-[1.02] tracking-tight text-white">
              Clarity from every{' '}
              <span className="text-gradient not-italic">document</span>
              <span className="text-zinc-500">.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg font-light leading-relaxed text-zinc-400 md:text-xl">
              Hybrid retrieval across your knowledge base—dense vectors plus keyword search—so teams get precise answers without the noise.
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link to="/app" className="btn-primary rounded-full px-8 !py-3.5">
                Open workspace
              </Link>
              <Link to="/register" className="btn-ghost rounded-full !border-white/15 !py-3.5">
                Create account
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-4 sm:grid-cols-3 md:mt-28">
            {[
              { t: 'Ingest', d: 'PDF, Office, media, URLs' },
              { t: 'Retrieve', d: 'Semantic + sparse fusion' },
              { t: 'Answer', d: 'Grounded in your data' },
            ].map((x) => (
              <div key={x.t} className="glass-card rounded-2xl p-6">
                <p className="text-sm font-semibold tracking-wide text-amber-200/90">{x.t}</p>
                <p className="mt-2 text-sm text-zinc-500">{x.d}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="border-t border-white/[0.06] pt-10 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}
