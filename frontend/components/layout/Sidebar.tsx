'use client';

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@heroui/button';
import { Tooltip } from '@heroui/tooltip';
import { ScrollShadow } from '@heroui/scroll-shadow';
import { Avatar } from '@heroui/avatar';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@heroui/popover';
import { LanguageSwitcher, ThemeSwitch } from '@/components/ui';
import { useTranslation } from '@/contexts/LocaleProvider';
import { sidebarSections, sidebarBrand, popoverLinks } from '@/config/navigation';
import { ROUTES, PROTECTED_ROUTES } from '@/config/routes';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/contexts/PermissionsProvider';

// Page-title context – lets StickyHeader push its title up to the mobile header
interface PageTitleContextType {
  pageTitle: string;
  pageSubtitle: string;
  setPageTitle: (title: string) => void;
  setPageSubtitle: (subtitle: string) => void;
}

const PageTitleContext = createContext<PageTitleContextType>({ pageTitle: '', pageSubtitle: '', setPageTitle: () => {}, setPageSubtitle: () => {} });

export function usePageTitle() {
  return useContext(PageTitleContext);
}

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

// Hook to get translated navigation items from config, filtered by permissions
function useSidebarSections(): SidebarSection[] {
  const { t } = useTranslation('common');
  const { permissions, loading } = usePermissions();
  
  return sidebarSections.map((section) => ({
    key: section.key,
    title: section.titleKey ? t(section.titleKey) : undefined,
    items: section.items
      .filter((item) => {
        if (!item.permission) return true;
        if (loading) return false;
        return permissions.includes(item.permission);
      })
      .map((item) => ({
        key: item.key,
        label: t(item.labelKey),
        icon: <item.icon className="size-5" />,
        href: item.href,
      })),
  })).filter((section) => section.items.length > 0);
}

// Sidebar Item Component
function SidebarItemComponent({
  item,
  isActive,
  isCollapsed,
  onNavigate,
}: {
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
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
      onPress={() => { router.push(item.href, { scroll: false }); onNavigate?.(); }}
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
  activeKey,
  onNavigate,
}: {
  section: SidebarSection;
  isCollapsed: boolean;
  activeKey: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {section.title && !isCollapsed && (
        <p className="px-3 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider" suppressHydrationWarning>
          {section.title}
        </p>
      )}
      {section.items.map((item) => (
        <SidebarItemComponent
          key={item.key}
          item={item}
          isActive={item.key === activeKey}
          isCollapsed={isCollapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

// Main Sidebar Component
export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const sidebarSections = useSidebarSections();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');

  // Determine which single nav item is active (longest prefix match wins)
  const activeKey = (() => {
    let bestKey: string | null = null;
    let bestLength = -1;

    for (const section of sidebarSections) {
      for (const item of section.items) {
        let matches = false;

        if (item.href === ROUTES.home) {
          matches = pathname === ROUTES.home;
        } else if (item.href.includes('?')) {
          const [basePath, query] = item.href.split('?');
          const itemParams = new URLSearchParams(query);
          matches =
            pathname.startsWith(basePath) &&
            Array.from(itemParams.entries()).every(
              ([key, value]) => searchParams.get(key) === value
            );
        } else {
          matches = pathname === item.href || pathname.startsWith(item.href + '/');
        }

        if (matches && item.href.length > bestLength) {
          bestKey = item.key;
          bestLength = item.href.length;
        }
      }
    }

    return bestKey;
  })();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user) {
        setUserEmail(user.email || '');
        setUserName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          ''
        );
      }
    });
  }, []);

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
          isCollapsed ? 'w-18' : 'w-65',
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
                <sidebarBrand.icon className="size-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">{sidebarBrand.name}</span>
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
                activeKey={activeKey}
                onNavigate={() => setIsMobileOpen(false)}
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

          {/* User Section with Popover */}
          <Popover placement={isCollapsed ? 'right-end' : 'top-start'} isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors',
                  !isCollapsed && 'hover:bg-default-100',
                  isCollapsed && 'hover:bg-default-100 justify-center'
                )}
              >
                <Avatar
                  size="sm"
                  name={userName || userEmail || 'U'}
                  className="shrink-0"
                />
                {!isCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    <p className="truncate text-xs text-default-500">{userEmail}</p>
                  </div>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-3 w-57">
              <div className="w-full flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    size="sm"
                    name={userName || userEmail || 'U'}
                    className="shrink-0"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    <p className="truncate text-xs text-default-500">{userEmail}</p>
                  </div>
                </div>
                <div className="border-t border-divider" />
                {popoverLinks.map((link) => (
                  <Button
                    key={link.key}
                    variant="flat"
                    color={link.color || 'default'}
                    size="sm"
                    className="w-full justify-start"
                    startContent={<link.icon className="size-4" />}
                    onPress={async () => {
                      setIsPopoverOpen(false);
                      if (link.action === 'logout') {
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        window.location.href = ROUTES.logout;
                      } else if (link.href) {
                        router.push(link.href);
                      }
                    }}
                  >
                    {link.labelKey.includes(':') ? (() => { const [ns, key] = link.labelKey.split(':'); return ns === 'auth' ? t(key) : tCommon(link.labelKey); })() : tCommon(link.labelKey)}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
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
  const [pageTitle, setPageTitle] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}
    >
      <PageTitleContext.Provider value={{ pageTitle, pageSubtitle, setPageTitle, setPageSubtitle }}>
        <SidebarLayoutInner>{children}</SidebarLayoutInner>
      </PageTitleContext.Provider>
    </SidebarContext.Provider>
  );
}

function SidebarLayoutInner({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { pageTitle, pageSubtitle } = usePageTitle();
  const pathname = usePathname();
  const { t } = useTranslation('common');

  // Derive a fallback title from navigation config when no StickyHeader sets one
  const fallbackTitle = (() => {
    if (pageTitle) return pageTitle;
    for (const section of sidebarSections) {
      for (const item of section.items) {
        const itemPath = item.href.split('?')[0];
        if (pathname === itemPath || (itemPath !== '/' && pathname.startsWith(itemPath + '/'))) {
          return t(item.labelKey);
        }
      }
    }
    return 'Invoice';
  })();

  return (
    <div className={cn(
      'min-h-screen transition-all duration-300',
      isCollapsed ? 'lg:pl-18' : 'lg:pl-65'
    )}>
      <Sidebar />
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-divider bg-background px-4 lg:hidden">
        <SidebarMobileToggle />
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-base font-bold truncate leading-tight">{fallbackTitle}</span>
          {pageSubtitle && <span className="text-xs text-default-500 truncate leading-tight">{pageSubtitle}</span>}
        </div>
      </header>

      {/* Page Content */}
      {children}
  </div>
  );
}
