import { supabase } from './supabase'

const LEGACY_KEY = 'datasetId'
const ANON_KEY = 'datasetId:anon'

const userKey = (userId) => `datasetId:${userId}`

const getAuthenticatedUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data?.user || null
}

export const getDatasetId = async () => {
  const user = await getAuthenticatedUser()

  if (user?.id) {
    const { data } = await supabase
      .from('user_datasets')
      .select('dataset_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data?.dataset_id) {
      localStorage.setItem(userKey(user.id), data.dataset_id)
      return data.dataset_id
    }

    const cached = localStorage.getItem(userKey(user.id))
    if (cached) return cached

    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      localStorage.setItem(userKey(user.id), legacy)
      localStorage.removeItem(LEGACY_KEY)
      return legacy
    }

    return ''
  }

  return localStorage.getItem(ANON_KEY) || localStorage.getItem(LEGACY_KEY) || ''
}

export const saveDatasetId = async (datasetId) => {
  const normalized = String(datasetId || '').trim()
  if (!normalized) return

  const user = await getAuthenticatedUser()
  if (user?.id) {
    localStorage.setItem(userKey(user.id), normalized)
    await supabase.from('user_datasets').upsert(
      {
        user_id: user.id,
        dataset_id: normalized,
      },
      { onConflict: 'user_id' }
    )
    return
  }

  localStorage.setItem(ANON_KEY, normalized)
}

export const clearDatasetIdForCurrentUser = async () => {
  const user = await getAuthenticatedUser()
  if (user?.id) {
    localStorage.removeItem(userKey(user.id))
    return
  }

  localStorage.removeItem(ANON_KEY)
}
