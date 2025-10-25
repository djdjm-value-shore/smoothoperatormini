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

    abortControllerRef.current = new AbortController()

    try {
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

          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim()
            continue
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            try {
              const eventData = JSON.parse(data)

              if (currentEventType === 'delta') {
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
                setCurrentAgent(eventData.agent)

                const handoffMessage: ChatMessage = {
                  id: Date.now().toString() + '-handoff',
                  role: 'system',
                  content: `→ ${eventData.agent}`,
                  timestamp: Date.now(),
                }

                setMessages((prev) => [...prev, handoffMessage])

                currentMessage = {
                  id: Date.now().toString() + '-new',
                  role: 'assistant',
                  content: '',
                  agent: eventData.agent as any,
                  timestamp: Date.now(),
                }
                messageAdded = false
              } else if (currentEventType === 'tool_call') {
                const toolMessage: ChatMessage = {
                  id: Date.now().toString() + '-tool',
                  role: 'system',
                  content: `🔧 ${eventData.tool}()`,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, toolMessage])
              } else if (currentEventType === 'tool_result') {
                const resultMessage: ChatMessage = {
                  id: Date.now().toString() + '-result',
                  role: 'system',
                  content: `✓ ${eventData.tool} completed`,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, resultMessage])
              } else if (currentEventType === 'error') {
                const errorMessage: ChatMessage = {
                  id: Date.now().toString() + '-error',
                  role: 'system',
                  content: `❌ Error: ${eventData.error}`,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, errorMessage])
              }
            } catch (err) {
              console.error('Failed to parse SSE event:', err)
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request aborted
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
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">SmoothOperator</h1>
          <span className="text-sm text-slate-500 bg-slate-100/60 px-3 py-1 rounded-full">
            {currentAgent}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">How can I help you today?</p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'user' && (
                  <div className="flex justify-end">
                    <div className="bg-blue-100/70 rounded-2xl px-5 py-3 max-w-[75%] shadow-sm">
                      <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}

                {message.role === 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-white/90 rounded-2xl px-5 py-3 max-w-[75%] shadow-sm border border-slate-200/60">
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}

                {message.role === 'system' && (
                  <div className="flex justify-center">
                    <div className="text-xs text-slate-500 bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200/40">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-white/90 rounded-2xl px-5 py-3 shadow-sm border border-slate-200/60">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full px-5 py-3.5 pr-14 rounded-2xl border border-slate-300/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-sm bg-white shadow-sm placeholder:text-slate-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-blue-500 text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
