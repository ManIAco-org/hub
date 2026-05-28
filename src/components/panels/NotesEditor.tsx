'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

interface Props {
  content: string
  onChange: (markdown: string) => void
}

export function NotesEditor({ content, onChange }: Props) {
  const editor = useCreateBlockNote()
  const initialized = useRef(false)
  const lastContent = useRef(content)

  // Load markdown content into editor when note changes
  useEffect(() => {
    if (!editor) return

    async function loadContent() {
      const blocks = await editor.tryParseMarkdownToBlocks(content)
      editor.replaceBlocks(editor.document, blocks)
      initialized.current = true
      lastContent.current = content
    }

    loadContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor])

  // Debounced autosave — 1s after last keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange() {
    if (!initialized.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const md = await editor.blocksToMarkdownLossy(editor.document)
      if (md !== lastContent.current) {
        lastContent.current = md
        onChange(md)
      }
    }, 1000)
  }

  return (
    <div
      style={{
        maxWidth: '800px',
        width: '100%',
        maxHeight: '50vh',
        overflowY: 'auto',
        padding: '24px',
        borderRadius: '12px',
        background: 'var(--s1)',
        border: '1px solid var(--border)',
        boxSizing: 'border-box',
        // Blocknote theme overrides via CSS custom properties
        '--bn-font-family': "'Instrument Sans', 'Inter', system-ui, sans-serif",
        '--bn-font-size': '14px',
        '--bn-colors-editor-background': 'transparent',
        '--bn-colors-editor-text': 'var(--t1)',
        '--bn-colors-menu-background': 'var(--s2)',
        '--bn-colors-tooltip-background': 'var(--s3)',
        '--bn-colors-hovered-background': 'var(--s3)',
        '--bn-colors-selected-background': 'var(--acc-d)',
        '--bn-colors-border': 'var(--border)',
        '--bn-colors-shadow': 'none',
        '--bn-border-radius': '8px',
      } as React.CSSProperties}
    >
      <style>{`
        .bn-editor { font-family: 'Instrument Sans', 'Inter', system-ui, sans-serif !important; }
        .bn-editor code,
        .bn-editor pre,
        .bn-editor .bn-inline-content code { font-family: var(--mono) !important; font-size: 12px !important; }
        .bn-editor pre { background: var(--s2) !important; border-radius: 8px !important; padding: 12px 16px !important; }
        .bn-editor [class*="blockOuter"] { margin: 2px 0; }
        .bn-editor p { margin: 0; line-height: 1.65; }
        .bn-editor h1, .bn-editor h2, .bn-editor h3 { font-family: 'Instrument Sans', sans-serif; font-weight: 700; color: var(--t1); }
      `}</style>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="dark"
        data-theming-css-variables-demo
      />
    </div>
  )
}
