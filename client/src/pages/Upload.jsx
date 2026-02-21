import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadCard from '../components/UploadCard'
import { uploadDataset } from '../lib/api'

function Upload() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')

  const handleUpload = async (file) => {
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const result = await uploadDataset(file)
      localStorage.setItem('datasetId', result.dataset_id)
      setSuccessMessage('Upload successful')
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return <UploadCard onUpload={handleUpload} loading={loading} successMessage={successMessage} error={error} />
}

export default Upload
