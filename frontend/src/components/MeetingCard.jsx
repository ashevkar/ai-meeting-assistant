import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function MeetingCard({ meeting }) {
  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="block card hover:shadow-md hover:border-primary-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
            {meeting.title}
          </h3>
          <p className="text-sm text-gray-500 truncate mt-0.5">{meeting.original_filename}</p>
        </div>
        <StatusBadge status={meeting.status} className="shrink-0" />
      </div>

      {meeting.status === 'failed' && meeting.error_message && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-md p-2 line-clamp-2">
          {meeting.error_message}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(meeting.created_at)}</span>
        {meeting.duration_seconds && (
          <span>{Math.round(meeting.duration_seconds / 60)} min</span>
        )}
      </div>
    </Link>
  )
}
