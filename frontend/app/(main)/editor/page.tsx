'use client';

import { useTemplateEditor } from '@/features/templates/hooks/useTemplateEditor';
import {
  TemplateEditorToolbar,
  TemplateEditorPanel,
  TemplatePreviewPanel,
  SaveTemplateModal,
} from '@/features/templates/components';

export default function TemplateEditorPage() {
  const editor = useTemplateEditor();
  const { loading, error, showPreview, handleMouseDown } = editor;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-lg text-default-500">Loading invoices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-lg text-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* VS Code-style scrollbar */}
      <style>{`
        .editor-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .editor-scrollbar:hover {
          scrollbar-color: hsl(var(--heroui-default-300)) transparent;
        }
        .editor-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .editor-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .editor-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .editor-scrollbar:hover::-webkit-scrollbar-thumb {
          background: hsl(var(--heroui-default-300));
        }
        .editor-scrollbar:hover::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--heroui-default-400));
        }
      `}</style>

      <TemplateEditorToolbar editor={editor} />

      <div className="flex flex-1 min-h-0">
        <TemplateEditorPanel editor={editor} />

        {/* Draggable divider */}
        {showPreview && (
          <div
            className="w-1.5 cursor-col-resize flex items-center justify-center shrink-0 bg-divider hover:bg-primary/30 active:bg-primary/50 transition-colors"
            onMouseDown={handleMouseDown}
          >
            <div className="w-px h-8 bg-default-400 rounded-full" />
          </div>
        )}

        {showPreview && <TemplatePreviewPanel editor={editor} />}
      </div>

      <SaveTemplateModal editor={editor} />
    </div>
  );
}
