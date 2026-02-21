import { useState } from 'react'
import CoachChat from '../components/CoachChat'
import { askCoach, askCoachNoDataset } from '../lib/api'

function Coach() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const handleAsk = async (question) => {
    const datasetId = localStorage.getItem('datasetId')
    setLoading(true)
    try {
      const response = datasetId
        ? await askCoach(datasetId, question)
        : await askCoachNoDataset(question)
      setMessages((prev) => [...prev, { question, response }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          question,
          response: {
            summary_text: err.response?.data?.error || 'Unable to reach coach endpoint.',
            recommendations: [],
          },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return <CoachChat onAsk={handleAsk} loading={loading} messages={messages} />
}

export default Coach
