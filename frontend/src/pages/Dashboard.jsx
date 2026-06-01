import { useCallback, useEffect, useState } from 'react'
import { getMeetings, deleteMeeting } from '../api/client'
import UploadZone from '../components/UploadZone'
import MeetingCard from '../components/MeetingCard'

function EmptyState() {
  return (
    <div className="text-center py-16">
      <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No meetings yet</h3>
      <p className="text-gray-500 text-sm">Upload your first meeting recording to get started</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="mt-4 h-3 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

export default function Dashboard() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await getMeetings()
      setMeetings(res.data)
    } catch {
      setError('Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Upload and manage your meeting recordings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload panel */}
        <div className="lg:col-span-1">
          <UploadZone onSuccess={fetchMeetings} />
        </div>

        {/* Meetings list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Meetings
              {!loading && meetings.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">({meetings.length})</span>
              )}
            </h2>
            {!loading && meetings.length > 0 && (
              <button onClick={fetchMeetings} className="btn-secondary text-sm">
                Refresh
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : meetings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
