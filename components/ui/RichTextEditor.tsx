'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Undo,
  Redo,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  enableTables?: boolean
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  className = '',
  minHeight = '120px',
  enableTables = true,
}: RichTextEditorProps) {
  const extensions = [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    ...(enableTables
      ? [
          Table.configure({ resizable: true }),
          TableRow,
          TableCell,
          TableHeader,
        ]
      : []),
  ]

  const editor = useEditor({
    extensions,
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-3 py-2`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Si el editor está vacío, devolver string vacío
      if (html === '<p></p>') {
        onChange('')
      } else {
        onChange(html)
      }
    },
  })

  // Sincronizar valor externo solo si cambia significativamente
  useEffect(() => {
    if (!editor) return
    const currentContent = editor.getHTML()
    const normalizedCurrent = currentContent === '<p></p>' ? '' : currentContent
    const normalizedValue = value || ''
    if (normalizedCurrent !== normalizedValue && normalizedValue !== '') {
      editor.commands.setContent(normalizedValue, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
    disabled = false,
  }: {
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )

  const ToolbarSeparator = () => (
    <div className="w-px h-6 bg-gray-200 mx-1" />
  )

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        {/* Formato de texto */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Subrayado (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Alineación */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Alinear izquierda"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Centrar"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Alinear derecha"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justificar"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Listas */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        {/* Tablas */}
        {enableTables && (
          <>
            <ToolbarSeparator />
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
              isActive={editor.isActive('table')}
              title="Insertar tabla 3x3"
            >
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>
            {editor.isActive('table') && (
              <>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  title="Agregar columna"
                >
                  <Plus className="w-3 h-3" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  title="Agregar fila"
                >
                  <Plus className="w-3 h-3 rotate-90" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  title="Eliminar columna"
                >
                  <Minus className="w-3 h-3" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  title="Eliminar fila"
                >
                  <Minus className="w-3 h-3 rotate-90" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  title="Eliminar tabla"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </ToolbarButton>
              </>
            )}
          </>
        )}

        <ToolbarSeparator />

        {/* Deshacer/Rehacer */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer (Ctrl+Shift+Z)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Estilos para la tabla dentro del editor */}
      <style jsx global>{`
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5rem 0;
        }
        .ProseMirror th,
        .ProseMirror td {
          border: 1px solid #d1d5db;
          padding: 0.5rem;
          min-width: 80px;
          vertical-align: top;
        }
        .ProseMirror th {
          background-color: #f3f4f6;
          font-weight: 600;
          text-align: left;
        }
        .ProseMirror .selectedCell {
          background-color: #dbeafe;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror .tableWrapper {
          overflow-x: auto;
        }
        .ProseMirror .resize-cursor {
          cursor: col-resize;
        }
      `}</style>
    </div>
  )
}
