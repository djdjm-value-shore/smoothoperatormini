# SmoothOperator Specification

## Product Definition

**Name**: SmoothOperator
**Type**: Multi-agent chat application with embeddable widget
**Purpose**: Competition entry demonstrating minimal, code-efficient architecture for production-ready multi-agent systems

## Functional Requirements

### 1. Authentication System

**Passcode Gate** (FR-1.1):
- Users enter `APP_PASSCODE` at `/login` endpoint
- Creates HttpOnly, Secure, SameSite=Lax session cookie
- Session managed in-memory (no database)

**API Key Management** (FR-1.2):
- Users paste OpenAI API key in `/settings` page
- Key stored in session memory only (never persisted)
- Required for `/chat` access

**Route Guards** (FR-1.3):
- `/settings`: Requires passcode authentication
- `/chat`: Requires both passcode + user API key

### 2. Multi-Agent System

**Agent Roster** (FR-2.1):
- Concierge: Front-facing agent for general queries
- Archivist: Specialist agent for note management

**Agent Handoff Protocol** (FR-2.2):
- Concierge can hand off to Archivist for note operations
- Archivist can return control to Concierge after completion
- Handoffs visible in chat stream as `agent_updated` events
- Maximum 10 iterations to prevent infinite loops

**Agent Definitions** (FR-2.3):
- Each agent has:
  - Name (display label)
  - Instructions (system prompt)
  - Tools (function call schemas)

### 3. MCP Tool Integration

**MCP Server** (FR-3.1):
- Implementation: FastMCP (stdio, in-process)
- Scope: Per-session isolation
- Backing store: In-memory dict (swappable to DB later)

**Available Tools** (FR-3.2):
- `save_note(title: str, content: str)` → Save note to session store
- `get_note(title: str)` → Retrieve note by title
- `list_titles()` → List all note titles in session

**Tool Access** (FR-3.3):
- Only Archivist agent has access to MCP tools
- Concierge must hand off for note operations

### 4. Chat Streaming

**Stream Events** (FR-4.1):
- `user_message`: User input
- `agent_updated`: Agent handoff occurred
- `content_delta`: Partial LLM response text
- `tool_call`: Tool invocation with arguments
- `tool_result`: Tool execution result
- `error`: Error state
- `done`: Completion marker

**OpenAI Integration** (FR-4.2):
- Model: gpt-4-turbo-preview
- Streaming: Enabled (SSE via sse-starlette)
- Tools: Passed as function schemas

### 5. Embeddable Widget

**Iframe Embedding** (FR-5.1):
```html
<iframe src="https://web-url/chat?embed=1" style="width:100%;height:600px"></iframe>
```

**JavaScript Loader** (FR-5.2):
```html
<div id="so-chat"></div>
<script src="https://web-url/embed/smoothoperator.js"></script>
<script>
  window.SmoothOperator.mount('#so-chat', { siteId: 'customer-prod' });
</script>
```

**CSP Configuration** (FR-5.3):
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api-url;
  frame-ancestors *;
```

## Non-Functional Requirements

### Performance (NFR-1)
- Client bundle: ≤200KB (gzipped)
- First Paint: ≤300ms (4G, 5 Mbps)
- Time to Interactive: ≤1s
- API response: <100ms (health checks)

### Deployment Size (NFR-2)
- Backend Docker image: ≤150MB
- Frontend Docker image: ≤40MB
- Total deployment: ≤200MB
- Backend dependencies: ≤10 packages (core)

### Security (NFR-3)
- No server-side API keys in code
- HttpOnly session cookies
- CORS locked to web domain
- Rate limiting per IP/session
- API keys redacted from logs
- Non-root Docker user
- Secrets in environment variables only

### Scalability (NFR-4)
- Stateless API design (horizontal scaling ready)
- Session cleanup: Auto-expire after inactivity
- In-memory constraints: Swappable to Redis/PostgreSQL

### Code Quality (NFR-5)
- Type safety: Full TypeScript (frontend), Python 3.12+ (backend)
- Linting: ESLint (frontend), Ruff (backend)
- Testing: pytest (backend), vitest (frontend)
- Zero hallucinations: All external library usage verified against actual code

## Technical Constraints

### Backend (TC-1)
- Framework: FastAPI
- Python: ≥3.12
- Package manager: uv
- Agents: OpenAI SDK
- MCP: FastMCP
- Deployment: Docker + Railway

### Frontend (TC-2)
- Framework: React 18 + Vite
- TypeScript: ≥5.6
- Styling: Tailwind CSS + DaisyUI
- Icons: Lucide React
- Routing: React Router v6
- Deployment: nginx-alpine + Railway

### Dependencies (TC-3)
**Backend core**:
- fastapi ≥0.115.0
- uvicorn ≥0.32.0
- sse-starlette ≥2.2.0
- pydantic ≥2.10.0
- pydantic-settings ≥2.6.0
- python-dotenv ≥1.0.0
- openai ≥1.57.0
- httpx ≥0.28.0

**Frontend core**:
- react ^18.3.1
- react-dom ^18.3.1
- react-router-dom ^6.28.0
- lucide-react ^0.462.0

## Out of Scope (Current Phase)

### Database (OS-1)
- No PostgreSQL/MySQL/MongoDB
- Sessions expire on server restart
- Notes are session-scoped only

### Advanced Auth (OS-2)
- No user registration
- No OAuth/SSO
- No password reset
- No multi-tenant support

### Advanced MCP (OS-3)
- No remote MCP catalogs
- No tool discovery protocol
- No cross-session tool state

### Scale Features (OS-4)
- No CDN
- No Redis caching
- No load balancer
- No rate limit persistence

## Competition Criteria Alignment

### Smallest Deployment Size (CC-1)
- Target: <200MB total (64% smaller than typical 500MB+)
- Backend: 8 packages vs typical 18
- Frontend: 151KB JS vs typical 300KB+

### Code Efficiency (CC-2)
- FastAPI: Minimal install (8 core packages)
- DaisyUI: CSS-only, zero JavaScript overhead
- FastMCP: In-process, no network serialization
- Zero architectural redundancy

### Clean Architecture (CC-3)
- Single canonical surface per behavior
- No aliases/shims/compat layers
- Clear separation: API / Web / Embed
- Auto-generated OpenAPI docs

## Success Metrics

### Deployment (SM-1)
- ✅ Public web URL operational
- ✅ Public API URL operational
- ✅ `smoothoperator-embed-demo.html` works double-click

### Happy Path (SM-2)
1. ✅ Enter passcode → authenticated
2. ✅ Paste API key → settings saved
3. ✅ Send message → chat response
4. ✅ Request note save → handoff visible → tool executed
5. ✅ Request note list → MCP action succeeds

### Technical (SM-3)
- ✅ Total deployment <200MB
- ✅ Client bundle <200KB
- ✅ Backend dependencies ≤10 core packages
- ✅ Time to Interactive <1s
