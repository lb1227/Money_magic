import { useState } from 'react'
import RecommendationCards from './RecommendationCards'

function CoachChat({ onAsk, loading, messages }) {
  const [question, setQuestion] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    await onAsk(question)
    setQuestion('')
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Ask BudgetBuddy Coach</h2>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How can I save more this month?"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Ask coach a question"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Send
        </button>
      </form>

      {loading && <p className="text-sm text-indigo-700">Thinking...</p>}

      <div className="space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <p><span className="font-medium">You:</span> {msg.question}</p>
            <p><span className="font-medium">Coach:</span> {msg.response.summary_text}</p>
            <RecommendationCards recommendations={msg.response.recommendations || []} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default CoachChat
