import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../api/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const u = await api.me()
      setUser(u)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const { access_token } = await api.login(email, password)
    localStorage.setItem('token', access_token)
    const u = await api.me()
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, password) => {
    await api.register(email, password)
    return login(email, password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
