import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import Chat from './pages/Chat'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0c] text-zinc-500">
        …
      </div>
    )
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
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0c] text-zinc-500">
        …
      </div>
    )
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
