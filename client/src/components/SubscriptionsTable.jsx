import { formatCurrency, formatPercent } from '../lib/format'

const intervalLabel = (days) => {
  if (days === 7) return 'Weekly'
  if (days === 14) return 'Bi-weekly'
  if (days === 30) return 'Monthly'
  if (days === 90) return 'Quarterly'
  if (days === 365) return 'Yearly'
  return `${days} days`
}

const formatDate = (iso) => {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString()
  } catch (_) {
    return iso
  }
}

const toNumberOrNull = (value) => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function SubscriptionsTable({
  subscriptions = [],
  flagged = {},
  toggleFlag,
  onEditManual,
  onRemoveManual,
  saving = false,
}) {
  const safeList = Array.isArray(subscriptions) ? subscriptions : []
  const hasManualRows = safeList.some((sub) => sub?.is_manual && sub?.tx_id)

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            <th className="px-4 py-3">Merchant</th>
            <th className="px-4 py-3">Interval</th>
            <th className="px-4 py-3">Monthly Cost</th>
            <th className="px-4 py-3">Next Charge Date</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Flag to cancel</th>
            {hasManualRows && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {safeList.length === 0 ? (
            <tr className="border-t border-slate-200 dark:border-slate-700">
              <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={hasManualRows ? 7 : 6}>
                No subscriptions detected.
              </td>
            </tr>
          ) : (
            safeList.map((sub, idx) => {
              const merchant = sub?.merchant ?? 'Unknown'
              const nextDate = sub?.next_charge_date ?? ''
              const rowKey = `${merchant}-${nextDate || idx}`
              const inputId = `flag-${rowKey}`

              const intervalDays = toNumberOrNull(sub?.interval_days)
              const monthlyCost = toNumberOrNull(sub?.monthly_cost)
              const confidence = toNumberOrNull(sub?.confidence)
              const isManual = Boolean(sub?.is_manual && sub?.tx_id)

              return (
                <tr key={rowKey} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{merchant}</span>
                      {isManual && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                          Manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{intervalLabel(intervalDays ?? 0)}</td>
                  <td className="px-4 py-3">{monthlyCost === null ? '—' : formatCurrency(monthlyCost)}</td>
                  <td className="px-4 py-3">{formatDate(nextDate)}</td>
                  <td className="px-4 py-3">{confidence === null ? '—' : formatPercent(confidence)}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2" htmlFor={inputId}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={Boolean(flagged[rowKey])}
                        onChange={() => toggleFlag(rowKey)}
                        aria-label={`Flag ${merchant} to cancel`}
                      />
                      <span>{flagged[rowKey] ? 'Flagged' : 'Not flagged'}</span>
                    </label>
                  </td>
                  {hasManualRows && (
                    <td className="px-4 py-3">
                      {isManual ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded border border-slate-300 px-2 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                            onClick={() => onEditManual?.(sub)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded border border-rose-300 px-2 py-1 text-rose-700 dark:border-rose-700 dark:text-rose-300"
                            onClick={() => onRemoveManual?.(sub)}
                            disabled={Boolean(saving)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default SubscriptionsTable
