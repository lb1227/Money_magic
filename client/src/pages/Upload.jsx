import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadCard from '../components/UploadCard'
import { createManualDataset, uploadDataset } from '../lib/api'

const emptyTx = { date: '', merchant: '', description: '', amount: '' }

function Upload() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [transactions, setTransactions] = useState([{ ...emptyTx }])
  const [goals, setGoals] = useState({ monthly_budget: '', savings_goal: '' })

  const handleUpload = async (file) => {
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const result = await uploadDataset(file)
      localStorage.setItem('datasetId', result.dataset_id)
      setSuccessMessage('Upload successful')
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const updateRow = (index, field, value) => {
    setTransactions((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)))
  }

  const saveManual = async () => {
    setLoading(true)
    setError('')
    const cleaned = transactions
      .filter((row) => row.date && row.merchant && Number(row.amount) > 0)
      .map((row) => ({ ...row, amount: Number(row.amount) }))

    if (!cleaned.length) {
      setError('Add at least one valid transaction (date, merchant, amount).')
      setLoading(false)
      return
    }

    try {
      const result = await createManualDataset(cleaned, {
        monthly_budget: Number(goals.monthly_budget || 0),
        savings_goal: Number(goals.savings_goal || 0),
      })
      localStorage.setItem('datasetId', result.dataset_id)
      setSuccessMessage('Manual dataset created')
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create manual dataset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <UploadCard onUpload={handleUpload} loading={loading} successMessage={successMessage} error={error} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Manual Money Studio</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Add subscriptions, expenses, and even past weeks/months to build trend history.</p>

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input placeholder="Monthly budget goal" type="number" className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800" value={goals.monthly_budget} onChange={(e) => setGoals((p) => ({ ...p, monthly_budget: e.target.value }))} />
          <input placeholder="Savings goal" type="number" className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800" value={goals.savings_goal} onChange={(e) => setGoals((p) => ({ ...p, savings_goal: e.target.value }))} />
        </div>

        <div className="space-y-3">
          {transactions.map((row, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-4">
              <input type="date" className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800" value={row.date} onChange={(e) => updateRow(index, 'date', e.target.value)} />
              <input placeholder="Merchant" className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800" value={row.merchant} onChange={(e) => updateRow(index, 'merchant', e.target.value)} />
              <input placeholder="Description" className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800" value={row.description} onChange={(e) => updateRow(index, 'description', e.target.value)} />
              <input placeholder="Amount" type="number" className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800" value={row.amount} onChange={(e) => updateRow(index, 'amount', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border px-3 py-2 dark:border-slate-700" onClick={() => setTransactions((prev) => [...prev, { ...emptyTx }])}>
            + Add expense/subscription
          </button>
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-white" onClick={saveManual}>
            Create dataset
          </button>
        </div>
      </section>
    </div>
  )
}

export default Upload
