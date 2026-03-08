'use client';

import { useCallback, useState } from 'react';
import Editor, { loader, type OnMount, type BeforeMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { registerTemplateProviders } from '../utils/monacoSetup';
import type { TemplateEditorState } from '../hooks/useTemplateEditor';

// Load Monaco from local node_modules instead of CDN to avoid tracking prevention warnings
import * as monaco from 'monaco-editor';
loader.config({ monaco });

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
    handleStylingChange,
  } = editor;

  const { theme } = useTheme();
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    registerTemplateProviders(monaco);
  }, []);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    // Track cursor position
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorLine(e.position.lineNumber);
      setCursorColumn(e.position.column);
    });

    // Focus the editor on mount
    editorInstance.focus();
  }, []);

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

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          language="html"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={styling}
          onChange={(value) => handleStylingChange(value ?? '')}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Menlo', monospace",
            lineHeight: 18,
            tabSize: 2,
            wordWrap: wordWrap ? 'on' : 'off',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            suggest: { showWords: true },
            padding: { top: 8, bottom: 8 },
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-content2">
              <span className="text-sm text-default-400">Loading editor...</span>
            </div>
          }
        />
      </div>

      {/* Editor footer / status bar */}
      <div className="flex items-center gap-4 px-3 py-1 bg-content1 border-t border-divider text-[11px] text-default-400">
        <span>Ln {cursorLine}, Col {cursorColumn}</span>
        <span>Lines: {styling.split('\n').length}</span>
        <span>Characters: {styling.length}</span>
        <div className="flex-1" />
        <span>HTML</span>
      </div>
    </div>
  );
}
