import { useEffect, useMemo, useState } from 'react'
import SubscriptionsTable from '../components/SubscriptionsTable'
import { fetchSubscriptions } from '../lib/api'
import { buildSubscriptionRows, getManualEntries } from '../lib/localData'

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [flagged, setFlagged] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    const datasetId = localStorage.getItem('datasetId')
    const manualRows = buildSubscriptionRows(getManualEntries())

    if (!datasetId) {
      setSubscriptions(manualRows)
      return
    }

    fetchSubscriptions(datasetId)
      .then((data) => setSubscriptions([...(data.subscriptions || []), ...manualRows]))
      .catch(() => {
        setError('Failed to load CSV subscriptions. Showing manual subscriptions only.')
        setSubscriptions(manualRows)
      })
  }, [])

  const toggleFlag = (key) => {
    setFlagged((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const calendarLinks = useMemo(
    () =>
      subscriptions.map((sub) => ({
        merchant: sub.merchant,
        url: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          `Pay ${sub.merchant}`,
        )}&details=${encodeURIComponent(`Subscription payment of $${sub.monthly_cost}`)}&dates=${(sub.next_charge_date || '').replaceAll('-', '')}/${(sub.next_charge_date || '').replaceAll('-', '')}`,
      })),
    [subscriptions],
  )

  return (
    <div className="space-y-4">
      {error && <p className="text-amber-600">{error}</p>}
      <h2 className="text-xl font-semibold">Detected subscriptions</h2>
      <SubscriptionsTable subscriptions={subscriptions} flagged={flagged} toggleFlag={toggleFlag} />
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-2 text-lg font-semibold">Google Calendar upcoming payments</h3>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">One-click event links for each subscription payment date.</p>
        <div className="flex flex-wrap gap-2">
          {calendarLinks.map((item) => (
            <a key={item.merchant} href={item.url} target="_blank" rel="noreferrer" className="rounded-lg bg-indigo-100 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
              Add {item.merchant}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Subscriptions
