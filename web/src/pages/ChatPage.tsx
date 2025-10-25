import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { getFullApiUrl } from '../config'
import type { ChatMessage } from '../types'

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<string>('concierge')
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Use apiRequest to include session ID header
      const sessionId = localStorage.getItem('session_id')
      const response = await fetch(getFullApiUrl('/api/chatkit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
        },
        credentials: 'include',
        body: JSON.stringify({ message: userMessage.content }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let currentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        agent: currentAgent as any,
        timestamp: Date.now(),
      }

      let messageAdded = false
      let currentEventType = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.trim()) continue

          // Parse SSE event type
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim()
            continue
          }

          // Parse SSE data
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // Remove 'data: ' prefix

            try {
              const eventData = JSON.parse(data)

              if (currentEventType === 'delta') {
                // Text streaming
                currentMessage.content += eventData.content
                currentMessage.agent = eventData.agent

                if (!messageAdded) {
                  setMessages((prev) => [...prev, currentMessage])
                  messageAdded = true
                } else {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === currentMessage.id ? { ...currentMessage } : msg
                    )
                  )
                }
              } else if (currentEventType === 'agent_handoff') {
                // Visible handoff
                setCurrentAgent(eventData.agent)

                const handoffMessage: ChatMessage = {
                  id: Date.now().toString() + '-handoff',
                  role: 'system',
                  content: `→ ${eventData.agent}`,
                  timestamp: Date.now(),
                }

                setMessages((prev) => [...prev, handoffMessage])

                // Start new message for new agent
                currentMessage = {
                  id: Date.now().toString() + '-new',
                  role: 'assistant',
                  content: '',
                  agent: eventData.agent as any,
                  timestamp: Date.now(),
                }
                messageAdded = false
              } else if (currentEventType === 'tool_call') {
                // Tool being called - show minimally
                const toolMessage: ChatMessage = {
                  id: Date.now().toString() + '-tool',
                  role: 'system',
                  content: `${eventData.tool}()`,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, toolMessage])
              } else if (currentEventType === 'tool_result') {
                // Skip tool results for cleaner UI
              } else if (currentEventType === 'error') {
                const errorMessage: ChatMessage = {
                  id: Date.now().toString() + '-error',
                  role: 'system',
                  content: `Error: ${eventData.error}`,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, errorMessage])
              } else if (currentEventType === 'done') {
                // Stream complete
              }
            } catch (err) {
              console.error('Failed to parse SSE event:', err)
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted by user
      } else {
        console.error('Chat error:', err)
        const errorMessage: ChatMessage = {
          id: Date.now().toString() + '-error',
          role: 'system',
          content: `Error: ${err.message}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Minimalist header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-medium text-gray-900">SmoothOperator</h1>
          <span className="text-xs text-gray-500">{currentAgent}</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">How can I help you today?</p>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'user' && (
                  <div className="flex justify-end">
                    <div className="bg-gray-100 rounded-2xl px-5 py-3 max-w-[80%]">
                      <p className="text-gray-900 text-[15px] leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}

                {message.role === 'assistant' && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <p className="text-gray-900 text-[15px] leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}

                {message.role === 'system' && (
                  <div className="flex justify-center">
                    <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              placeholder="Message SmoothOperator..."
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-[15px] bg-white"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gray-900 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
