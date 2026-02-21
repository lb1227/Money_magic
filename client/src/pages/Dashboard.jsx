import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Legend,
} from 'recharts'
import SummaryCards from '../components/SummaryCards'
import CategoryChart from '../components/CategoryChart'
import UploadCard from '../components/UploadCard'
import {
  addTransaction,
  createManualDataset,
  fetchCalendarEvents,
  fetchSummary,
  updateGoals,
  uploadDataset,
} from '../lib/api'

const colors = ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b']
const emptyManualRow = { type: 'expense', date: '', merchant: '', description: '', amount: '' }
const emptyMonthlyRow = { month: '', income: '', expenses: '' }

function Dashboard() {
  const [datasetId, setDatasetId] = useState(localStorage.getItem('datasetId'))
  const [summary, setSummary] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [manualRows, setManualRows] = useState([{ ...emptyManualRow }])
  const [monthlyRows, setMonthlyRows] = useState([{ ...emptyMonthlyRow }])
  const [goalForm, setGoalForm] = useState({ monthly_budget: '', savings_goal: '' })

  const loadData = useCallback(async (id = datasetId) => {
    if (!id) {
      setSummary(null)
      setCalendarEvents([])
      return
    }
    try {
      setError('')
      const [summaryData, calendarData] = await Promise.all([fetchSummary(id), fetchCalendarEvents(id)])
      setSummary(summaryData)
      setGoalForm({
        monthly_budget: summaryData.goals?.monthly_budget || '',
        savings_goal: summaryData.goals?.savings_goal || '',
      })
      setCalendarEvents(calendarData.events || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard')
    }
  }, [datasetId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const budgetUsage = useMemo(() => {
    const budget = Number(goalForm.monthly_budget || 0)
    const spent = Number(summary?.total_spent_this_month || 0)
    if (!budget) return null
    return Math.min(100, Math.round((spent / budget) * 100))
  }, [goalForm.monthly_budget, summary?.total_spent_this_month])

  const persistTransactions = async (transactions) => {
    if (!transactions.length) return null
    if (!datasetId) {
      const result = await createManualDataset(transactions, {
        monthly_budget: Number(goalForm.monthly_budget || 0),
        savings_goal: Number(goalForm.savings_goal || 0),
      })
      localStorage.setItem('datasetId', result.dataset_id)
      setDatasetId(result.dataset_id)
      return result.dataset_id
    }

    try {
      for (const transaction of transactions) {
        await addTransaction(datasetId, transaction)
      }
      return datasetId
    } catch (err) {
      // If backend memory reset made the stored dataset id stale, recreate the dataset seamlessly.
      if (err.response?.status === 404) {
        const result = await createManualDataset(transactions, {
          monthly_budget: Number(goalForm.monthly_budget || 0),
          savings_goal: Number(goalForm.savings_goal || 0),
        })
        localStorage.setItem('datasetId', result.dataset_id)
        setDatasetId(result.dataset_id)
        return result.dataset_id
      }
      throw err
    }
  }

  const handleUpload = async (file) => {
    setCsvLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const result = await uploadDataset(file)
      localStorage.setItem('datasetId', result.dataset_id)
      setDatasetId(result.dataset_id)
      setSuccessMessage('CSV imported successfully.')
      await loadData(result.dataset_id)
    } catch (err) {
      setError(err.response?.data?.error || 'CSV upload failed')
    } finally {
      setCsvLoading(false)
    }
  }

  const saveManualEntries = async () => {
    setSaving(true)
    setError('')
    setSuccessMessage('')
    const cleaned = manualRows
      .filter((row) => row.date && row.merchant && Number(row.amount) > 0)
      .map((row) => ({
        date: row.date,
        merchant: row.merchant,
        description: row.description || `${row.type} entry`,
        amount: row.type === 'income' ? -Math.abs(Number(row.amount)) : Math.abs(Number(row.amount)),
      }))

    if (!cleaned.length) {
      setError('Add at least one valid manual entry with date, merchant, and amount.')
      setSaving(false)
      return
    }

    try {
      const activeDatasetId = await persistTransactions(cleaned)
      setManualRows([{ ...emptyManualRow }])
      setSuccessMessage('Manual entries saved.')
      await loadData(activeDatasetId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save manual entries')
    } finally {
      setSaving(false)
    }
  }

  const saveMonthlyPlans = async () => {
    setSaving(true)
    setError('')
    setSuccessMessage('')
    const planTransactions = monthlyRows
      .filter((row) => row.month && (Number(row.income) > 0 || Number(row.expenses) > 0))
      .flatMap((row) => {
        const transactions = []
        const date = `${row.month}-01`
        if (Number(row.income) > 0) {
          transactions.push({
            date,
            merchant: 'Monthly Income Plan',
            description: `Income for ${row.month}`,
            amount: -Math.abs(Number(row.income)),
          })
        }
        if (Number(row.expenses) > 0) {
          transactions.push({
            date,
            merchant: 'Monthly Expense Plan',
            description: `Expenses for ${row.month}`,
            amount: Math.abs(Number(row.expenses)),
          })
        }
        return transactions
      })

    if (!planTransactions.length) {
      setError('Add at least one month with income or expenses to save.')
      setSaving(false)
      return
    }

    try {
      const activeDatasetId = await persistTransactions(planTransactions)
      setMonthlyRows([{ ...emptyMonthlyRow }])
      setSuccessMessage('Monthly income/expense plans saved.')
      await loadData(activeDatasetId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save monthly plans')
    } finally {
      setSaving(false)
    }
  }

  const saveGoals = async () => {
    if (!datasetId) {
      setError('Add manual data first, then save goals to your dashboard dataset.')
      return
    }
    try {
      setError('')
      await updateGoals(datasetId, {
        monthly_budget: Number(goalForm.monthly_budget || 0),
        savings_goal: Number(goalForm.savings_goal || 0),
      })
      setSuccessMessage('Goals saved.')
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save goals')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Enter data manually first. CSV import is optional. Historical monthly income and expense entries feed your charts and Gemini insights.
        </p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {successMessage && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Manual entry (primary)</h3>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
              onClick={() => setManualRows((prev) => [...prev, { ...emptyManualRow }])}
            >
              + Add row
            </button>
          </div>
          {manualRows.map((row, index) => (
            <div key={`${row.date}-${index}`} className="grid gap-2 md:grid-cols-5">
              <select
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={row.type}
                onChange={(e) => setManualRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, type: e.target.value } : entry)))}
              >
                <option value="expense">Expense</option>
                <option value="subscription">Subscription</option>
                <option value="income">Income</option>
              </select>
              <input
                type="date"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={row.date}
                onChange={(e) => setManualRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, date: e.target.value } : entry)))}
              />
              <input
                placeholder="Merchant"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={row.merchant}
                onChange={(e) => setManualRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, merchant: e.target.value } : entry)))}
              />
              <input
                placeholder="Description"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={row.description}
                onChange={(e) => setManualRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, description: e.target.value } : entry)))}
              />
              <div className="flex gap-2">
                <input
                  placeholder="Amount"
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={row.amount}
                  onChange={(e) => setManualRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, amount: e.target.value } : entry)))}
                />
                {manualRows.length > 1 && (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    onClick={() => setManualRows((prev) => prev.filter((_, idx) => idx !== index))}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-70" onClick={saveManualEntries} disabled={saving}>
            {saving ? 'Saving...' : 'Save manual entries'}
          </button>
        </article>

        <div>
          <UploadCard onUpload={handleUpload} loading={csvLoading} successMessage="" error="" />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Monthly planner (past months supported)</h3>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            onClick={() => setMonthlyRows((prev) => [...prev, { ...emptyMonthlyRow }])}
          >
            + Add month
          </button>
        </div>
        {monthlyRows.map((row, index) => (
          <div key={`${row.month}-${index}`} className="grid gap-2 md:grid-cols-3">
            <input
              type="month"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              value={row.month}
              onChange={(e) => setMonthlyRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, month: e.target.value } : entry)))}
            />
            <input
              type="number"
              min="0"
              placeholder="Income for month"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              value={row.income}
              onChange={(e) => setMonthlyRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, income: e.target.value } : entry)))}
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                placeholder="Expenses for month"
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={row.expenses}
                onChange={(e) => setMonthlyRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, expenses: e.target.value } : entry)))}
              />
              {monthlyRows.length > 1 && (
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  onClick={() => setMonthlyRows((prev) => prev.filter((_, idx) => idx !== index))}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-white dark:bg-slate-200 dark:text-slate-900 disabled:opacity-70" onClick={saveMonthlyPlans} disabled={saving}>
          {saving ? 'Saving...' : 'Save monthly income and expenses'}
        </button>
      </section>

      {!summary && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Add manual entries above to generate dashboard charts and analytics.
        </article>
      )}

      {summary && (
        <>
          <SummaryCards summary={summary} />

          <section className="grid gap-4 md:grid-cols-2">
            <CategoryChart data={summary.category_totals || []} />
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 text-lg font-semibold">Income vs Expenses by month</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.monthly_cashflow || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={3} />
                    <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={3} />
                    <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 text-lg font-semibold">Budget goals</h3>
              <div className="mb-3 grid gap-2 md:grid-cols-2">
                <input className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" type="number" placeholder="Monthly budget" value={goalForm.monthly_budget} onChange={(e) => setGoalForm((p) => ({ ...p, monthly_budget: e.target.value }))} />
                <input className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" type="number" placeholder="Savings goal" value={goalForm.savings_goal} onChange={(e) => setGoalForm((p) => ({ ...p, savings_goal: e.target.value }))} />
              </div>
              <button className="rounded bg-indigo-600 px-3 py-2 text-white" onClick={saveGoals}>Save goals</button>
              {budgetUsage !== null && <p className="mt-2 text-sm">Budget usage this month: {budgetUsage}%</p>}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 text-lg font-semibold">Category mix</h3>
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
        </>
      )}
    </div>
  )
}

export default Dashboard
