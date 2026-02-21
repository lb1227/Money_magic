import { formatCurrency, formatPercent } from '../lib/format'

const intervalLabel = (days) => {
  if (days === 7) return 'Weekly'
  if (days === 14) return 'Bi-weekly'
  if (days === 30) return 'Monthly'
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

function SubscriptionsTable({ subscriptions = [], flagged = {}, toggleFlag }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-4 py-3">Merchant</th>
            <th className="px-4 py-3">Interval</th>
            <th className="px-4 py-3">Monthly Cost</th>
            <th className="px-4 py-3">Next Charge Date</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Flag to cancel</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.length === 0 ? (
            <tr className="border-t border-slate-200">
              <td className="px-4 py-6 text-slate-500" colSpan={6}>
                No subscriptions detected.
              </td>
            </tr>
          ) : (
            subscriptions.map((sub) => {
              const rowKey = `${sub.merchant}-${sub.next_charge_date}`
              const inputId = `flag-${rowKey}`
              return (
                <tr key={rowKey} className="border-t border-slate-200">
                  <td className="px-4 py-3">{sub.merchant}</td>
                  <td className="px-4 py-3">{intervalLabel(sub.interval_days)}</td>
                  <td className="px-4 py-3">{formatCurrency(sub.monthly_cost)}</td>
                  <td className="px-4 py-3">{formatDate(sub.next_charge_date)}</td>
                  <td className="px-4 py-3">{formatPercent(sub.confidence)}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2" htmlFor={inputId}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={Boolean(flagged[rowKey])}
                        onChange={() => toggleFlag(rowKey)}
                        aria-label={`Flag ${sub.merchant} to cancel`}
                      />
                      <span>{flagged[rowKey] ? 'Flagged' : 'Not flagged'}</span>
                    </label>
                  </td>
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
