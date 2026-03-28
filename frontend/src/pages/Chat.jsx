import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/client'
import { useAuth } from '../context/useAuth'
import MeshBackground from '../components/MeshBackground'

export default function Chat() {
  const { user, logout, isAdmin } = useAuth()
  const [departments, setDepartments] = useState([])
  const [deptId, setDeptId] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const bottomRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const audioFileInputRef = useRef(null)

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

  function clearAttachments() {
    setImageFile(null)
    setVideoFile(null)
    setAudioBlob(null)
    setAudioFile(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (audioFileInputRef.current) audioFileInputRef.current.value = ''
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size) {
          setAudioFile(null)
          if (audioFileInputRef.current) audioFileInputRef.current.value = ''
          setAudioBlob(blob)
        }
      }
      mediaRecorderRef.current = mr
      mr.start(200)
      setRecording(true)
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Microphone access denied or unavailable. Attach an audio file instead.',
        },
      ])
    }
  }

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    const hasMedia = !!(imageFile || videoFile || audioBlob || audioFile)
    if ((!text && !hasMedia) || sending) return

    let userDisplay = text
    if (!userDisplay) {
      if (audioBlob || audioFile) userDisplay = '🎤 Voice / audio'
      else if (imageFile) userDisplay = '🖼 Image'
      else if (videoFile) userDisplay = '🎬 Video'
    }

    setInput('')
    setMessages((m) => [...m, { role: 'user', content: userDisplay }])
    if (hasMedia) {
      setMessages((m) => [...m, { role: 'status', content: 'Processing attachment with Groq (Whisper / vision)…' }])
    }
    setSending(true)

    const img = imageFile
    const vid = videoFile
    const aud = audioBlob
    const audF = audioFile
    clearAttachments()

    try {
      let res
      if (hasMedia) {
        const audioPayload =
          audF != null
            ? audF
            : aud != null
              ? new File([aud], 'recording.webm', { type: aud.type || 'audio/webm' })
              : null
        res = await api.chatWithMedia({
          message: text,
          departmentId: deptId ? Number(deptId) : null,
          image: img,
          audio: audioPayload,
          video: vid,
        })
      } else {
        res = await api.chat(text, deptId ? Number(deptId) : null)
      }
      setMessages((m) => {
        const filtered = m.filter((x) => x.role !== 'status')
        return [...filtered, { role: 'assistant', content: res.answer, sources: res.sources }]
      })
    } catch {
      setMessages((m) => {
        const filtered = m.filter((x) => x.role !== 'status')
        return [...filtered, { role: 'assistant', content: 'Request failed. Check API key and try again.' }]
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <MeshBackground />
      <div className="relative flex min-h-dvh flex-col">
        <header className="border-b border-white/[0.06] px-4 py-4 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-200/70">Workspace</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-200">{user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="select-elegant py-2"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {isAdmin && (
                <Link to="/admin" className="btn-ghost !py-2 !text-xs">
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="rounded-full px-3 py-2 text-xs text-zinc-500 hover:bg-white/5 hover:text-white"
              >
                Out
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && (
              <div className="glass-panel rounded-3xl p-10 text-center">
                <p className="font-[family-name:var(--font-display)] text-2xl text-white">Ask your knowledge base</p>
                <p className="mt-3 text-sm text-zinc-500">
                  Type a question, attach an image for vision, record voice for live Whisper transcription, or add a
                  video. Answers use hybrid RAG over everything admins uploaded.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === 'user'
                    ? 'justify-end'
                    : msg.role === 'status'
                      ? 'justify-center'
                      : 'justify-start'
                }`}
              >
                {msg.role === 'status' ? (
                  <p className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-100/90">
                    {msg.content}
                  </p>
                ) : (
                  <div
                    className={`max-w-[88%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-100 shadow-lg'
                        : 'glass-panel border-white/[0.08] text-zinc-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources?.length > 0 && (
                      <ul className="mt-4 border-t border-white/[0.08] pt-3 text-xs text-zinc-500">
                        {msg.sources.map((s, j) => (
                          <li key={j} className="mt-1">
                            <span className="text-zinc-400">{s.filename}</span>
                            {s.preview ? ` — ${s.preview}…` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <form onSubmit={send} className="border-t border-white/[0.06] px-4 py-5 md:px-8">
          <div className="mx-auto max-w-3xl space-y-3">
            {(imageFile || videoFile || audioBlob || audioFile) && (
              <div className="flex flex-wrap gap-2">
                {imageFile && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                    {imageFile.name}
                    <button
                      type="button"
                      className="ml-2 text-zinc-500 hover:text-white"
                      onClick={() => {
                        setImageFile(null)
                        if (imageInputRef.current) imageInputRef.current.value = ''
                      }}
                    >
                      ×
                    </button>
                  </span>
                )}
                {videoFile && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                    {videoFile.name}
                    <button
                      type="button"
                      className="ml-2 text-zinc-500 hover:text-white"
                      onClick={() => {
                        setVideoFile(null)
                        if (videoInputRef.current) videoInputRef.current.value = ''
                      }}
                    >
                      ×
                    </button>
                  </span>
                )}
                {audioBlob && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                    Voice clip
                    <button
                      type="button"
                      className="ml-2 text-zinc-500 hover:text-white"
                      onClick={() => setAudioBlob(null)}
                    >
                      ×
                    </button>
                  </span>
                )}
                {audioFile && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                    {audioFile.name}
                    <button
                      type="button"
                      className="ml-2 text-zinc-500 hover:text-white"
                      onClick={() => {
                        setAudioFile(null)
                        if (audioFileInputRef.current) audioFileInputRef.current.value = ''
                      }}
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setAudioFile(f)
                  if (f) {
                    setAudioBlob(null)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-zinc-400 transition hover:border-amber-400/30 hover:text-amber-200/90"
                title="Image"
              >
                Image
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-zinc-400 transition hover:border-amber-400/30 hover:text-amber-200/90"
                title="Video"
              >
                Video
              </button>
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-zinc-400 transition hover:border-amber-400/30 hover:text-amber-200/90"
                title="Audio file"
              >
                Audio
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={sending}
                className={`rounded-xl border px-3 py-3 text-xs font-medium transition ${
                  recording
                    ? 'animate-pulse border-red-400/50 bg-red-950/40 text-red-200'
                    : 'border-white/10 bg-black/30 text-zinc-400 hover:border-amber-400/30 hover:text-amber-200/90'
                }`}
                title="Record voice (Whisper after stop)"
              >
                {recording ? 'Stop' : 'Mic'}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message…"
                className="input-elegant min-h-12 min-w-0 flex-1"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending}
                className="btn-primary shrink-0 !rounded-2xl !px-6 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
