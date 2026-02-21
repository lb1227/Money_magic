import { useRef, useState } from 'react'

function UploadCard({ onUpload, loading, successMessage, error }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    onUpload(file)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 text-xl font-semibold">Import from CSV (optional)</h2>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">You can upload statements or add data manually below.</p>

      <div
        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-700'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          const file = e.dataTransfer.files?.[0]
          handleFile(file)
        }}
      >
        <p className="mb-4 text-slate-600 dark:text-slate-400">Drag & drop CSV file here</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
          Browse File
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {loading && <p className="mt-4 text-sm text-indigo-700">Uploading...</p>}
      {successMessage && <p className="mt-4 text-sm text-emerald-700">{successMessage}</p>}
      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
    </section>
  )
}

export default UploadCard
