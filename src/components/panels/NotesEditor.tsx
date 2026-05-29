'use client'

import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered } from 'lucide-react'

interface Props {
  content: string  // HTML string
  onChange: (html: string) => void
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px',
        background: active ? 'var(--acc-d)' : 'none',
        border: 'none', borderRadius: '4px',
        cursor: 'pointer',
        color: active ? 'var(--acc)' : 'var(--t2)',
        transition: 'background 100ms, color 100ms',
      }}
      onMouseEnter={(e) => {
        if (!active) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' }
      }}
      onMouseLeave={(e) => {
        if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--t2)' }
      }}
    >
      {children}
    </button>
  )
}

export function NotesEditor({ content, onChange }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    immediatelyRender: false,  // required for Next.js 15 — prevents hydration mismatch
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escribí algo...' }),
    ],
    content,
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 120px; padding: 16px 20px; font-family: var(--sans, sans-serif); font-size: 14px; line-height: 1.65; color: var(--t1);',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange(ed.getHTML())
      }, 800)
    },
  })

  // Sync content when the active note changes (key prop handles hard reset)
  const prevContent = useRef(content)
  useEffect(() => {
    if (!editor) return
    if (content !== prevContent.current) {
      prevContent.current = content
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  // ── ALL hooks above this line — no conditional hook calls below ───────────
  // editor can be null on first render (useEditor is async); render loading state
  if (!editor) {
    return (
      <div style={{
        width: '100%', maxWidth: '800px', borderRadius: '12px',
        background: 'var(--s1)', border: '1px solid var(--border)',
        minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>Iniciando editor...</span>
      </div>
    )
  }

  // Shorthand for chained commands — safe here (after all hooks, not a hook itself)
  const ch = () => editor.chain().focus()

  return (
    <div style={{
      width: '100%', maxWidth: '800px',
      borderRadius: '12px', background: 'var(--s1)',
      border: '1px solid var(--border)', overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '6px 10px', borderBottom: '1px solid var(--border)',
        background: 'var(--s2)',
      }}>
        <ToolbarBtn onClick={() => ch().toggleBold().run()}              active={editor.isActive('bold')}              title="Negrita"><Bold size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => ch().toggleItalic().run()}            active={editor.isActive('italic')}            title="Cursiva"><Italic size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => ch().toggleStrike().run()}            active={editor.isActive('strike')}            title="Tachado"><Strikethrough size={13} /></ToolbarBtn>
        <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn onClick={() => ch().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1"><Heading1 size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => ch().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2"><Heading2 size={13} /></ToolbarBtn>
        <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn onClick={() => ch().toggleBulletList().run()}        active={editor.isActive('bulletList')}        title="Lista"><List size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => ch().toggleOrderedList().run()}       active={editor.isActive('orderedList')}       title="Lista numerada"><ListOrdered size={13} /></ToolbarBtn>
      </div>

      {/* Editor content */}
      <style>{`
        .tiptap-editor p { margin: 0 0 8px 0; }
        .tiptap-editor h1 { font-size: 1.4em; font-weight: 700; margin: 0 0 10px 0; color: var(--t1); }
        .tiptap-editor h2 { font-size: 1.15em; font-weight: 700; margin: 0 0 8px 0; color: var(--t1); }
        .tiptap-editor ul, .tiptap-editor ol { padding-left: 1.4em; margin: 0 0 8px 0; }
        .tiptap-editor li { margin-bottom: 2px; }
        .tiptap-editor strong { font-weight: 700; }
        .tiptap-editor em { font-style: italic; }
        .tiptap-editor s { text-decoration: line-through; }
        .tiptap-editor code { font-family: var(--mono); font-size: 12px; background: var(--s3); padding: 1px 5px; border-radius: 4px; }
        .tiptap-editor blockquote { border-left: 3px solid var(--border); padding-left: 12px; color: var(--t3); margin: 0 0 8px 0; }
        .tiptap-editor .is-editor-empty:first-child::before {
          content: attr(data-placeholder); float: left;
          color: var(--t3); pointer-events: none; height: 0;
        }
      `}</style>
      <div className="tiptap-editor" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
