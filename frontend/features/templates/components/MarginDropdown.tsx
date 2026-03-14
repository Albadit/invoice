'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PdfMargin } from '@/lib/types';

interface MarginDropdownProps {
  pdfMargins: PdfMargin[];
  selectedMarginId: string;
  onMarginChange: (marginId: string) => void;
}

export function MarginDropdown({ pdfMargins, selectedMarginId, onMarginChange }: MarginDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = pdfMargins.find((m) => m.id === selectedMarginId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-default-500 hover:text-default-700 hover:bg-default-100 transition-colors"
      >
        <span className="text-default-400">Margins:</span>
        <span className="font-medium text-default-600">{selected?.name ?? 'None'}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-50 rounded-lg border border-divider bg-content1 shadow-lg py-1">

          {pdfMargins.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onMarginChange(m.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-default-100 transition-colors ${
                selectedMarginId === m.id ? 'text-primary font-medium' : 'text-default-600'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span>{m.name}</span>
                {m.is_system && (
                  <span className="text-[9px] px-1 py-px rounded bg-secondary/10 text-secondary">System</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 text-[10px] text-default-400">
                <span>top: {m.top}</span>
                <span>bottom: {m.bottom}</span>
                <span>left: {m.left}</span>
                <span>right: {m.right}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
