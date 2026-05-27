'use client'

import { useEffect, useRef } from 'react'
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
}

export function XtermInstance({ onData, terminalRef, fitAddonRef, visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Store the current onData callback in a ref so we don't re-init on change
  const onDataRef = useRef(onData)
  onDataRef.current = onData

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
        scrollback: 5_000,
        allowTransparency: false,
        convertEol: true,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.loadAddon(new WebLinksAddon())

      term.open(containerRef.current)
      try { fitAddon.fit() } catch { /* ignore sizing errors before layout */ }

      terminalRef.current = term
      fitAddonRef.current = fitAddon

      disposables.push(term.onData((d) => onDataRef.current(d)))

      // Responsive re-fit via ResizeObserver
      const ro = new ResizeObserver(() => {
        try { fitAddon.fit() } catch { /* ignore */ }
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
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    />
  )
}
