import { formatCurrency } from '../lib/format'

function SummaryCards({ summary }) {
  const cards = [
    { label: 'Total Spent This Month', value: formatCurrency(summary.total_spent_this_month) },
    { label: 'Biggest Category', value: `${summary.biggest_category?.name || 'N/A'} (${formatCurrency(summary.biggest_category?.amount)})` },
    { label: 'Subscription Monthly Total', value: formatCurrency(summary.subscription_monthly_total) },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm text-slate-500">{card.label}</h3>
          <p className="mt-1 text-lg font-semibold">{card.value}</p>
        </article>
      ))}
    </div>
  )
}

export default SummaryCards
