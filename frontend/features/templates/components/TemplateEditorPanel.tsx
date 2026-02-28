'use client';

import type { TemplateEditorState } from '../hooks/useTemplateEditor';

interface TemplateEditorPanelProps {
  editor: TemplateEditorState;
}

export function TemplateEditorPanel({ editor }: TemplateEditorPanelProps) {
  const {
    styling,
    editorDirty,
    wordWrap,
    showPreview,
    editorWidth,
    textareaRef,
    gutterRef,
    handleStylingChange,
    handleEditorScroll,
  } = editor;

  return (
    <div
      className="flex flex-col min-h-0 min-w-0"
      style={{ width: showPreview ? `${editorWidth}%` : '100%' }}
    >
      {/* Editor header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-content1 border-b border-divider">
        <span className="text-[11px] font-medium text-default-400 uppercase tracking-wider">
          Template - Mustache
        </span>
        {editorDirty && (
          <span className="text-[11px] text-warning font-medium">● Modified</span>
        )}
      </div>

      {/* Line numbers + textarea */}
      <div className="group/editor flex flex-1 min-h-0 overflow-hidden">
        {/* Line numbers gutter */}
        <div
          ref={gutterRef}
          className="bg-content2 text-default-400 text-[11px] font-mono leading-4.5 pt-3 pl-2 pr-2 select-none overflow-hidden text-right shrink-0 pointer-events-none"
        >
          {styling.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="flex-1 font-mono text-[13px] leading-4.5 p-3 bg-content2 text-foreground resize-none focus:outline-none caret-primary selection:bg-default-200 editor-scrollbar"
          style={{
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            overflowWrap: wordWrap ? 'break-word' : 'normal',
            tabSize: 2,
            border: 'none',
          }}
          value={styling}
          onChange={(e) => handleStylingChange(e.target.value)}
          onScroll={handleEditorScroll}
          spellCheck={false}
          wrap={wordWrap ? 'soft' : 'off'}
        />
      </div>

      {/* Editor footer / status bar */}
      <div className="flex items-center gap-4 px-3 py-1 bg-content1 border-t border-divider text-[11px] text-default-400">
        <span>Lines: {styling.split('\n').length}</span>
        <span>Characters: {styling.length}</span>
      </div>
    </div>
  );
}
