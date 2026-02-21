import { useState } from 'react'

function QuickAddFab({ onSelect }) {
  const [open, setOpen] = useState(false)
  const actions = [
    { key: 'expense', label: 'Add expense' },
    { key: 'subscription', label: 'Add subscription' },
    { key: 'income', label: 'Add income' },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-20">
      {open && (
        <div className="mb-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => {
                onSelect(action.key)
                setOpen(false)
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} className="h-14 w-14 rounded-full bg-fuchsia-600 text-3xl text-white shadow-2xl hover:bg-fuchsia-500">
        +
      </button>
    </div>
  )
}

export default QuickAddFab
