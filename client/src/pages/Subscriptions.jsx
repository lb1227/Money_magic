import { useCallback, useEffect, useMemo, useState } from 'react'
import SubscriptionsTable from '../components/SubscriptionsTable'
import {
  addTransaction,
  createManualDataset,
  deleteTransaction,
  fetchCalendarEvents,
  fetchSubscriptions,
  fetchTransactions,
  updateTransaction,
} from '../lib/api'

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'biweekly', label: 'Bi-weekly', days: 14 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'yearly', label: 'Yearly', days: 365 },
]

const emptyManualSub = { date: '', merchant: '', description: '', amount: '', frequency: 'monthly' }

const frequencyToDays = (frequency) => {
  const option = FREQUENCY_OPTIONS.find((item) => item.value === frequency)
  return option ? option.days : 30
}

const daysToFrequency = (days) => {
  const match = FREQUENCY_OPTIONS.find((item) => item.days === Number(days))
  return match ? match.value : 'monthly'
}

const addDaysIso = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  date.setDate(date.getDate() + Number(days))
  return date.toISOString().slice(0, 10)
}

const toIsoDate = (date) => {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const monthEnd = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const normalizeSubscriptions = (value) => {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value !== 'object') return []

  // If the API ever returns a single subscription object, wrap it.
  if (Object.prototype.hasOwnProperty.call(value, 'merchant')) return [value]

  // If the API returns a map/object of subscriptions, convert to an array.
  const candidates = Object.values(value)
  return candidates.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      Object.prototype.hasOwnProperty.call(item, 'merchant')
  )
}

const subscriptionSignature = (item = {}) => {
  const merchant = String(item.merchant || '').trim().toLowerCase()
  const interval = Number(item.interval_days || 30)
  const monthlyCost = Number(item.monthly_cost || 0).toFixed(2)
  const nextCharge = String(item.next_charge_date || item.date || '').slice(0, 10)
  return [merchant, interval, monthlyCost, nextCharge].join('|')
}

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [flagged, setFlagged] = useState({})
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualRows, setManualRows] = useState([{ ...emptyManualSub }])
  const [editingTxId, setEditingTxId] = useState('')
  const [editRow, setEditRow] = useState({ ...emptyManualSub })
  const [calendarEvents, setCalendarEvents] = useState([])
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(toIsoDate(new Date()))
  const [oneTimePayment, setOneTimePayment] = useState({
    date: toIsoDate(new Date()),
    merchant: '',
    description: '',
    amount: '',
  })

  const loadData = useCallback(async (id) => {
    if (!id) return
    const [subscriptionData, transactionData, calendarData] = await Promise.all([
      fetchSubscriptions(id),
      fetchTransactions(id),
      fetchCalendarEvents(id),
    ])

    const detected = normalizeSubscriptions(subscriptionData?.subscriptions)

    const manualOnly = (transactionData?.transactions || [])
      .filter(
        (tx) => tx?.source === 'manual_subscription' || tx?.category === 'Subscription'
      )
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))

    const manualAsSubscriptions = manualOnly.map((tx) => ({
      merchant: tx.merchant,
      interval_days: Number(tx.interval_days || 30),
      monthly_cost: Math.abs(Number(tx.amount || 0)),
      next_charge_date: tx.next_charge_date || tx.date,
      date: tx.date,
      amount: Number(tx.amount || 0),
      confidence: null,
      is_manual: true,
      tx_id: tx.tx_id,
      description: tx.description,
      source: tx.source,
    }))

    const manualSignatures = new Set(manualAsSubscriptions.map(subscriptionSignature))
    const nonManualDetected = detected.filter((sub) => !manualSignatures.has(subscriptionSignature(sub)))

    setSubscriptions([...nonManualDetected, ...manualAsSubscriptions])
    setCalendarEvents(calendarData?.events || [])
  }, [])

  useEffect(() => {
    const datasetId = localStorage.getItem('datasetId')
    if (!datasetId) {
      setError('No dataset found. Add manual entries in the Dashboard first.')
      return
    }

    loadData(datasetId).catch((err) =>
      setError(err.response?.data?.error || 'Failed to load subscriptions')
    )
  }, [loadData])

  const persistManualSubscriptions = async (transactions) => {
    const datasetId = localStorage.getItem('datasetId')
    if (!datasetId) {
      const result = await createManualDataset(transactions)
      localStorage.setItem('datasetId', result.dataset_id)
      return result.dataset_id
    }

    for (const transaction of transactions) {
      await addTransaction(datasetId, transaction)
    }

    return datasetId
  }

  const saveManualSubscriptions = async () => {
    setSaving(true)
    setError('')
    setSuccessMessage('')

    const cleaned = manualRows
      .filter((row) => row.date && row.merchant && Number(row.amount) > 0)
      .map((row) => ({
        date: row.date,
        merchant: row.merchant,
        description: row.description || `${row.merchant} subscription`,
        category: 'Subscription',
        source: 'manual_subscription',
        interval_days: frequencyToDays(row.frequency),
        next_charge_date: addDaysIso(row.date, frequencyToDays(row.frequency)),
        amount: Math.abs(Number(row.amount)),
      }))

    if (!cleaned.length) {
      setError('Add at least one valid manual subscription entry.')
      setSaving(false)
      return
    }

    try {
      const activeDatasetId = await persistManualSubscriptions(cleaned)
      await loadData(activeDatasetId)
      setManualRows([{ ...emptyManualSub }])
      setShowManualForm(false)
      setSuccessMessage('Manual subscription entries saved.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save manual subscriptions')
    } finally {
      setSaving(false)
    }
  }

  const beginEdit = (tx) => {
    setEditingTxId(tx.tx_id)
    setEditRow({
      date: tx.date || tx.next_charge_date || '',
      merchant: tx.merchant || '',
      description: tx.description || '',
      amount: Math.abs(Number(tx.amount || 0)),
      frequency: daysToFrequency(Number(tx.interval_days || 30)),
    })
  }

  const saveEdit = async () => {
    const datasetId = localStorage.getItem('datasetId')
    if (!datasetId || !editingTxId) return

    try {
      setSaving(true)
      setError('')
      await updateTransaction(datasetId, editingTxId, {
        date: editRow.date,
        merchant: editRow.merchant,
        description: editRow.description || `${editRow.merchant} subscription`,
        category: 'Subscription',
        source: 'manual_subscription',
        interval_days: frequencyToDays(editRow.frequency),
        next_charge_date: addDaysIso(editRow.date, frequencyToDays(editRow.frequency)),
        amount: Math.abs(Number(editRow.amount || 0)),
      })
      setEditingTxId('')
      setSuccessMessage('Manual subscription entry updated.')
      await loadData(datasetId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update manual subscription')
    } finally {
      setSaving(false)
    }
  }

  const removeManualSubscription = async (tx) => {
    const datasetId = localStorage.getItem('datasetId')
    if (!datasetId) return

    try {
      setSaving(true)
      setError('')
      await deleteTransaction(datasetId, tx.tx_id)
      setSuccessMessage('Manual subscription entry removed.')
      await loadData(datasetId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove manual subscription')
    } finally {
      setSaving(false)
    }
  }

  const toggleFlag = (key) => {
    setFlagged((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const saveOneTimeFuturePayment = async () => {
    const datasetId = localStorage.getItem('datasetId')
    const todayIso = toIsoDate(new Date())
    const amount = Number(oneTimePayment.amount || 0)
    if (!oneTimePayment.date || oneTimePayment.date < todayIso || !oneTimePayment.merchant || amount <= 0) {
      setError('Set a future date, merchant, and amount for one-time payment.')
      return
    }

    const payload = {
      date: oneTimePayment.date,
      merchant: oneTimePayment.merchant,
      description: oneTimePayment.description || `One-time payment: ${oneTimePayment.merchant}`,
      category: 'Planned Payment',
      source: 'one_time_future_payment',
      amount,
    }

    try {
      setSaving(true)
      setError('')
      if (!datasetId) {
        const result = await createManualDataset([payload])
        localStorage.setItem('datasetId', result.dataset_id)
        await loadData(result.dataset_id)
      } else {
        await addTransaction(datasetId, payload)
        await loadData(datasetId)
      }
      setSuccessMessage('One-time future payment added to calendar.')
      setOneTimePayment({
        date: oneTimePayment.date,
        merchant: '',
        description: '',
        amount: '',
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add one-time payment')
    } finally {
      setSaving(false)
    }
  }

  const eventsByDate = useMemo(() => {
    const grouped = new Map()
    for (const event of calendarEvents) {
      const key = String(event.date || '')
      if (!key) continue
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(event)
    }
    return grouped
  }, [calendarEvents])

  const calendarCells = useMemo(() => {
    const start = monthStart(calendarMonth)
    const end = monthEnd(calendarMonth)
    const firstCell = new Date(start)
    firstCell.setDate(start.getDate() - start.getDay())
    const lastCell = new Date(end)
    lastCell.setDate(end.getDate() + (6 - end.getDay()))

    const cells = []
    const cursor = new Date(firstCell)
    while (cursor <= lastCell) {
      const iso = toIsoDate(cursor)
      cells.push({
        iso,
        date: new Date(cursor),
        inMonth: cursor.getMonth() === calendarMonth.getMonth(),
        eventCount: (eventsByDate.get(iso) || []).length,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return cells
  }, [calendarMonth, eventsByDate])

  const eventsForSelectedDay = useMemo(
    () => eventsByDate.get(selectedCalendarDate) || [],
    [eventsByDate, selectedCalendarDate]
  )

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold">Detected subscriptions</h2>
        <SubscriptionsTable
          subscriptions={subscriptions}
          flagged={flagged}
          toggleFlag={toggleFlag}
          onEditManual={beginEdit}
          onRemoveManual={removeManualSubscription}
          saving={saving}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Manual subscriptions</h3>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
            onClick={() => setShowManualForm((prev) => !prev)}
          >
            {showManualForm ? 'Hide manual entry' : 'Manual subscription entry'}
          </button>
        </div>

        {successMessage && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}

        {showManualForm && (
          <div className="mb-5 space-y-3">
            {manualRows.map((row, index) => (
              <div key={`${index}-${row.date}`} className="grid gap-2 md:grid-cols-5">
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={row.date}
                  onChange={(e) =>
                    setManualRows((prev) =>
                      prev.map((entry, idx) =>
                        idx === index ? { ...entry, date: e.target.value } : entry
                      )
                    )
                  }
                />
                <input
                  placeholder="Merchant"
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={row.merchant}
                  onChange={(e) =>
                    setManualRows((prev) =>
                      prev.map((entry, idx) =>
                        idx === index ? { ...entry, merchant: e.target.value } : entry
                      )
                    )
                  }
                />
                <input
                  placeholder="Description"
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={row.description}
                  onChange={(e) =>
                    setManualRows((prev) =>
                      prev.map((entry, idx) =>
                        idx === index ? { ...entry, description: e.target.value } : entry
                      )
                    )
                  }
                />
                <select
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={row.frequency}
                  onChange={(e) =>
                    setManualRows((prev) =>
                      prev.map((entry, idx) =>
                        idx === index ? { ...entry, frequency: e.target.value } : entry
                      )
                    )
                  }
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    value={row.amount}
                    onChange={(e) =>
                      setManualRows((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, amount: e.target.value } : entry
                        )
                      )
                    }
                  />
                  {manualRows.length > 1 && (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      onClick={() =>
                        setManualRows((prev) => prev.filter((_, idx) => idx !== index))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                onClick={() => setManualRows((prev) => [...prev, { ...emptyManualSub }])}
              >
                + Add row
              </button>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-70"
                onClick={saveManualSubscriptions}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save manual subscriptions'}
              </button>
            </div>
          </div>
        )}

        {editingTxId && (
          <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <h4 className="text-sm font-semibold">Edit manual subscription</h4>
            <div className="grid gap-2 md:grid-cols-5">
              <input
                type="date"
                className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={editRow.date}
                onChange={(e) => setEditRow((prev) => ({ ...prev, date: e.target.value }))}
              />
              <input
                className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={editRow.merchant}
                onChange={(e) => setEditRow((prev) => ({ ...prev, merchant: e.target.value }))}
                placeholder="Merchant"
              />
              <input
                className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={editRow.description}
                onChange={(e) => setEditRow((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
              />
              <input
                type="number"
                min="0"
                className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={editRow.amount}
                onChange={(e) => setEditRow((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Amount"
              />
              <select
                className="rounded border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={editRow.frequency || 'monthly'}
                onChange={(e) => setEditRow((prev) => ({ ...prev, frequency: e.target.value }))}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white" onClick={saveEdit} disabled={saving}>
                Save
              </button>
              <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700" onClick={() => setEditingTxId('')}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-2 text-lg font-semibold">Subscription due-date calendar</h3>
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"
            onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            Prev
          </button>
          <p className="text-sm font-semibold">
            {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"
            onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            Next
          </button>
        </div>

        <div className="mb-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          {dayNames.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell) => (
            <button
              key={cell.iso}
              type="button"
              onClick={() => {
                setSelectedCalendarDate(cell.iso)
                setOneTimePayment((prev) => ({ ...prev, date: cell.iso }))
              }}
              className={`min-h-16 rounded-lg border p-1 text-left text-xs ${
                cell.inMonth
                  ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
              } ${selectedCalendarDate === cell.iso ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span>{cell.date.getDate()}</span>
                {cell.eventCount > 0 && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Events on {selectedCalendarDate}</h4>
            <div className="space-y-2">
              {eventsForSelectedDay.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No payments due.</p>}
              {eventsForSelectedDay.map((event) => (
                <div key={`${event.title}-${event.date}`} className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  <p>{event.title}</p>
                  <a href={event.google_calendar_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                    Add to Google Calendar
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Add one-time future payment</h4>
            <div className="space-y-2">
              <input
                type="date"
                className="w-full rounded border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={oneTimePayment.date}
                onChange={(e) => setOneTimePayment((prev) => ({ ...prev, date: e.target.value }))}
              />
              <input
                placeholder="Merchant"
                className="w-full rounded border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={oneTimePayment.merchant}
                onChange={(e) => setOneTimePayment((prev) => ({ ...prev, merchant: e.target.value }))}
              />
              <input
                placeholder="Description (optional)"
                className="w-full rounded border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={oneTimePayment.description}
                onChange={(e) => setOneTimePayment((prev) => ({ ...prev, description: e.target.value }))}
              />
              <input
                type="number"
                min="0"
                placeholder="Amount"
                className="w-full rounded border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={oneTimePayment.amount}
                onChange={(e) => setOneTimePayment((prev) => ({ ...prev, amount: e.target.value }))}
              />
              <button
                type="button"
                className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-70"
                onClick={saveOneTimeFuturePayment}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Add one-time payment'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Subscriptions
