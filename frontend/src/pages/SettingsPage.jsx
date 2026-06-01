import { useEffect, useState } from 'react'
import { getSlackSettings, saveSlackSettings, deleteSlackSettings, testSlackWebhook } from '../api/client'

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [channelName, setChannelName] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState('')
  const [hasSettings, setHasSettings] = useState(false)

  useEffect(() => {
    getSlackSettings()
      .then((res) => {
        setWebhookUrl(res.data.webhook_url)
        setChannelName(res.data.channel_name || '')
        setEnabled(res.data.enabled)
        setHasSettings(true)
      })
      .catch(() => setHasSettings(false))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!webhookUrl.trim()) return
    setSaving(true)
    setError('')
    try {
      await saveSlackSettings({ webhook_url: webhookUrl, channel_name: channelName || null, enabled })
      setHasSettings(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testSlackWebhook()
      setTestResult(res.data)
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.detail || 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Slack? Meeting completion notifications will stop.')) return
    await deleteSlackSettings().catch(() => {})
    setWebhookUrl('')
    setChannelName('')
    setEnabled(true)
    setHasSettings(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure integrations and preferences</p>
      </div>

      {/* Slack Integration */}
      <div className="card">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Slack Integration</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Post meeting summaries and action items to a Slack channel when processing completes
            </p>
          </div>
          {hasSettings && (
            <span className="ml-auto shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Connected
            </span>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Incoming Webhook URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                className="input-field"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Create one at <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">api.slack.com/apps</a> → Your App → Incoming Webhooks
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel name (optional)</label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="#meetings"
                className="input-field"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-700">
                {enabled ? 'Notifications enabled' : 'Notifications disabled'}
              </span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {testResult && (
              <div className={`rounded-lg p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.success ? '✓ ' : '✗ '}{testResult.message}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary">
                {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save settings'}
              </button>
              {hasSettings && (
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="btn-secondary"
                >
                  {testing ? 'Testing…' : 'Send test'}
                </button>
              )}
              {hasSettings && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="ml-auto text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Email provider info */}
      <div className="card mt-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Email Sending</h2>
        <p className="text-sm text-gray-500 mb-3">
          Configure email delivery in your <code className="bg-gray-100 px-1 rounded text-xs">.env</code> file:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-600 space-y-1">
          <p className="text-gray-400"># Option A: SendGrid</p>
          <p>SENDGRID_API_KEY=SG....</p>
          <p>FROM_EMAIL=you@yourdomain.com</p>
          <p className="text-gray-400 mt-2"># Option B: SMTP (Gmail, etc.)</p>
          <p>SMTP_HOST=smtp.gmail.com</p>
          <p>SMTP_PORT=587</p>
          <p>SMTP_USER=you@gmail.com</p>
          <p>SMTP_PASS=your_app_password</p>
          <p>FROM_EMAIL=you@gmail.com</p>
        </div>
        <p className="text-xs text-gray-400 mt-2">After editing .env, run: <code className="bg-gray-100 px-1 rounded">docker compose up -d backend</code></p>
      </div>
    </div>
  )
}
