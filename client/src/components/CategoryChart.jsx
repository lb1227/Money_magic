import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../lib/format'

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
  },
  labelStyle: { color: '#e2e8f0', fontWeight: 600 },
  itemStyle: { color: '#cbd5e1' },
  cursor: { fill: 'rgba(79, 70, 229, 0.12)' },
}

function CategoryChart({ data }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-lg font-semibold">Category Spend</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default CategoryChart
