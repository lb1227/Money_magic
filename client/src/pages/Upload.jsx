import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadCard from '../components/UploadCard'
import { uploadDataset } from '../lib/api'
import { addManualEntry } from '../lib/localData'

const defaultForm = { name: '', amount: '', category: 'General', type: 'expense', date: '', nextChargeDate: '' }

function Upload() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(defaultForm)

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

  const handleManualSubmit = (e) => {
    e.preventDefault()
    addManualEntry({ ...form, amount: Number(form.amount), date: form.date || new Date().toISOString().slice(0, 10) })
    setForm(defaultForm)
    setSuccessMessage('Manual transaction added!')
    setTimeout(() => navigate('/dashboard'), 400)
  }

  return (
    <div className="space-y-5">
      <UploadCard onUpload={handleUpload} loading={loading} successMessage={successMessage} error={error} />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-xl font-semibold">Add data manually (no CSV needed)</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Track older weeks/months too so your coach can build trends.</p>
        <form onSubmit={handleManualSubmit} className="grid gap-3 md:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Name / merchant" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          <input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required type="number" step="0.01" placeholder="Amount" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
            <option value="expense">Expense</option>
            <option value="subscription">Subscription</option>
            <option value="income">Income</option>
          </select>
          <input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} type="date" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          <input value={form.nextChargeDate} onChange={(e) => setForm((f) => ({ ...f, nextChargeDate: e.target.value }))} type="date" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          <button className="rounded-lg bg-fuchsia-600 px-4 py-2 font-medium text-white hover:bg-fuchsia-500">Add entry</button>
        </form>
      </section>
    </div>
  )
}

export default Upload
