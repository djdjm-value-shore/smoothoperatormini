import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, User, Bot, Wrench } from 'lucide-react'
import { getFullApiUrl } from '../config'
import type { ChatMessage } from '../types'

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<string>('concierge')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const isNearBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return true

    const threshold = 150
    const position = container.scrollTop + container.clientHeight
    const height = container.scrollHeight

    return position >= height - threshold
  }

  useEffect(() => {
    // Only auto-scroll if user is near bottom (not reading history)
    if (isNearBottom()) {
      scrollToBottom()
    }
  }, [messages])

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
                  content: eventData.message,
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
                // Tool being called
                const toolMessage: ChatMessage = {
                  id: Date.now().toString() + '-tool',
                  role: 'system',
                  content: `🔧 Calling ${eventData.tool}(${JSON.stringify(eventData.arguments)})`,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, toolMessage])
              } else if (currentEventType === 'tool_result') {
                // Tool result
                const resultMessage: ChatMessage = {
                  id: Date.now().toString() + '-result',
                  role: 'system',
                  content: `✓ ${eventData.tool} completed: ${JSON.stringify(eventData.result).slice(0, 100)}`,
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

  const getMessageIcon = (message: ChatMessage) => {
    if (message.role === 'user') {
      return <User className="w-5 h-5" />
    } else if (message.role === 'system') {
      return <Wrench className="w-5 h-5" />
    } else {
      return <Bot className="w-5 h-5" />
    }
  }

  const getMessageClasses = (message: ChatMessage) => {
    if (message.role === 'user') {
      return 'chat-end'
    } else {
      return 'chat-start'
    }
  }

  const getBubbleClasses = (message: ChatMessage) => {
    if (message.role === 'user') {
      return 'chat-bubble-primary'
    } else if (message.role === 'system') {
      return 'chat-bubble-info'
    } else {
      return 'chat-bubble-secondary'
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <h1 className="text-xl font-bold">SmoothOperator Chat</h1>
        </div>
        <div className="flex-none">
          <div className="badge badge-outline badge-sm">
            Agent: {currentAgent}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-base-content/60 mt-20">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Start a conversation!</p>
            <p className="text-sm mt-2">
              Try: "Save a note titled 'test' with content 'hello world'"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`chat ${getMessageClasses(message)}`}>
            <div className="chat-image avatar">
              <div className="w-10 rounded-full bg-base-300 flex items-center justify-center">
                {getMessageIcon(message)}
              </div>
            </div>
            <div className={`chat-bubble ${getBubbleClasses(message)}`}>
              {message.agent && (
                <div className="text-xs opacity-70 mb-1">
                  {message.agent}
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-10 rounded-full bg-base-300 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
            <div className="chat-bubble chat-bubble-secondary">
              <span className="loading loading-dots"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-base-300 bg-base-100 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="input input-bordered flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
