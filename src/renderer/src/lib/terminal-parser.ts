/**
 * Terminal Output Parser
 *
 * Parses Claude Code CLI's PTY output into structured MissionEvent objects.
 * This is a read-only observer — it never modifies the terminal stream.
 * Unrecognized output becomes 'text_output' events.
 */

export interface ParsedEvent {
  type:
    | 'tool_use'
    | 'file_read'
    | 'file_write'
    | 'bash_exec'
    | 'thinking'
    | 'agent_spawn'
    | 'agent_complete'
    | 'text_output'
    | 'error'
    | 'user_input'
  label: string
  detail?: string
  agentName?: string
  status: 'active' | 'completed' | 'failed'
}

// Strip ANSI escape codes for pattern matching
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '')
}

// Patterns matching Claude Code CLI output conventions
const PATTERNS = {
  // Tool invocation patterns
  toolRead: /(?:⏺\s*)?Read\(([^)]+)\)/,
  toolWrite: /(?:⏺\s*)?(?:Write|Edit)\(([^)]+)\)/,
  toolBash: /(?:⏺\s*)?Bash\(([^)]*)\)/,
  toolGlob: /(?:⏺\s*)?Glob\(([^)]*)\)/,
  toolGrep: /(?:⏺\s*)?Grep\(([^)]*)\)/,
  toolWebFetch: /(?:⏺\s*)?WebFetch\(([^)]*)\)/,
  toolWebSearch: /(?:⏺\s*)?WebSearch\(([^)]*)\)/,
  toolTodo: /(?:⏺\s*)?TodoWrite/,
  toolAgent: /(?:⏺\s*)?Agent\(([^)]*)\)/,
  toolNotebook: /(?:⏺\s*)?NotebookEdit\(([^)]*)\)/,

  // Agent patterns
  agentSpawn: /(?:Launching|Calling|Spawning)\s+(?:agent\s+)?@?([a-z0-9-]+)/i,
  agentComplete: /(?:Agent|Subagent)\s+@?([a-z0-9-]+)\s+(?:completed|finished|done)/i,

  // Status patterns
  thinking: /(?:Thinking|Processing|Analyzing)\.\.\./i,
  error: /(?:Error|Failed|Exception|FATAL)[:!]/i,
  permission: /(?:Allow|Deny|Permission)\s/i,

  // Claude Code specific UI markers
  toolHeader: /^[─━═]+/,
  costLine: /Cost:\s*\$[\d.]+/,
  tokenLine: /(\d+[kK]?)\s+(?:input|output)\s+tokens?/,
}

// Buffer for accumulating partial lines
let lineBuffer = ''

export function parseTerminalChunk(data: string): ParsedEvent[] {
  const events: ParsedEvent[] = []
  const clean = stripAnsi(data)

  // Accumulate with buffer for line-based parsing
  lineBuffer += clean
  const lines = lineBuffer.split('\n')
  // Keep the last (possibly incomplete) line in buffer
  lineBuffer = lines.pop() || ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Tool: Read
    const readMatch = trimmed.match(PATTERNS.toolRead)
    if (readMatch) {
      events.push({
        type: 'file_read',
        label: `Reading ${readMatch[1]}`,
        detail: readMatch[1],
        status: 'active',
      })
      continue
    }

    // Tool: Write/Edit
    const writeMatch = trimmed.match(PATTERNS.toolWrite)
    if (writeMatch) {
      events.push({
        type: 'file_write',
        label: `Writing ${writeMatch[1]}`,
        detail: writeMatch[1],
        status: 'active',
      })
      continue
    }

    // Tool: Bash
    const bashMatch = trimmed.match(PATTERNS.toolBash)
    if (bashMatch) {
      events.push({
        type: 'bash_exec',
        label: `Executing command`,
        detail: bashMatch[1] || undefined,
        status: 'active',
      })
      continue
    }

    // Tool: Agent
    const agentToolMatch = trimmed.match(PATTERNS.toolAgent)
    if (agentToolMatch) {
      events.push({
        type: 'agent_spawn',
        label: `Spawning agent`,
        detail: agentToolMatch[1] || undefined,
        agentName: agentToolMatch[1] || undefined,
        status: 'active',
      })
      continue
    }

    // Tool: Glob/Grep/WebFetch/WebSearch/Todo/Notebook
    for (const [key, pattern] of [
      ['tool_use', PATTERNS.toolGlob],
      ['tool_use', PATTERNS.toolGrep],
      ['tool_use', PATTERNS.toolWebFetch],
      ['tool_use', PATTERNS.toolWebSearch],
      ['tool_use', PATTERNS.toolTodo],
      ['tool_use', PATTERNS.toolNotebook],
    ] as const) {
      const match = trimmed.match(pattern)
      if (match) {
        events.push({
          type: 'tool_use',
          label: trimmed.slice(0, 60),
          detail: match[1] || undefined,
          status: 'active',
        })
        break
      }
    }

    // Agent spawn
    const spawnMatch = trimmed.match(PATTERNS.agentSpawn)
    if (spawnMatch) {
      events.push({
        type: 'agent_spawn',
        label: `Agent @${spawnMatch[1]} activated`,
        agentName: spawnMatch[1],
        status: 'active',
      })
      continue
    }

    // Agent complete
    const completeMatch = trimmed.match(PATTERNS.agentComplete)
    if (completeMatch) {
      events.push({
        type: 'agent_complete',
        label: `Agent @${completeMatch[1]} completed`,
        agentName: completeMatch[1],
        status: 'completed',
      })
      continue
    }

    // Thinking
    if (PATTERNS.thinking.test(trimmed)) {
      events.push({
        type: 'thinking',
        label: 'Processing...',
        status: 'active',
      })
      continue
    }

    // Error
    if (PATTERNS.error.test(trimmed)) {
      events.push({
        type: 'error',
        label: trimmed.slice(0, 80),
        detail: trimmed,
        status: 'failed',
      })
      continue
    }
  }

  return events
}

export function resetParserBuffer(): void {
  lineBuffer = ''
}
