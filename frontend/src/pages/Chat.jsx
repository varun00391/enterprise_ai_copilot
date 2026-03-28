import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/client'
import { useAuth } from '../context/useAuth'

export default function Chat() {
  const { user, logout, isAdmin } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const res = await api.chat(text)
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Request failed. Try again.' },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#e6e4df] text-stone-800">
      {/* Soft warm gray base — not white, not dark */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(255,255,255,0.5), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(180,170,155,0.15), transparent 50%)',
        }}
      />

      <header className="border-b border-stone-300/80 bg-[#ebe9e4]/95 px-4 py-4 shadow-sm backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Workspace</p>
            <p className="mt-0.5 text-sm font-medium text-stone-800">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-xl border border-stone-400/50 bg-white/60 px-3 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-white/90"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-2 text-xs text-stone-600 transition hover:bg-stone-300/50 hover:text-stone-900"
            >
              Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="rounded-3xl border border-stone-300/90 bg-white/55 p-10 text-center shadow-sm backdrop-blur-sm">
              <p className="font-[family-name:var(--font-display)] text-2xl text-stone-800">
                Ask your knowledge base
              </p>
              <p className="mt-3 text-sm text-stone-600">
                Answers use hybrid RAG over everything in the corpus (semantic + keyword retrieval).
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#5c5a56] text-stone-50'
                    : 'border border-stone-300/90 bg-white/75 text-stone-800 backdrop-blur-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources?.length > 0 && (
                  <details className="group mt-4 rounded-xl border border-stone-300/80 bg-stone-100/90">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-200/60 [&::-webkit-details-marker]:hidden">
                      <span
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-stone-400/60 bg-white/80 text-[10px] text-stone-500 transition group-open:rotate-90"
                        aria-hidden
                      >
                        ▸
                      </span>
                      Sources
                      <span className="font-normal text-stone-500">({msg.sources.length})</span>
                    </summary>
                    <ul className="space-y-2 border-t border-stone-300/70 px-3 py-3 text-xs text-stone-600">
                      {msg.sources.map((s, j) => (
                        <li key={j} className="rounded-lg bg-white/60 px-2 py-1.5">
                          <span className="font-medium text-stone-700">{s.filename}</span>
                          {s.preview ? (
                            <span className="mt-0.5 block text-stone-500 line-clamp-2">{s.preview}…</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={send}
        className="border-t border-stone-300/80 bg-[#ebe9e4]/95 px-4 py-5 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)] backdrop-blur-sm md:px-8"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-stone-400/50 bg-white/90 px-4 text-stone-800 shadow-inner outline-none ring-stone-400/30 placeholder:text-stone-400 focus:border-amber-600/40 focus:ring-2"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending}
            className="shrink-0 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-600 px-6 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
