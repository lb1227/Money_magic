import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const client = axios.create({
  baseURL: API_BASE_URL,
})

export const uploadDataset = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post('/datasets/upload', formData)
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

export const askCoach = async (datasetId, question) => {
  const response = await client.post(`/datasets/${datasetId}/coach`, { question })
  return response.data
}

export default client
