import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL,
  timeout: 120000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function register(email, password) {
  const { data } = await api.post('/auth/register', { email, password })
  return data
}

export async function me() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function departments() {
  const { data } = await api.get('/departments')
  return data
}

export async function adminDocuments() {
  const { data } = await api.get('/admin/documents')
  return data
}

export async function uploadDocument(departmentId, file) {
  const form = new FormData()
  form.append('department_id', String(departmentId))
  form.append('file', file)
  const { data } = await api.post('/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  })
  return data
}

/** Upload many files in one request; each is ingested into the same department. */
export async function uploadDocumentBatch(departmentId, fileList) {
  const form = new FormData()
  form.append('department_id', String(departmentId))
  for (const f of fileList) {
    form.append('files', f)
  }
  const { data } = await api.post('/admin/upload-batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  })
  return data
}

export async function ingestUrl(departmentId, url) {
  const { data } = await api.post('/admin/ingest-url', {
    department_id: departmentId,
    url,
  })
  return data
}

export async function deleteDocument(id) {
  await api.delete(`/admin/documents/${id}`)
}

export async function chat(message, departmentId) {
  const { data } = await api.post('/chat', {
    message,
    department_id: departmentId,
  })
  return data
}

/**
 * Multimodal chat: Groq vision for images / video frames, Whisper for audio.
 * @param {{ message?: string, departmentId?: number | null, image?: File | null, audio?: File | null, video?: File | null }} opts
 */
export async function chatWithMedia(opts) {
  const form = new FormData()
  if (opts.message) form.append('message', opts.message)
  if (opts.departmentId != null && opts.departmentId !== '') {
    form.append('department_id', String(opts.departmentId))
  }
  if (opts.image) form.append('image', opts.image)
  if (opts.audio) form.append('audio', opts.audio)
  if (opts.video) form.append('video', opts.video)
  const { data } = await api.post('/chat/with-media', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  })
  return data
}
