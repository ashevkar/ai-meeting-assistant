import TranscriptSegments from './TranscriptSegments'

export default function TranscriptViewer({ transcript, segments, speakers }) {
  if (!transcript && (!segments || segments.length === 0)) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="mx-auto w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>Transcript not available yet</p>
      </div>
    )
  }

  // Speaker-diarized view
  if (segments && segments.length > 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">
            {segments.length} segments · {transcript?.text.split(' ').length || 0} words
          </span>
          {transcript && (
            <button
              onClick={() => navigator.clipboard.writeText(transcript.text)}
              className="btn-secondary text-xs"
            >
              Copy transcript
            </button>
          )}
        </div>
        <TranscriptSegments segments={segments} speakers={speakers} />
      </div>
    )
  }

  // Plain text fallback
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{transcript.text.split(' ').length} words</span>
        <button
          onClick={() => navigator.clipboard.writeText(transcript.text)}
          className="btn-secondary text-xs"
        >
          Copy transcript
        </button>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript.text}</p>
      </div>
    </div>
  )
}
