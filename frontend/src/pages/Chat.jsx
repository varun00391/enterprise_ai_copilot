import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Chat() {
  const { user, logout, isAdmin } = useAuth()
  const [departments, setDepartments] = useState([])
  const [deptId, setDeptId] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const loadDeps = useCallback(async () => {
    const deps = await api.departments()
    setDepartments(deps)
  }, [])

  useEffect(() => {
    loadDeps().catch(() => {})
  }, [loadDeps])

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
      const res = await api.chat(text, deptId ? Number(deptId) : null)
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
    <div className="flex min-h-dvh flex-col bg-[#0a0a0c]">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Chat</p>
            <p className="text-sm text-zinc-300">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {isAdmin && (
              <Link to="/admin" className="text-sm text-amber-200/80 hover:underline">
                Admin
              </Link>
            )}
            <button type="button" onClick={logout} className="text-sm text-zinc-400 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              Ask something grounded in uploaded data.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'border border-zinc-800 bg-zinc-900/60 text-zinc-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources?.length > 0 && (
                  <ul className="mt-3 border-t border-zinc-700/80 pt-3 text-xs text-zinc-500">
                    {msg.sources.map((s, j) => (
                      <li key={j}>
                        {s.filename}
                        {s.preview ? ` — ${s.preview}…` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={send}
        className="border-t border-zinc-800 px-4 py-4"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            className="min-h-12 flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-zinc-100 outline-none focus:border-zinc-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-2xl bg-zinc-100 px-6 text-sm font-medium text-zinc-950 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
