const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey)

const authRequest = async (path, body) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.msg || data.error_description || 'Supabase auth failed')
  }
  return data
}

export const signUp = (email, password) => authRequest('signup', { email, password })

export const signIn = (email, password) => authRequest('token?grant_type=password', { email, password })
