import { useEffect, useState } from 'react'
import SummaryCards from '../components/SummaryCards'
import CategoryChart from '../components/CategoryChart'
import { fetchSummary } from '../lib/api'

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const datasetId = localStorage.getItem('datasetId')
    if (!datasetId) {
      setError('No dataset uploaded yet. Please upload a CSV first.')
      return
    }

    fetchSummary(datasetId)
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load summary'))
  }, [])

  if (error) return <p className="text-rose-700">{error}</p>
  if (!summary) return <p className="text-slate-600">Loading dashboard...</p>

  return (
    <div className="space-y-4">
      <SummaryCards summary={summary} />
      <CategoryChart data={summary.category_totals || []} />
    </div>
  )
}

export default Dashboard
