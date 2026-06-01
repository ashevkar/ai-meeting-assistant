import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllActionItems, updateActionItemFull } from '../api/client'

const PRIORITY_STYLES = {
  high:   'text-red-700 bg-red-50 border-red-200',
  medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  low:    'text-green-700 bg-green-50 border-green-200',
}

const STATUS_STYLES = {
  open:        'text-blue-700 bg-blue-50',
  in_progress: 'text-yellow-700 bg-yellow-50',
  done:        'text-green-700 bg-green-50',
}

const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', done: 'Done' }

export default function AllActionItemsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '', assignee: '', completed: '' })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.assignee) params.assignee = filters.assignee
      if (filters.completed !== '') params.completed = filters.completed === 'true'
      const res = await getAllActionItems(params)
      setItems(res.data)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleStatusChange = async (item, newStatus) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i))
    await updateActionItemFull(item.meeting_id, item.id, { status: newStatus }).catch(() => {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: item.status } : i))
    })
  }

  const handleToggle = async (item) => {
    const next = !item.completed
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, completed: next } : i))
    await updateActionItemFull(item.meeting_id, item.id, { completed: next }).catch(() => {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, completed: item.completed } : i))
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Action Items</h1>
        <p className="text-gray-500 mt-1">All action items across all your meetings</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="input-field text-sm"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
              className="input-field text-sm"
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Completed</label>
            <select
              value={filters.completed}
              onChange={(e) => setFilters((f) => ({ ...f, completed: e.target.value }))}
              className="input-field text-sm"
            >
              <option value="">All</option>
              <option value="false">Incomplete</option>
              <option value="true">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assignee</label>
            <input
              type="text"
              value={filters.assignee}
              onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
              placeholder="Search assignee…"
              className="input-field text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="mx-auto w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No action items found</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-3">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          {items.map((item) => (
            <div key={item.id} className={`card py-3 px-4 flex items-start gap-3 ${item.completed ? 'opacity-60' : ''}`}>
              <button
                onClick={() => handleToggle(item)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-colors ${
                  item.completed ? 'bg-primary-600 border-primary-600' : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                {item.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {item.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <select
                    value={item.status || 'open'}
                    onChange={(e) => handleStatusChange(item, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer ${STATUS_STYLES[item.status || 'open']}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  {item.priority && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium}`}>
                      {item.priority}
                    </span>
                  )}
                  {item.assignee && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {item.assignee}
                    </span>
                  )}
                  {item.due_date && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {item.due_date}
                    </span>
                  )}
                </div>
              </div>

              <Link
                to={`/meetings/${item.meeting_id}`}
                className="shrink-0 text-xs text-gray-400 hover:text-primary-600 transition-colors ml-2"
                title="Go to meeting"
              >
                View meeting →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
