const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SESSION_KEY = 'moneyMagicSupabaseSession'

const getHeaders = (includeAuth = false) => {
  const headers = {
    apikey: SUPABASE_ANON_KEY || '',
    'Content-Type': 'application/json',
  }

  if (includeAuth) {
    const session = getStoredSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  }

  return headers
}

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const getStoredSession = () => {
  try {
    const raw = localStorage.getItem(SUPABASE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const setStoredSession = (session) => {
  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session))
}

export const clearStoredSession = () => {
  localStorage.removeItem(SUPABASE_SESSION_KEY)
}

const authRequest = async (path, body) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.msg || data?.error_description || data?.error || 'Authentication failed.'
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return data
}

export const signInWithPassword = async (email, password) => {
  const data = await authRequest('token?grant_type=password', { email, password })
  setStoredSession(data)
  return data
}

export const signUpWithPassword = async (email, password) => {
  const data = await authRequest('signup', { email, password })
  if (data?.access_token) {
    setStoredSession(data)
  }
  return data
}

export const signOut = async () => {
  if (!isSupabaseConfigured()) {
    clearStoredSession()
    return
  }

  const session = getStoredSession()
  if (session?.access_token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        ...getHeaders(true),
      },
    })
  }
  clearStoredSession()
}

export const getCurrentUser = () => {
  const session = getStoredSession()
  return session?.user || null
}

export const supabaseTableRequest = async (path, { method = 'GET', body } = {}) => {
  if (!isSupabaseConfigured()) return null

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      ...getHeaders(true),
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.message || 'Supabase table request failed.')
  }

  if (response.status === 204) return null
  return response.json().catch(() => null)
}
