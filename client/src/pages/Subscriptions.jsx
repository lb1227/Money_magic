import { useCallback, useEffect, useState } from 'react'
import SubscriptionsTable from '../components/SubscriptionsTable'
import {
  addTransaction,
  createManualDataset,
  deleteTransaction,
  fetchSubscriptions,
  fetchTransactions,
  updateTransaction,
} from '../lib/api'

const emptyManualSub = { date: '', merchant: '', description: '', amount: '' }

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

  const loadData = useCallback(async (id) => {
    if (!id) return
    const [subscriptionData, transactionData] = await Promise.all([
      fetchSubscriptions(id),
      fetchTransactions(id),
    ])

    const detected = normalizeSubscriptions(subscriptionData?.subscriptions)

    const manualOnly = (transactionData?.transactions || [])
      .filter(
        (tx) => tx?.source === 'manual_subscription' || tx?.category === 'Subscription'
      )
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))

    const manualAsSubscriptions = manualOnly.map((tx) => ({
      merchant: tx.merchant,
      interval_days: 30,
      monthly_cost: Math.abs(Number(tx.amount || 0)),
      next_charge_date: tx.date,
      confidence: null,
      is_manual: true,
      tx_id: tx.tx_id,
      description: tx.description,
    }))

    setSubscriptions([...detected, ...manualAsSubscriptions])
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
      date: tx.date || '',
      merchant: tx.merchant || '',
      description: tx.description || '',
      amount: Math.abs(Number(tx.amount || 0)),
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
              <div key={`${index}-${row.date}`} className="grid gap-2 md:grid-cols-4">
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
            <div className="grid gap-2 md:grid-cols-4">
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
    </div>
  )
}

export default Subscriptions
