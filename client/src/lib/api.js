import axios from 'axios'

const githubPagesDefaultApi = 'https://money-magic.onrender.com/api'
const isGithubPages =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (isGithubPages ? githubPagesDefaultApi : '/api')

const client = axios.create({
  baseURL: API_BASE_URL,
})

const shouldTryLocalFallback = (error) => {
  if (API_BASE_URL !== '/api') return false
  if (typeof window === 'undefined') return false
  if (!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) return false
  return error?.response?.status === 404
}

const fallbackRequest = async (method, path, payload) => {
  const response = await axios({
    method,
    url: `http://localhost:5001/api${path}`,
    data: payload,
  })
  return response.data
}

export const uploadDataset = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post('/datasets/upload', formData)
  return response.data
}

export const createManualDataset = async (transactions = [], goals = {}, subscriptions = []) => {
  const payload = { transactions, goals }
  if (Array.isArray(subscriptions) && subscriptions.length) payload.subscriptions = subscriptions
  try {
    const response = await client.post('/datasets/manual', payload)
    return response.data
  } catch (error) {
    if (shouldTryLocalFallback(error)) {
      return fallbackRequest('post', '/datasets/manual', payload)
    }
    throw error
  }
}

export const addTransaction = async (datasetId, transaction) => {
  try {
    const response = await client.post(`/datasets/${datasetId}/transactions`, transaction)
    return response.data
  } catch (error) {
    if (shouldTryLocalFallback(error)) {
      return fallbackRequest('post', `/datasets/${datasetId}/transactions`, transaction)
    }
    throw error
  }
}

export const fetchTransactions = async (datasetId) => {
  const response = await client.get(`/datasets/${datasetId}/transactions`)
  return response.data
}

export const updateTransaction = async (datasetId, txId, transaction) => {
  const response = await client.put(`/datasets/${datasetId}/transactions/${txId}`, transaction)
  return response.data
}

export const deleteTransaction = async (datasetId, txId) => {
  const response = await client.delete(`/datasets/${datasetId}/transactions/${txId}`)
  return response.data
}

export const updateGoals = async (datasetId, goals) => {
  const response = await client.put(`/datasets/${datasetId}/goals`, goals)
  return response.data
}

export const fetchSummary = async (datasetId) => {
  const response = await client.get(`/datasets/${datasetId}/summary`)
  return response.data
}

export const fetchSubscriptions = async (datasetId) => {
  const response = await client.get(`/datasets/${datasetId}/subscriptions`)
  return response.data
}

export const fetchCalendarEvents = async (datasetId) => {
  const response = await client.get(`/datasets/${datasetId}/calendar-events`)
  return response.data
}

export const askCoach = async (datasetId, question) => {
  const response = await client.post(`/datasets/${datasetId}/coach`, { question })
  return response.data
}

export default client
