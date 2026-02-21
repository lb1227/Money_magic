import { useEffect, useState } from 'react'
import SubscriptionsTable from '../components/SubscriptionsTable'
import { fetchSubscriptions } from '../lib/api'

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [flagged, setFlagged] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    const datasetId = localStorage.getItem('datasetId')
    if (!datasetId) {
      setError('No dataset uploaded yet. Please upload a CSV first.')
      return
    }

    fetchSubscriptions(datasetId)
      .then((data) => setSubscriptions(data.subscriptions || []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load subscriptions'))
  }, [])

  const toggleFlag = (key) => {
    setFlagged((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (error) return <p className="text-rose-700">{error}</p>

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Detected subscriptions</h2>
      <SubscriptionsTable subscriptions={subscriptions} flagged={flagged} toggleFlag={toggleFlag} />
    </div>
  )
}

export default Subscriptions
