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
  deleteTransaction,
  fetchCalendarEvents,
  fetchSummary,
  fetchTransactions,
  updateGoals,
  updateTransaction,
  uploadDataset,
} from '../lib/api'

const colors = ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b']
const categories = ['Food', 'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment', 'Shopping', 'Income', 'Other']
const emptyManualRow = {
  flow: 'expense',
  category: 'Other',
  date: '',
  merchant: '',
  description: '',
  amount: '',
}

const toDate = (value) => {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getWeekKey = (date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

const getPeriodKey = (date, granularity) => {
  if (granularity === 'weekly') return getWeekKey(date)
  if (granularity === 'yearly') return String(date.getFullYear())
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const getPeriodLabel = (key, granularity) => {
  if (granularity === 'weekly') return `Week ${key.split('-W')[1]} (${key.split('-W')[0]})`
  if (granularity === 'yearly') return key
  const [year, month] = key.split('-')
  return `${year}-${month}`
}

function Dashboard() {
  const [datasetId, setDatasetId] = useState(localStorage.getItem('datasetId'))
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [manualRows, setManualRows] = useState([{ ...emptyManualRow }])
  const [goalForm, setGoalForm] = useState({ monthly_budget: '', savings_goal: '' })
  const [granularity, setGranularity] = useState('monthly')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [editingTxId, setEditingTxId] = useState('')
  const [editRow, setEditRow] = useState({ ...emptyManualRow })

  const loadData = useCallback(async (id = datasetId) => {
    if (!id) {
      setSummary(null)
      setTransactions([])
      setCalendarEvents([])
      return
    }
    try {
      setError('')
      const [summaryData, calendarData, transactionData] = await Promise.all([
        fetchSummary(id),
        fetchCalendarEvents(id),
        fetchTransactions(id),
      ])
      setSummary(summaryData)
      setTransactions(transactionData.transactions || [])
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

  const periodChartData = useMemo(() => {
    const grouped = new Map()
    for (const tx of transactions) {
      const parsedDate = toDate(tx.date)
      if (!parsedDate) continue
      const key = getPeriodKey(parsedDate, granularity)
      const existing = grouped.get(key) || { period: key, label: getPeriodLabel(key, granularity), income: 0, expenses: 0, net: 0 }
      const amount = Number(tx.amount || 0)
      if (amount < 0) {
        existing.income += Math.abs(amount)
      } else {
        existing.expenses += amount
      }
      existing.net = existing.income - existing.expenses
      grouped.set(key, existing)
    }
    return [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period))
  }, [transactions, granularity])

  const periodKeys = useMemo(() => periodChartData.map((item) => item.period), [periodChartData])

  useEffect(() => {
    if (!periodKeys.length) {
      setSelectedPeriod('')
      return
    }
    if (!selectedPeriod || !periodKeys.includes(selectedPeriod)) {
      setSelectedPeriod(periodKeys[periodKeys.length - 1])
    }
  }, [periodKeys, selectedPeriod])

  const categoryDataForSelectedPeriod = useMemo(() => {
    if (!selectedPeriod) return []
    const totals = new Map()
    for (const tx of transactions) {
      const parsedDate = toDate(tx.date)
      if (!parsedDate) continue
      if (getPeriodKey(parsedDate, granularity) !== selectedPeriod) continue
      const amount = Number(tx.amount || 0)
      if (amount <= 0) continue
      const category = tx.category || 'Other'
      totals.set(category, (totals.get(category) || 0) + amount)
    }
    return [...totals.entries()]
      .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, granularity, selectedPeriod])

  const budgetUsage = useMemo(() => {
    const budget = Number(goalForm.monthly_budget || 0)
    const spent = Number(summary?.total_spent_this_month || 0)
    if (!budget) return null
    return Math.min(100, Math.round((spent / budget) * 100))
  }, [goalForm.monthly_budget, summary?.total_spent_this_month])

  const persistTransactions = async (newTransactions) => {
    if (!newTransactions.length) return null
    if (!datasetId) {
      const result = await createManualDataset(newTransactions, {
        monthly_budget: Number(goalForm.monthly_budget || 0),
        savings_goal: Number(goalForm.savings_goal || 0),
      })
      localStorage.setItem('datasetId', result.dataset_id)
      setDatasetId(result.dataset_id)
      return result.dataset_id
    }

    try {
      for (const transaction of newTransactions) {
        await addTransaction(datasetId, transaction)
      }
      return datasetId
    } catch (err) {
      if (err.response?.status === 404) {
        const result = await createManualDataset(newTransactions, {
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
      .filter((row) => row.date && row.merchant && row.category && Number(row.amount) > 0)
      .map((row) => ({
        date: row.date,
        merchant: row.merchant,
        description: row.description || `${row.category} ${row.flow}`,
        category: row.category,
        source: 'manual',
        amount: row.flow === 'income' ? -Math.abs(Number(row.amount)) : Math.abs(Number(row.amount)),
      }))

    if (!cleaned.length) {
      setError('Add at least one valid manual entry with date, merchant, category, and amount.')
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
      await loadData(datasetId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save goals')
    }
  }

  const beginEdit = (tx) => {
    setEditingTxId(tx.tx_id)
    setEditRow({
      flow: Number(tx.amount || 0) < 0 ? 'income' : 'expense',
      category: tx.category || 'Other',
      date: tx.date || '',
      merchant: tx.merchant || '',
      description: tx.description || '',
      amount: Math.abs(Number(tx.amount || 0)),
    })
  }

  const saveEditedTransaction = async () => {
    if (!datasetId || !editingTxId) return
    try {
      setSaving(true)
      setError('')
      await updateTransaction(datasetId, editingTxId, {
        date: editRow.date,
        merchant: editRow.merchant,
        description: editRow.description || `${editRow.category} ${editRow.flow}`,
        category: editRow.category,
        source: 'manual',
        amount: editRow.flow === 'income' ? -Math.abs(Number(editRow.amount || 0)) : Math.abs(Number(editRow.amount || 0)),
      })
      setEditingTxId('')
      setSuccessMessage('Entry updated.')
      await loadData(datasetId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update entry')
    } finally {
      setSaving(false)
    }
  }

  const removeTransaction = async (txId) => {
    if (!datasetId) return
    try {
      setSaving(true)
      setError('')
      await deleteTransaction(datasetId, txId)
      setSuccessMessage('Entry removed.')
      await loadData(datasetId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove entry')
    } finally {
      setSaving(false)
    }
  }

  const sortedTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.source !== 'csv')
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [transactions]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Use manual entry as the primary workflow. Switch analytics by weekly, monthly, or yearly views.
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
            <div key={`${row.date}-${index}`} className="grid gap-2 md:grid-cols-6">
              <select
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={row.flow}
                onChange={(e) => setManualRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, flow: e.target.value } : entry)))}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={row.category}
                onChange={(e) => setManualRows((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, category: e.target.value } : entry)))}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
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

      {summary && <SummaryCards summary={summary} />}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">Analytics view</h3>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            disabled={!periodKeys.length}
          >
            {periodKeys.length === 0 && <option value="">No period data</option>}
            {periodKeys.map((key) => (
              <option key={key} value={key}>
                {getPeriodLabel(key, granularity)}
              </option>
            ))}
          </select>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={periodChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={3} />
              <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={3} />
              <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <CategoryChart data={categoryDataForSelectedPeriod} />

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-semibold">Period data ({granularity})</h3>
          <div className="max-h-72 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Income</th>
                  <th className="px-3 py-2">Expenses</th>
                  <th className="px-3 py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {periodChartData.map((row) => (
                  <tr key={row.period} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">${row.income.toFixed(2)}</td>
                    <td className="px-3 py-2">${row.expenses.toFixed(2)}</td>
                    <td className="px-3 py-2">${row.net.toFixed(2)}</td>
                  </tr>
                ))}
                {periodChartData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-slate-500">No data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
          <h3 className="mb-3 text-lg font-semibold">Category mix ({selectedPeriod || 'latest'})</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryDataForSelectedPeriod} dataKey="amount" nameKey="category" outerRadius={90}>
                  {categoryDataForSelectedPeriod.map((entry, index) => (
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
        <h3 className="mb-2 text-lg font-semibold">Previous manual entries</h3>
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Merchant</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((tx) => {
                const isEditing = editingTxId === tx.tx_id
                return (
                  <tr key={tx.tx_id || `${tx.date}-${tx.merchant}-${tx.amount}`} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2">
                      {isEditing ? <input type="date" className="rounded border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" value={editRow.date} onChange={(e) => setEditRow((prev) => ({ ...prev, date: e.target.value }))} /> : tx.date}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? <input className="rounded border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" value={editRow.merchant} onChange={(e) => setEditRow((prev) => ({ ...prev, merchant: e.target.value }))} /> : tx.merchant}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select className="rounded border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" value={editRow.category} onChange={(e) => setEditRow((prev) => ({ ...prev, category: e.target.value }))}>
                          {categories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      ) : (
                        tx.category || 'Other'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select className="rounded border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" value={editRow.flow} onChange={(e) => setEditRow((prev) => ({ ...prev, flow: e.target.value }))}>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      ) : (
                        Number(tx.amount || 0) < 0 ? 'Income' : 'Expense'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? <input type="number" min="0" className="w-24 rounded border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" value={editRow.amount} onChange={(e) => setEditRow((prev) => ({ ...prev, amount: e.target.value }))} /> : `$${Math.abs(Number(tx.amount || 0)).toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button type="button" className="rounded bg-indigo-600 px-2 py-1 text-white" onClick={saveEditedTransaction} disabled={saving}>Save</button>
                          <button type="button" className="rounded border px-2 py-1" onClick={() => setEditingTxId('')}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" className="rounded border px-2 py-1" onClick={() => beginEdit(tx)}>Edit</button>
                          <button type="button" className="rounded border border-rose-300 px-2 py-1 text-rose-700" onClick={() => removeTransaction(tx.tx_id)} disabled={saving}>Remove</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {sortedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-slate-500">No entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

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
