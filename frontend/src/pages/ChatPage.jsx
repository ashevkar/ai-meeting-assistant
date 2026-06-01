import ChatInterface from '../components/ChatInterface'

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Ask AI</h1>
        <p className="text-gray-500 mt-1">
          Search and query across all your meeting history using natural language
        </p>
      </div>
      <ChatInterface />
    </div>
  )
}
