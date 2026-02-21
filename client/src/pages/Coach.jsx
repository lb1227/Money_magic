import { useState } from 'react'
import CoachChat from '../components/CoachChat'
import { askCoach } from '../lib/api'

function Coach() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const handleAsk = async (question) => {
    const datasetId = localStorage.getItem('datasetId')
    if (!datasetId) {
      setMessages((prev) => [
        ...prev,
        { question, response: { summary_text: 'Please upload a dataset first.', recommendations: [] } },
      ])
      return
    }

    setLoading(true)
    try {
      const response = await askCoach(datasetId, question)
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
