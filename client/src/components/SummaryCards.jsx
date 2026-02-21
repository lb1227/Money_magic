import { formatCurrency } from '../lib/format'

function SummaryCards({ summary }) {
  const cards = [
    { label: 'Total Spent This Month', value: formatCurrency(summary.total_spent_this_month) },
    { label: 'Total Income This Month', value: formatCurrency(summary.total_income_this_month || 0) },
    { label: 'Net Cashflow This Month', value: formatCurrency(summary.net_cashflow_this_month || 0) },
    { label: 'Biggest Category', value: `${summary.biggest_category?.name || 'N/A'} (${formatCurrency(summary.biggest_category?.amount)})` },
    { label: 'Subscription Monthly Total', value: formatCurrency(summary.subscription_monthly_total) },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm text-slate-500 dark:text-slate-400">{card.label}</h3>
          <p className="mt-1 text-lg font-semibold">{card.value}</p>
        </article>
      ))}
    </div>
  )
}

export default SummaryCards
