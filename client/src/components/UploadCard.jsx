import { useRef, useState } from 'react'

function UploadCard({ onUpload, loading, successMessage, error }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    onUpload(file)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-xl font-semibold">Upload your bank CSV</h2>
      <p className="mb-4 text-sm text-slate-600">Drop your file below or browse from your device.</p>

      <div
        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'
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
        role="button"
        tabIndex={0}
        aria-label="Drag and drop CSV upload"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <p className="mb-4 text-slate-600">Drag & drop CSV file here</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Browse File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
          aria-label="Upload CSV file"
        />
      </div>

      {loading && <p className="mt-4 text-sm text-indigo-700">Uploading...</p>}
      {successMessage && <p className="mt-4 text-sm text-emerald-700">{successMessage}</p>}
      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
    </section>
  )
}

export default UploadCard
