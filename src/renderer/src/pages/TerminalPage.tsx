import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Plus, X, Monitor, ChevronDown, RotateCcw, Terminal as TermIcon,
  Brain, Loader2, Sparkles, Send, ChevronUp, Minimize2, FolderOpen, Clock,
  History, ShieldOff, Palette
} from 'lucide-react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { useLocation } from 'react-router-dom'
import 'xterm/css/xterm.css'
import { cn, getApi } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { Modal } from '../components/shared/Modal'

interface TerminalTab {
  id: string
  title: string
  ptyId: string | null
  terminal: Terminal | null
  fitAddon: FitAddon | null
  dead: boolean
}

const TERMINAL_THEMES: Record<string, Record<string, string>> = {
  'Dark': {
    background: '#0a0a0f',
    foreground: '#e2e8f0',
    cursor: '#f97316',
    cursorAccent: '#0a0a0f',
    selectionBackground: '#f9731633',
    selectionForeground: '#e2e8f0',
    black: '#1e1e2e',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#cba6f7',
    cyan: '#94e2d5',
    white: '#e2e8f0',
    brightBlack: '#585b70',
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#cba6f7',
    brightCyan: '#94e2d5',
    brightWhite: '#ffffff',
  },
  'Dracula': {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#ff79c6',
    cursorAccent: '#282a36',
    selectionBackground: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
  },
  'Solarized Dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#268bd2',
    cursorAccent: '#002b36',
    selectionBackground: '#073642',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#002b36',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
  'Monokai': {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    cursorAccent: '#272822',
    selectionBackground: '#49483e',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9e8',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9e8',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  },
  'Light': {
    background: '#fafafa',
    foreground: '#383a42',
    cursor: '#f97316',
    cursorAccent: '#fafafa',
    selectionBackground: '#e5e5e6',
    black: '#383a42',
    red: '#e45649',
    green: '#50a14f',
    yellow: '#c18401',
    blue: '#4078f2',
    magenta: '#a626a4',
    cyan: '#0184bc',
    white: '#fafafa',
    brightBlack: '#4f525e',
    brightRed: '#e45649',
    brightGreen: '#50a14f',
    brightYellow: '#c18401',
    brightBlue: '#4078f2',
    brightMagenta: '#a626a4',
    brightCyan: '#0184bc',
    brightWhite: '#ffffff',
  },
}

const MODELS = [
  { id: 'opus', label: 'Claude Opus 4.6', desc: 'Most capable' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', desc: 'Balanced (latest)' },
  { id: 'sonnet', label: 'Claude Sonnet 4.5', desc: 'Balanced' },
  { id: 'haiku', label: 'Claude Haiku 4.5', desc: 'Fastest' },
]

function extractBufferText(terminal: Terminal): string {
  const buffer = terminal.buffer.active
  const lines: string[] = []
  for (let i = 0; i < buffer.length; i++) {
    const line = buffer.getLine(i)
    if (line) lines.push(line.translateToString(true))
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }
  return lines.join('\n')
}

export function TerminalPage() {
  const { cliAvailable, currentProjectDir, setCurrentProjectDir, pendingSessionMemory, setPendingSessionMemory, addActivity } = useAppStore()
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('claude-gui-model') || 'opus')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [continueSession, setContinueSession] = useState(false)
  const [skipPermissions, setSkipPermissions] = useState(false)
  const [selectedThemeName, setSelectedThemeName] = useState(() => localStorage.getItem('claude-gui-terminal-theme') || 'Dark')
  const [showThemePicker, setShowThemePicker] = useState(false)

  // Save Memory modal state
  const [showSaveMemory, setShowSaveMemory] = useState(false)
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memorySummary, setMemorySummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [memorySaved, setMemorySaved] = useState(false)

  // Prompt Enhancer state
  const [showComposer, setShowComposer] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [enhancedText, setEnhancedText] = useState('')
  const [enhancing, setEnhancing] = useState(false)
  const [isEnhanced, setIsEnhanced] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const containersRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const tabsRef = useRef<Map<string, TerminalTab>>(new Map())
  const cleanupFnsRef = useRef<Map<string, (() => void)[]>>(new Map())

  // Create a new terminal tab with optional initial message
  const createTab = useCallback(async (model?: string, initialMessage?: string) => {
    const api = getApi()
    if (!api) return

    const tabId = `tab-${Date.now()}`
    const tabNum = tabs.length + 1

    const terminal = new Terminal({
      theme: TERMINAL_THEMES[selectedThemeName] || TERMINAL_THEMES['Dark'],
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
      scrollOnUserInput: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    const tab: TerminalTab = {
      id: tabId,
      title: initialMessage ? `Session ${tabNum} (from memory)` : `Session ${tabNum}`,
      ptyId: null,
      terminal,
      fitAddon,
      dead: false,
    }

    tabsRef.current.set(tabId, tab)
    setTabs(prev => [...prev, tab])
    setActiveTabId(tabId)

    // Spawn PTY after a brief delay to let the DOM render
    setTimeout(async () => {
      const container = containersRef.current.get(tabId)
      if (!container) return

      terminal.open(container)
      fitAddon.fit()
      terminal.scrollToBottom()

      // Spawn Claude in PTY — use project dir as cwd so Claude works inside the project
      const extraArgs: string[] = []
      if (continueSession) extraArgs.push('--continue')
      if (skipPermissions) extraArgs.push('--dangerously-skip-permissions')
      const result = await api.pty.spawn({
        model: model || selectedModel,
        cwd: currentProjectDir || undefined,
        args: extraArgs.length > 0 ? extraArgs : undefined,
      })

      if (result.error || !result.id) {
        terminal.writeln(`\r\n\x1b[31mFailed to start Claude: ${result.error || 'Unknown error'}\x1b[0m`)
        terminal.writeln(`\x1b[33mMake sure Claude Code CLI is installed and in your PATH.\x1b[0m`)
        tab.dead = true
        return
      }

      tab.ptyId = result.id

      // Wire xterm input → PTY
      const inputDispose = terminal.onData((data) => {
        if (tab.ptyId) {
          api.pty.write(tab.ptyId, data)
        }
      })

      // Wire PTY output → xterm
      const removeDataListener = api.pty.onData((payload: any) => {
        if (payload.id === tab.ptyId) {
          terminal.write(payload.data)
        }
      })

      // Handle PTY exit
      const removeExitListener = api.pty.onExit((payload: any) => {
        if (payload.id === tab.ptyId) {
          terminal.writeln(`\r\n\x1b[33m[Claude exited with code ${payload.exitCode}]\x1b[0m`)
          terminal.writeln(`\x1b[90mPress the restart button or open a new tab to start a new session.\x1b[0m`)
          tab.dead = true
          tab.ptyId = null
          setTabs(prev => prev.map(t => t.id === tabId ? { ...t, dead: true, ptyId: null } : t))
        }
      })

      // Handle resize
      const resizeDispose = terminal.onResize(({ cols, rows }) => {
        if (tab.ptyId) {
          api.pty.resize(tab.ptyId, cols, rows)
        }
      })

      // Store cleanup functions
      cleanupFnsRef.current.set(tabId, [
        () => inputDispose.dispose(),
        removeDataListener,
        removeExitListener,
        () => resizeDispose.dispose(),
      ])

      terminal.focus()

      // If there's an initial message (from session memory), inject it after Claude initializes
      if (initialMessage && tab.ptyId) {
        let injected = false
        const checkReady = api.pty.onData((p: any) => {
          if (p.id === tab.ptyId && !injected) {
            setTimeout(() => {
              if (!injected && tab.ptyId) {
                injected = true
                api.pty.write(tab.ptyId, initialMessage)
                setTimeout(() => {
                  if (tab.ptyId) api.pty.write(tab.ptyId, '\r')
                }, 100)
              }
            }, 2000)
          }
        })
        setTimeout(() => { checkReady() }, 15000)
      }
    }, 50)
  }, [selectedModel, tabs.length])

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    const api = getApi()
    const tab = tabsRef.current.get(tabId)

    if (tab) {
      if (tab.ptyId && api) {
        api.pty.kill(tab.ptyId)
      }
      const cleanups = cleanupFnsRef.current.get(tabId) || []
      cleanups.forEach(fn => fn())
      cleanupFnsRef.current.delete(tabId)
      tab.terminal?.dispose()
      tabsRef.current.delete(tabId)
      containersRef.current.delete(tabId)
    }

    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId && remaining.length > 0) {
        setActiveTabId(remaining[remaining.length - 1].id)
      }
      return remaining
    })
  }, [activeTabId])

  // Restart a dead tab
  const restartTab = useCallback(async (tabId: string) => {
    const api = getApi()
    if (!api) return

    const tab = tabsRef.current.get(tabId)
    if (!tab || !tab.terminal) return

    tab.terminal.clear()
    tab.dead = false
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, dead: false } : t))

    const result = await api.pty.spawn({ model: selectedModel, cwd: currentProjectDir || undefined })
    if (result.error || !result.id) {
      tab.terminal.writeln(`\r\n\x1b[31mFailed to restart: ${result.error}\x1b[0m`)
      tab.dead = true
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, dead: true } : t))
      return
    }

    tab.ptyId = result.id

    const inputDispose = tab.terminal.onData((data) => {
      if (tab.ptyId) api.pty.write(tab.ptyId, data)
    })
    const removeDataListener = api.pty.onData((payload: any) => {
      if (payload.id === tab.ptyId) tab.terminal?.write(payload.data)
    })
    const removeExitListener = api.pty.onExit((payload: any) => {
      if (payload.id === tab.ptyId) {
        tab.terminal?.writeln(`\r\n\x1b[33m[Claude exited with code ${payload.exitCode}]\x1b[0m`)
        tab.dead = true
        tab.ptyId = null
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, dead: true, ptyId: null } : t))
      }
    })
    const resizeDispose = tab.terminal.onResize(({ cols, rows }) => {
      if (tab.ptyId) api.pty.resize(tab.ptyId, cols, rows)
    })

    const oldCleanups = cleanupFnsRef.current.get(tabId) || []
    oldCleanups.forEach(fn => fn())
    cleanupFnsRef.current.set(tabId, [
      () => inputDispose.dispose(),
      removeDataListener,
      removeExitListener,
      () => resizeDispose.dispose(),
    ])

    tab.terminal.focus()
  }, [selectedModel])

  // Save memory from the active terminal session
  const handleSaveMemory = useCallback(async () => {
    const api = getApi()
    const tab = activeTabId ? tabsRef.current.get(activeTabId) : null
    if (!api || !tab?.terminal) return

    const bufferText = extractBufferText(tab.terminal)
    if (!bufferText.trim()) return

    setMemoryTitle(`Session — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`)
    setMemorySummary('')
    setMemorySaved(false)
    setSummarizing(true)
    setShowSaveMemory(true)

    let transcript = bufferText
    if (transcript.length > 10000) {
      transcript = transcript.slice(0, 2000) + '\n\n[...earlier context truncated...]\n\n' + transcript.slice(-8000)
    }

    try {
      const result = await api.cli.summarizeSession(transcript)
      setMemorySummary(result.success && result.summary
        ? result.summary
        : 'Failed to generate summary. You can write one manually.')
    } catch {
      setMemorySummary('Failed to generate summary. You can write one manually.')
    }
    setSummarizing(false)
  }, [activeTabId])

  const handleSaveMemoryConfirm = useCallback(async () => {
    const api = getApi()
    if (!api || !memoryTitle.trim() || !memorySummary.trim()) return

    const result = await api.memory.save({
      title: memoryTitle.trim(),
      summary: memorySummary.trim(),
      sourceSessionId: activeTabId || undefined,
      model: selectedModel,
    })

    if (result.success) {
      setMemorySaved(true)
      addActivity({ type: 'config', message: `Saved session memory: ${memoryTitle}`, status: 'success' })
      setTimeout(() => setShowSaveMemory(false), 1500)
    }
  }, [memoryTitle, memorySummary, activeTabId, selectedModel, addActivity])

  // ==================== PROMPT ENHANCER ====================

  const handleEnhance = useCallback(async () => {
    const api = getApi()
    if (!api || !promptText.trim()) return

    setEnhancing(true)
    try {
      const result = await api.cli.enhancePrompt(promptText.trim())
      if (result.success && result.enhanced) {
        setEnhancedText(result.enhanced)
        setIsEnhanced(true)
      } else {
        addActivity({ type: 'session', message: result.error || 'Prompt enhancement failed', status: 'error' })
      }
    } catch {
      addActivity({ type: 'session', message: 'Prompt enhancement failed', status: 'error' })
    }
    setEnhancing(false)
  }, [promptText, addActivity])

  const handleSendPrompt = useCallback(() => {
    const api = getApi()
    const tab = activeTabId ? tabsRef.current.get(activeTabId) : null
    if (!api || !tab?.ptyId) return

    const textToSend = isEnhanced ? enhancedText : promptText
    if (!textToSend.trim()) return

    // Write the prompt text to PTY
    api.pty.write(tab.ptyId, textToSend.trim())
    // Press Enter
    setTimeout(() => {
      if (tab.ptyId) api.pty.write(tab.ptyId, '\r')
    }, 50)

    // Reset composer state
    setPromptText('')
    setEnhancedText('')
    setIsEnhanced(false)
    setShowComposer(false)

    // Focus terminal
    tab.terminal?.focus()
  }, [activeTabId, promptText, enhancedText, isEnhanced])

  const handleUseOriginal = useCallback(() => {
    setIsEnhanced(false)
    setEnhancedText('')
  }, [])

  const handleComposerKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSendPrompt()
    }
    // Cmd/Ctrl + Shift + Enter to enhance
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault()
      handleEnhance()
    }
    // Escape to close
    if (e.key === 'Escape') {
      setShowComposer(false)
      const tab = activeTabId ? tabsRef.current.get(activeTabId) : null
      tab?.terminal?.focus()
    }
  }, [handleSendPrompt, handleEnhance, activeTabId])

  // Switch tab — show/hide containers and fit active terminal
  useEffect(() => {
    containersRef.current.forEach((container, tabId) => {
      container.style.display = tabId === activeTabId ? 'block' : 'none'
    })
    if (activeTabId) {
      const tab = tabsRef.current.get(activeTabId)
      if (tab?.fitAddon && tab.terminal) {
        try { tab.fitAddon.fit(); tab.terminal.scrollToBottom() } catch { /* ignore */ }
        tab.terminal.focus()
      }
    }
  }, [activeTabId])

  // Window resize → fit active terminal
  useEffect(() => {
    const handleResize = () => {
      if (activeTabId) {
        const tab = tabsRef.current.get(activeTabId)
        if (tab?.fitAddon && tab.terminal) {
          try { tab.fitAddon.fit(); tab.terminal.scrollToBottom() } catch { /* ignore */ }
        }
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeTabId])

  // Auto-create first tab on mount
  useEffect(() => {
    if (tabs.length === 0 && cliAvailable) {
      createTab()
    }
  }, [cliAvailable]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fit and focus terminal when navigating back to the terminal page
  const location = useLocation()
  const isVisible = location.pathname === '/terminal'

  useEffect(() => {
    if (isVisible && activeTabId) {
      const tab = tabsRef.current.get(activeTabId)
      if (tab?.fitAddon && tab.terminal) {
        setTimeout(() => {
          try { tab.fitAddon!.fit(); tab.terminal!.scrollToBottom() } catch { /* ignore */ }
          tab.terminal!.focus()
        }, 50)
      }
    }
  }, [isVisible, activeTabId])

  // Handle pending session memory from SessionsPage → create new tab with context
  useEffect(() => {
    if (isVisible && pendingSessionMemory && cliAvailable) {
      const message = `I'm continuing from a previous session. Here is the context summary from that session:\n\n${pendingSessionMemory}\n\nPlease review this context. I'll tell you what to work on next.`
      createTab(undefined, message)
      setPendingSessionMemory(null)
    }
  }, [isVisible, pendingSessionMemory, cliAvailable]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refit terminal when composer opens/closes (changes available height)
  useEffect(() => {
    if (activeTabId) {
      const tab = tabsRef.current.get(activeTabId)
      if (tab?.fitAddon) {
        setTimeout(() => {
          try { tab.fitAddon!.fit(); tab.terminal?.scrollToBottom() } catch { /* ignore */ }
        }, 100)
      }
    }
  }, [showComposer, activeTabId])

  const activeTab = tabs.find(t => t.id === activeTabId)
  const displayText = isEnhanced ? enhancedText : promptText
  const canSend = activeTab && !activeTab.dead && activeTab.ptyId && displayText.trim()

  // Open folder picker for project selection
  const pickProject = useCallback(async () => {
    const api = getApi()
    if (!api) return
    const dir = await api.fs.pickDirectory()
    if (dir) {
      setCurrentProjectDir(dir)
      addActivity({ type: 'session', message: `Set project directory: ${dir}`, status: 'success' })
    }
  }, [setCurrentProjectDir, addActivity])

  // Load recent projects from localStorage
  const recentProjects: string[] = (() => {
    try { return JSON.parse(localStorage.getItem('recentProjects') || '[]') } catch { return [] }
  })()

  const termBg = TERMINAL_THEMES[selectedThemeName]?.background || '#0a0a0f'

  // Gate: must select a project directory before using the terminal
  if (!currentProjectDir) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ background: termBg }}>
        <div className="max-w-md w-full space-y-6 px-6">
          <div className="text-center space-y-2">
            <TermIcon size={40} className="mx-auto text-accent-orange opacity-80" />
            <h2 className="text-lg font-semibold text-text-primary">Select a Project Directory</h2>
            <p className="text-sm text-text-muted">
              Claude needs a working directory to operate in. Choose the project folder where you want Claude to read, write, and execute files.
            </p>
          </div>

          <button
            onClick={pickProject}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-accent-orange text-white hover:bg-accent-orange/90 transition-colors"
          >
            <FolderOpen size={18} />
            Open Project Folder
          </button>

          {recentProjects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Clock size={12} />
                Recent Projects
              </div>
              {recentProjects.slice(0, 5).map((dir) => (
                <button
                  key={dir}
                  onClick={() => {
                    setCurrentProjectDir(dir)
                    addActivity({ type: 'session', message: `Set project directory: ${dir}`, status: 'success' })
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-mono bg-bg-secondary hover:bg-bg-tertiary border border-border/50 hover:border-border transition-colors truncate"
                >
                  <FolderOpen size={13} className="text-text-muted flex-shrink-0" />
                  <span className="truncate">{dir}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: termBg }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="btn-secondary text-xs gap-1"
            >
              <Monitor size={14} />
              {MODELS.find(m => m.id === selectedModel)?.label || 'Select Model'}
              <ChevronDown size={12} />
            </button>
            {showModelPicker && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-bg-card border border-border rounded-lg shadow-xl z-10 py-1">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); localStorage.setItem('claude-gui-model', m.id); setShowModelPicker(false) }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors',
                      selectedModel === m.id && 'text-accent-orange'
                    )}
                  >
                    <span>{m.label}</span>
                    <span className="text-xs text-text-muted">{m.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Terminal color theme selector */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="btn-secondary text-xs gap-1"
              title="Change terminal color theme"
            >
              <Palette size={14} />
              {selectedThemeName}
              <ChevronDown size={12} />
            </button>
            {showThemePicker && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-bg-card border border-border rounded-lg shadow-xl z-10 py-1">
                {Object.keys(TERMINAL_THEMES).map(themeName => (
                  <button
                    key={themeName}
                    onClick={() => {
                      setSelectedThemeName(themeName)
                      localStorage.setItem('claude-gui-terminal-theme', themeName)
                      setShowThemePicker(false)
                      // Apply to all open terminals immediately
                      tabsRef.current.forEach((tab) => {
                        if (tab.terminal) {
                          tab.terminal.options.theme = TERMINAL_THEMES[themeName]
                        }
                      })
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors',
                      selectedThemeName === themeName && 'text-accent-orange'
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                      style={{ background: TERMINAL_THEMES[themeName].background }}
                    />
                    {themeName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current project directory indicator — click to change */}
          {currentProjectDir && (
            <button
              onClick={pickProject}
              className="flex items-center gap-1 text-[10px] text-text-muted font-mono truncate max-w-[200px] hover:text-text-secondary transition-colors"
              title={`${currentProjectDir}\nClick to change project`}
            >
              <FolderOpen size={11} className="flex-shrink-0" />
              {currentProjectDir.split('/').pop()}
            </button>
          )}

          {/* Session flags */}
          <button
            onClick={() => setContinueSession(v => !v)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              continueSession
                ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
            )}
            title="Resume last conversation with --continue. New tabs will continue where Claude left off."
          >
            <History size={12} />
            {continueSession && <span>Continue</span>}
          </button>

          <button
            onClick={() => setSkipPermissions(v => !v)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              skipPermissions
                ? 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
            )}
            title="Skip permission prompts with --dangerously-skip-permissions. Use with caution in trusted projects."
          >
            <ShieldOff size={12} />
            {skipPermissions && <span>Skip Perms</span>}
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {activeTab && !activeTab.dead && activeTab.ptyId && (
            <>
              <button
                onClick={() => {
                  setShowComposer(!showComposer)
                  if (!showComposer) {
                    setTimeout(() => composerRef.current?.focus(), 100)
                  }
                }}
                className={cn(
                  'btn-secondary text-xs gap-1',
                  showComposer && 'bg-accent-purple/20 text-accent-purple border-accent-purple/30'
                )}
                title="Open prompt composer with AI enhancement (Ctrl+I)"
              >
                <Sparkles size={14} /> Compose
              </button>
              <button
                onClick={handleSaveMemory}
                className="btn-secondary text-xs gap-1"
                title="Save session memory for handoff to a new session"
              >
                <Brain size={14} /> Save Memory
              </button>
            </>
          )}

          {activeTab?.dead && (
            <button
              onClick={() => activeTab && restartTab(activeTab.id)}
              className="btn-secondary text-xs gap-1 text-accent-orange"
              title="Restart Claude"
            >
              <RotateCcw size={14} /> Restart
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-text-muted">
          {activeTab && !activeTab.dead && activeTab.ptyId && (
            <span className="flex items-center gap-1.5 text-accent-green">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              Connected
            </span>
          )}
          {activeTab?.dead && (
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
              Exited
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-bg-primary border-b border-border">
        <div className="flex-1 flex items-center overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs border-r border-border cursor-pointer transition-colors min-w-0',
                activeTabId === tab.id
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-secondary/50'
              )}
              onClick={() => setActiveTabId(tab.id)}
            >
              <TermIcon size={12} className={tab.dead ? 'text-text-muted' : 'text-accent-green'} />
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  className="hover:text-accent-red transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => createTab()} className="px-3 py-2 text-text-muted hover:text-text-primary transition-colors" title="New session">
          <Plus size={14} />
        </button>
      </div>

      {/* Terminal area */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map(tab => (
          <div
            key={tab.id}
            ref={(el) => {
              if (el) containersRef.current.set(tab.id, el)
            }}
            className="absolute inset-0 p-1"
            style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
          />
        ))}

        {tabs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <TermIcon size={40} className="text-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-text-muted text-sm mb-3">
                {cliAvailable ? 'Starting Claude...' : 'Claude Code CLI not found'}
              </p>
              {!cliAvailable && (
                <p className="text-text-muted text-xs">
                  Install Claude Code CLI: npm install -g @anthropic-ai/claude-code
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== PROMPT COMPOSER ==================== */}
      {showComposer && (
        <div className="border-t border-border bg-bg-secondary">
          {/* Composer header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent-purple" />
              <span className="text-xs font-medium text-text-secondary">Prompt Composer</span>
              {isEnhanced && (
                <span className="badge text-[10px] bg-accent-green/10 text-accent-green">
                  Enhanced
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
              </span>
              <button
                onClick={() => setShowComposer(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
                title="Close composer"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* Enhanced prompt diff view */}
          {isEnhanced && (
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-accent-green" />
                  <span className="text-[11px] font-medium text-accent-green">AI Enhanced</span>
                </div>
                <button
                  onClick={handleUseOriginal}
                  className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Use original instead
                </button>
              </div>
              <div className="text-[10px] text-text-muted bg-bg-tertiary/50 rounded px-3 py-2 mb-2 max-h-16 overflow-y-auto">
                <span className="line-through opacity-60">{promptText}</span>
              </div>
            </div>
          )}

          {/* Text area */}
          <div className="px-4 py-3">
            <textarea
              ref={composerRef}
              value={isEnhanced ? enhancedText : promptText}
              onChange={(e) => {
                if (isEnhanced) {
                  setEnhancedText(e.target.value)
                } else {
                  setPromptText(e.target.value)
                }
              }}
              onKeyDown={handleComposerKeyDown}
              placeholder="Write your prompt here... Click 'Enhance with AI' to improve it before sending."
              className="w-full bg-bg-primary border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted/50 resize-none focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/20 transition-all"
              rows={3}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnhance}
                disabled={enhancing || !(isEnhanced ? enhancedText : promptText).trim()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  'bg-accent-purple/10 text-accent-purple border border-accent-purple/20',
                  'hover:bg-accent-purple/20 hover:border-accent-purple/30',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {enhancing ? (
                  <><Loader2 size={13} className="animate-spin" /> Enhancing...</>
                ) : (
                  <><Sparkles size={13} /> {isEnhanced ? 'Re-enhance' : 'Enhance with AI'}</>
                )}
              </button>
              {!isEnhanced && promptText.trim() && (
                <span className="text-[10px] text-text-muted">
                  Tip: AI will rewrite your prompt to be clearer and more effective
                </span>
              )}
            </div>

            <button
              onClick={handleSendPrompt}
              disabled={!canSend}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                'bg-accent-orange text-white',
                'hover:bg-accent-orange/90',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              <Send size={13} /> Send to Claude
            </button>
          </div>
        </div>
      )}

      {/* Save Memory Modal */}
      <Modal
        open={showSaveMemory}
        onClose={() => setShowSaveMemory(false)}
        title="Save Session Memory"
        description="Create a summary to hand off context to a new session"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowSaveMemory(false)} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleSaveMemoryConfirm}
              disabled={summarizing || !memorySummary.trim() || memorySaved}
              className="btn-primary text-sm"
            >
              {memorySaved ? 'Saved!' : <><Brain size={14} /> Save Memory</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              value={memoryTitle}
              onChange={e => setMemoryTitle(e.target.value)}
              className="input"
              placeholder="Session title..."
            />
          </div>
          <div>
            <label className="label">Summary</label>
            {summarizing ? (
              <div className="flex items-center gap-2 py-8 justify-center text-text-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Claude is summarizing the session...</span>
              </div>
            ) : (
              <textarea
                value={memorySummary}
                onChange={e => setMemorySummary(e.target.value)}
                rows={14}
                className="input font-mono text-xs leading-relaxed"
                placeholder="Session summary..."
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
