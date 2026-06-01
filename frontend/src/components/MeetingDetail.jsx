import { useState } from 'react'
import TranscriptViewer from './TranscriptViewer'
import SummaryPanel from './SummaryPanel'
import ActionItemsList from './ActionItemsList'
import EmailDraft from './EmailDraft'
import StatusBadge from './StatusBadge'

const TABS = [
  { id: 'transcript', label: 'Transcript' },
  { id: 'summary',    label: 'Summary' },
  { id: 'actions',    label: 'Action Items' },
  { id: 'email',      label: 'Follow-up Email' },
]

function LoadingTab() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`h-4 bg-gray-200 rounded ${i === 3 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  )
}

export default function MeetingDetail({ meeting, onRegenerate }) {
  const [activeTab, setActiveTab] = useState('transcript')
  const isProcessing = ['pending', 'processing'].includes(meeting.status)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{meeting.original_filename}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={meeting.status} />
            {meeting.status === 'completed' && (
              <button onClick={onRegenerate} className="btn-secondary text-sm">
                Regenerate
              </button>
            )}
          </div>
        </div>

        {meeting.status === 'failed' && meeting.error_message && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium">Processing failed</p>
            <p className="text-sm text-red-600 mt-0.5">{meeting.error_message}</p>
          </div>
        )}

        {isProcessing && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-blue-700">
              {meeting.status === 'pending' ? 'Queued for processing…' : 'Transcribing and analyzing your meeting…'}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'actions' && meeting.action_items?.length > 0 && (
                <span className="ml-1.5 bg-primary-100 text-primary-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {meeting.action_items.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'transcript' && (
          isProcessing && !meeting.transcript
            ? <LoadingTab />
            : <TranscriptViewer transcript={meeting.transcript} segments={meeting.segments} speakers={meeting.speakers} />
        )}
        {activeTab === 'summary' && (
          isProcessing && !meeting.summary
            ? <LoadingTab />
            : <SummaryPanel summary={meeting.summary} />
        )}
        {activeTab === 'actions' && (
          isProcessing && !meeting.action_items?.length
            ? <LoadingTab />
            : <ActionItemsList meetingId={meeting.id} actionItems={meeting.action_items} />
        )}
        {activeTab === 'email' && (
          isProcessing && !meeting.follow_up_email
            ? <LoadingTab />
            : <EmailDraft email={meeting.follow_up_email} meetingId={meeting.id} />
        )}
      </div>
    </div>
  )
}
