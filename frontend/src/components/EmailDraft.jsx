import { useState } from 'react'
import { updateEmailDraft, sendMeetingEmail } from '../api/client'

export default function EmailDraft({ email: initialEmail, meetingId }) {
  const [email, setEmail] = useState(initialEmail)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [recipients, setRecipients] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  if (!email) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="mx-auto w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p>Email draft not available yet</p>
      </div>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startEditing = () => {
    setEditSubject(email.subject)
    setEditBody(email.body)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const res = await updateEmailDraft(meetingId, { subject: editSubject, body: editBody })
      setEmail(res.data)
      setIsEditing(false)
    } catch {
      // keep editing on failure
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    const recipientList = recipients.split(',').map((r) => r.trim()).filter(Boolean)
    if (!recipientList.length) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await sendMeetingEmail(meetingId, { recipients: recipientList })
      setSendResult(res.data)
      if (res.data.sent) setEmail((e) => ({ ...e, is_sent: true }))
    } catch (err) {
      setSendResult({ sent: false, method: 'none', message: err.response?.data?.detail || 'Send failed' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Subject</p>
          {isEditing ? (
            <input
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="input-field text-sm font-medium"
            />
          ) : (
            <p className="font-medium text-gray-900">{email.subject}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {email.is_sent && (
            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">Sent</span>
          )}
          {!isEditing && (
            <button onClick={startEditing} className="btn-secondary text-xs">Edit</button>
          )}
          <button onClick={handleCopy} className="btn-secondary text-sm">
            {copied ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Body</p>
        {isEditing ? (
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="input-field text-sm w-full h-64 resize-none"
          />
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 max-h-72 overflow-y-auto">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{email.body}</p>
          </div>
        )}
      </div>

      {/* Edit actions */}
      {isEditing && (
        <div className="flex gap-2">
          <button onClick={handleSaveEdit} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">Cancel</button>
        </div>
      )}

      {/* Send section */}
      {!isEditing && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Send email</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="recipient@example.com, another@example.com"
              className="input-field text-sm flex-1"
            />
            <button
              onClick={handleSend}
              disabled={sending || !recipients.trim()}
              className="btn-primary text-sm shrink-0"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {sendResult && (
            <div className={`mt-2 text-sm rounded-lg px-3 py-2 ${sendResult.sent ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {sendResult.sent
                ? `✓ Sent via ${sendResult.method}`
                : `✗ ${sendResult.message}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
