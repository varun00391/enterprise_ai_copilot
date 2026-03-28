import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/client'
import { useAuth } from '../context/useAuth'
import MeshBackground from '../components/MeshBackground'

export default function Admin() {
  const { logout, user } = useAuth()
  const [departments, setDepartments] = useState([])
  const [deptId, setDeptId] = useState('')
  const [documents, setDocuments] = useState([])
  const [url, setUrl] = useState('')
  const [batchFiles, setBatchFiles] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)

  const load = useCallback(async () => {
    const [deps, docs] = await Promise.all([api.departments(), api.adminDocuments()])
    setDepartments(deps)
    setDocuments(docs)
    setDeptId((prev) => prev || (deps[0] ? String(deps[0].id) : ''))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!cancelled) await load()
      } catch {
        if (!cancelled) setMsg('Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  function onPickFiles(e) {
    const list = e.target.files ? Array.from(e.target.files) : []
    if (list.length) setBatchFiles(list)
  }

  function onDrop(e) {
    e.preventDefault()
    setDrag(false)
    const list = e.dataTransfer.files?.length ? Array.from(e.dataTransfer.files) : []
    if (list.length) setBatchFiles(list)
  }

  async function onBatchUpload(e) {
    e.preventDefault()
    if (!batchFiles.length || !deptId || uploading) return
    setMsg('')
    setUploading(true)
    const n = batchFiles.length
    try {
      await api.uploadDocumentBatch(Number(deptId), batchFiles)
      setBatchFiles([])
      await load()
      setMsg(`Ingested ${n} file(s). Users can query them anytime (all depts or filtered).`)
    } catch (err) {
      setMsg(err?.response?.data?.detail || 'Batch upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onUrl(e) {
    e.preventDefault()
    if (!url.trim() || !deptId) return
    setMsg('')
    try {
      await api.ingestUrl(Number(deptId), url.trim())
      setUrl('')
      await load()
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
      <div className="relative flex min-h-dvh items-center justify-center">
        <MeshBackground />
        <p className="relative text-zinc-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh">
      <MeshBackground />
      <div className="relative">
        <header className="border-b border-white/[0.06] px-6 py-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-200/70">
                Admin
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-200">{user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/app" className="btn-ghost !py-2 !text-xs">
                Workspace
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full px-4 py-2 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-12">
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-white md:text-5xl">
            Knowledge ingest
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-500">
            Upload every file in one batch for a department. Everything is indexed together—users chat against the full
            corpus with optional department filters.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <section className="glass-panel rounded-3xl p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">
                Batch files
              </h2>
              <p className="mt-2 text-xs text-zinc-500">
                PDF, Office, images (vision), audio (Whisper), video (Whisper + frames). Max 50MB per file.
              </p>
              <form onSubmit={onBatchUpload} className="mt-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500">Department</label>
                  <select
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="select-elegant w-full py-3"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    setDrag(true)
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                    drag
                      ? 'border-amber-400/50 bg-amber-400/5'
                      : 'border-white/[0.1] bg-black/20 hover:border-white/20'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    onChange={onPickFiles}
                    className="hidden"
                    id="batch-files"
                  />
                  <label htmlFor="batch-files" className="cursor-pointer text-sm text-zinc-400">
                    <span className="font-medium text-amber-200/90">Choose files</span>
                    <span className="text-zinc-600"> or drag and drop here</span>
                  </label>
                  {batchFiles.length > 0 && (
                    <ul className="mt-4 max-h-32 space-y-1 overflow-y-auto text-left text-xs text-zinc-500">
                      {batchFiles.map((f) => (
                        <li key={f.name + f.size} className="truncate">
                          {f.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!batchFiles.length || uploading}
                  className="btn-primary w-full !py-3 disabled:opacity-40"
                >
                  {uploading ? `Processing ${batchFiles.length}…` : `Upload ${batchFiles.length || 'all'} files`}
                </button>
              </form>
            </section>

            <section className="glass-panel rounded-3xl p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">Website</h2>
              <p className="mt-2 text-xs text-zinc-500">Pull clean text from a public URL into the same department.</p>
              <form onSubmit={onUrl} className="mt-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500">Department</label>
                  <select
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="select-elegant w-full py-3"
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
                  className="input-elegant"
                />
                <button type="submit" className="btn-ghost w-full !py-3">
                  Ingest URL
                </button>
              </form>
            </section>
          </div>

          {msg && (
            <p
              className="mt-8 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90"
              role="status"
            >
              {msg}
            </p>
          )}

          <section className="mt-14">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Library</h2>
            <ul className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20">
              {documents.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-zinc-600">No documents yet.</li>
              )}
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm transition hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-200">{doc.filename}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {doc.status} · dept {doc.department_id} · {doc.source_type}
                    </p>
                    {doc.error_message && <p className="mt-1 text-xs text-red-400">{doc.error_message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-red-400/90 transition hover:bg-red-950/40"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  )
}
