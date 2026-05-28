'use client'

import { useEffect, useRef, useState } from 'react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

// Theme aligned with DESIGN.md: bg dark, cyan cursor, lima green for output
const XTERM_THEME = {
  background: '#0A0A0A',
  foreground: '#EFEFEF',
  cursor: '#06B6D4',
  cursorAccent: '#0A0A0A',
  selectionBackground: 'rgba(6, 182, 212, 0.3)',
  black: '#0C0C0C',
  red: '#EF4444',
  green: '#A3E635',
  yellow: '#F59E0B',
  blue: '#06B6D4',
  magenta: '#A78BFA',
  cyan: '#06B6D4',
  white: '#F0F0F0',
  brightBlack: '#374151',
  brightRed: '#F87171',
  brightGreen: '#BEF264',
  brightYellow: '#FBBF24',
  brightBlue: '#22D3EE',
  brightMagenta: '#C4B5FD',
  brightCyan: '#67E8F9',
  brightWhite: '#FFFFFF',
}

interface Props {
  onData: (data: string) => void
  terminalRef: React.MutableRefObject<Terminal | null>
  fitAddonRef: React.MutableRefObject<FitAddon | null>
  visible: boolean
  onReady?: () => void
  onResize?: (cols: number, rows: number) => void
}

export function XtermInstance({ onData, terminalRef, fitAddonRef, visible, onReady, onResize }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const onDataRef      = useRef(onData)
  const onReadyRef     = useRef(onReady)
  const onResizeRef    = useRef(onResize)
  onDataRef.current    = onData
  onReadyRef.current   = onReady
  onResizeRef.current  = onResize

  // Track whether we've received first output — triggers fade-in
  const [hasOutput, setHasOutput] = useState(false)
  const hasOutputRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return
    if (terminalRef.current) return // already initialised

    let disposed = false
    const disposables: Array<{ dispose: () => void }> = []

    Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('@xterm/addon-web-links'),
    ]).then(([{ Terminal }, { FitAddon }, { WebLinksAddon }]) => {
      if (disposed || !containerRef.current) return

      const term = new Terminal({
        theme: XTERM_THEME,
        fontFamily: '"Geist Mono", "JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorStyle: 'block',
        cursorBlink: true,
        scrollback: 10_000,          // more history
        allowTransparency: false,
        allowProposedApi: true,      // required for some addons + future features
        convertEol: true,            // CRLF → LF normalisation
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.loadAddon(new WebLinksAddon())

      term.open(containerRef.current)

      // Delay first fit by 50ms so DOM has settled after open()
      const fitTimer = setTimeout(() => {
        if (!disposed) {
          try {
            fitAddon.fit()
            onResizeRef.current?.(term.cols, term.rows)
          } catch { /* ignore */ }
          onReadyRef.current?.()
        }
      }, 50)
      disposables.push({ dispose: () => clearTimeout(fitTimer) })

      terminalRef.current = term
      fitAddonRef.current = fitAddon

      // Track first output for fade-in
      disposables.push(term.onData((d) => {
        onDataRef.current(d)
        if (!hasOutputRef.current) {
          hasOutputRef.current = true
          setHasOutput(true)
        }
      }))

      // Also trigger fade-in on first write from server (onData is input; we need
      // to detect server writes by hooking into the terminal's write pipeline via
      // a custom addon approach — simplest proxy: flip on first visible char in buffer)
      const writeOrig = term.write.bind(term)
      ;(term as Terminal & { write: typeof term.write }).write = (data, cb) => {
        if (!hasOutputRef.current && data && (typeof data === 'string' ? data.length : data.byteLength) > 0) {
          hasOutputRef.current = true
          setHasOutput(true)
        }
        return writeOrig(data as Parameters<typeof term.write>[0], cb)
      }

      // Responsive re-fit via ResizeObserver — also sends WS resize so pty matches
      const ro = new ResizeObserver(() => {
        if (!disposed) {
          try {
            fitAddon.fit()
            onResizeRef.current?.(term.cols, term.rows)
          } catch { /* ignore */ }
        }
      })
      ro.observe(containerRef.current!)
      disposables.push({ dispose: () => ro.disconnect() })
    })

    return () => {
      disposed = true
      disposables.forEach((d) => d.dispose())
      terminalRef.current?.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        padding: '6px 8px',
        background: '#0A0A0A',
        overflow: 'hidden',
        // Keep all terminals in the DOM for WS continuity; hide inactive ones
        opacity: visible ? (hasOutput ? 1 : 0.6) : 0,
        pointerEvents: visible ? 'auto' : 'none',
        // Smooth transitions: appear when becoming active, fade-in on first output
        transition: 'opacity 200ms ease',
      }}
    />
  )
}
