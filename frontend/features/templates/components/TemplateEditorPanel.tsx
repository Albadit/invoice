'use client';

import { useCallback, useRef, useState } from 'react';
import Editor, { loader, type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from 'next-themes';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, X, Copy, ClipboardCheck } from 'lucide-react';
import { registerTemplateProviders, validateTemplate, type TemplateDiagnostics } from '../utils/monacoSetup';
import type { TemplateEditorState } from '../hooks/useTemplateEditor';

// Load Monaco from local node_modules instead of CDN to avoid tracking prevention warnings
import * as monaco from 'monaco-editor';

if (typeof self !== 'undefined') {
  self.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url), { type: 'module' });
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url), { type: 'module' });
      }
      if (label === 'typescript' || label === 'javascript') {
        return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url), { type: 'module' });
      }
      if (label === 'json') {
        return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url), { type: 'module' });
      }
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), { type: 'module' });
    },
  };
}

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
  const [diagnostics, setDiagnostics] = useState<TemplateDiagnostics>({ errors: 0, warnings: 0, markers: [] });
  const monacoRef = useRef<Parameters<BeforeMount>[0] | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showProblems, setShowProblems] = useState(false);

  const runValidation = useCallback(() => {
    const m = monacoRef.current;
    const model = m?.editor.getModels()[0];
    if (m && model) setDiagnostics(validateTemplate(m, model));
  }, []);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monacoRef.current = monaco;
    registerTemplateProviders(monaco);
  }, []);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;

    // Track cursor position
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorLine(e.position.lineNumber);
      setCursorColumn(e.position.column);
    });

    // Focus the editor on mount
    editorInstance.focus();

    // Run initial validation
    runValidation();
  }, [runValidation]);

  const goToMarker = useCallback((marker: editor.IMarkerData) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.revealLineInCenter(marker.startLineNumber);
    ed.setPosition({ lineNumber: marker.startLineNumber, column: marker.startColumn });
    ed.focus();
  }, []);

  const totalProblems = diagnostics.errors + diagnostics.warnings;
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyMarker = useCallback((e: React.MouseEvent, marker: editor.IMarkerData, idx: number) => {
    e.stopPropagation();
    const text = `[Ln ${marker.startLineNumber}, Col ${marker.startColumn}] ${marker.message}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
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
      <div className="flex-1 min-h-0 overflow-hidden" style={showProblems && totalProblems > 0 ? { flex: '1 1 0%', minHeight: 0 } : undefined}>
        <Editor
          height="100%"
          language="html"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={styling}
          onChange={(value) => {
            handleStylingChange(value ?? '');
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(runValidation, 300);
          }}
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

      {/* Problems panel */}
      {showProblems && totalProblems > 0 && (
        <div className="flex flex-col border-t border-divider bg-content1" style={{ height: '35%', minHeight: 80, maxHeight: 250 }}>
          <div className="flex items-center justify-between px-3 py-1 border-b border-divider">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-default-400 uppercase tracking-wider">Problems</span>
              <span className="text-[10px] bg-default-200 text-default-600 rounded-full px-1.5 py-0.5 font-medium">{totalProblems}</span>
            </div>
            <button onClick={() => setShowProblems(false)} className="p-0.5 rounded hover:bg-default-200 text-default-400 transition-colors">
              <X size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-[12px]">
            {diagnostics.markers.map((marker, i) => {
              const isError = marker.severity === monacoRef.current?.MarkerSeverity.Error;
              return (
                <button
                  key={i}
                  onClick={() => goToMarker(marker)}
                  className="flex items-center gap-2 w-full px-3 py-1 hover:bg-default-100 text-left transition-colors cursor-pointer"
                >
                  {isError
                    ? <XCircle size={14} className="text-danger shrink-0" />
                    : <AlertTriangle size={14} className="text-warning shrink-0" />
                  }
                  <span className="truncate flex-1 text-default-700">{marker.message}</span>
                  <span className="text-default-400 shrink-0 text-[11px]">[Ln {marker.startLineNumber}, Col {marker.startColumn}]</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => copyMarker(e, marker, i)}
                    onKeyDown={(e) => { if (e.key === 'Enter') copyMarker(e as unknown as React.MouseEvent, marker, i); }}
                    className="p-0.5 rounded hover:bg-default-200 text-default-400 hover:text-default-600 transition-colors shrink-0"
                    title="Copy"
                  >
                    {copiedIdx === i ? <ClipboardCheck size={12} className="text-success" /> : <Copy size={12} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor footer / status bar */}
      <div className="flex items-center gap-4 px-3 py-1 bg-content1 border-t border-divider text-[11px] text-default-400">
        <span>Ln {cursorLine}, Col {cursorColumn}</span>
        <span>Lines: {styling.split('\n').length}</span>
        <span>Characters: {styling.length}</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowProblems(p => !p)}
          className="flex items-center gap-2 hover:bg-default-200 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
        >
          {diagnostics.errors > 0 && (
            <span className="flex items-center gap-1 text-danger font-medium">
              <XCircle size={12} /> {diagnostics.errors}
            </span>
          )}
          {diagnostics.warnings > 0 && (
            <span className="flex items-center gap-1 text-warning font-medium">
              <AlertTriangle size={12} /> {diagnostics.warnings}
            </span>
          )}
          {diagnostics.errors === 0 && diagnostics.warnings === 0 && (
            <span className="text-success font-medium">✓ No issues</span>
          )}
          {totalProblems > 0 && (
            showProblems
              ? <ChevronDown size={10} className="text-default-400" />
              : <ChevronUp size={10} className="text-default-400" />
          )}
        </button>
        <span>HTML</span>
      </div>
    </div>
  );
}
