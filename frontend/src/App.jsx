import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import MeshBackground from './components/MeshBackground'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import Chat from './pages/Chat'

function AuthLoading() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center">
      <MeshBackground />
      <div className="relative flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return <AuthLoading />
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  if (loading) {
    return <AuthLoading />
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (!isAdmin) {
    return <Navigate to="/app" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <Chat />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Admin />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
