import { useEffect, useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import SummaryCards from '../components/SummaryCards'
import CategoryChart from '../components/CategoryChart'
import { addTransaction, fetchCalendarEvents, fetchSummary, updateGoals } from '../lib/api'

const colors = ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b']

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: 'expense', date: '', merchant: '', description: '', amount: '' })
  const [goalForm, setGoalForm] = useState({ monthly_budget: '', savings_goal: '' })

  const datasetId = localStorage.getItem('datasetId')

  const loadData = async () => {
    if (!datasetId) {
      setError('No dataset found. Go to Data Studio and add data first.')
      return
    }
    try {
      const [summaryData, calendarData] = await Promise.all([fetchSummary(datasetId), fetchCalendarEvents(datasetId)])
      setSummary(summaryData)
      setGoalForm({
        monthly_budget: summaryData.goals?.monthly_budget || '',
        savings_goal: summaryData.goals?.savings_goal || '',
      })
      setCalendarEvents(calendarData.events || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard')
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const budgetUsage = useMemo(() => {
    const budget = Number(goalForm.monthly_budget || 0)
    const spent = Number(summary?.total_spent_this_month || 0)
    if (!budget) return null
    return Math.min(100, Math.round((spent / budget) * 100))
  }, [goalForm.monthly_budget, summary?.total_spent_this_month])

  const saveQuickAdd = async () => {
    if (!datasetId) return
    await addTransaction(datasetId, {
      ...form,
      amount: Number(form.amount),
      description: form.description || `${form.type} entry`,
    })
    setForm({ type: 'expense', date: '', merchant: '', description: '', amount: '' })
    setShowAdd(false)
    loadData()
  }

  const saveGoals = async () => {
    if (!datasetId) return
    await updateGoals(datasetId, {
      monthly_budget: Number(goalForm.monthly_budget || 0),
      savings_goal: Number(goalForm.savings_goal || 0),
    })
    loadData()
  }

  if (error) return <p className="text-rose-700">{error}</p>
  if (!summary) return <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between">
        <h2 className="text-xl font-semibold">Your Magical Money View</h2>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="rounded-lg bg-fuchsia-600 px-3 py-2 text-white">
          + Add
        </button>
      </div>

      {showAdd && (
        <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-5">
          <select className="rounded border p-2 dark:border-slate-700 dark:bg-slate-800" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="expense">Add Expense</option>
            <option value="subscription">Add Subscription</option>
            <option value="income">Add Income</option>
          </select>
          <input type="date" className="rounded border p-2 dark:border-slate-700 dark:bg-slate-800" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <input placeholder="Merchant" className="rounded border p-2 dark:border-slate-700 dark:bg-slate-800" value={form.merchant} onChange={(e) => setForm((p) => ({ ...p, merchant: e.target.value }))} />
          <input placeholder="Amount" type="number" className="rounded border p-2 dark:border-slate-700 dark:bg-slate-800" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          <button className="rounded bg-indigo-600 p-2 text-white" onClick={saveQuickAdd}>Save</button>
        </section>
      )}

      <SummaryCards summary={summary} />

      <section className="grid gap-4 md:grid-cols-2">
        <CategoryChart data={summary.category_totals || []} />
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-semibold">Monthly Trend (coach-friendly)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.monthly_totals || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#a855f7" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-semibold">Budget Goals</h3>
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <input className="rounded border p-2 dark:border-slate-700 dark:bg-slate-800" type="number" placeholder="Monthly budget" value={goalForm.monthly_budget} onChange={(e) => setGoalForm((p) => ({ ...p, monthly_budget: e.target.value }))} />
            <input className="rounded border p-2 dark:border-slate-700 dark:bg-slate-800" type="number" placeholder="Savings goal" value={goalForm.savings_goal} onChange={(e) => setGoalForm((p) => ({ ...p, savings_goal: e.target.value }))} />
          </div>
          <button className="rounded bg-indigo-600 px-3 py-2 text-white" onClick={saveGoals}>Save goals</button>
          {budgetUsage !== null && <p className="mt-2 text-sm">Budget usage this month: {budgetUsage}%</p>}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-semibold">Category Mix</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.category_totals || []} dataKey="amount" nameKey="category" outerRadius={90}>
                  {(summary.category_totals || []).map((entry, index) => (
                    <Cell key={entry.category} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-2 text-lg font-semibold">Google Calendar upcoming payments</h3>
        <ul className="space-y-1 text-sm">
          {calendarEvents.length === 0 && <li className="text-slate-500">No recurring events yet.</li>}
          {calendarEvents.map((event) => (
            <li key={`${event.title}-${event.date}`}>
              {event.date} • {event.title} •{' '}
              <a href={event.google_calendar_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                Add to Google Calendar
              </a>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}

export default Dashboard
