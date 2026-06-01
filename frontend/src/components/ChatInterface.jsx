import { useState } from 'react'
import { Link } from 'react-router-dom'
import { queryChat } from '../api/client'

const CHUNK_TYPE_LABELS = {
  transcript: 'Transcript',
  summary: 'Summary',
  action_item: 'Action Item',
}

export default function ChatInterface() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await queryChat(question.trim())
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Query failed. Make sure you have processed meetings first.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What decisions were made about authentication?"
          className="input-field flex-1"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()} className="btn-primary shrink-0">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching…
            </span>
          ) : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Answer</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.answer}</p>
          </div>

          {result.sources?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Sources ({result.sources.length})
              </h3>
              <div className="space-y-2">
                {result.sources.map((source, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Link
                        to={`/meetings/${source.meeting_id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 truncate"
                      >
                        {source.meeting_title}
                      </Link>
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {CHUNK_TYPE_LABELS[source.chunk_type] || source.chunk_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{source.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="text-center py-12 text-gray-400">
          <svg className="mx-auto w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">Ask anything about your meeting history</p>
          <p className="text-xs mt-1">e.g. "What were the key decisions about the Q1 roadmap?"</p>
        </div>
      )}
    </div>
  )
}
