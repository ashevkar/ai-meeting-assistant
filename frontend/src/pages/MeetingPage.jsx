import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getMeeting, deleteMeeting, regenerateMeeting } from '../api/client'
import MeetingDetail from '../components/MeetingDetail'
import { usePolling } from '../hooks/usePolling'

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-40 mb-8" />
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-20 mb-3" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
      </div>
    </div>
  )
}

export default function MeetingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const fetchMeeting = useCallback(async () => {
    try {
      const res = await getMeeting(id)
      setMeeting(res.data)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Meeting not found')
      } else {
        setError('Failed to load meeting')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMeeting()
  }, [fetchMeeting])

  // Poll every 3s while the meeting is being processed
  const isProcessing = ['pending', 'processing'].includes(meeting?.status)
  usePolling(fetchMeeting, 3000, isProcessing)

  const handleDelete = async () => {
    if (!confirm('Delete this meeting and all its data? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteMeeting(id)
      navigate('/dashboard')
    } catch {
      setError('Failed to delete meeting')
      setDeleting(false)
    }
  }

  const handleRegenerate = async () => {
    try {
      await regenerateMeeting(id)
      await fetchMeeting()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to regenerate')
    }
  }

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/dashboard" className="btn-secondary">← Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-danger text-sm"
        >
          {deleting ? 'Deleting…' : 'Delete meeting'}
        </button>
      </div>

      <div className="card">
        <MeetingDetail meeting={meeting} onRegenerate={handleRegenerate} />
      </div>
    </div>
  )
}
