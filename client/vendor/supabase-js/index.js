const DEFAULT_STORAGE_KEY = 'moneyMagicSupabaseSession'

const parseJson = (value, fallback = null) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const createMemoryStorage = () => {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
  }
}

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  return createMemoryStorage()
}

export const createClient = (supabaseUrl, supabaseAnonKey) => {
  const storage = getStorage()
  const listeners = new Set()

  const getStoredSession = () => parseJson(storage.getItem(DEFAULT_STORAGE_KEY), null)

  const setStoredSession = (session) => {
    if (session) {
      storage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(session))
      return
    }

    storage.removeItem(DEFAULT_STORAGE_KEY)
  }

  const notify = (event, session) => {
    listeners.forEach((listener) => listener(event, session))
  }

  const request = async (path, payload) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        data: { user: null, session: null },
        error: { message: 'Missing Supabase configuration.' },
      }
    }

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(payload),
      })
      const text = await response.text()
      const json = text ? parseJson(text, {}) : {}

      if (!response.ok) {
        return {
          data: { user: null, session: null },
          error: { message: json?.msg || json?.message || 'Authentication request failed.' },
        }
      }

      const session = json?.session || null
      const user = json?.user || session?.user || null

      if (session || user) {
        const normalizedSession = session || { user }
        setStoredSession(normalizedSession)
        notify(path === 'signup' ? 'SIGNED_UP' : 'SIGNED_IN', normalizedSession)
      }

      return {
        data: { user, session },
        error: null,
      }
    } catch {
      return {
        data: { user: null, session: null },
        error: { message: 'Unable to reach authentication service.' },
      }
    }
  }

  return {
    auth: {
      signUp: ({ email, password }) => request('signup', { email, password }),
      signInWithPassword: ({ email, password }) => request('token?grant_type=password', { email, password, grant_type: 'password' }),
      getSession: async () => ({ data: { session: getStoredSession() }, error: null }),
      onAuthStateChange: (callback) => {
        listeners.add(callback)
        return {
          data: {
            subscription: {
              unsubscribe: () => listeners.delete(callback),
            },
          },
        }
      },
      signOut: async () => {
        setStoredSession(null)
        notify('SIGNED_OUT', null)
        return { error: null }
      },
    },
  }
}
