import {
  FileText,
  Palette,
  Coins,
  Plus,
  Settings,
  LayoutDashboard,
  FileCog,
  Users,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { PROTECTED_ROUTES, INVOICE_ROUTES, EDITOR_ROUTES, SETTINGS_ROUTES, USERS_ROUTES, ROLES_ROUTES } from '@/config/routes';

export interface NavItem {
  /** Unique key, also used to resolve i18n label via `navigation.{key}` in common.json */
  key: string;
  /** Translation key under `navigation.*` in common.json */
  labelKey: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Route path */
  href: string;
  /** Permission key required to see this item (omit to always show) */
  permission?: string;
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
        permission: 'dashboard:access',
      },
      {
        key: 'invoice',
        labelKey: 'navigation.invoices',
        icon: FileText,
        href: PROTECTED_ROUTES.invoice,
        permission: 'invoices:access',
      },
      {
        key: 'new-invoice',
        labelKey: 'navigation.newInvoice',
        icon: Plus,
        href: INVOICE_ROUTES.new,
        permission: 'invoices:create',
      },
      {
        key: 'editor',
        labelKey: 'navigation.templateEditor',
        icon: FileCog ,
        href: EDITOR_ROUTES.page,
        permission: 'templates:access',
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
        permission: 'settings:access',
      },
      {
        key: 'templates',
        labelKey: 'navigation.templates',
        icon: Palette,
        href: SETTINGS_ROUTES.templates,
        permission: 'templates:access',
      },
      {
        key: 'currencies',
        labelKey: 'navigation.currencies',
        icon: Coins,
        href: SETTINGS_ROUTES.currencies,
        permission: 'currencies:access',
      },
    ],
  },
  {
    key: 'admin',
    titleKey: 'navigation.admin',
    items: [
      {
        key: 'users',
        labelKey: 'navigation.users',
        icon: Users,
        href: USERS_ROUTES.page,
        permission: 'users:access',
      },
      {
        key: 'roles',
        labelKey: 'navigation.roles',
        icon: Shield,
        href: ROLES_ROUTES.page,
        permission: 'roles:access',
      },
    ],
  },
];
