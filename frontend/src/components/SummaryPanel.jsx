export default function SummaryPanel({ summary }) {
  if (!summary) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="mx-auto w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h10" />
        </svg>
        <p>Summary not available yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Executive Summary</h3>
        <p className="text-gray-700 leading-relaxed">{summary.summary}</p>
      </div>

      {summary.key_points?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Key Points</h3>
          <ul className="space-y-2">
            {summary.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-700 text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
