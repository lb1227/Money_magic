import { getCurrentUser, supabaseTableRequest } from './supabase'

export const getActiveDatasetId = async () => {
  const user = getCurrentUser()
  if (!user?.id) return null

  const rows = await supabaseTableRequest(
    `user_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=active_dataset_id&limit=1`,
  )

  if (!Array.isArray(rows) || !rows.length) return null
  return rows[0]?.active_dataset_id || null
}

export const setActiveDatasetId = async (datasetId) => {
  const user = getCurrentUser()
  if (!user?.id || !datasetId) return

  await supabaseTableRequest('user_profiles', {
    method: 'POST',
    body: {
      user_id: user.id,
      active_dataset_id: datasetId,
      updated_at: new Date().toISOString(),
    },
  }).catch(async () => {
    await supabaseTableRequest(`user_profiles?user_id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      body: {
        active_dataset_id: datasetId,
        updated_at: new Date().toISOString(),
      },
    })
  })
}
