export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)

export const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`
