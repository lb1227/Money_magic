import { formatCurrency, formatPercent } from '../lib/format'

function SubscriptionsTable({ subscriptions, flagged, toggleFlag }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-4 py-3">Merchant</th>
            <th className="px-4 py-3">Interval (days)</th>
            <th className="px-4 py-3">Monthly Cost</th>
            <th className="px-4 py-3">Next Charge Date</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Flag to cancel</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => (
            <tr key={`${sub.merchant}-${sub.next_charge_date}`} className="border-t border-slate-200">
              <td className="px-4 py-3">{sub.merchant}</td>
              <td className="px-4 py-3">{sub.interval_days}</td>
              <td className="px-4 py-3">{formatCurrency(sub.monthly_cost)}</td>
              <td className="px-4 py-3">{sub.next_charge_date}</td>
              <td className="px-4 py-3">{formatPercent(sub.confidence)}</td>
              <td className="px-4 py-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(flagged[`${sub.merchant}-${sub.next_charge_date}`])}
                    onChange={() => toggleFlag(`${sub.merchant}-${sub.next_charge_date}`)}
                    aria-label={`Flag ${sub.merchant} to cancel`}
                  />
                  <span>{flagged[`${sub.merchant}-${sub.next_charge_date}`] ? 'Flagged' : 'Not flagged'}</span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SubscriptionsTable
