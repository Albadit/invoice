'use client';

import type { TemplateEditorState } from '../hooks/useTemplateEditor';

interface TemplatePreviewPanelProps {
  editor: TemplateEditorState;
}

export function TemplatePreviewPanel({ editor }: TemplatePreviewPanelProps) {
  const {
    previewScale,
    previewFullscreen,
    iframeRef,
    previewContainerRef,
    previewPanelRef,
    handleToggleFullscreen,
  } = editor;

  return (
    <div ref={previewPanelRef} className="flex flex-col flex-1 min-h-0 min-w-0 bg-content2">
      <div className="flex items-center px-3 py-1.5 bg-content1 border-b border-divider">
        <span className="text-[11px] font-medium text-default-400 uppercase tracking-wider">
          Preview
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-default-300">
            {Math.round(previewScale * 100)}%
          </span>
          <button
            type="button"
            className="p-0.5 rounded text-default-400 hover:text-foreground hover:bg-default-200 transition-colors"
            onClick={handleToggleFullscreen}
            title={previewFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {previewFullscreen ? (
                <>
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              ) : (
                <>
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={previewContainerRef}
        className="flex-1 bg-content2 flex items-center justify-center overflow-hidden"
      >
        <iframe
          ref={iframeRef}
          className="bg-white shadow-2xl border-none origin-center shrink-0"
          style={{
            width: 794,
            height: 1123,
            transform: `scale(${previewScale})`,
            opacity: previewScale > 0 ? 1 : 0,
          }}
          title="Invoice preview"
        />
      </div>
    </div>
  );
}
