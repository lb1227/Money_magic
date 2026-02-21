import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const client = axios.create({
  baseURL: API_BASE_URL,
})

export const uploadDataset = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post('/api/datasets/upload', formData)
  return response.data
}

export const fetchSummary = async (datasetId) => {
  const response = await client.get(`/api/datasets/${datasetId}/summary`)
  return response.data
}

export const fetchSubscriptions = async (datasetId) => {
  const response = await client.get(`/api/datasets/${datasetId}/subscriptions`)
  return response.data
}

export const askCoach = async (datasetId, question) => {
  const response = await client.post(`/api/datasets/${datasetId}/coach`, { question })
  return response.data
}

export default client
