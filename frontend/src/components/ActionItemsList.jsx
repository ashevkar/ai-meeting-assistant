import { useState } from 'react'
import { updateActionItem, updateActionItemFull } from '../api/client'

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

export default function ActionItemsList({ meetingId, actionItems: initialItems }) {
  const [items, setItems] = useState(initialItems || [])

  if (!items.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="mx-auto w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No action items identified</p>
      </div>
    )
  }

  const completed = items.filter((i) => i.completed).length

  const optimistic = (id, patch) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const revert = (id, original) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...original } : i)))

  const handleToggle = async (item) => {
    const next = !item.completed
    optimistic(item.id, { completed: next })
    try {
      await updateActionItem(meetingId, item.id, { completed: next })
    } catch {
      revert(item.id, { completed: item.completed })
    }
  }

  const handleStatusChange = async (item, newStatus) => {
    optimistic(item.id, { status: newStatus })
    try {
      await updateActionItemFull(meetingId, item.id, { status: newStatus })
    } catch {
      revert(item.id, { status: item.status })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{completed} of {items.length} completed</span>
        <div className="w-32 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-primary-500 h-1.5 rounded-full transition-all"
            style={{ width: `${items.length ? (completed / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              item.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-primary-200'
            }`}
          >
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
                {item.priority && (
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium}`}>
                    {item.priority}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
