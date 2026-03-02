import {
  FileText,
  Palette,
  Coins,
  Plus,
  Settings,
  LayoutDashboard,
  FileCog ,
  type LucideIcon,
} from 'lucide-react';
import { PROTECTED_ROUTES, INVOICE_ROUTES, EDITOR_ROUTES, SETTINGS_ROUTES } from '@/config/routes';

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
        href: PROTECTED_ROUTES.dashboard,
      },
      {
        key: 'invoice',
        labelKey: 'navigation.invoices',
        icon: FileText,
        href: PROTECTED_ROUTES.invoice,
      },
      {
        key: 'new-invoice',
        labelKey: 'navigation.newInvoice',
        icon: Plus,
        href: INVOICE_ROUTES.new,
      },
      {
        key: 'editor',
        labelKey: 'navigation.templateEditor',
        icon: FileCog ,
        href: EDITOR_ROUTES.page,
      },
    ],
  },
  {
    key: 'settings',
    titleKey: 'navigation.settings',
    items: [
      {
        key: 'settings',
        labelKey: 'navigation.settings',
        icon: Settings,
        href: SETTINGS_ROUTES.page,
      },
      {
        key: 'templates',
        labelKey: 'navigation.templates',
        icon: Palette,
        href: SETTINGS_ROUTES.templates,
      },
      {
        key: 'currencies',
        labelKey: 'navigation.currencies',
        icon: Coins,
        href: SETTINGS_ROUTES.currencies,
      },
    ],
  },
];
