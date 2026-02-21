const ENTRIES_KEY = 'manualEntries'
const GOALS_KEY = 'budgetGoals'

export const getManualEntries = () => {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]')
  } catch {
    return []
  }
}

export const addManualEntry = (entry) => {
  const next = [...getManualEntries(), { id: crypto.randomUUID(), ...entry }]
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(next))
  return next
}

export const getGoals = () => {
  try {
    return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]')
  } catch {
    return []
  }
}

export const saveGoal = (goal) => {
  const next = [...getGoals(), { id: crypto.randomUUID(), ...goal }]
  localStorage.setItem(GOALS_KEY, JSON.stringify(next))
  return next
}

export const buildSummaryFromEntries = (entries) => {
  const expenses = entries.filter((entry) => entry.type === 'expense')
  const subscriptions = entries.filter((entry) => entry.type === 'subscription')
  const categoryMap = expenses.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + Number(entry.amount)
    return acc
  }, {})

  const categoryTotals = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }))
  const biggestCategory = categoryTotals.sort((a, b) => b.amount - a.amount)[0]

  return {
    total_spent_this_month: expenses.reduce((sum, item) => sum + Number(item.amount), 0),
    biggest_category: biggestCategory ? { name: biggestCategory.category, amount: biggestCategory.amount } : null,
    subscription_monthly_total: subscriptions.reduce((sum, item) => sum + Number(item.amount), 0),
    category_totals: categoryTotals,
  }
}

export const buildTrendData = (entries, timeframe = 'month') => {
  const options = { month: 'short', day: 'numeric' }
  const fmt = new Intl.DateTimeFormat('en-US', options)
  const buckets = entries.reduce((acc, entry) => {
    const date = new Date(entry.date)
    const key = timeframe === 'week' ? `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}` : fmt.format(date)
    acc[key] = (acc[key] || 0) + Number(entry.amount)
    return acc
  }, {})

  return Object.entries(buckets).map(([period, amount]) => ({ period, amount }))
}

export const buildSubscriptionRows = (entries) =>
  entries
    .filter((entry) => entry.type === 'subscription')
    .map((entry) => ({
      merchant: entry.name,
      interval_days: 30,
      monthly_cost: Number(entry.amount),
      next_charge_date: entry.nextChargeDate || entry.date,
      confidence: 1,
    }))
