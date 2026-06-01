const STATUS_CONFIG = {
  pending:    { label: 'Pending',    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  processing: { label: 'Processing', classes: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' },
  completed:  { label: 'Completed',  classes: 'bg-green-100 text-green-800 border-green-200' },
  failed:     { label: 'Failed',     classes: 'bg-red-100 text-red-800 border-red-200' },
}

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  )
}
