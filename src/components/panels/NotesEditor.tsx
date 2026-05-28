'use client'

import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { es } from '@blocknote/core/locales'
import '@blocknote/mantine/style.css'

interface Props {
  content: string
  onChange: (markdown: string) => void
}

export function NotesEditor({ content, onChange }: Props) {
  const editor = useCreateBlockNote({
    dictionary: es,
  })

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
        borderRadius: '12px',
        background: 'var(--s1)',
        border: '1px solid var(--border)',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        /* ── Editor body ── */
        .bn-editor {
          font-family: 'Instrument Sans', 'Inter', system-ui, sans-serif !important;
          padding: 20px 24px !important;
        }
        .bn-editor p { margin: 0; line-height: 1.65; color: var(--t1); }
        .bn-editor h1, .bn-editor h2, .bn-editor h3 {
          font-family: 'Instrument Sans', sans-serif;
          font-weight: 700;
          color: var(--t1);
        }

        /* ── Code blocks ── */
        .bn-editor code,
        .bn-editor pre,
        .bn-editor .bn-inline-content code {
          font-family: var(--mono) !important;
          font-size: 12px !important;
        }
        .bn-editor pre {
          background: var(--s2) !important;
          border-radius: 8px !important;
          padding: 12px 16px !important;
        }

        /* ── Placeholder ── */
        .bn-editor [data-placeholder]::before {
          color: var(--t3) !important;
          font-style: normal !important;
        }

        /* ── Slash menu ── */
        .bn-suggestion-menu {
          background: var(--s2) !important;
          border: 1px solid var(--acc-b) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
        }
        .bn-suggestion-menu-item {
          border-radius: 6px !important;
          color: var(--t1) !important;
        }
        .bn-suggestion-menu-item:hover,
        .bn-suggestion-menu-item[data-selected="true"] {
          background: var(--acc-d) !important;
          color: var(--acc) !important;
        }
        .bn-suggestion-menu-item-title { font-weight: 600 !important; }
        .bn-suggestion-menu-item-subtitle { color: var(--t3) !important; font-size: 11px !important; }

        /* ── Formatting toolbar ── */
        .bn-toolbar {
          background: var(--s2) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
        }
        .bn-toolbar button {
          color: var(--t2) !important;
          border-radius: 4px !important;
        }
        .bn-toolbar button:hover { background: var(--s3) !important; color: var(--t1) !important; }
        .bn-toolbar button[data-selected="true"],
        .bn-toolbar button[aria-checked="true"] {
          background: var(--acc-d) !important;
          color: var(--acc) !important;
        }

        /* ── Side menu (drag handle) ── */
        .bn-side-menu { opacity: 0.4; transition: opacity 150ms; }
        .bn-side-menu:hover { opacity: 1; }
      `}</style>

      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  )
}
