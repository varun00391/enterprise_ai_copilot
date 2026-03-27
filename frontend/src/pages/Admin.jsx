import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { logout, user } = useAuth()
  const [departments, setDepartments] = useState([])
  const [deptId, setDeptId] = useState('')
  const [documents, setDocuments] = useState([])
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [deps, docs] = await Promise.all([api.departments(), api.adminDocuments()])
        if (cancelled) return
        setDepartments(deps)
        setDocuments(docs)
        setDeptId((prev) => prev || (deps[0] ? String(deps[0].id) : ''))
      } catch {
        setMsg('Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  async function onUpload(e) {
    e.preventDefault()
    if (!file || !deptId) return
    setMsg('')
    try {
      await api.uploadDocument(Number(deptId), file)
      setFile(null)
      const docs = await api.adminDocuments()
      setDocuments(docs)
      setMsg('Uploaded.')
    } catch (err) {
      setMsg(err?.response?.data?.detail || 'Upload failed')
    }
  }

  async function onUrl(e) {
    e.preventDefault()
    if (!url.trim() || !deptId) return
    setMsg('')
    try {
      await api.ingestUrl(Number(deptId), url.trim())
      setUrl('')
      const docs = await api.adminDocuments()
      setDocuments(docs)
      setMsg('URL ingested.')
    } catch (err) {
      setMsg(err?.response?.data?.detail || 'URL ingest failed')
    }
  }

  async function onDelete(id) {
    if (!confirm('Delete this document?')) return
    try {
      await api.deleteDocument(id)
      setDocuments((d) => d.filter((x) => x.id !== id))
    } catch {
      setMsg('Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0c]">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Admin</p>
            <p className="text-sm text-zinc-300">{user?.email}</p>
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/app" className="text-zinc-400 hover:text-white">
              User chat
            </Link>
            <button type="button" onClick={logout} className="text-zinc-400 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-zinc-50">
          Data ingest
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Department, then upload files or add a URL.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Upload
            </h2>
            <form onSubmit={onUpload} className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-zinc-500">Department</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-zinc-200"
              />
              <button
                type="submit"
                className="rounded-xl bg-amber-200/90 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-100"
              >
                Upload
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Website
            </h2>
            <form onSubmit={onUrl} className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-zinc-500">Department</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
              <button
                type="submit"
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400"
              >
                Ingest URL
              </button>
            </form>
          </section>
        </div>

        {msg && (
          <p className="mt-6 text-sm text-amber-200/80" role="status">
            {msg}
          </p>
        )}

        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Documents
          </h2>
          <ul className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {documents.length === 0 && (
              <li className="px-4 py-6 text-sm text-zinc-500">None yet.</li>
            )}
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-zinc-200">{doc.filename}</p>
                  <p className="text-xs text-zinc-500">
                    {doc.status} · dept {doc.department_id} · {doc.source_type}
                  </p>
                  {doc.error_message && (
                    <p className="text-xs text-red-400">{doc.error_message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
