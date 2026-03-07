'use client';

import { type ReactNode, useEffect } from 'react';
import { usePageTitle } from '@/components/layout';

interface StickyHeaderProps {
  children?: ReactNode;
  /** Plain-text page title shown in the mobile header bar */
  title?: string;
  /** Plain-text page subtitle shown in the mobile header bar */
  subtitle?: string;
  /** Extra classes appended to the root <section> (e.g. "mb-6 z-30") */
  className?: string;
}

/**
 * Reusable frosted-glass sticky page header.
 *
 * Renders a full-bleed `<section>` that sticks to the top of the scroll
 * container with a translucent backdrop blur.
 *
 * Usage:
 * ```tsx
 * <StickyHeader>
 *   <div className="flex flex-col gap-0.5 min-w-0">
 *     <h1 className="text-2xl font-bold">Title</h1>
 *   </div>
 *   <div className="sm:ml-auto shrink-0">
 *     <Button>Action</Button>
 *   </div>
 * </StickyHeader>
 * ```
 */
export function StickyHeader({ children, title, subtitle, className = '' }: StickyHeaderProps) {
  const { setPageTitle, setPageSubtitle } = usePageTitle();

  useEffect(() => {
    if (title) setPageTitle(title);
    if (subtitle) setPageSubtitle(subtitle);
    return () => { setPageTitle(''); setPageSubtitle(''); };
  }, [title, subtitle, setPageTitle, setPageSubtitle]);

  const hasChildren = !!children;

  return (
    <section
      className={`${hasChildren ? '' : 'hidden lg:block '}sticky top-16 lg:top-0 z-30 bg-background/80 backdrop-blur-md -mx-4 sm:-mx-8 -mt-4 sm:-mt-8 px-4 sm:px-8 py-3 border-b border-divider ${className}`.trim()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {title && (
          <div className="hidden lg:flex flex-col gap-0.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-default-500">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
