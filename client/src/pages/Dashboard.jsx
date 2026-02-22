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
  ReferenceLine,
} from 'recharts'
import SummaryCards from '../components/SummaryCards'
import CategoryChart from '../components/CategoryChart'
import UploadCard from '../components/UploadCard'
import {
  addTransaction,
  createManualDataset,
  deleteTransaction,
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

const monthName = (date, mode = 'long') =>
  date.toLocaleString('en-US', { month: mode })

const weekOfMonth = (date) => Math.floor((date.getDate() - 1) / 7) + 1

const getWeekStart = (date) => {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setDate(date.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

const getWeekEnd = (date) => {
  const end = new Date(getWeekStart(date))
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const getMonthEnd = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
const getYearStart = (date) => new Date(date.getFullYear(), 0, 1)
const getYearEnd = (date) => new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)

const addDays = (date, days) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const asIso = (date) => date.toISOString().slice(0, 10)

function ChartTooltip({ active, payload, granularity }) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload
  if (!row) return null

  const periodTitle =
    granularity === 'weekly'
      ? `Day: ${row.detailLabel || row.label}`
      : granularity === 'monthly'
        ? `Week: ${row.detailLabel || row.label}`
        : `Month: ${row.detailLabel || row.label}`

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{periodTitle}</p>
      <p className="text-emerald-700 dark:text-emerald-300">Income: ${Number(row.income || 0).toFixed(2)}</p>
      <p className="text-rose-700 dark:text-rose-300">Expenses: ${Number(row.expenses || 0).toFixed(2)}</p>
      <p className="text-blue-700 dark:text-blue-300">Net: ${Number(row.net || 0).toFixed(2)}</p>
      {Number(row.budget_target || 0) > 0 && (
        <p className="text-amber-700 dark:text-amber-300">Budget target: ${Number(row.budget_target).toFixed(2)}</p>
      )}
    </div>
  )
}

function CollapsibleSection({ title, isOpen, onToggle, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
          onClick={onToggle}
        >
          {isOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {isOpen && children}
    </section>
  )
}

function Dashboard() {
  const [datasetId, setDatasetId] = useState(localStorage.getItem('datasetId'))
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [now, setNow] = useState(new Date())
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [manualRows, setManualRows] = useState([{ ...emptyManualRow }])
  const [goalForm, setGoalForm] = useState({ monthly_budget: '', savings_goal: '' })
  const [granularity, setGranularity] = useState('monthly')
  const [selectedScope, setSelectedScope] = useState('')
  const [editingTxId, setEditingTxId] = useState('')
  const [editRow, setEditRow] = useState({ ...emptyManualRow })
  const [showAllManualEntries, setShowAllManualEntries] = useState(false)
  const [expanded, setExpanded] = useState({
    manual: true,
    analytics: true,
    periodData: true,
    budget: true,
    categoryMix: true,
    manualEntries: true,
    history: true,
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const loadData = useCallback(async (id = datasetId) => {
    if (!id) {
      setSummary(null)
      setTransactions([])
      return
    }
    try {
      setError('')
      const [summaryData, transactionData] = await Promise.all([
        fetchSummary(id),
        fetchTransactions(id),
      ])
      setSummary(summaryData)
      setTransactions(transactionData.transactions || [])
      setGoalForm({
        monthly_budget: summaryData.goals?.monthly_budget || '',
        savings_goal: summaryData.goals?.savings_goal || '',
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard')
    }
  }, [datasetId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const scopeOptions = useMemo(() => {
    const map = new Map()
    const addScopeForDate = (parsedDate) => {
      if (granularity === 'weekly') {
        const start = getWeekStart(parsedDate)
        const end = getWeekEnd(parsedDate)
        const key = asIso(start)
        map.set(key, {
          key,
          label: `${monthName(start)} week ${weekOfMonth(start)} (${start.getFullYear()})`,
          start,
          end,
        })
      } else if (granularity === 'monthly') {
        const start = getMonthStart(parsedDate)
        const end = getMonthEnd(parsedDate)
        const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
        map.set(key, {
          key,
          label: `${monthName(start)} ${start.getFullYear()}`,
          start,
          end,
        })
      } else {
        const start = getYearStart(parsedDate)
        const end = getYearEnd(parsedDate)
        const key = `${start.getFullYear()}`
        map.set(key, {
          key,
          label: key,
          start,
          end,
        })
      }
    }

    for (const tx of transactions) {
      const parsedDate = toDate(tx.date)
      if (parsedDate) addScopeForDate(parsedDate)

      const isRecurringManualSub =
        tx.source === 'manual_subscription' &&
        Number(tx.interval_days || 0) > 0 &&
        toDate(tx.next_charge_date || tx.date)

      if (isRecurringManualSub) {
        const intervalDays = Number(tx.interval_days)
        let due = toDate(tx.next_charge_date || tx.date)
        const horizon = addDays(new Date(), 370)
        while (due && due <= horizon) {
          addScopeForDate(due)
          due = addDays(due, intervalDays)
        }
      }
    }

    return [...map.values()].sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [transactions, granularity])

  useEffect(() => {
    if (!scopeOptions.length) {
      setSelectedScope('')
      return
    }
    if (!selectedScope || !scopeOptions.some((option) => option.key === selectedScope)) {
      setSelectedScope(scopeOptions[scopeOptions.length - 1].key)
    }
  }, [scopeOptions, selectedScope])

  const activeScope = useMemo(
    () => ({
      label: `${monthName(now)} ${now.getFullYear()}`,
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    }),
    [now]
  )

  const scopeRangeStart = activeScope.start
  const scopeRangeEnd = activeScope.end

  const periodChartData = useMemo(() => {
    const budgetTarget = Number(goalForm.monthly_budget || 0)
    if (!scopeRangeStart || !scopeRangeEnd) return []

    const grouped = new Map()
    const addPoint = (date, amount) => {
      if (date < scopeRangeStart || date > scopeRangeEnd) return

      let key
      let label
      let detailLabel
      if (granularity === 'weekly') {
        key = asIso(date)
        label = date.toLocaleString('en-US', { weekday: 'short' })
        detailLabel = `${monthName(date)} ${date.getDate()}, ${date.getFullYear()}`
      } else if (granularity === 'monthly') {
        const wom = weekOfMonth(date)
        key = `${date.getFullYear()}-${date.getMonth()}-W${wom}`
        label = `${monthName(date)} week ${wom}`
        detailLabel = `${monthName(date)} week ${wom}, ${date.getFullYear()}`
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        label = monthName(date, 'short')
        detailLabel = `${monthName(date)} ${date.getFullYear()}`
      }

      const existing = grouped.get(key) || {
        period: key,
        label,
        detailLabel,
        income: 0,
        expenses: 0,
        net: 0,
        budget_target: budgetTarget > 0 ? budgetTarget : 0,
      }
      if (amount < 0) {
        existing.income += Math.abs(amount)
      } else {
        existing.expenses += amount
      }
      existing.net = existing.income - existing.expenses
      grouped.set(key, existing)
    }

    for (const tx of transactions) {
      const amount = Number(tx.amount || 0)
      if (!Number.isFinite(amount)) continue

      const isRecurringManualSub =
        tx.source === 'manual_subscription' &&
        Number(tx.interval_days || 0) > 0 &&
        toDate(tx.next_charge_date || tx.date)

      if (isRecurringManualSub) {
        const intervalDays = Number(tx.interval_days)
        let due = toDate(tx.next_charge_date || tx.date)
        while (due && due <= scopeRangeEnd) {
          if (due >= scopeRangeStart) {
            addPoint(due, Math.abs(amount))
          }
          due = addDays(due, intervalDays)
        }
        continue
      }

      const parsedDate = toDate(tx.date)
      if (!parsedDate) continue
      addPoint(parsedDate, amount)
    }

    return [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period))
  }, [transactions, granularity, goalForm.monthly_budget, scopeRangeStart, scopeRangeEnd])

  const categoryDataForSelectedPeriod = useMemo(() => {
    if (!scopeRangeStart || !scopeRangeEnd) return []
    const totals = new Map()

    for (const tx of transactions) {
      const amount = Number(tx.amount || 0)
      if (!Number.isFinite(amount) || amount <= 0) continue

      const isRecurringManualSub =
        tx.source === 'manual_subscription' &&
        Number(tx.interval_days || 0) > 0 &&
        toDate(tx.next_charge_date || tx.date)

      if (isRecurringManualSub) {
        const intervalDays = Number(tx.interval_days)
        let due = toDate(tx.next_charge_date || tx.date)
        while (due && due <= scopeRangeEnd) {
          if (due >= scopeRangeStart) {
            const category = tx.category || 'Subscription'
            totals.set(category, (totals.get(category) || 0) + Math.abs(amount))
          }
          due = addDays(due, intervalDays)
        }
        continue
      }

      const parsedDate = toDate(tx.date)
      if (!parsedDate || parsedDate < scopeRangeStart || parsedDate > scopeRangeEnd) continue
      const category = tx.category || 'Other'
      totals.set(category, (totals.get(category) || 0) + amount)
    }

    return [...totals.entries()]
      .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, scopeRangeStart, scopeRangeEnd])

  const budgetUsage = useMemo(() => {
    const budget = Number(goalForm.monthly_budget || 0)
    const spent = Number(summary?.total_spent_this_month || 0)
    if (!budget) return null
    return Math.min(100, Math.round((spent / budget) * 100))
  }, [goalForm.monthly_budget, summary?.total_spent_this_month])

  const savingsGoalForecast = useMemo(() => {
    const savingsGoal = Number(goalForm.savings_goal || 0)
    const budget = Number(goalForm.monthly_budget || 0)
    if (!savingsGoal || !budget || !summary) return null

    const monthlyCashflow = Array.isArray(summary.monthly_cashflow) ? summary.monthly_cashflow : []
    const monthsWithIncome = monthlyCashflow
      .map((entry) => Number(entry?.income || 0))
      .filter((income) => income > 0)
    const averageMonthlyIncome = monthsWithIncome.length
      ? monthsWithIncome.reduce((sum, income) => sum + income, 0) / monthsWithIncome.length
      : Number(summary.total_income_this_month || 0)

    if (!averageMonthlyIncome || averageMonthlyIncome <= 0) {
      return { status: 'unavailable' }
    }

    const projectedMonthlySavings = averageMonthlyIncome - budget
    if (projectedMonthlySavings <= 0) {
      return { status: 'not_reachable', projectedMonthlySavings }
    }

    const months = Math.ceil(savingsGoal / projectedMonthlySavings)
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12

    return {
      status: 'ok',
      months,
      years,
      remainingMonths,
      projectedMonthlySavings,
    }
  }, [goalForm.monthly_budget, goalForm.savings_goal, summary])

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
  const visibleTransactions = showAllManualEntries ? sortedTransactions : sortedTransactions.slice(0, 8)
  const historyRows = useMemo(() => {
    if (!summary?.monthly_cashflow) return []
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return summary.monthly_cashflow
      .filter((row) => row.month < currentKey)
      .sort((a, b) => String(b.month).localeCompare(String(a.month)))
  }, [summary, now])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {now.toLocaleString()} • Data shown for current month ({activeScope.label}).
        </p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {successMessage && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>}

      <section className="grid gap-4 lg:grid-cols-3">
        <CollapsibleSection
          title="Manual entry (primary)"
          isOpen={expanded.manual}
          onToggle={() => setExpanded((prev) => ({ ...prev, manual: !prev.manual }))}
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-between">
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
        </CollapsibleSection>

        <div>
          <UploadCard onUpload={handleUpload} loading={csvLoading} successMessage="" error="" />
        </div>
      </section>

      {summary && <SummaryCards summary={summary} />}

      <CollapsibleSection
        title="Analytics view"
        isOpen={expanded.analytics}
        onToggle={() => setExpanded((prev) => ({ ...prev, analytics: !prev.analytics }))}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
          >
            <option value="weekly">Weekly (by day)</option>
            <option value="monthly">Monthly (by week)</option>
            <option value="yearly">Yearly (by month)</option>
          </select>
          <span className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
            {activeScope.label}
          </span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={periodChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip content={<ChartTooltip granularity={granularity} />} />
              <Legend />
              {Number(goalForm.monthly_budget || 0) > 0 && (
                <ReferenceLine
                  y={Number(goalForm.monthly_budget)}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                  label={{ value: 'Budget target', position: 'right', fill: '#b45309' }}
                />
              )}
              <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={3} />
              <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={3} />
              <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CollapsibleSection>

      <section className="grid gap-4 md:grid-cols-2">
        <CollapsibleSection
          title={`Period data (${granularity})`}
          isOpen={expanded.periodData}
          onToggle={() => setExpanded((prev) => ({ ...prev, periodData: !prev.periodData }))}
          className="rounded-xl"
        >
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
        </CollapsibleSection>

        <CollapsibleSection
          title={`Category mix (${activeScope?.label || 'selected period'})`}
          isOpen={expanded.categoryMix}
          onToggle={() => setExpanded((prev) => ({ ...prev, categoryMix: !prev.categoryMix }))}
          className="rounded-xl"
        >
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
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 md:grid-cols-1">
        <CollapsibleSection
          title="Budget goals"
          isOpen={expanded.budget}
          onToggle={() => setExpanded((prev) => ({ ...prev, budget: !prev.budget }))}
          className="rounded-xl"
        >
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <input className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" type="number" placeholder="Monthly budget" value={goalForm.monthly_budget} onChange={(e) => setGoalForm((p) => ({ ...p, monthly_budget: e.target.value }))} />
            <input className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" type="number" placeholder="Savings goal" value={goalForm.savings_goal} onChange={(e) => setGoalForm((p) => ({ ...p, savings_goal: e.target.value }))} />
          </div>
          <button className="rounded bg-indigo-600 px-3 py-2 text-white" onClick={saveGoals}>Save goals</button>
          {budgetUsage !== null && <p className="mt-2 text-sm">Budget usage this month: {budgetUsage}%</p>}
          {savingsGoalForecast?.status === 'ok' && (
            <p className="mt-2 text-sm">
              Estimated time to reach savings goal: {savingsGoalForecast.years > 0 ? `${savingsGoalForecast.years}y ` : ''}
              {savingsGoalForecast.remainingMonths}m
              {' '}at ~${savingsGoalForecast.projectedMonthlySavings.toFixed(2)}/month if budget is maintained.
            </p>
          )}
          {savingsGoalForecast?.status === 'not_reachable' && (
            <p className="mt-2 text-sm text-amber-700">
              At the current budget, projected monthly savings are ${savingsGoalForecast.projectedMonthlySavings.toFixed(2)}.
              Increase income or lower budgeted spend to reach the savings goal.
            </p>
          )}
          {savingsGoalForecast?.status === 'unavailable' && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Add income entries to estimate when your savings goal will be reached.
            </p>
          )}
        </CollapsibleSection>
      </section>

      <CollapsibleSection
        title="History"
        isOpen={expanded.history}
        onToggle={() => setExpanded((prev) => ({ ...prev, history: !prev.history }))}
        className="rounded-xl"
      >
        <div className="max-h-72 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Income</th>
                <th className="px-3 py-2">Expenses</th>
                <th className="px-3 py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.month} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2">${Number(row.income || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">${Number(row.expenses || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">${Number(row.net || 0).toFixed(2)}</td>
                </tr>
              ))}
              {historyRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-500">No prior month history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Previous manual entries"
        isOpen={expanded.manualEntries}
        onToggle={() => setExpanded((prev) => ({ ...prev, manualEntries: !prev.manualEntries }))}
        className="rounded-xl"
      >
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
              {visibleTransactions.map((tx) => {
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
        {sortedTransactions.length > 8 && (
          <div className="mt-3">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              onClick={() => setShowAllManualEntries((prev) => !prev)}
            >
              {showAllManualEntries ? 'Show less' : 'See all'}
            </button>
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}

export default Dashboard
