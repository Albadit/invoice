'use client';

import { useState, createContext, useContext, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@heroui/button';
import { Tooltip } from '@heroui/tooltip';
import { ScrollShadow } from '@heroui/scroll-shadow';
import { Avatar } from '@heroui/avatar';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Menu,
  X,
} from 'lucide-react';
import { LanguageSwitcher, ThemeSwitch } from '@/components/ui';
import { useTranslation } from '@/contexts/LocaleProvider';
import { sidebarSections } from '@/config/navigation';

// Sidebar Context
interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Types
interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
}

interface SidebarSection {
  key: string;
  title?: string;
  items: SidebarItem[];
}

// Hook to get translated navigation items from config
function useSidebarSections(): SidebarSection[] {
  const { t } = useTranslation('common');
  
  return sidebarSections.map((section) => ({
    key: section.key,
    title: section.titleKey ? t(section.titleKey) : undefined,
    items: section.items.map((item) => ({
      key: item.key,
      label: t(item.labelKey),
      icon: <item.icon className="size-5" />,
      href: item.href,
    })),
  }));
}

// Sidebar Item Component
function SidebarItemComponent({
  item,
  isActive,
  isCollapsed,
}: {
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const router = useRouter();

  const content = (
    <Button
      variant={isActive ? 'flat' : 'light'}
      className={cn(
        'w-full h-11',
        isCollapsed ? 'justify-center px-0 min-w-11' : 'justify-start gap-3',
        isActive && 'bg-primary/10 text-primary'
      )}
      isIconOnly={isCollapsed}
      onPress={() => router.push(item.href, { scroll: false })}
    >
      <span className={cn(isActive && 'text-primary')}>{item.icon}</span>
      {!isCollapsed && (
        <span className={cn('font-medium', isActive && 'text-primary')} suppressHydrationWarning>
          {item.label}
        </span>
      )}
    </Button>
  );

  if (isCollapsed) {
    return (
      <Tooltip content={item.label} placement="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}

// Sidebar Section Component
function SidebarSectionComponent({
  section,
  isCollapsed,
  pathname,
  searchParams,
}: {
  section: SidebarSection;
  isCollapsed: boolean;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  return (
    <div className="flex flex-col gap-1">
      {section.title && !isCollapsed && (
        <p className="px-3 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider" suppressHydrationWarning>
          {section.title}
        </p>
      )}
      {section.items.map((item) => {
        let isActive: boolean;
        if (item.href === '/') {
          isActive = pathname === '/';
        } else if (item.href.includes('?')) {
          const [basePath, query] = item.href.split('?');
          const itemParams = new URLSearchParams(query);
          isActive =
            pathname.startsWith(basePath) &&
            Array.from(itemParams.entries()).every(
              ([key, value]) => searchParams.get(key) === value
            );
        } else {
          isActive = pathname.startsWith(item.href);
        }

        return (
          <SidebarItemComponent
            key={item.key}
            item={item}
            isActive={isActive}
            isCollapsed={isCollapsed}
          />
        );
      })}
    </div>
  );
}

// Main Sidebar Component
export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const sidebarSections = useSidebarSections();

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r border-divider bg-background transition-all duration-300',
          isCollapsed ? 'w-[72px]' : 'w-[260px]',
          // Mobile styles
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-divider px-4',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <FileText className="size-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Invoice</span>
            </div>
          )}

          {/* Collapse Button - Desktop */}
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="hidden lg:flex"
            onPress={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>

          {/* Close Button - Mobile */}
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="lg:hidden"
            onPress={() => setIsMobileOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollShadow className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-4">
            {sidebarSections.map((section) => (
              <SidebarSectionComponent
                key={section.key}
                section={section}
                isCollapsed={isCollapsed}
                pathname={pathname}
                searchParams={searchParams}
              />
            ))}
          </nav>
        </ScrollShadow>

        {/* Footer */}
        <div
          className={cn(
            'flex flex-col gap-2 border-t border-divider p-3',
            isCollapsed && 'items-center'
          )}
        >
          {/* Language & Theme Switchers */}
          <div className={cn('flex gap-2', isCollapsed ? 'flex-col items-center' : 'justify-start px-1')}>
            <LanguageSwitcher />
            <ThemeSwitch />
          </div>

          {/* User Section */}
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              !isCollapsed && 'hover:bg-default-100'
            )}
          >
            <Avatar
              size="sm"
              name="User"
              className="shrink-0"
            />
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">User Name</p>
                <p className="truncate text-xs text-default-500">user@email.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// Mobile Menu Button
export function SidebarMobileToggle() {
  const { setIsMobileOpen } = useSidebar();

  return (
    <Button
      isIconOnly
      variant="light"
      className="lg:hidden"
      onPress={() => setIsMobileOpen(true)}
    >
      <Menu className="size-5" />
    </Button>
  );
}

// Layout Wrapper with Sidebar (includes provider)
export function SidebarLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}
    >
      <SidebarLayoutInner>{children}</SidebarLayoutInner>
    </SidebarContext.Provider>
  );
}

function SidebarLayoutInner({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn(
      'min-h-screen transition-all duration-300',
      isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
    )}>
      <Sidebar />
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-divider bg-background px-4 lg:hidden">
        <SidebarMobileToggle />
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Invoice</span>
        </div>
      </header>

      {/* Page Content */}
      {children}
  </div>
  );
}
