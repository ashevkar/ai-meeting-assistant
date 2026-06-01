export default function TranscriptSegments({ segments, speakers }) {
  if (!segments || segments.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        {speakers?.map((speaker) => (
          <div key={speaker.id} className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: speaker.color || '#6B7280' }}
            />
            {speaker.name || speaker.label}
          </div>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {segments.map((seg) => (
          <div key={seg.id} className="flex gap-3">
            <div className="flex-shrink-0 pt-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mt-1"
                style={{ backgroundColor: seg.speaker_color || '#6B7280' }}
                title={seg.speaker_label}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {seg.speaker_label}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed mt-0.5">{seg.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
