import { useEffect, useMemo, useState } from 'react'
import SummaryCards from '../components/SummaryCards'
import CategoryChart from '../components/CategoryChart'
import TrendChart from '../components/TrendChart'
import { fetchSummary } from '../lib/api'
import { buildSummaryFromEntries, buildTrendData, getGoals, getManualEntries, saveGoal } from '../lib/localData'
import { formatCurrency } from '../lib/format'

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState([])
  const [timeframe, setTimeframe] = useState('month')
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [goals, setGoals] = useState(getGoals())

  useEffect(() => {
    const datasetId = localStorage.getItem('datasetId')
    const stored = getManualEntries()
    setEntries(stored)

    if (!datasetId) {
      setSummary(buildSummaryFromEntries(stored))
      return
    }

    fetchSummary(datasetId)
      .then((apiSummary) => setSummary(apiSummary))
      .catch(() => {
        setError('Could not load CSV summary. Showing manual data.')
        setSummary(buildSummaryFromEntries(stored))
      })
  }, [])

  const trendData = useMemo(() => buildTrendData(entries, timeframe), [entries, timeframe])

  const monthlySpent = summary?.total_spent_this_month || 0

  const addGoal = (e) => {
    e.preventDefault()
    const next = saveGoal({ name: goalName, amount: Number(goalAmount) })
    setGoals(next)
    setGoalName('')
    setGoalAmount('')
  }

  if (error) return <p className="text-amber-600">{error}</p>
  if (!summary) return <p className="text-slate-600 dark:text-slate-300">Loading dashboard...</p>

  return (
    <div className="space-y-4">
      <SummaryCards summary={summary} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryChart data={summary.category_totals || []} />
        <div>
          <div className="mb-2 flex gap-2">
            <button onClick={() => setTimeframe('week')} className={`rounded-md px-3 py-1 ${timeframe === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Weeks</button>
            <button onClick={() => setTimeframe('month')} className={`rounded-md px-3 py-1 ${timeframe === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Months</button>
          </div>
          <TrendChart data={trendData} />
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-lg font-semibold">Budget goals</h2>
        <form onSubmit={addGoal} className="mb-4 flex flex-wrap gap-2">
          <input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name" required className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          <input value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} type="number" step="0.01" required placeholder="Monthly budget" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Save goal</button>
        </form>
        <ul className="space-y-2">
          {goals.map((goal) => (
            <li key={goal.id} className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
              <p className="font-medium">{goal.name}</p>
              <p className="text-sm">Target: {formatCurrency(goal.amount)} · Current spend: {formatCurrency(monthlySpent)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default Dashboard
