'use client';

import type { TemplateEditorState } from '../hooks/useTemplateEditor';

interface TemplatePreviewPanelProps {
  editor: TemplateEditorState;
}

export function TemplatePreviewPanel({ editor }: TemplatePreviewPanelProps) {
  const {
    previewScale,
    scaleMode,
    iframeRef,
    previewContainerRef,
  } = editor;

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="flex items-center px-3 py-1.5 bg-content1 border-b border-divider">
        <span className="text-[11px] font-medium text-default-400 uppercase tracking-wider">
          Preview
        </span>
        <span className="ml-auto text-[11px] text-default-300">
          {Math.round(previewScale * 100)}%
        </span>
      </div>
      <div
        ref={previewContainerRef}
        className={`flex-1 bg-content2 flex items-center justify-center ${scaleMode === 'auto' ? 'overflow-hidden' : 'overflow-auto'}`}
      >
        <iframe
          ref={iframeRef}
          className="min-w-198.5 min-h-280.75 bg-white shadow-2xl border-none origin-center"
          style={{ transform: `scale(${previewScale})` }}
          title="Invoice preview"
        />
      </div>
    </div>
  );
}
