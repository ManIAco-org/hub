import { create } from 'zustand'

export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface TerminalSession {
  id: string
  clientSlug: string
  projectId?: string
  label: string
  status: SessionStatus
  unread: number
  resume?: boolean          // true = attach existing tmux (-A); false = new named session
  tmuxSessionName?: string  // exact tmux session name set after auth_ok; used to reattach
  customName?: string       // user-set display name; overrides label in UI
  cwd?: string              // working dir received from auth_ok
  gitBranch?: string        // git branch received from auth_ok
  lastActivityAt?: number   // ms timestamp of last terminal output (for status bar timer)
}

interface TerminalStore {
  sessions: TerminalSession[]
  activeSessionId: string | null
  isOpen: boolean
  isMinimized: boolean

  openSession: (session: Omit<TerminalSession, 'unread' | 'status'>) => void
  closeSession: (id: string) => void
  switchToSession: (id: string) => void
  markRead: (id: string) => void
  updateStatus: (id: string, status: SessionStatus) => void
  incrementUnread: (id: string) => void
  setOpen: (open: boolean) => void
  setMinimized: (minimized: boolean) => void
  updateInfo: (id: string, info: { cwd?: string; gitBranch?: string; tmuxSessionName?: string }) => void
  touchActivity: (id: string) => void
  renameSession: (id: string, name: string) => void
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: [],
  activeSessionId: null,
  isOpen: false,
  isMinimized: false,

  openSession: (session) => set((state) => {
    const existing = state.sessions.find((s) => s.id === session.id)
    if (existing) {
      return { activeSessionId: session.id, isOpen: true, isMinimized: false }
    }
    return {
      sessions: [...state.sessions, { ...session, status: 'connecting', unread: 0 }],
      activeSessionId: session.id,
      isOpen: true,
      isMinimized: false,
    }
  }),

  closeSession: (id) => set((state) => {
    const sessions = state.sessions.filter((s) => s.id !== id)
    const activeSessionId =
      state.activeSessionId === id
        ? (sessions[sessions.length - 1]?.id ?? null)
        : state.activeSessionId
    return {
      sessions,
      activeSessionId,
      isOpen: sessions.length > 0 ? state.isOpen : false,
    }
  }),

  switchToSession: (id) => set({ activeSessionId: id }),

  markRead: (id) => set((state) => ({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, unread: 0 } : s)),
  })),

  updateStatus: (id, status) => set((state) => ({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, status } : s)),
  })),

  incrementUnread: (id) => set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === id && s.id !== state.activeSessionId
        ? { ...s, unread: s.unread + 1 }
        : s,
    ),
  })),

  setOpen: (open) => set({ isOpen: open }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),

  updateInfo: (id, info) => set((state) => ({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...info } : s)),
  })),

  touchActivity: (id) => set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, lastActivityAt: Date.now() } : s,
    ),
  })),

  renameSession: (id, name) => set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, customName: name.trim() || undefined } : s,
    ),
  })),
}))
