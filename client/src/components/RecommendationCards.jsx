import { formatCurrency } from '../lib/format'

function RecommendationCards({ recommendations }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {recommendations.map((item, index) => (
        <article key={`${item.title}-${index}`} className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <h4 className="font-semibold text-indigo-900">{item.title}</h4>
          <p className="mt-1 text-sm text-indigo-700">Potential savings: {formatCurrency(item.savings_impact)}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {item.steps?.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}

export default RecommendationCards
