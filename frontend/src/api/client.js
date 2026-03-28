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

export async function adminDocuments() {
  const { data } = await api.get('/admin/documents')
  return data
}

export async function uploadDocument(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  })
  return data
}

export async function uploadDocumentBatch(fileList) {
  const form = new FormData()
  for (const f of fileList) {
    form.append('files', f)
  }
  const { data } = await api.post('/admin/upload-batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  })
  return data
}

export async function ingestUrl(url) {
  const { data } = await api.post('/admin/ingest-url', { url })
  return data
}

export async function deleteDocument(id) {
  await api.delete(`/admin/documents/${id}`)
}

export async function chat(message) {
  const { data } = await api.post('/chat', { message })
  return data
}
