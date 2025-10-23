/**
 * Type definitions for SmoothOperator
 */

export interface SessionStatus {
  passcode_verified: boolean
  api_key_set: boolean
  fully_authenticated: boolean
  session_id: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: 'concierge' | 'archivist'
  timestamp: number
}

export interface AgentHandoff {
  agent: string
  agent_name: string
  message: string
}

export interface ToolCall {
  agent: string
  tool: string
  arguments: Record<string, any>
}

export interface ToolResult {
  agent: string
  tool: string
  result: Record<string, any>
}

export type SSEEvent =
  | { event: 'delta'; data: { agent: string; content: string } }
  | { event: 'agent_handoff'; data: AgentHandoff }
  | { event: 'tool_call'; data: ToolCall }
  | { event: 'tool_result'; data: ToolResult }
  | { event: 'error'; data: { error: string } }
  | { event: 'done'; data: { agent: string } }
