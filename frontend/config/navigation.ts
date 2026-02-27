import {
  FileText,
  Building2,
  Palette,
  Coins,
  Plus,
  Users,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** Unique key, also used to resolve i18n label via `navigation.{key}` in common.json */
  key: string;
  /** Translation key under `navigation.*` in common.json */
  labelKey: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Route path */
  href: string;
}

export interface NavSection {
  /** Unique section key */
  key: string;
  /** Translation key for the section title (optional – main section has none) */
  titleKey?: string;
  /** Navigation items in this section */
  items: NavItem[];
}

/**
 * Sidebar navigation structure.
 * Edit this array to add, remove, or reorder tabs in the sidebar.
 */
export const sidebarSections: NavSection[] = [
  {
    key: 'main',
    items: [
      {
        key: 'dashboard',
        labelKey: 'navigation.dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
      },
      {
        key: 'home',
        labelKey: 'navigation.invoices',
        icon: FileText,
        href: '/',
      },
      {
        key: 'new-invoice',
        labelKey: 'navigation.newInvoice',
        icon: Plus,
        href: '/invoice/new/edit',
      },
    ],
  },
  {
    key: 'settings',
    titleKey: 'navigation.settings',
    items: [
      {
        key: 'companies',
        labelKey: 'navigation.companies',
        icon: Building2,
        href: '/settings?tab=companies',
      },
      {
        key: 'clients',
        labelKey: 'navigation.clients',
        icon: Users,
        href: '/settings?tab=clients',
      },
      {
        key: 'templates',
        labelKey: 'navigation.templates',
        icon: Palette,
        href: '/settings?tab=templates',
      },
      {
        key: 'currencies',
        labelKey: 'navigation.currencies',
        icon: Coins,
        href: '/settings?tab=currencies',
      },
    ],
  },
];
